import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/paymentService';
import { submitUtrSchema, rejectPaymentSchema } from '../validators/phase5Validators';
import { AppError } from '../middleware/errorHandler';

export class PaymentController {
  /**
   * Customer: Get payment status & instructions for a loan.
   */
  async getPaymentRequirement(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Unauthorized');
      const data = await paymentService.getPaymentForLoan(req.user.id, req.params.loanId as string);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Customer: Submit UTR reference.
   */
  async submitUtr(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Unauthorized');
      const input = submitUtrSchema.parse(req.body);
      const data = await paymentService.submitUtr(req.user.id, req.params.loanId as string, input, req.user, req.ip);
      res.status(201).json({
        success: true,
        message: 'Payment reference submitted successfully. Verification in progress.',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: List payments.
   */
  async listPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, search, page, limit } = req.query;
      const data = await paymentService.listPayments({
        status: status as string,
        search: search as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.status(200).json({ success: true, data: data.payments, pagination: data.pagination });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Verify payment (triggers atomic auto-approval & One Approved Loan check).
   */
  async verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Unauthorized');
      const result = await paymentService.verifyPayment(req.params.id as string, req.user, req.ip);
      res.status(200).json({
        success: true,
        message: 'Payment verified and loan application automatically approved successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Reject payment with reason.
   */
  async rejectPayment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Unauthorized');
      const input = rejectPaymentSchema.parse(req.body);
      const result = await paymentService.rejectPayment(req.params.id as string, input, req.user, req.ip);
      res.status(200).json({
        success: true,
        message: 'Payment marked as rejected. Borrower has been notified.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const paymentController = new PaymentController();
