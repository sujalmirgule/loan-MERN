import { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboardService';
import { AppError } from '../middleware/errorHandler';

export class DashboardController {
  /**
   * Admin: Get comprehensive dashboard aggregates, funnel, charts and tracking table.
   * Supports optional query params: dateFrom, dateTo, state, loanType, status
   */
  async getAdminDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const { dateFrom, dateTo, state, loanType, status } = req.query as Record<string, string | undefined>;
      const data = await dashboardService.getAdminDashboardData({
        dateFrom,
        dateTo,
        state,
        loanType,
        status,
      });
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
