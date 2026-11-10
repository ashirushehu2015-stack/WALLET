import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { logger } from '../config/logger';

export interface ThrottleStatus {
  isRestricted: boolean;
  lockoutRemainingMs?: number;
  failedAttempts: number;
}

interface AttemptRecord {
  failedAttempts: number;
  lastAttemptAt: Date;
  lockoutUntil: Date | null;
}

export class LoginThrottlingService {
  private static MAX_FAILED_ATTEMPTS = 5;
  private static LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15-minute temporary restriction
  private static attemptsStore = new Map<string, AttemptRecord>();

  private static normalizeIdentifier(identifier: string): string {
    return identifier.trim().toLowerCase();
  }

  /**
   * Check if account identifier is currently throttled / locked out.
   */
  static isAccountThrottled(identifier: string): ThrottleStatus {
    const key = this.normalizeIdentifier(identifier);
    const record = this.attemptsStore.get(key);

    if (!record) {
      return { isRestricted: false, failedAttempts: 0 };
    }

    const now = Date.now();
    if (record.lockoutUntil) {
      const remainingMs = record.lockoutUntil.getTime() - now;
      if (remainingMs > 0) {
        return {
          isRestricted: true,
          lockoutRemainingMs: remainingMs,
          failedAttempts: record.failedAttempts,
        };
      } else {
        // Lockout expired: reset record
        this.attemptsStore.delete(key);
        return { isRestricted: false, failedAttempts: 0 };
      }
    }

    return { isRestricted: false, failedAttempts: record.failedAttempts };
  }

  /**
   * Record a failed login attempt.
   * Increments failed attempt counter; triggers 15-minute restriction on 5th consecutive failure.
   */
  static async recordFailedAttempt(identifier: string, ipAddress?: string): Promise<{ lockedNow: boolean; remainingAttempts: number }> {
    const key = this.normalizeIdentifier(identifier);
    const existing = this.attemptsStore.get(key) || {
      failedAttempts: 0,
      lastAttemptAt: new Date(),
      lockoutUntil: null,
    };

    existing.failedAttempts += 1;
    existing.lastAttemptAt = new Date();

    let lockedNow = false;
    if (existing.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
      existing.lockoutUntil = new Date(Date.now() + this.LOCKOUT_DURATION_MS);
      lockedNow = true;

      logger.warn(
        `SECURITY ALERT: Account ${key} temporarily restricted for 15 minutes following ${existing.failedAttempts} consecutive failed login attempts [IP: ${ipAddress || 'unknown'}].`
      );

      try {
        await prisma.auditLog.create({
          data: {
            actorType: 'SYSTEM',
            action: 'ACCOUNT_LOGIN_TEMPORARILY_RESTRICTED',
            resource: `auth/login/${key}`,
            ipAddress: ipAddress || null,
            details: {
              accountIdentifier: key,
              failedAttempts: existing.failedAttempts,
              lockoutMinutes: 15,
              lockoutExpiresAt: existing.lockoutUntil.toISOString(),
            },
          },
        });
      } catch (err: any) {
        logger.error('Failed to write audit log for login throttle:', err.message);
      }
    }

    this.attemptsStore.set(key, existing);
    const remainingAttempts = Math.max(0, this.MAX_FAILED_ATTEMPTS - existing.failedAttempts);

    return { lockedNow, remainingAttempts };
  }

  /**
   * Reset throttle on successful authentication.
   */
  static recordSuccessfulLogin(identifier: string): void {
    const key = this.normalizeIdentifier(identifier);
    this.attemptsStore.delete(key);
  }

  /**
   * Timing-safe dummy password verification to equalize latency and defeat account enumeration.
   */
  static async dummyPasswordCheck(password: string): Promise<void> {
    // Constant hash cost comparison
    const dummyHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
    await bcrypt.compare(password, dummyHash);
  }
}
