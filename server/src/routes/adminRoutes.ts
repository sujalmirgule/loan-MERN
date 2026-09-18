import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';
import { adminKycController } from '../controllers/adminKycController';
import { loanApplicationController } from '../controllers/loanApplicationController';

const router = Router();

// Apply admin authentication & authorization to all admin endpoints
router.use(authenticate, requireAdmin);

// Status check
router.get('/status', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Admin console authenticated',
    admin: req.user,
  });
});

// --- KYC Management Endpoints ---
router.get('/kyc', adminKycController.listKycCustomers);
router.get('/kyc/:customerId', adminKycController.getCustomerKycDetails);
router.post('/kyc/documents/:documentId/review', adminKycController.reviewDocument);
router.get('/kyc/documents/:documentId/file', adminKycController.streamDocumentFile);
router.post('/kyc/:customerId/request-document', adminKycController.requestAdditionalDocument);
router.post('/kyc/:customerId/decision', adminKycController.overrideKycDecision);

// --- Loan Application Management Endpoints ---
router.get('/loan-applications', loanApplicationController.getAdminApplications);
router.get('/loan-applications/:id', loanApplicationController.getAdminApplicationById);
router.post('/loan-applications/:id/review', loanApplicationController.startReview);
router.post('/loan-applications/:id/request-documents', loanApplicationController.requestDocuments);
router.post('/loan-applications/:id/hold', loanApplicationController.putOnHold);
router.post('/loan-applications/:id/reject', loanApplicationController.rejectApplication);
router.post('/loan-applications/:id/approve', loanApplicationController.approveApplication);
router.post('/loan-applications/:id/modify-amount', loanApplicationController.modifyAmount);

export default router;
