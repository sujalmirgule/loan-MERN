import fs from 'fs';
import path from 'path';
import { prisma } from '../src/services/db';
import { hashPassword } from '../src/utils/security';

async function performCleanReset() {
  console.log('====================================================');
  console.log('STARTING CLEAN DATABASE RESET & CUSTOMER PURGE');
  console.log('====================================================');

  // 1. Safe backup of SQLite database file
  const prismaDir = path.join(__dirname, '../prisma');
  const dbPath = path.join(prismaDir, 'dev.db');
  const backupPath = path.join(prismaDir, `dev.db.backup_${Date.now()}`);

  if (fs.existsSync(dbPath)) {
    try {
      fs.copyFileSync(dbPath, backupPath);
      console.log(`[BACKUP] Successfully created database backup at: ${backupPath}`);
    } catch (err: any) {
      console.warn(`[BACKUP] Note: Could not copy file directly (file locked): ${err.message}`);
    }
  }

  // 2. Delete all customer business, transactional, and authentication records in FK order
  console.log('[CLEANUP] Deleting customer transactional and authentication records...');
  
  const deletedInvoices = await prisma.invoice.deleteMany({});
  console.log(` - Invoices deleted: ${deletedInvoices.count}`);

  const deletedPayments = await prisma.payment.deleteMany({});
  console.log(` - Payments deleted: ${deletedPayments.count}`);

  const deletedCharges = await prisma.charge.deleteMany({});
  console.log(` - Charges deleted: ${deletedCharges.count}`);

  const deletedDocRequests = await prisma.documentRequest.deleteMany({});
  console.log(` - Document Requests deleted: ${deletedDocRequests.count}`);

  const deletedDocuments = await prisma.loanDocument.deleteMany({});
  console.log(` - Loan Documents deleted: ${deletedDocuments.count}`);

  const deletedAgreements = await prisma.loanAgreement.deleteMany({});
  console.log(` - Loan Agreements deleted: ${deletedAgreements.count}`);

  const deletedDisbursements = await prisma.disbursement.deleteMany({});
  console.log(` - Disbursements deleted: ${deletedDisbursements.count}`);

  const deletedEmiSchedules = await prisma.eMISchedule.deleteMany({});
  console.log(` - EMI Schedules deleted: ${deletedEmiSchedules.count}`);

  const deletedNotifications = await prisma.notification.deleteMany({});
  console.log(` - Notifications deleted: ${deletedNotifications.count}`);

  const deletedSupportTickets = await prisma.supportTicket.deleteMany({});
  console.log(` - Support Tickets deleted: ${deletedSupportTickets.count}`);

  const deletedWhatsApp = await prisma.whatsAppMessage.deleteMany({});
  console.log(` - WhatsApp Messages deleted: ${deletedWhatsApp.count}`);

  const deletedEmails = await prisma.emailMessage.deleteMany({});
  console.log(` - Email Messages deleted: ${deletedEmails.count}`);

  const deletedVerificationTokens = await prisma.verificationToken.deleteMany({});
  console.log(` - Verification Tokens deleted: ${deletedVerificationTokens.count}`);

  const deletedLoans = await prisma.loanApplication.deleteMany({});
  console.log(` - Loan Applications deleted: ${deletedLoans.count}`);

  const deletedCustomers = await prisma.customer.deleteMany({});
  console.log(` - Customers deleted: ${deletedCustomers.count}`);

  const deletedAuditLogs = await prisma.auditLog.deleteMany({});
  console.log(` - Audit Logs purged: ${deletedAuditLogs.count}`);

  // 3. Clean up uploads directory (documents & invoices)
  const uploadsDir = path.join(__dirname, '../uploads');
  const docsUploadDir = path.join(uploadsDir, 'documents');
  const invUploadDir = path.join(uploadsDir, 'invoices');

  if (fs.existsSync(docsUploadDir)) {
    try {
      fs.rmSync(docsUploadDir, { recursive: true, force: true });
      fs.mkdirSync(docsUploadDir, { recursive: true });
      console.log('[STORAGE] Cleaned uploads/documents directory');
    } catch (err: any) {
      console.warn(`[STORAGE] Could not clean documents dir: ${err.message}`);
    }
  }

  if (fs.existsSync(invUploadDir)) {
    try {
      fs.rmSync(invUploadDir, { recursive: true, force: true });
      fs.mkdirSync(invUploadDir, { recursive: true });
      console.log('[STORAGE] Cleaned uploads/invoices directory');
    } catch (err: any) {
      console.warn(`[STORAGE] Could not clean invoices dir: ${err.message}`);
    }
  }

  // 4. Provision / Ensure exactly ONE Master Development Admin Account
  console.log('[ADMIN PROVISIONING] Checking AdminUser table...');
  const devAdminEmail = 'admin@loanapprove.com';
  const devAdminPassword = 'Admin@123456';
  const passwordHash = await hashPassword(devAdminPassword);

  // Remove any stale test/non-master admin accounts
  const deletedAdmins = await prisma.adminUser.deleteMany({
    where: {
      email: { not: devAdminEmail },
    },
  });
  if (deletedAdmins.count > 0) {
    console.log(` - Stale admin accounts removed: ${deletedAdmins.count}`);
  }

  // Upsert the single development admin
  const admin = await prisma.adminUser.upsert({
    where: { email: devAdminEmail },
    update: {
      fullName: 'Master System Administrator',
      passwordHash,
      role: 'SUPER_ADMIN',
      permissions: JSON.stringify(['*']),
      isActive: true,
    },
    create: {
      email: devAdminEmail,
      fullName: 'Master System Administrator',
      passwordHash,
      role: 'SUPER_ADMIN',
      permissions: JSON.stringify(['*']),
      isActive: true,
    },
  });
  console.log(`[ADMIN] Master development Admin provisioned: ${admin.email} (Role: ${admin.role})`);

  // 5. Ensure Preserved Default System Settings
  console.log('[SETTINGS] Verifying system configuration defaults...');
  await prisma.brandingSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      companyName: 'Loan Approve Financial Services',
      appName: 'Loan Approve',
      email: 'support@loanapprove.com',
      phone: '+91 98765 43210',
      address: 'Nariman Point, Mumbai, Maharashtra 400021',
      primaryColor: '#047857',
      secondaryColor: '#0f172a',
      companyLegalName: 'Loan Approve Financial Services Pvt. Ltd.',
      documentWatermarkEnabled: true,
      invoiceWatermarkEnabled: true,
      watermarkOpacity: 0.10,
      watermarkSize: 'MEDIUM',
      watermarkPosition: 'CENTER',
    },
  });

  await prisma.paymentConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      chargeAmount: 500,
      kycChargeAmount: 499,
      processingFeeAmount: 1999,
      chargeType: 'PROCESSING_DEPOSIT',
      upiId: 'pay@loanapprove',
      accountNumber: '9876543210123',
      ifscCode: 'HDFC0001234',
      accountHolderName: 'Loan Approve Financial Services',
      instructions: 'Please transfer the fee using UPI or IMPS and enter the 12-digit UTR number below.',
      defaultInterestRate: 12.0,
    },
  });

  await prisma.uPISettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      upiEnabled: true,
      upiId: 'pay@loanapprove',
      merchantName: 'Loan Approve Financial Services',
      gpayEnabled: true,
      gpayId: 'pay@loanapprove',
      phonepeEnabled: true,
      phonepeId: 'pay@loanapprove',
      paytmEnabled: true,
      paytmId: 'pay@loanapprove',
      otherUpiEnabled: true,
      otherUpiId: 'pay@loanapprove',
    },
  });

  await prisma.bankSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      bankEnabled: true,
      accountHolder: 'Loan Approve Financial Services Pvt Ltd',
      accountNumber: '50200084729104',
      bankName: 'HDFC Bank',
      ifsc: 'HDFC0000060',
      branch: 'Fort, Mumbai',
    },
  });

  await prisma.communicationSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      emailEnabled: false,
      whatsAppEnabled: false,
      autoEmailOnPaymentVerified: true,
      autoEmailOnLoanApproved: true,
      autoEmailOnLoanRejected: true,
      autoEmailOnKycVerified: true,
      autoEmailOnKycRejected: true,
      autoEmailOnChargeCreated: true,
    },
  });

  // 6. Post-Cleanup Final State Verification
  const counts = {
    adminUsers: await prisma.adminUser.count(),
    customers: await prisma.customer.count(),
    loans: await prisma.loanApplication.count(),
    kycDocuments: await prisma.loanDocument.count(),
    documentRequests: await prisma.documentRequest.count(),
    payments: await prisma.payment.count(),
    charges: await prisma.charge.count(),
    invoices: await prisma.invoice.count(),
    emiSchedules: await prisma.eMISchedule.count(),
    disbursements: await prisma.disbursement.count(),
    agreements: await prisma.loanAgreement.count(),
    notifications: await prisma.notification.count(),
    supportTickets: await prisma.supportTicket.count(),
    whatsAppMessages: await prisma.whatsAppMessage.count(),
    emailMessages: await prisma.emailMessage.count(),
    verificationTokens: await prisma.verificationToken.count(),
    auditLogs: await prisma.auditLog.count(),
  };

  console.log('\n====================================================');
  console.log('FINAL DATABASE CLEAN STATE AUDIT:');
  console.log('====================================================');
  console.table(counts);

  const isClean =
    counts.adminUsers === 1 &&
    counts.customers === 0 &&
    counts.loans === 0 &&
    counts.kycDocuments === 0 &&
    counts.documentRequests === 0 &&
    counts.payments === 0 &&
    counts.charges === 0 &&
    counts.invoices === 0 &&
    counts.emiSchedules === 0 &&
    counts.disbursements === 0 &&
    counts.agreements === 0 &&
    counts.notifications === 0 &&
    counts.supportTickets === 0 &&
    counts.whatsAppMessages === 0 &&
    counts.emailMessages === 0 &&
    counts.verificationTokens === 0 &&
    counts.auditLogs === 0;

  if (isClean) {
    console.log('SUCCESS: Database is in pristine clean state!');
    console.log('Admin Account: admin@loanapprove.com / Admin@123456');
  } else {
    console.error('WARNING: Database contains non-zero counts for customer/business tables!');
    process.exit(1);
  }
}

performCleanReset()
  .catch((err) => {
    console.error('CLEAN RESET FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
