import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import {
  customerRegisterSchema,
  customerLoginSchema,
  adminLoginSchema,
} from '../validators/authValidators';
import { auditService } from '../services/auditService';
import { resolveDomainId } from '../utils/domainResolver';

export const authController = {
  /**
   * Customer Registration handler
   */
  async registerCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = customerRegisterSchema.parse(req.body);
      const ipAddress = req.ip || req.socket.remoteAddress;

      // Resolve domain from the server side — never trust a client-supplied domainId
      const domainId = await resolveDomainId(req);

      const result = await authService.registerCustomer(validatedData, ipAddress, domainId);

      res.status(201).json({
        success: true,
        message: 'Customer registration completed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Customer Mobile-Only Login handler
   */
  async loginCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { mobile } = customerLoginSchema.parse(req.body);
      const ipAddress = req.ip || req.socket.remoteAddress;

      const result = await authService.loginCustomer(mobile, ipAddress);

      res.status(200).json({
        success: true,
        message: 'Customer signed in successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Administrator Email + Password Login handler
   */
  async loginAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = adminLoginSchema.parse(req.body);
      const ipAddress = req.ip || req.socket.remoteAddress;

      const result = await authService.loginAdmin(email, password, ipAddress);

      res.status(200).json({
        success: true,
        message: 'Admin signed in successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get Current Authenticated User profile
   */
  async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      const user = await authService.getCurrentUser(req.user.id, req.user.role);

      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Logout handler
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user) {
        const ipAddress = req.ip || req.socket.remoteAddress;
        await auditService.record({
          actorType: req.user.role,
          actorId: req.user.id,
          actorName: req.user.fullName,
          action: 'LOGOUT',
          entity: req.user.role === 'ADMIN' ? 'AdminUser' : 'Customer',
          entityId: req.user.id,
          ipAddress,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};
