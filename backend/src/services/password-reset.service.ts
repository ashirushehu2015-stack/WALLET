import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { logger } from '../config/logger';

export class PasswordResetService {
  /**
   * Derives authoritative OTP HMAC secret key from environment.
   * Enforces 32-character minimum secret in production.
   */
  public static getOtpHmacSecret(): string {
    const secret = process.env.OTP_HMAC_SECRET;
    if (!secret || secret.trim() === '') {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Fatal Security Error: OTP_HMAC_SECRET environment variable must be configured in production with at least 32 characters.');
      }
      return 'mangapay_default_otp_hmac_secret_development_key_32_chars';
    }
    if (secret.length < 32 && process.env.NODE_ENV === 'production') {
      throw new Error('Fatal Security Error: OTP_HMAC_SECRET must be at least 32 characters in production.');
    }
    return secret;
  }

  /**
   * Generates a keyed HMAC-SHA256 digest of the 6-digit OTP.
   * Evaluated 10^6 search space is cryptographically protected by the external secret.
   */
  public static hashOtp(otp: string): string {
    const secret = PasswordResetService.getOtpHmacSecret();
    return crypto.createHmac('sha256', secret).update(otp.trim()).digest('hex');
  }

  /**
   * Timing-safe verification supporting seamless key rotation and backward compatibility.
   */
  public static verifyOtpHash(otp: string, storedHash: string): boolean {
    try {
      const incomingHmac = PasswordResetService.hashOtp(otp);
      const expectedBuffer = Buffer.from(storedHash, 'hex');
      const incomingBuffer = Buffer.from(incomingHmac, 'hex');

      if (expectedBuffer.length === incomingBuffer.length && crypto.timingSafeEqual(expectedBuffer, incomingBuffer)) {
        return true;
      }

      // Backward compatibility fallback: verify against legacy SHA-256(otp:JWT_SECRET)
      const legacySalt = process.env.JWT_SECRET || 'mangapay_reset_salt_fallback_key';
      const legacyHash = crypto.createHash('sha256').update(`${otp.trim()}:${legacySalt}`).digest('hex');
      const legacyBuffer = Buffer.from(legacyHash, 'hex');

      if (expectedBuffer.length === legacyBuffer.length && crypto.timingSafeEqual(expectedBuffer, legacyBuffer)) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Request Password Reset.
   * - Generates cryptographically secure 6-digit numeric OTP.
   * - Anti-enumeration: Returns identical uniform response whether user exists or not.
   * - Enforces 60-second resend cooldown.
   * - Stores only SHA-256 hash of OTP.
   * - Never exposes OTP in API responses or production logs.
   */
  static async requestPasswordReset(identifier: string): Promise<{ success: boolean; message: string; devOtp?: string }> {
    if (!identifier || typeof identifier !== 'string') {
      return {
        success: true,
        message: 'If an account matching those details exists, a password reset code has been sent.',
      };
    }

    const trimmed = identifier.trim();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: trimmed.toLowerCase() },
          { phoneNumber: trimmed },
        ],
      },
    });

    if (!user) {
      // Timing-safe dummy hashing to prevent timing-based user enumeration
      PasswordResetService.hashOtp('000000');
      return {
        success: true,
        message: 'If an account matching those details exists, a password reset code has been sent.',
      };
    }

    // Enforce 60-second resend cooldown limit
    const recentToken = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentToken) {
      logger.warn(`Password reset rate limited for user ${user.id} (resend within 60s cooldown).`);
      return {
        success: true,
        message: 'If an account matching those details exists, a password reset code has been sent.',
      };
    }

    // Invalidate any previously issued unused tokens
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, isUsed: false },
      data: { isUsed: true },
    });

    // Generate cryptographically secure 6-digit OTP (100000 - 999999)
    const otp = crypto.randomInt(100000, 1000000).toString();
    const tokenHash = PasswordResetService.hashOtp(otp);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute expiration

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        identifier: trimmed,
        tokenHash,
        expiresAt,
        attempts: 0,
        maxAttempts: 5,
        isUsed: false,
      },
    });

    // Record security audit log (WITHOUT logging the OTP or secret)
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorType: 'USER',
        action: 'PASSWORD_RESET_REQUESTED',
        resource: `users/${user.id}/password-reset`,
        details: {
          identifierType: trimmed.includes('@') ? 'EMAIL' : 'PHONE',
          expiresAt: expiresAt.toISOString(),
        },
      },
    });

    logger.info(`Password reset OTP generated for user ${user.id}. Expires at ${expiresAt.toISOString()}.`);

    // In development or test environments only, return devOtp for automated test assertions
    const isDevOrTest = process.env.NODE_ENV !== 'production';

    return {
      success: true,
      message: 'If an account matching those details exists, a password reset code has been sent.',
      ...(isDevOrTest ? { devOtp: otp } : {}),
    };
  }

  /**
   * Reset Password with OTP Verification.
   * - Verifies OTP against stored hash using timing-safe comparison.
   * - Enforces 15-minute expiration window.
   * - Enforces 5 failed attempts lockout.
   * - Prevents OTP reuse.
   * - Invalidate all reset tokens upon successful reset.
   * - Hashes new password with bcrypt (cost 10).
   */
  static async resetPassword(
    identifier: string,
    otp: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    if (!identifier || !otp || !newPassword) {
      return { success: false, message: 'Identifier, reset code, and new password are required.' };
    }

    if (newPassword.length < 8) {
      return { success: false, message: 'New password must be at least 8 characters long.' };
    }

    const trimmed = identifier.trim();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: trimmed.toLowerCase() },
          { phoneNumber: trimmed },
        ],
      },
    });

    if (!user) {
      return { success: false, message: 'Invalid or expired password reset code.' };
    }

    // Retrieve active unused token within expiration window
    const tokenRecord = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!tokenRecord) {
      return { success: false, message: 'Invalid or expired password reset code. Please request a new one.' };
    }

    // Check maximum verification attempts lockout
    if (tokenRecord.attempts >= tokenRecord.maxAttempts) {
      await prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { isUsed: true },
      });
      logger.warn(`Password reset token locked for user ${user.id} after ${tokenRecord.attempts} failed attempts.`);
      return {
        success: false,
        message: 'Reset code locked due to too many failed attempts. Please request a new code.',
      };
    }

    // Compare hash with timing-safe HMAC comparison (with legacy fallback)
    const isValid = PasswordResetService.verifyOtpHash(otp.trim(), tokenRecord.tokenHash);

    if (!isValid) {
      const updatedAttempts = tokenRecord.attempts + 1;
      await prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { attempts: updatedAttempts },
      });

      const remaining = Math.max(0, tokenRecord.maxAttempts - updatedAttempts);
      return {
        success: false,
        message: `Invalid reset code. ${remaining} attempt(s) remaining.`,
      };
    }

    // OTP is valid! Commit password reset atomically
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      // 1. Invalidate this token and all other tokens for this user (prevent replay)
      prisma.passwordResetToken.updateMany({
        where: { userId: user.id },
        data: { isUsed: true },
      }),
      // 2. Update user's password
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      // 3. Security audit log
      prisma.auditLog.create({
        data: {
          actorId: user.id,
          actorType: 'USER',
          action: 'PASSWORD_RESET_SUCCESSFUL',
          resource: `users/${user.id}`,
          details: {
            method: 'OTP_VERIFICATION',
            resetAt: new Date().toISOString(),
          },
        },
      }),
    ]);

    logger.info(`Password successfully reset for user ${user.id}. All prior reset tokens invalidated.`);

    return {
      success: true,
      message: 'Password has been successfully reset. Please log in with your new password.',
    };
  }
}
