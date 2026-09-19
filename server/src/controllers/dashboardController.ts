import { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboardService';
import { AppError } from '../middleware/errorHandler';

export class DashboardController {
  /**
   * Admin: Get comprehensive dashboard aggregates, funnel, and tracking table.
   */
  async getAdminDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getAdminDashboardData();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Customer: Get customer dashboard data.
   */
  async getCustomerDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Unauthorized');
      const data = await dashboardService.getCustomerDashboardData(req.user.id);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const dashboardController = new DashboardController();
