import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin, requirePermission } from '../middleware/authMiddleware';
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
import { domainController } from '../controllers/domainController';
import { chargesController } from '../controllers/chargesController';
import { paymentConfigAdvancedController } from '../controllers/paymentConfigAdvancedController';
import { adminUserController } from '../controllers/adminUserController';
import { communicationController } from '../controllers/communicationController';
import { specificChargesController } from '../controllers/specificChargesController';
import { adminDocumentController } from '../controllers/adminDocumentController';
import { brandingUploadController } from '../controllers/brandingUploadController';
import { handleBrandingUpload } from '../middleware/uploadMiddleware';

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
router.get('/dashboard', requirePermission(['customers.view', 'applications.view', 'reports.view', 'kyc.view', 'payments.view']), dashboardController.getAdminDashboard);

// --- Customer Management Endpoints ---
router.get('/customers', requirePermission('customers.view'), adminCustomerController.listCustomers);
router.get('/customers/all-matching', requirePermission('customers.view'), adminCustomerController.getMatchingCustomers);
router.get('/customers/states', requirePermission('customers.view'), adminCustomerController.listStates);
router.get('/customers/export', requirePermission(['customers.view', 'reports.export']), adminCustomerController.exportCsv);
router.post('/customers/manual', requirePermission('customers.create'), adminCustomerController.manualCreateCustomer);
router.get('/customers/:id', requirePermission('customers.view'), adminCustomerController.getCustomer360);
router.delete('/customers/:id', requirePermission('customers.delete'), adminCustomerController.deleteCustomer);
router.post('/customers/bulk-delete', requirePermission('customers.delete'), adminCustomerController.bulkDeleteCustomers);
router.post('/customers/bulk-deactivate', requirePermission(['customers.delete', 'customers.edit']), adminCustomerController.bulkDeactivateCustomers);
router.post('/customers/bulk-reactivate', requirePermission(['customers.delete', 'customers.edit']), adminCustomerController.bulkReactivateCustomers);
router.get('/customers/:id/invoice/pdf', requirePermission(['charges.view', 'payments.view']), adminCustomerController.downloadInvoicePdf);
router.get('/customers/:id/approval-letter/pdf', requirePermission(['applications.view', 'applications.approve']), adminCustomerController.downloadApprovalLetterPdf);

// --- Customer 360 Document Management Center ---
router.get('/customers/:customerId/documents', requirePermission('documents.view'), adminDocumentController.listCustomerDocuments);
router.post('/customers/:customerId/documents/download-zip', requirePermission('documents.download'), adminDocumentController.downloadZip);
router.get('/customers/:customerId/documents/download-all', requirePermission('documents.download'), adminDocumentController.downloadZip);
router.get('/documents/:documentId', requirePermission('documents.view'), adminDocumentController.getDocumentMetadata);
router.get('/documents/:documentId/view', requirePermission('documents.view'), adminDocumentController.streamDocumentView);
router.get('/documents/:documentId/download', requirePermission('documents.download'), adminDocumentController.downloadDocument);
router.post('/documents/:documentId/verify', requirePermission('documents.verify'), adminDocumentController.verifyDocument);
router.post('/documents/:documentId/reject', requirePermission('documents.reject'), adminDocumentController.rejectDocument);
router.post('/documents/:documentId/request-correction', requirePermission('documents.reject'), adminDocumentController.requestCorrection);

// --- KYC Management Endpoints ---
router.get('/kyc', requirePermission('kyc.view'), adminKycController.listKycCustomers);
router.get('/kyc/:customerId', requirePermission('kyc.view'), adminKycController.getCustomerKycDetails);
router.post('/kyc/documents/:documentId/review', requirePermission('kyc.verify'), adminKycController.reviewDocument);
router.get('/kyc/documents/:documentId/file', requirePermission('kyc.view'), adminKycController.streamDocumentFile);
router.post('/kyc/:customerId/request-document', requirePermission('kyc.correction'), adminKycController.requestAdditionalDocument);
router.post('/kyc/:customerId/decision', requirePermission(['kyc.verify', 'kyc.reject']), adminKycController.overrideKycDecision);

// --- Loan Application Management Endpoints ---
router.get('/loan-applications', requirePermission('applications.view'), loanApplicationController.getAdminApplications);
router.get('/loan-applications/:id', requirePermission('applications.view'), loanApplicationController.getAdminApplicationById);
router.post('/loan-applications/:id/review', requirePermission('applications.review'), loanApplicationController.startReview);
router.post('/loan-applications/:id/request-documents', requirePermission('applications.review'), loanApplicationController.requestDocuments);
router.post('/loan-applications/:id/hold', requirePermission('applications.review'), loanApplicationController.putOnHold);
router.post('/loan-applications/:id/reject', requirePermission('applications.reject'), loanApplicationController.rejectApplication);
router.post('/loan-applications/:id/approve', requirePermission('applications.approve'), loanApplicationController.approveApplication);
router.post('/loan-applications/:id/modify-amount', requirePermission('applications.review'), loanApplicationController.modifyAmount);
router.post('/loan-applications/:id/archive', requirePermission('applications.reject'), loanApplicationController.archiveApplication);
router.post('/loan-applications/:id/restore', requirePermission('applications.review'), loanApplicationController.restoreApplication);
router.delete('/loan-applications/:id', requirePermission('applications.reject'), loanApplicationController.deleteApplication);
router.post('/loan-applications/bulk-archive', requirePermission('applications.reject'), loanApplicationController.bulkArchiveApplications);
router.post('/loan-applications/bulk-restore', requirePermission('applications.review'), loanApplicationController.bulkRestoreApplications);
router.post('/loan-applications/bulk-delete', requirePermission('applications.reject'), loanApplicationController.bulkDeleteApplications);
router.get('/loans/:id/agreement', requirePermission('applications.view'), agreementController.getAdminAgreement);

// --- Payment Management Endpoints ---
router.get('/payments/pending', requirePermission('payments.view'), paymentController.listPendingPayments);
router.get('/payments', requirePermission('payments.view'), paymentController.listPayments);
router.patch('/payments/:id/verify', requirePermission('payments.verify'), paymentController.verifyPayment);
router.post('/payments/:id/verify', requirePermission('payments.verify'), paymentController.verifyPayment);
router.patch('/payments/:id/reject', requirePermission('payments.reject'), paymentController.rejectPayment);
router.post('/payments/:id/reject', requirePermission('payments.reject'), paymentController.rejectPayment);
router.post('/payments/:id/archive', requirePermission('payments.reject'), paymentController.archivePayment);
router.post('/payments/:id/restore', requirePermission('payments.verify'), paymentController.restorePayment);
router.delete('/payments/:id', requirePermission('payments.reject'), paymentController.deletePayment);
router.post('/payments/bulk-archive', requirePermission('payments.reject'), paymentController.bulkArchivePayments);
router.post('/payments/bulk-restore', requirePermission('payments.verify'), paymentController.bulkRestorePayments);
router.post('/payments/bulk-delete', requirePermission('payments.reject'), paymentController.bulkDeletePayments);

// --- Disbursement Management Endpoints ---
router.get('/disbursements', requirePermission('payments.view'), disbursementController.listDisbursements);
router.post('/disbursements', requirePermission('payments.verify'), disbursementController.recordDisbursement);

// --- Reports Endpoints ---
router.get('/reports/summary', requirePermission('reports.view'), reportsController.getReportSummary);
router.get('/reports/export/excel', requirePermission('reports.export'), reportsController.exportCsv);

// --- Audit Log Endpoints ---
router.get('/audit-logs', requirePermission('activity_logs.view'), auditController.listAuditLogs);

// --- Settings Endpoints ---
router.get('/settings/branding', requirePermission('branding.view'), settingsController.getBrandingSettings);
router.patch('/settings/branding', requirePermission('branding.manage'), settingsController.updateBrandingSettings);
router.put('/settings/branding', requirePermission('branding.manage'), settingsController.updateBrandingSettings);

// Dedicated Document Branding Endpoints
router.get('/settings/document-branding', requirePermission('branding.view'), settingsController.getDocumentBrandingSettings);
router.patch('/settings/document-branding', requirePermission('branding.manage'), settingsController.updateDocumentBrandingSettings);
router.put('/settings/document-branding', requirePermission('branding.manage'), settingsController.updateDocumentBrandingSettings);

// Branding asset file uploads (logo, secondary logo, approval header, watermark, favicon)
router.post('/settings/branding/upload-logo', requirePermission('branding.manage'), handleBrandingUpload('file'), brandingUploadController.uploadLogo);
router.post('/settings/branding/upload-secondary-logo', requirePermission('branding.manage'), handleBrandingUpload('file'), brandingUploadController.uploadSecondaryLogo);
router.post('/settings/branding/upload-approval-header', requirePermission('branding.manage'), handleBrandingUpload('file'), brandingUploadController.uploadApprovalHeader);
router.post('/settings/branding/upload-watermark-logo', requirePermission('branding.manage'), handleBrandingUpload('file'), brandingUploadController.uploadWatermarkLogo);
router.post('/settings/branding/upload-favicon', requirePermission('branding.manage'), handleBrandingUpload('file'), brandingUploadController.uploadFavicon);

// Live document branding preview
router.get('/settings/preview/approval-letter', requirePermission('branding.view'), settingsController.previewApprovalLetter);
router.get('/settings/preview-approval-letter', requirePermission('branding.view'), settingsController.previewApprovalLetter);
router.get('/settings/preview/invoice', requirePermission('branding.view'), settingsController.previewInvoice);
router.get('/settings/preview-invoice', requirePermission('branding.view'), settingsController.previewInvoice);

router.get('/settings/email', requirePermission('settings.view'), settingsController.getEmailSettings);
router.patch('/settings/email', requirePermission('settings.manage'), settingsController.updateEmailSettings);
router.put('/settings/email', requirePermission('settings.manage'), settingsController.updateEmailSettings);
router.post('/settings/email/test', requirePermission('settings.manage'), settingsController.sendTestEmail);
router.post('/settings/email/test-connection', requirePermission('settings.manage'), settingsController.testEmailConnection);

router.get('/settings/whatsapp', requirePermission('settings.view'), settingsController.getWhatsAppSettings);
router.patch('/settings/whatsapp', requirePermission('settings.manage'), settingsController.updateWhatsAppSettings);
router.put('/settings/whatsapp', requirePermission('settings.manage'), settingsController.updateWhatsAppSettings);
router.post('/settings/whatsapp/test', requirePermission('settings.manage'), settingsController.sendTestWhatsApp);
router.post('/settings/whatsapp/test-connection', requirePermission('settings.manage'), settingsController.testWhatsAppConnection);

router.get('/settings/payment', requirePermission('settings.view'), settingsController.getPaymentConfig);
router.patch('/settings/payment', requirePermission('settings.manage'), settingsController.updatePaymentConfig);
router.put('/settings/payment', requirePermission('settings.manage'), settingsController.updatePaymentConfig);

// --- Dynamic Payment Methods Enable/Disable ---
router.get('/settings/payment-methods', requirePermission(['upi.view', 'settings.view']), paymentConfigAdvancedController.getPaymentMethods);
router.put('/settings/payment-methods', requirePermission(['upi.manage', 'settings.manage']), paymentConfigAdvancedController.updatePaymentMethods);
router.patch('/settings/payment-methods', requirePermission(['upi.manage', 'settings.manage']), paymentConfigAdvancedController.updatePaymentMethods);

// --- Advanced UPI & Bank Settings ---
router.post('/settings/upi/upload-qr', requirePermission(['upi.manage', 'settings.manage']), handleBrandingUpload('file'), brandingUploadController.uploadQrCode);
router.post('/settings/branding/upload-qr', requirePermission(['upi.manage', 'settings.manage', 'branding.manage']), handleBrandingUpload('file'), brandingUploadController.uploadQrCode);
router.get('/settings/upi', requirePermission('upi.view'), paymentConfigAdvancedController.getUpiSettings);
router.patch('/settings/upi', requirePermission('upi.manage'), paymentConfigAdvancedController.updateUpiSettings);
router.put('/settings/upi', requirePermission('upi.manage'), paymentConfigAdvancedController.updateUpiSettings);
router.get('/settings/bank', requirePermission('upi.view'), paymentConfigAdvancedController.getBankSettings);
router.patch('/settings/bank', requirePermission('upi.manage'), paymentConfigAdvancedController.updateBankSettings);
router.put('/settings/bank', requirePermission('upi.manage'), paymentConfigAdvancedController.updateBankSettings);


// --- Payment Links Management ---
router.get('/settings/payment-links', requirePermission('upi.view'), paymentConfigAdvancedController.listPaymentLinks);
router.post('/settings/payment-links', requirePermission('upi.manage'), paymentConfigAdvancedController.createPaymentLink);
router.patch('/settings/payment-links/:id', requirePermission('upi.manage'), paymentConfigAdvancedController.updatePaymentLink);
router.delete('/settings/payment-links/:id', requirePermission('upi.manage'), paymentConfigAdvancedController.deletePaymentLink);
router.post('/settings/payment-links/bulk-delete', requirePermission('upi.manage'), paymentConfigAdvancedController.bulkDeletePaymentLinks);

// --- Multi-Tenant Domain Management ---
router.get('/domains', requirePermission('domains.view'), domainController.listDomains);
router.post('/domains', requirePermission('domains.manage'), domainController.createDomain);
router.patch('/domains/:id', requirePermission('domains.manage'), domainController.updateDomain);
router.delete('/domains/:id', requirePermission('domains.manage'), domainController.deleteDomain);
router.post('/domains/bulk-delete', requirePermission('domains.manage'), domainController.bulkDeleteDomains);

// --- Charges & Fees Management ---
router.get('/charges/config', requirePermission('charges.view'), (req, res, next) => chargesController.getConfig(req, res, next));
router.patch('/charges/config', requirePermission('charges.edit'), (req, res, next) => chargesController.updateConfig(req, res, next));
router.get('/charges/records', requirePermission('charges.view'), (req, res, next) => chargesController.listFeeRecords(req, res, next));
router.get('/charges/records/:id/invoice', requirePermission('charges.view'), (req, res, next) => chargesController.getInvoicePdf(req, res, next));
router.get('/charges', requirePermission('charges.view'), chargesController.listCharges);
router.post('/charges', requirePermission('charges.create'), chargesController.createCharge);
router.patch('/charges/:id', requirePermission('charges.edit'), chargesController.updateCharge);
router.delete('/charges/:id', requirePermission('charges.edit'), chargesController.deleteCharge);

// --- Customer-Specific Charges ---
router.get('/charges/specific', requirePermission('charges.view'), (req, res, next) => specificChargesController.listSpecificCharges(req, res, next));
router.get('/charges/specific/application/:applicationId', requirePermission('charges.view'), (req, res, next) => specificChargesController.listApplicationSpecificCharges(req, res, next));
router.get('/charges/specific/customer/:customerId', requirePermission('charges.view'), (req, res, next) => specificChargesController.listCustomerSpecificCharges(req, res, next));
router.post('/charges/specific', requirePermission('charges.create'), (req, res, next) => specificChargesController.createSpecificCharge(req, res, next));
router.post('/charges/specific/send-all', requirePermission('charges.send'), (req, res, next) => specificChargesController.sendAllCharges(req, res, next));
router.post('/charges/specific/:chargeId/send', requirePermission('charges.send'), (req, res, next) => specificChargesController.sendCharge(req, res, next));
router.patch('/charges/specific/:chargeId', requirePermission('charges.edit'), (req, res, next) => specificChargesController.updateSpecificCharge(req, res, next));
router.post('/charges/specific/:chargeId/cancel', requirePermission('charges.edit'), (req, res, next) => specificChargesController.cancelSpecificCharge(req, res, next));
router.post('/charges/specific/:chargeId/remind', requirePermission('charges.send'), (req, res, next) => specificChargesController.sendReminder(req, res, next));
router.get('/charges/specific/:chargeId/invoice', requirePermission('charges.view'), (req, res, next) => specificChargesController.getInvoicePdf(req, res, next));
router.post('/charges/specific/:chargeId/verify-payment', requirePermission('payments.verify'), (req, res, next) => specificChargesController.verifySpecificChargePayment(req, res, next));
router.delete('/charges/specific/:chargeId', requirePermission('charges.edit'), (req, res, next) => specificChargesController.deleteCharge(req, res, next));
router.post('/charges/specific/bulk-cancel', requirePermission('charges.edit'), (req, res, next) => specificChargesController.bulkCancelCharges(req, res, next));
router.post('/charges/specific/bulk-delete', requirePermission('charges.edit'), (req, res, next) => specificChargesController.bulkDeleteCharges(req, res, next));

// --- Admin Users Management ---
router.get('/users', requirePermission('admin_users.view'), adminUserController.listUsers);
router.post('/users', requirePermission('admin_users.create'), adminUserController.createUser);
router.put('/users/:id', requirePermission(['admin_users.edit', 'admin_users.disable']), adminUserController.updateUser);
router.patch('/users/:id', requirePermission(['admin_users.edit', 'admin_users.disable']), adminUserController.updateUser);
router.delete('/users/:id', requirePermission('admin_users.disable'), adminUserController.deleteUser);
router.post('/users/bulk-deactivate', requirePermission('admin_users.disable'), adminUserController.bulkDeactivateUsers);
router.post('/users/bulk-delete', requirePermission('admin_users.disable'), adminUserController.bulkDeleteUsers);

// --- PDF Generation Endpoint ---
router.get('/loans/:id/approval-letter/pdf', requirePermission('applications.view'), agreementController.downloadApprovalLetterPdf);

// --- Support Ticket Management ---
router.get('/support/tickets', requirePermission('communication.history'), supportController.listAllTickets);
router.post('/support/tickets/:id/reply', requirePermission('communication.email'), supportController.replyTicket);
router.delete('/support/tickets/:id', requirePermission('communication.email'), supportController.deleteTicket);
router.post('/support/tickets/bulk-close', requirePermission('communication.email'), supportController.bulkCloseTickets);
router.post('/support/tickets/bulk-delete', requirePermission('communication.email'), supportController.bulkDeleteTickets);

// --- Customer Communication Center (Email & Messages) ---
router.get('/communication/customers', requirePermission(['customers.view', 'communication.email', 'communication.whatsapp']), (req, res, next) => communicationController.listCommunicationCustomers(req, res, next));
router.get('/communication/templates', requirePermission(['communication.email', 'communication.whatsapp']), (req, res) => communicationController.getTemplates(req, res));
router.post('/communication/email', requirePermission('communication.email'), (req, res, next) => communicationController.sendCustomerEmail(req, res, next));
router.post('/communication/email/bulk', requirePermission('communication.email'), (req, res, next) => communicationController.sendCustomerEmail(req, res, next));
router.post('/communication/email/bulk-applications', requirePermission('communication.email'), (req, res, next) => communicationController.sendBulkApplicationEmail(req, res, next));
router.post('/loan-applications/bulk-email', requirePermission(['applications.view', 'communication.email']), (req, res, next) => communicationController.sendBulkApplicationEmail(req, res, next));
router.post('/email/bulk-send', requirePermission('communication.email'), (req, res, next) => communicationController.sendCustomerEmail(req, res, next));
router.post('/communication/email/invoice', requirePermission('communication.email'), (req, res, next) => communicationController.sendInvoiceEmail(req, res, next));
router.post('/communication/email/approval-letter', requirePermission('communication.email'), (req, res, next) => communicationController.sendApprovalLetterEmail(req, res, next));
router.post('/communication/whatsapp', requirePermission('communication.whatsapp'), (req, res, next) => communicationController.sendWhatsAppMessage(req, res, next));
router.post('/communication/whatsapp/bulk', requirePermission('communication.whatsapp'), (req, res, next) => communicationController.sendBulkWhatsApp(req, res, next));
router.post('/communication/whatsapp/bulk-applications', requirePermission('communication.whatsapp'), (req, res, next) => communicationController.sendBulkApplicationWhatsApp(req, res, next));
router.post('/loan-applications/bulk-whatsapp', requirePermission(['applications.view', 'communication.whatsapp']), (req, res, next) => communicationController.sendBulkApplicationWhatsApp(req, res, next));
router.post('/whatsapp/bulk-send', requirePermission('communication.whatsapp'), (req, res, next) => communicationController.sendBulkWhatsApp(req, res, next));
router.get('/communication/history', requirePermission('communication.history'), (req, res, next) => communicationController.getCommunicationHistory(req, res, next));
router.get('/communication/history/customer/:customerId', requirePermission('communication.history'), (req, res, next) => communicationController.getCustomerHistory(req, res, next));


// --- Settings: Communication Automated Event Triggers ---
router.get('/settings/communication', requirePermission('settings.view'), async (req, res, next) => {
  try {
    const { settingsService } = await import('../services/settingsService');
    const data = await settingsService.getCommunicationSettings();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});
router.patch('/settings/communication', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const { settingsService } = await import('../services/settingsService');
    const data = await settingsService.updateCommunicationSettings(req.body, req.user!, req.ip);
    res.json({ success: true, message: 'Communication settings updated successfully', data });
  } catch (err) { next(err); }
});

// --- Admin Notifications ---
router.get('/notifications', requirePermission(['customers.view', 'applications.view', 'payments.view', 'kyc.view']), notificationController.getAdminNotifications);
router.patch('/notifications/read-all', requirePermission(['customers.view', 'applications.view', 'payments.view', 'kyc.view']), notificationController.markAllAdminNotificationsRead);
router.patch('/notifications/:id/read', requirePermission(['customers.view', 'applications.view', 'payments.view', 'kyc.view']), notificationController.markAdminNotificationRead);
router.delete('/notifications/:id', requirePermission(['customers.view', 'applications.view', 'payments.view', 'kyc.view']), notificationController.deleteAdminNotification);
router.post('/notifications/bulk-delete', requirePermission(['customers.view', 'applications.view', 'payments.view', 'kyc.view']), notificationController.bulkDeleteAdminNotifications);

export default router;
