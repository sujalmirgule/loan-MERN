import { Router } from 'express';
import { authenticate, requireCustomer } from '../middleware/authMiddleware';
import { customerProfileController } from '../controllers/customerProfileController';
import { documentController } from '../controllers/documentController';
import { loanApplicationController } from '../controllers/loanApplicationController';
import { handleUpload } from '../middleware/uploadMiddleware';

const router = Router();

// Apply customer authentication & authorization to all customer endpoints
router.use(authenticate, requireCustomer);

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

export default router;
