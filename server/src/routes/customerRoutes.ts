import { Router } from 'express';
import { authenticate, requireCustomer } from '../middleware/authMiddleware';
import { customerProfileController } from '../controllers/customerProfileController';
import { documentController } from '../controllers/documentController';
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

export default router;
