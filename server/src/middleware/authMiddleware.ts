import { Request, Response, NextFunction } from 'express';
import { verifyAuthToken, UserRole } from '../services/tokenService';
import { prisma } from '../services/db';
import { AppError } from './errorHandler';
import { ROLE_PRESETS } from '../constants/permissions';

export type AdminRoleType = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  adminRole?: AdminRoleType;
  permissions?: string[];
  fullName: string;
  email: string;
  mobile?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Validates the JWT Bearer token and attaches the authenticated user with fresh permissions from DB.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'Authentication token missing or invalid');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AppError(401, 'Authentication token missing');
    }

    const payload = verifyAuthToken(token);

    if (payload.role === 'CUSTOMER') {
      const customer = await prisma.customer.findUnique({
        where: { id: payload.sub },
        select: { id: true, fullName: true, email: true, mobile: true, status: true, isDeleted: true },
      });

      if (!customer || customer.isDeleted) {
        throw new AppError(401, 'Customer account does not exist or has been deleted');
      }

      if (customer.status !== 'ACTIVE') {
        throw new AppError(403, 'Customer account is suspended. Please contact customer support.');
      }

      req.user = {
        id: customer.id,
        role: 'CUSTOMER',
        fullName: customer.fullName,
        email: customer.email,
        mobile: customer.mobile,
      };
    } else if (payload.role === 'ADMIN') {
      const admin = await prisma.adminUser.findUnique({
        where: { id: payload.sub },
        select: { id: true, fullName: true, email: true, role: true, permissions: true, isActive: true },
      });

      if (!admin || !admin.isActive) {
        throw new AppError(401, 'Administrator account does not exist or has been deactivated');
      }

      // Parse granular permissions
      let userPermissions: string[] = [];
      try {
        if (admin.permissions) {
          const parsed = JSON.parse(admin.permissions);
          if (Array.isArray(parsed) && parsed.length > 0) {
            userPermissions = parsed;
          }
        }
      } catch {
        userPermissions = [];
      }

      // Fall back to default role preset if empty
      const adminRole = (admin.role as AdminRoleType) || 'STAFF';
      if (userPermissions.length === 0 && ROLE_PRESETS[adminRole]) {
        userPermissions = [...ROLE_PRESETS[adminRole]];
      }

      req.user = {
        id: admin.id,
        role: 'ADMIN',
        adminRole,
        permissions: userPermissions,
        fullName: admin.fullName,
        email: admin.email,
      };
    } else {
      throw new AppError(403, 'Invalid user role');
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Role authorization guard restricting endpoint access to specific roles.
 */
export function requireRole(allowedRole: UserRole) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required'));
    }

    if (req.user.role !== allowedRole) {
      return next(new AppError(403, `Access forbidden: Requires ${allowedRole} privileges`));
    }

    next();
  };
}

export const requireCustomer = requireRole('CUSTOMER');
export const requireAdmin = requireRole('ADMIN');

/**
 * Granular Permission authorization guard restricting endpoint access to specific permissions.
 * SUPER_ADMIN has automatic bypass.
 */
export function requirePermission(permission: string | string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required'));
    }

    if (req.user.role !== 'ADMIN') {
      return next(new AppError(403, 'Access forbidden: Requires Administrator privileges'));
    }

    // SUPER_ADMIN has full system access
    if (req.user.adminRole === 'SUPER_ADMIN') {
      return next();
    }

    const userPermissions = req.user.permissions || [];
    const requiredList = Array.isArray(permission) ? permission : [permission];

    // Check if user has at least one of the required permissions
    const hasAccess = requiredList.some((perm) => userPermissions.includes(perm));

    if (!hasAccess) {
      const requiredStr = requiredList.join(', ');
      return next(new AppError(403, `Access forbidden: Missing required permission [${requiredStr}]`));
    }

    next();
  };
}
