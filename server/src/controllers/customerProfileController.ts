import { Request, Response, NextFunction } from 'express';
import { customerProfileService } from '../services/customerProfileService';
import { updateProfileSchema } from '../validators/customerValidators';
import { AppError } from '../middleware/errorHandler';

export const customerProfileController = {
  /**
   * GET /api/customer/profile
   */
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.role !== 'CUSTOMER') {
        throw new AppError(401, 'Unauthorized');
      }

      const profile = await customerProfileService.getProfile(req.user.id);
      res.status(200).json({
        success: true,
        data: { profile },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/customer/profile
   */
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.role !== 'CUSTOMER') {
        throw new AppError(401, 'Unauthorized');
      }

      const validation = updateProfileSchema.safeParse(req.body);
      if (!validation.success) {
        const errors = validation.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors,
        });
        return;
      }

      const ipAddress = req.ip || req.socket.remoteAddress;
      const updatedProfile = await customerProfileService.updateProfile(
        req.user.id,
        validation.data,
        ipAddress
      );

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { profile: updatedProfile },
      });
    } catch (err) {
      next(err);
    }
  },
};
