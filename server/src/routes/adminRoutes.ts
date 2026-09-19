import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';
import { adminKycController } from '../controllers/adminKycController';
import { loanApplicationController } from '../controllers/loanApplicationController';
import { dashboardController } from '../controllers/dashboardController';
import { adminCustomerController } from '../controllers/adminCustomerController';
import { paymentController } from '../controllers/paymentController';
import { disbursementController } from '../controllers/disbursementController';
import { agreementController } from '../controllers/agreementController';
import { reportsController } from '../controllers/reportsController';
import { auditController } from '../controllers/auditController';
import { settingsController } from '../controllers/settingsController';
import { supportController } from '../controllers/supportController';
import { notificationController } from '../controllers/notificationController';

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

// --- Dashboard Aggregates & KPIs ---
router.get('/dashboard', dashboardController.getAdminDashboard);

// --- Customer Management Endpoints ---
router.get('/customers', adminCustomerController.listCustomers);
router.get('/customers/:id', adminCustomerController.getCustomer360);

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
router.get('/loans/:id/agreement', agreementController.getAdminAgreement);

// --- Payment Management Endpoints ---
router.get('/payments', paymentController.listPayments);
router.post('/payments/:id/verify', paymentController.verifyPayment);
router.post('/payments/:id/reject', paymentController.rejectPayment);

// --- Disbursement Management Endpoints ---
router.get('/disbursements', disbursementController.listDisbursements);
router.post('/disbursements', disbursementController.recordDisbursement);

// --- Reports Endpoints ---
router.get('/reports/summary', reportsController.getReportSummary);
router.get('/reports/export/excel', reportsController.exportCsv);

// --- Audit Log Endpoints ---
router.get('/audit-logs', auditController.listAuditLogs);

// --- Settings Endpoints ---
router.get('/settings/branding', settingsController.getBrandingSettings);
router.patch('/settings/branding', settingsController.updateBrandingSettings);

router.get('/settings/email', settingsController.getEmailSettings);
router.patch('/settings/email', settingsController.updateEmailSettings);
router.post('/settings/email/test', settingsController.sendTestEmail);

router.get('/settings/whatsapp', settingsController.getWhatsAppSettings);
router.patch('/settings/whatsapp', settingsController.updateWhatsAppSettings);
router.post('/settings/whatsapp/test', settingsController.sendTestWhatsApp);

router.get('/settings/payment', settingsController.getPaymentConfig);
router.patch('/settings/payment', settingsController.updatePaymentConfig);

// --- Support Ticket Management ---
router.get('/support/tickets', supportController.listAllTickets);
router.post('/support/tickets/:id/reply', supportController.replyTicket);

// --- Admin Notifications ---
router.get('/notifications', notificationController.getAdminNotifications);
router.patch('/notifications/:id/read', notificationController.markAdminNotificationRead);

export default router;

