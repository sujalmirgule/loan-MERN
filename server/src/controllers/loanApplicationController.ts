import { Request, Response, NextFunction } from 'express';
import { loanApplicationService } from '../services/loanApplicationService';
import {
  createLoanApplicationSchema,
  adminFilterSchema,
  holdApplicationSchema,
  rejectApplicationSchema,
  modifyAmountSchema,
  requestDocumentsSchema,
} from '../validators/loanApplicationValidators';
import { AppError } from '../middleware/errorHandler';

function getParamId(req: Request): string {
  const id = req.params.id;
  if (Array.isArray(id)) {
    return id[0];
  }
  return id || '';
}

export const loanApplicationController = {
  // --- Customer Controllers ---

  async checkEligibility(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'CUSTOMER') {
        throw new AppError(401, 'Authentication required as a customer');
      }

      const result = await loanApplicationService.checkEligibility(req.user.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async createApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'CUSTOMER') {
        throw new AppError(401, 'Authentication required as a customer');
      }

      // Prevent mass-assignment: only validate allowed customer fields
      const parsed = createLoanApplicationSchema.parse(req.body);

      const application = await loanApplicationService.createApplication(
        req.user.id,
        parsed,
        req.user,
        req.ip
      );

      res.status(201).json({
        success: true,
        message: 'Loan application submitted successfully',
        data: application,
      });
    } catch (error) {
      next(error);
    }
  },

  async getCustomerApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'CUSTOMER') {
        throw new AppError(401, 'Authentication required as a customer');
      }

      const applications = await loanApplicationService.getCustomerApplications(req.user.id);

      res.status(200).json({
        success: true,
        data: applications,
      });
    } catch (error) {
      next(error);
    }
  },

  async getCustomerApplicationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'CUSTOMER') {
        throw new AppError(401, 'Authentication required as a customer');
      }

      const id = getParamId(req);
      const application = await loanApplicationService.getCustomerApplicationById(
        req.user.id,
        id
      );

      res.status(200).json({
        success: true,
        data: application,
      });
    } catch (error) {
      next(error);
    }
  },

  async acceptOffer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'CUSTOMER') {
        throw new AppError(401, 'Authentication required as a customer');
      }

      const id = getParamId(req);
      const updated = await loanApplicationService.acceptOffer(
        req.user.id,
        id,
        req.user,
        req.ip
      );

      res.status(200).json({
        success: true,
        message: 'Offer accepted successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },

  async rejectOffer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'CUSTOMER') {
        throw new AppError(401, 'Authentication required as a customer');
      }

      const id = getParamId(req);
      const updated = await loanApplicationService.rejectOffer(
        req.user.id,
        id,
        req.user,
        req.ip
      );

      res.status(200).json({
        success: true,
        message: 'Offer rejected successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },

  // Security guard against direct status / field tampering
  async rejectTampering(req: Request, _res: Response, next: NextFunction): Promise<void> {
    next(
      new AppError(
        403,
        'Direct modification of loan applications is strictly prohibited. Please use the controlled workflow endpoints.'
      )
    );
  },

  // --- Admin Controllers ---

  async getAdminApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = adminFilterSchema.parse(req.query);
      const result = await loanApplicationService.getAdminApplications(filters);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },

  async getAdminApplicationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      const application = await loanApplicationService.getAdminApplicationById(id);

      res.status(200).json({
        success: true,
        data: application,
      });
    } catch (error) {
      next(error);
    }
  },

  async startReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }

      const id = getParamId(req);
      const updated = await loanApplicationService.startReview(
        id,
        req.user,
        req.ip
      );

      res.status(200).json({
        success: true,
        message: 'Application review started',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },

  async requestDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }

      const id = getParamId(req);
      const parsed = requestDocumentsSchema.parse(req.body);
      const result = await loanApplicationService.requestDocuments(
        id,
        req.user,
        parsed,
        req.ip
      );

      res.status(200).json({
        success: true,
        message: 'Additional documents requested from borrower',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async putOnHold(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }

      const id = getParamId(req);
      const parsed = holdApplicationSchema.parse(req.body);
      const updated = await loanApplicationService.putOnHold(
        id,
        req.user,
        parsed.holdReason,
        req.ip
      );

      res.status(200).json({
        success: true,
        message: 'Application placed on hold',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },

  async rejectApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }

      const id = getParamId(req);
      const parsed = rejectApplicationSchema.parse(req.body);
      const rejectionReason = parsed.rejectionReason || parsed.reason || 'Does not meet underwriting requirements';
      const updated = await loanApplicationService.rejectApplication(
        id,
        req.user,
        rejectionReason,
        req.ip
      );

      res.status(200).json({
        success: true,
        message: 'Application rejected',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },

  async approveApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }

      const id = getParamId(req);
      const updated = await loanApplicationService.approveApplication(
        id,
        req.user,
        req.body,
        req.ip
      );

      res.status(200).json({
        success: true,
        message: 'Loan application approved successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },

  async modifyAmount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }

      const id = getParamId(req);
      const parsed = modifyAmountSchema.parse(req.body);
      const updated = await loanApplicationService.modifyAmount(
        id,
        req.user,
        parsed.proposedAmount,
        req.ip
      );

      res.status(200).json({
        success: true,
        message: 'Loan amount modified and offer submitted to borrower',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },

  async archiveApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      const id = getParamId(req);
      const result = await loanApplicationService.archiveLoanApplication(id, req.user, req.ip);
      res.status(200).json({
        success: true,
        message: 'Loan application archived / cancelled successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async restoreApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      const id = getParamId(req);
      const result = await loanApplicationService.restoreLoanApplication(id, req.user, req.ip);
      res.status(200).json({
        success: true,
        message: 'Loan application restored to submitted state',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      const id = getParamId(req);
      await loanApplicationService.deleteLoanApplication(id, req.user, req.ip);
      res.status(200).json({
        success: true,
        message: 'Loan application deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  async bulkArchiveApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      const { loanIds } = req.body;
      const result = await loanApplicationService.bulkArchiveApplications(loanIds, req.user, req.ip);
      res.status(200).json({
        success: true,
        message: `Successfully archived ${result.archivedCount} loan applications`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async bulkRestoreApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      const { loanIds } = req.body;
      const result = await loanApplicationService.bulkRestoreApplications(loanIds, req.user, req.ip);
      res.status(200).json({
        success: true,
        message: `Successfully restored ${result.restoredCount} loan applications`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async bulkDeleteApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      const { loanIds } = req.body;
      const result = await loanApplicationService.bulkDeleteApplications(loanIds, req.user, req.ip);
      res.status(200).json({
        success: true,
        message: `Bulk delete completed: ${result.deletedCount} deleted, ${result.archivedCount} archived due to active financial history`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};

