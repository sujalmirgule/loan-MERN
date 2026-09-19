import { Request, Response, NextFunction } from 'express';
import { agreementService } from '../services/agreementService';
import { AppError } from '../middleware/errorHandler';

export class AgreementController {
  /**
   * Customer: Get loan agreement.
   */
  async getCustomerAgreement(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Unauthorized');
      const data = await agreementService.getAgreementForLoan(req.user.id, req.params.id as string, false);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Customer: Accept loan agreement.
   */
  async acceptAgreement(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Unauthorized');
      const data = await agreementService.acceptAgreement(
        req.user.id,
        req.params.id as string,
        req.user,
        req.ip,
        req.headers['user-agent']
      );
      res.status(200).json({
        success: true,
        message: 'Loan agreement signed and accepted successfully.',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Get loan agreement.
   */
  async getAdminAgreement(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Unauthorized');
      const data = await agreementService.getAgreementForLoan(req.user.id, req.params.id as string, true);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const agreementController = new AgreementController();
