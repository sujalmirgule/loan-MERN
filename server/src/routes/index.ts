import { Router } from 'express';
import healthRoutes from './healthRoutes';
import authRoutes from './authRoutes';
import customerRoutes from './customerRoutes';
import adminRoutes from './adminRoutes';
import { authLimiter } from '../middleware/rateLimiter';

import { authenticate } from '../middleware/authMiddleware';
import { loanApplicationController } from '../controllers/loanApplicationController';
import { settingsController } from '../controllers/settingsController';
import { verificationController } from '../controllers/verificationController';
import { domainController } from '../controllers/domainController';
import { agreementController } from '../controllers/agreementController';
import { paymentConfigAdvancedController } from '../controllers/paymentConfigAdvancedController';

const router = Router();

// Health check endpoint
router.use('/health', healthRoutes);

// Public dynamic branding, multi-tenant domain configuration, and document verification
router.get('/public/config', settingsController.getPublicConfig);
router.get('/public/branding', settingsController.getPublicConfig);
router.get('/public/domain-config', domainController.getDomainConfig);
router.get('/public/verify/document/:token', verificationController.verifyDocument);
router.get('/public/payments/options', paymentConfigAdvancedController.getActivePaymentOptions);
router.get('/public/payment-methods', paymentConfigAdvancedController.getPublicPaymentMethods);
router.get('/settings/branding', settingsController.getPublicConfig);
router.get('/approval-letter/:id/pdf', authenticate, agreementController.downloadApprovalLetterPdf);

// Authentication endpoints with strict rate limiting
router.use('/auth', authLimiter, authRoutes);

// Protected Customer endpoints (supporting both singular and plural)
router.use('/customer', customerRoutes);
router.use('/customers', customerRoutes);

// Protected Admin endpoints
router.use('/admin', adminRoutes);

// Direct /loan-applications routes (IDOR-guarded and anti-tamper)
const directLoanRouter = Router();
directLoanRouter.use(authenticate);
directLoanRouter.get('/:id', (req, res, next) => {
  if (req.user?.role === 'ADMIN') {
    return loanApplicationController.getAdminApplicationById(req, res, next);
  }
  return loanApplicationController.getCustomerApplicationById(req, res, next);
});
directLoanRouter.patch('/:id', loanApplicationController.rejectTampering);
directLoanRouter.put('/:id', loanApplicationController.rejectTampering);

router.use('/loan-applications', directLoanRouter);

export default router;
