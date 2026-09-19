import { Request, Response, NextFunction } from 'express';
import { prisma } from '../services/db';

export class AuditController {
  /**
   * Admin: List audit logs with multi-field filters and pagination.
   */
  async listAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { actorType, entity, action, search, page, limit } = req.query;
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
      const skip = (pageNum - 1) * limitNum;

      const where: Record<string, unknown> = {};

      if (actorType && actorType !== 'ALL') {
        where.actorType = actorType;
      }

      if (entity && entity !== 'ALL') {
        where.entity = entity;
      }

      if (action && action !== 'ALL') {
        where.action = action;
      }

      if (search && (search as string).trim().length > 0) {
        const term = (search as string).trim();
        where.OR = [
          { actorName: { contains: term } },
          { entityId: { contains: term } },
          { action: { contains: term } },
          { entity: { contains: term } },
        ];
      }

      const [total, logs] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { timestamp: 'desc' },
        }),
      ]);

      const formatted = logs.map((l) => ({
        id: l.id,
        actorType: l.actorType,
        actorId: l.actorId,
        actorName: l.actorName,
        action: l.action,
        entity: l.entity,
        entityId: l.entityId,
        ipAddress: l.ipAddress,
        timestamp: l.timestamp,
        previousValue: l.previousValue ? JSON.parse(l.previousValue) : null,
        newValue: l.newValue ? JSON.parse(l.newValue) : null,
      }));

      res.status(200).json({
        success: true,
        data: formatted,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const auditController = new AuditController();
