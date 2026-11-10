import { prisma } from '../config/db';
import { logger } from '../config/logger';

export interface KillSwitchStatus {
  active: boolean;
  activatedAt: Date | null;
  activatedBy: string | null;
  reason: string | null;
}

export class KillSwitchService {
  private static active: boolean = process.env.KILL_SWITCH_ACTIVE === 'true';
  private static activatedAt: Date | null = process.env.KILL_SWITCH_ACTIVE === 'true' ? new Date() : null;
  private static activatedBy: string | null = process.env.KILL_SWITCH_ACTIVE === 'true' ? 'SYSTEM_ENV' : null;
  private static reason: string | null = process.env.KILL_SWITCH_ACTIVE === 'true' ? 'Configured via environment variable' : null;

  /**
   * Evaluates whether the Emergency Kill Switch is currently active.
   */
  public static isActive(): boolean {
    if (process.env.KILL_SWITCH_ACTIVE === 'true') {
      return true;
    }
    return this.active;
  }

  /**
   * Retrieves current status and audit details.
   */
  public static getStatus(): KillSwitchStatus {
    return {
      active: this.isActive(),
      activatedAt: this.activatedAt,
      activatedBy: this.activatedBy,
      reason: this.reason,
    };
  }

  /**
   * Activate Emergency Transaction Suspension.
   * Requires SUPER_ADMIN authority.
   */
  public static async activate(actorId: string, reason: string): Promise<KillSwitchStatus> {
    if (!reason || typeof reason !== 'string') {
      throw new Error('A documented operational reason is required to activate the Emergency Kill Switch.');
    }

    this.active = true;
    this.activatedAt = new Date();
    this.activatedBy = actorId;
    this.reason = reason;

    logger.warn(`EMERGENCY ALERT: Transaction Kill Switch ACTIVATED by ${actorId}. Reason: ${reason}`);

    try {
      await prisma.auditLog.create({
        data: {
          actorId,
          actorType: 'ADMIN',
          action: 'EMERGENCY_KILL_SWITCH_ACTIVATED',
          resource: 'system/emergency/kill-switch',
          details: {
            reason,
            role: 'SUPER_ADMIN',
            activatedAt: this.activatedAt.toISOString(),
          },
        },
      });
    } catch (err: any) {
      logger.error('Failed to persist Kill Switch audit log:', err.message);
    }

    return this.getStatus();
  }

  /**
   * Deactivate Emergency Transaction Suspension and resume operations.
   * Requires SUPER_ADMIN authority.
   */
  public static async deactivate(actorId: string, reason: string): Promise<KillSwitchStatus> {
    if (!reason || typeof reason !== 'string') {
      throw new Error('A documented operational reason is required to deactivate the Emergency Kill Switch.');
    }

    this.active = false;
    const previousActivatedAt = this.activatedAt;
    const previousReason = this.reason;

    this.activatedAt = null;
    this.activatedBy = null;
    this.reason = null;

    logger.info(`EMERGENCY STATUS: Transaction Kill Switch DEACTIVATED by ${actorId}. Resuming operations.`);

    try {
      await prisma.auditLog.create({
        data: {
          actorId,
          actorType: 'ADMIN',
          action: 'EMERGENCY_KILL_SWITCH_DEACTIVATED',
          resource: 'system/emergency/kill-switch',
          details: {
            reason,
            role: 'SUPER_ADMIN',
            previousActivatedAt: previousActivatedAt ? previousActivatedAt.toISOString() : null,
            previousReason,
            resumedAt: new Date().toISOString(),
          },
        },
      });
    } catch (err: any) {
      logger.error('Failed to persist Kill Switch deactivation audit log:', err.message);
    }

    return this.getStatus();
  }
}
