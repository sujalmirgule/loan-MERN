import { Router } from 'express';
import { authenticate, requireCustomer } from '../middleware/authMiddleware';
import { customerProfileController } from '../controllers/customerProfileController';
import { documentController } from '../controllers/documentController';
import { loanApplicationController } from '../controllers/loanApplicationController';
import { handleUpload } from '../middleware/uploadMiddleware';
import { dashboardController } from '../controllers/dashboardController';
import { paymentController } from '../controllers/paymentController';
import { agreementController } from '../controllers/agreementController';
import { disbursementController } from '../controllers/disbursementController';
import { notificationController } from '../controllers/notificationController';
import { supportController } from '../controllers/supportController';

const router = Router();

// Apply customer authentication & authorization to all customer endpoints
router.use(authenticate, requireCustomer);

// --- Dashboard ---
router.get('/dashboard', dashboardController.getCustomerDashboard);

// --- Profile Endpoints ---
router.get('/profile', customerProfileController.getProfile);
router.patch('/profile', customerProfileController.updateProfile);

// --- Document & KYC Endpoints ---
router.get('/documents', documentController.listDocuments);
router.post('/documents', handleUpload('file'), documentController.uploadDocument);
router.get('/documents/:id', documentController.getDocumentMetadata);
router.get('/documents/:id/file', documentController.streamDocumentFile);
router.post('/documents/:id/reupload', handleUpload('file'), documentController.reuploadDocument);

// --- Loan Application Endpoints ---
router.post('/loan-applications', loanApplicationController.createApplication);
router.get('/loan-applications', loanApplicationController.getCustomerApplications);
router.get('/loan-applications/:id', loanApplicationController.getCustomerApplicationById);
router.post('/loan-applications/:id/submit', loanApplicationController.createApplication);
router.post('/loan-applications/:id/offer/accept', loanApplicationController.acceptOffer);
router.post('/loan-applications/:id/offer/reject', loanApplicationController.rejectOffer);
router.patch('/loan-applications/:id', loanApplicationController.rejectTampering);
router.put('/loan-applications/:id', loanApplicationController.rejectTampering);

// --- Loan Agreement Endpoints ---
router.get('/loans/:id/agreement', agreementController.getCustomerAgreement);
router.post('/loans/:id/agreement/accept', agreementController.acceptAgreement);

// --- Payment & UTR Endpoints ---
router.get('/payments/:loanId', paymentController.getPaymentRequirement);
router.post('/payments/:loanId/submit-utr', paymentController.submitUtr);

// --- Disbursement Endpoint ---
router.get('/loans/:loanId/disbursement', disbursementController.getDisbursementForLoan);

// --- Notifications Endpoints ---
router.get('/notifications', notificationController.getCustomerNotifications);
router.patch('/notifications/:id/read', notificationController.markCustomerNotificationRead);
router.post('/notifications/read-all', notificationController.markAllCustomerNotificationsRead);

// --- Support Ticket Endpoints ---
router.post('/support/tickets', supportController.createTicket);
router.get('/support/tickets', supportController.getCustomerTickets);

export default router;

