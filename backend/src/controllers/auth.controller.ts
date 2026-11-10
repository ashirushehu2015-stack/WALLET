import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { WalletService } from '../services/wallet.service';
import { KYCService } from '../services/kyc.service';
import { PasswordResetService } from '../services/password-reset.service';
import { LoginThrottlingService } from '../services/login-throttle.service';
import { AuthenticatedRequest } from '../middlewares/auth';

export class AuthController {
  private static getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === 'secret') {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Fatal Security Error: JWT_SECRET environment variable must be configured in production with at least 32 characters.');
      }
      return 'development_fallback_secret_key_32_chars_min';
    }
    return secret;
  }

  static async register(req: Request, res: Response) {
    try {
      const { email, phoneNumber, firstName, lastName, password } = req.body;

      if (!email || !phoneNumber || !firstName || !lastName || !password) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
      }

      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ email }, { phoneNumber }] },
      });

      if (existingUser) {
        return res.status(409).json({ success: false, message: 'User with email or phone already exists.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      
      // CRITICAL SECURITY FIX: Public registration strictly hardcodes role to 'USER'.
      // External request body 'role' parameter is completely ignored to prevent privilege escalation.
      const user = await prisma.user.create({
        data: {
          email,
          phoneNumber,
          firstName,
          lastName,
          passwordHash,
          role: 'USER',
        },
      });

      // Initialize Wallet and Dedicated Virtual Account
      const wallet = await WalletService.createWalletForUser(user.id);
      await KYCService.initializeKYC(user.id);

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        AuthController.getJwtSecret(),
        { expiresIn: '24h' }
      );

      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          },
          wallet: {
            walletNumber: wallet.walletNumber,
            availableBalance: wallet.availableBalance,
          },
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
      }

      // 1. Account-aware login throttle check
      const throttle = LoginThrottlingService.isAccountThrottled(email);
      if (throttle.isRestricted) {
        const remainingMinutes = Math.ceil((throttle.lockoutRemainingMs || 0) / 60000);
        return res.status(429).json({
          success: false,
          message: `Account temporarily restricted due to repeated failed login attempts. Please retry in ${remainingMinutes} minute(s) or reset your password.`,
        });
      }

      const user = await prisma.user.findUnique({
        where: { email },
        include: { walletAccount: true, dva: true },
      });

      // 2. Anti-enumeration timing-safe comparison
      if (!user) {
        await LoginThrottlingService.dummyPasswordCheck(password);
        await LoginThrottlingService.recordFailedAttempt(email, req.ip);
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordMatch) {
        const { lockedNow, remainingAttempts } = await LoginThrottlingService.recordFailedAttempt(email, req.ip);
        if (lockedNow) {
          return res.status(429).json({
            success: false,
            message: 'Account temporarily restricted for 15 minutes due to 5 consecutive failed login attempts.',
          });
        }
        return res.status(401).json({
          success: false,
          message: `Invalid credentials. ${remainingAttempts} attempt(s) remaining before temporary lockout.`,
        });
      }

      // 3. Successful login: Reset failed attempts
      LoginThrottlingService.recordSuccessfulLogin(email);

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        AuthController.getJwtSecret(),
        { expiresIn: '24h' }
      );

      return res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          },
          wallet: user.walletAccount,
          dva: user.dva,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          walletAccount: true,
          dva: true,
          kycRecord: true,
        },
      });

      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      return res.json({ success: true, data: user });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Request Password Reset (Forgot Password)
   * Anti-enumeration: Returns identical uniform response whether user exists or not.
   */
  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email, phoneNumber, identifier } = req.body;
      const targetIdentifier = identifier || email || phoneNumber;

      if (!targetIdentifier) {
        return res.status(400).json({
          success: false,
          message: 'An email address or registered phone number is required.',
        });
      }

      const result = await PasswordResetService.requestPasswordReset(targetIdentifier);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Reset Password with OTP Code
   */
  static async resetPassword(req: Request, res: Response) {
    try {
      const { email, phoneNumber, identifier, otp, code, newPassword } = req.body;
      const targetIdentifier = identifier || email || phoneNumber;
      const targetOtp = otp || code;

      if (!targetIdentifier || !targetOtp || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Account identifier, reset code, and new password are required.',
        });
      }

      const result = await PasswordResetService.resetPassword(targetIdentifier, targetOtp, newPassword);
      if (!result.success) {
        return res.status(400).json(result);
      }
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}
