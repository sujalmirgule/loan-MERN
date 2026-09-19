import { Request, Response, NextFunction } from 'express';
import { disbursementService } from '../services/disbursementService';
import { recordDisbursementSchema } from '../validators/phase5Validators';
import { AppError } from '../middleware/errorHandler';

export class DisbursementController {
  /**
   * Admin: List all disbursements.
   */
  async listDisbursements(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, page, limit } = req.query;
      const data = await disbursementService.listDisbursements({
        search: search as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.status(200).json({ success: true, data: data.disbursements, pagination: data.pagination });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Record disbursement.
   */
  async recordDisbursement(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Unauthorized');
      const input = recordDisbursementSchema.parse(req.body);
      const data = await disbursementService.recordDisbursement(input, req.user, req.ip);
      res.status(201).json({
        success: true,
        message: 'Disbursement recorded and customer notified successfully.',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Customer: View disbursement details for a loan.
   */
  async getDisbursementForLoan(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Unauthorized');
      const data = await disbursementService.getDisbursementForLoan(req.user.id, req.params.loanId as string, false);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const disbursementController = new DisbursementController();
