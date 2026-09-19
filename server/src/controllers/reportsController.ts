import { Request, Response, NextFunction } from 'express';
import { reportsService } from '../services/reportsService';

export class ReportsController {
  /**
   * Admin: Get report summary metrics.
   */
  async getReportSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportsService.getReportSummary();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Export report as CSV.
   */
  async exportCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const type = (req.query.type as 'customers' | 'loans' | 'payments' | 'disbursements') || 'customers';
      const { filename, csv } = await reportsService.exportCsv(type);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (err) {
      next(err);
    }
  }
}

export const reportsController = new ReportsController();
