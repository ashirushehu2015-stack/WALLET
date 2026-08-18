import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { WalletService } from '../services/wallet.service';
import { KYCService } from '../services/kyc.service';
import { AuthenticatedRequest } from '../middlewares/auth';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { email, phoneNumber, firstName, lastName, password, role } = req.body;

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
      const user = await prisma.user.create({
        data: {
          email,
          phoneNumber,
          firstName,
          lastName,
          passwordHash,
          role: role === 'ADMIN' ? 'ADMIN' : 'USER',
        },
      });

      // Initialize Wallet and Dedicated Virtual Account
      const wallet = await WalletService.createWalletForUser(user.id);
      await KYCService.submitKYC(user.id);

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'secret',
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

      const user = await prisma.user.findUnique({
        where: { email },
        include: { walletAccount: true, dva: true },
      });

      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'secret',
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
}
