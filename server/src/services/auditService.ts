import { prisma } from './db';
import { logger } from '../utils/logger';

export interface CreateAuditLogParams {
  actorType: 'ADMIN' | 'CUSTOMER' | 'SYSTEM';
  actorId?: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string;
}

export const auditService = {
  /**
   * Appends an immutable audit log entry into the database.
   */
  async record(params: CreateAuditLogParams): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          actorType: params.actorType,
          actorId: params.actorId || null,
          actorName: params.actorName,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          previousValue: params.previousValue ? JSON.stringify(params.previousValue) : null,
          newValue: params.newValue ? JSON.stringify(params.newValue) : null,
          ipAddress: params.ipAddress || null,
        },
      });
    } catch (err) {
      // Audit failure should be logged but not break customer transactions
      logger.error('Failed to write audit log entry', err, { action: params.action, entity: params.entity });
    }
  },
};
