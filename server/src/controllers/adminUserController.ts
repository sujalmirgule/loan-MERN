import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../services/db';
import { AppError } from '../middleware/errorHandler';
import { auditService } from '../services/auditService';
import { ROLE_PRESETS, ALL_PERMISSION_KEYS } from '../constants/permissions';

export class AdminUserController {
  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await prisma.adminUser.findMany({
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          permissions: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Parse JSON permissions for frontend convenience
      const formatted = users.map((u) => {
        let perms: string[] = [];
        try {
          if (u.permissions) {
            perms = JSON.parse(u.permissions);
          }
        } catch {
          perms = [];
        }
        if (perms.length === 0 && ROLE_PRESETS[u.role as keyof typeof ROLE_PRESETS]) {
          perms = [...ROLE_PRESETS[u.role as keyof typeof ROLE_PRESETS]];
        }
        return {
          ...u,
          permissions: perms,
        };
      });

      res.json({ success: true, data: formatted });
    } catch (err) {
      next(err);
    }
  }

  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = req.user!;
      const { email, password, fullName, role = 'STAFF', permissions } = req.body;

      if (!email || !password || !fullName) {
        return res.status(400).json({ success: false, message: 'Email, password, and full name are required' });
      }

      // Security Check: Only SUPER_ADMIN can create another SUPER_ADMIN
      if (role === 'SUPER_ADMIN' && actor.adminRole !== 'SUPER_ADMIN') {
        throw new AppError(403, 'Privilege Escalation Blocked: Only a SUPER_ADMIN can create a SUPER_ADMIN account.');
      }

      const existing = await prisma.adminUser.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Admin user already exists with this email address.' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Determine permissions
      let assignedPermissions: string[] = [];
      if (Array.isArray(permissions)) {
        // Filter against known catalog
        assignedPermissions = permissions.filter((p: string) => ALL_PERMISSION_KEYS.includes(p));
      } else if (ROLE_PRESETS[role as keyof typeof ROLE_PRESETS]) {
        assignedPermissions = [...ROLE_PRESETS[role as keyof typeof ROLE_PRESETS]];
      }

      const user = await prisma.adminUser.create({
        data: {
          email,
          passwordHash,
          fullName,
          role,
          permissions: JSON.stringify(assignedPermissions),
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          permissions: true,
          isActive: true,
          createdAt: true,
        },
      });

      // Audit Log
      await auditService.record({
        actorType: 'ADMIN',
        actorId: actor.id,
        actorName: actor.fullName,
        action: 'ADMIN_CREATED',
        entity: 'AdminUser',
        entityId: user.id,
        newValue: {
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          permissionsCount: assignedPermissions.length,
        },
        ipAddress: req.ip || req.socket.remoteAddress,
      });

      res.status(201).json({
        success: true,
        message: 'Admin user created successfully',
        data: {
          ...user,
          permissions: assignedPermissions,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = req.user!;
      const id = req.params.id as string;
      const { fullName, role, permissions, isActive, password } = req.body;

      const targetUser = await prisma.adminUser.findUnique({ where: { id } });
      if (!targetUser) {
        return res.status(404).json({ success: false, message: 'Admin user not found' });
      }

      // Security Safeguard 1: Non-SUPER_ADMIN cannot edit a SUPER_ADMIN user
      if (targetUser.role === 'SUPER_ADMIN' && actor.adminRole !== 'SUPER_ADMIN') {
        throw new AppError(403, 'Permission Denied: Only a SUPER_ADMIN can modify a SUPER_ADMIN account.');
      }

      // Security Safeguard 2: Non-SUPER_ADMIN cannot promote any user to SUPER_ADMIN
      if (role === 'SUPER_ADMIN' && actor.adminRole !== 'SUPER_ADMIN') {
        throw new AppError(403, 'Privilege Escalation Blocked: Only a SUPER_ADMIN can promote a user to SUPER_ADMIN.');
      }

      // Security Safeguard 3: Cannot disable or demote the last remaining active SUPER_ADMIN
      if (targetUser.role === 'SUPER_ADMIN') {
        const isDemoting = role && role !== 'SUPER_ADMIN';
        const isDisabling = isActive === false;

        if (isDemoting || isDisabling) {
          const activeSuperAdminCount = await prisma.adminUser.count({
            where: { role: 'SUPER_ADMIN', isActive: true },
          });

          if (activeSuperAdminCount <= 1) {
            throw new AppError(
              400,
              'Action Blocked: Cannot disable or demote the sole remaining active SUPER_ADMIN in the system.'
            );
          }
        }
      }

      const updateData: Record<string, unknown> = {};
      if (fullName) updateData.fullName = fullName;
      if (role) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (password) {
        const salt = await bcrypt.genSalt(10);
        updateData.passwordHash = await bcrypt.hash(password, salt);
      }

      if (Array.isArray(permissions)) {
        const validPerms = permissions.filter((p: string) => ALL_PERMISSION_KEYS.includes(p));
        updateData.permissions = JSON.stringify(validPerms);
      } else if (role && role !== targetUser.role) {
        // If role changed and permissions not explicitly passed, apply default preset
        if (ROLE_PRESETS[role as keyof typeof ROLE_PRESETS]) {
          updateData.permissions = JSON.stringify(ROLE_PRESETS[role as keyof typeof ROLE_PRESETS]);
        }
      }

      const updated = await prisma.adminUser.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          permissions: true,
          isActive: true,
          updatedAt: true,
        },
      });

      // Audit Log for changes
      const actionsRecorded: string[] = ['ADMIN_UPDATED'];
      if (role && role !== targetUser.role) actionsRecorded.push('ROLE_CHANGED');
      if (updateData.permissions) actionsRecorded.push('PERMISSIONS_CHANGED');
      if (isActive !== undefined && isActive !== targetUser.isActive) {
        actionsRecorded.push(isActive ? 'ADMIN_ENABLED' : 'ADMIN_DISABLED');
      }

      for (const act of actionsRecorded) {
        await auditService.record({
          actorType: 'ADMIN',
          actorId: actor.id,
          actorName: actor.fullName,
          action: act,
          entity: 'AdminUser',
          entityId: updated.id,
          previousValue: {
            role: targetUser.role,
            isActive: targetUser.isActive,
          },
          newValue: {
            role: updated.role,
            isActive: updated.isActive,
            permissionsCount: updateData.permissions && updated.permissions ? JSON.parse(updated.permissions).length : undefined,
          },
          ipAddress: req.ip || req.socket.remoteAddress,
        });
      }

      let parsedPerms: string[] = [];
      try {
        parsedPerms = JSON.parse(updated.permissions || '[]');
      } catch {
        parsedPerms = [];
      }

      res.json({
        success: true,
        message: 'Admin user updated successfully',
        data: {
          ...updated,
          permissions: parsedPerms,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = req.user!;
      const id = req.params.id as string;

      if (id === actor.id) {
        throw new AppError(400, 'Security Violation: You cannot delete your own admin account.');
      }

      const targetUser = await prisma.adminUser.findUnique({ where: { id } });
      if (!targetUser) {
        throw new AppError(404, 'Admin user not found');
      }

      if (targetUser.role === 'SUPER_ADMIN' && actor.adminRole !== 'SUPER_ADMIN') {
        throw new AppError(403, 'Permission Denied: Only a SUPER_ADMIN can delete another SUPER_ADMIN account.');
      }

      if (targetUser.role === 'SUPER_ADMIN') {
        const superAdminCount = await prisma.adminUser.count({
          where: { role: 'SUPER_ADMIN' },
        });
        if (superAdminCount <= 1) {
          throw new AppError(400, 'Action Blocked: Cannot delete the sole remaining SUPER_ADMIN account in the system.');
        }
      }

      await prisma.adminUser.delete({ where: { id } });

      await auditService.record({
        actorType: 'ADMIN',
        actorId: actor.id,
        actorName: actor.fullName,
        action: 'ADMIN_DELETED',
        entity: 'AdminUser',
        entityId: id,
        previousValue: { email: targetUser.email, role: targetUser.role },
        ipAddress: req.ip || req.socket.remoteAddress,
      });

      res.json({ success: true, message: `Admin user ${targetUser.email} deleted successfully.` });
    } catch (err) {
      next(err);
    }
  }

  async bulkDeactivateUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = req.user!;
      const { userIds } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new AppError(400, 'userIds must be a non-empty array');
      }

      // Filter out self and sole remaining super admin
      const validIds = userIds.filter((id: string) => id !== actor.id);
      if (validIds.length === 0) {
        throw new AppError(400, 'Cannot deactivate your own account in bulk operation');
      }

      const result = await prisma.adminUser.updateMany({
        where: {
          id: { in: validIds },
          role: { not: 'SUPER_ADMIN' }, // Safeguard SUPER_ADMINs from bulk deactivation
        },
        data: { isActive: false },
      });

      await auditService.record({
        actorType: 'ADMIN',
        actorId: actor.id,
        actorName: actor.fullName,
        action: 'ADMIN_BULK_DEACTIVATED',
        entity: 'AdminUser',
        entityId: 'BULK',
        newValue: { count: result.count, requestedCount: userIds.length },
        ipAddress: req.ip || req.socket.remoteAddress,
      });

      res.json({
        success: true,
        message: `Successfully deactivated ${result.count} admin user(s).`,
        count: result.count,
      });
    } catch (err) {
      next(err);
    }
  }

  async bulkDeleteUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = req.user!;
      const { userIds } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new AppError(400, 'userIds must be a non-empty array');
      }

      // Safeguard self and SUPER_ADMIN accounts
      const safeIds = userIds.filter((id: string) => id !== actor.id);

      const targetUsers = await prisma.adminUser.findMany({
        where: {
          id: { in: safeIds },
          role: { not: 'SUPER_ADMIN' }, // Prevent bulk deletion of super admins
        },
        select: { id: true },
      });

      const idsToDelete = targetUsers.map((u) => u.id);

      if (idsToDelete.length === 0) {
        throw new AppError(400, 'No valid or non-SuperAdmin users selected for deletion.');
      }

      const result = await prisma.adminUser.deleteMany({
        where: { id: { in: idsToDelete } },
      });

      await auditService.record({
        actorType: 'ADMIN',
        actorId: actor.id,
        actorName: actor.fullName,
        action: 'ADMIN_BULK_DELETED',
        entity: 'AdminUser',
        entityId: 'BULK',
        newValue: { deletedCount: result.count, requestedCount: userIds.length },
        ipAddress: req.ip || req.socket.remoteAddress,
      });

      res.json({
        success: true,
        message: `Successfully deleted ${result.count} admin user(s).`,
        count: result.count,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const adminUserController = new AdminUserController();

