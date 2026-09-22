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
   * Customer: Initiate a Single UPI Payment Request (POST /api/customer/payments/upi)
   * Amount is strictly derived from the database (tamper-proof).
   */
  async createUpiPayment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Unauthorized');
      const { chargeId, loanId } = req.body;
      const data = await paymentService.createUpiPayment(
        req.user.id,
        { chargeId, loanId },
        req.user,
        req.ip
      );
      res.status(201).json({
        success: true,
        message: 'UPI payment initiated successfully.',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Customer: Submit UTR reference by Payment ID (POST /api/customer/payments/:paymentId/utr)
   */
  async submitPaymentIdUtr(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Unauthorized');
      const paymentId = req.params.paymentId as string;
      const { utr, notes } = req.body;
      if (!utr || typeof utr !== 'string') {
        throw new AppError(400, 'UTR number is required.');
      }
      const data = await paymentService.submitPaymentUtr(
        req.user.id,
        paymentId,
        { utr, notes },
        req.user,
        req.ip
      );
      res.status(200).json({
        success: true,
        message: 'Payment reference submitted successfully. Verification in progress.',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Customer: Submit UTR reference by Loan ID (POST /api/customer/payments/:loanId/submit-utr)
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
   * Admin: List pending payments requiring manual UTR verification (GET /api/admin/payments/pending)
   */
  async listPendingPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, page, limit, state, fromDate, toDate } = req.query;
      const data = await paymentService.listPendingPayments({
        search: search as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        state: state as string,
        fromDate: fromDate as string,
        toDate: toDate as string,
      });
      res.status(200).json({ success: true, data: data.payments, pagination: data.pagination });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: List all payments with filtering (GET /api/admin/payments)
   */
  async listPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, search, page, limit, state, fromDate, toDate } = req.query;
      const data = await paymentService.listPayments({
        status: status as string,
        search: search as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        state: state as string,
        fromDate: fromDate as string,
        toDate: toDate as string,
      });
      res.status(200).json({ success: true, data: data.payments, pagination: data.pagination });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Verify payment (PATCH/POST /api/admin/payments/:id/verify)
   */
  async verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Unauthorized');
      const result = await paymentService.verifyPayment(req.params.id as string, req.user, req.ip);
      res.status(200).json({
        success: true,
        message: 'Payment verified and marked as PAID successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Reject payment with reason (PATCH/POST /api/admin/payments/:id/reject)
   */
  async rejectPayment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Unauthorized');
      const input = rejectPaymentSchema.parse(req.body);
      const result = await paymentService.rejectPayment(req.params.id as string, input, req.user, req.ip);
      res.status(200).json({
        success: true,
        message: 'Payment marked as rejected. Customer has been notified.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const paymentController = new PaymentController();
