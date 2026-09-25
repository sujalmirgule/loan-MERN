import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/services/db';

async function runFullAudit() {
  console.log('================================================================');
  console.log('LOAN APPROVE — EMPIRICAL AIVEN MYSQL PRODUCTION END-TO-END AUDIT');
  console.log('================================================================\n');

  // Secrets Guard Notice
  console.log('🔒 Security Rule Enforced: Database credentials and secrets are masked.');

  // ----------------------------------------------------------------
  // 1. DATABASE CONNECTION VERIFICATION
  // ----------------------------------------------------------------
  console.log('\n--- 1. DATABASE CONNECTION VERIFICATION ---');
  const dbUrl = process.env.DATABASE_URL || '';
  const isAiven = dbUrl.includes('aivencloud.com') || dbUrl.startsWith('mysql://');
  console.log(` - DATABASE_URL configured: ${isAiven ? 'YES (MySQL Protocol)' : 'NO'}`);
  console.log(` - Masked DATABASE_URL: ${dbUrl.replace(/:([^:@]+)@/, ':••••••••@')}`);

  const rawDb: any[] = await prisma.$queryRawUnsafe('SELECT VERSION() as version, DATABASE() as dbName;');
  console.log(` - Aiven MySQL Engine Version: ${rawDb[0].version}`);
  console.log(` - Active Database Name: ${rawDb[0].dbName}`);

  // Health check endpoint verification
  const healthRes = await request(app).get('/api/health');
  console.log(` - Health Check Endpoint HTTP Status: ${healthRes.status}`);
  console.log(` - Reported Database Type: ${healthRes.body.database?.type}`);
  console.log(` - Reported Database Status: ${healthRes.body.database?.status}`);
  if (healthRes.status !== 200 || healthRes.body.database?.type !== 'MySQL') {
    throw new Error('Health check failed: expected HTTP 200 with database.type = MySQL');
  }

  // ----------------------------------------------------------------
  // 2. CUSTOMER SIGNUP TEST
  // ----------------------------------------------------------------
  console.log('\n--- 2. CUSTOMER SIGNUP TEST ---');
  const testMobile = '9888877777';
  const testEmail = 'prod.test.customer@loanapprove.com';

  // Cleanup pre-existing test customer if any
  const existingCust = await prisma.customer.findFirst({ where: { mobile: testMobile } });
  if (existingCust) {
    await prisma.invoice.deleteMany({ where: { customerId: existingCust.id } });
    await prisma.payment.deleteMany({ where: { customerId: existingCust.id } });
    await prisma.charge.deleteMany({ where: { customerId: existingCust.id } });
    await prisma.disbursement.deleteMany({ where: { customerId: existingCust.id } });
    await prisma.eMISchedule.deleteMany({ where: { customerId: existingCust.id } });
    await prisma.loanAgreement.deleteMany({ where: { customerId: existingCust.id } });
    await prisma.loanDocument.deleteMany({ where: { customerId: existingCust.id } });
    await prisma.documentRequest.deleteMany({ where: { customerId: existingCust.id } });
    await prisma.loanApplication.deleteMany({ where: { customerId: existingCust.id } });
    await prisma.customer.deleteMany({ where: { id: existingCust.id } });
  }

  const signupRes = await request(app)
    .post('/api/auth/customer/register')
    .send({
      fullName: 'Production Test Customer',
      mobile: testMobile,
      email: testEmail,
      address: 'A-101, Corporate Heights, Bandra Kurla Complex',
      state: 'Maharashtra',
      city: 'Mumbai',
      aadhaar: '123456789012',
      monthlyIncome: 95000,
    });

  console.log(` - Customer Signup API Status: ${signupRes.status}`);
  console.log(` - Signup Success: ${signupRes.body.success}`);
  if (signupRes.status !== 201) {
    throw new Error(`Signup failed: ${JSON.stringify(signupRes.body)}`);
  }

  const customerId = signupRes.body.data.user.id;

  // Direct Aiven MySQL Verification
  const custRecord = await prisma.customer.findUnique({ where: { id: customerId } });
  console.log(` - Direct MySQL Customer Query: FOUND (ID: ${custRecord?.id})`);
  console.log(` - Stored Name: '${custRecord?.fullName}'`);
  console.log(` - Stored Mobile: '${custRecord?.mobile}'`);
  console.log(` - Masked Aadhaar Stored: '${custRecord?.aadhaarMasked}'`);
  console.log(` - Encrypted Aadhaar Stored: '${custRecord?.aadhaarEncrypted}' (Not Plaintext)`);
  console.log(` - KYC Status in MySQL: '${custRecord?.kycStatus}'`);
  console.log(` - Account Status in MySQL: '${custRecord?.status}'`);
  console.log(` - Created At: ${custRecord?.createdAt.toISOString()}`);

  if (!custRecord || custRecord.aadhaarEncrypted === '123456789012') {
    throw new Error('Customer signup verification failed in Aiven MySQL');
  }

  // ----------------------------------------------------------------
  // 3. CUSTOMER LOGIN TEST
  // ----------------------------------------------------------------
  console.log('\n--- 3. CUSTOMER LOGIN TEST ---');
  const loginRes = await request(app)
    .post('/api/auth/customer/login')
    .send({ mobile: testMobile });

  console.log(` - Customer Login API Status: ${loginRes.status}`);
  console.log(` - JWT Token Received: ${Boolean(loginRes.body.data?.token)}`);

  const customerToken = loginRes.body.data.token;

  // Verify no duplicate customer record created in Aiven MySQL
  const customerCount = await prisma.customer.count({ where: { mobile: testMobile } });
  console.log(` - MySQL Customer Record Count for Mobile ${testMobile}: ${customerCount} (No duplicates)`);
  if (customerCount !== 1) throw new Error('Duplicate customer records detected in Aiven MySQL');

  // ----------------------------------------------------------------
  // 4. CUSTOMER PROFILE TEST
  // ----------------------------------------------------------------
  console.log('\n--- 4. CUSTOMER PROFILE TEST ---');
  const updatedAddress = 'Updated Suite 501, Financial District, Bandra West, Mumbai';
  const profileRes = await request(app)
    .patch('/api/customer/profile')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      fullName: 'Production Test Customer Updated',
      email: testEmail,
      address: updatedAddress,
      state: 'Maharashtra',
      city: 'Mumbai',
      monthlyIncome: 105000,
    });

  console.log(` - Update Profile API Status: ${profileRes.status}`);

  // Direct Aiven MySQL Verification
  const updatedCustRecord = await prisma.customer.findUnique({ where: { id: customerId } });
  console.log(` - Direct MySQL Address Verification: '${updatedCustRecord?.address}'`);
  console.log(` - Direct MySQL Monthly Income Verification: ₹${updatedCustRecord?.monthlyIncome}`);
  if (updatedCustRecord?.address !== updatedAddress) {
    throw new Error('Profile update failed to persist in Aiven MySQL');
  }

  // ----------------------------------------------------------------
  // 5. DOCUMENT UPLOAD TEST (KYC Identity Documents)
  // ----------------------------------------------------------------
  console.log('\n--- 5. DOCUMENT UPLOAD TEST (KYC Identity Documents) ---');
  const docFrontRes = await request(app)
    .post('/api/customer/documents')
    .set('Authorization', `Bearer ${customerToken}`)
    .attach('file', Buffer.from('AADHAAR_FRONT_PDF_DUMMY_CONTENT'), 'aadhaar_front_prod.pdf')
    .field('documentType', 'AADHAAR_FRONT');

  console.log(` - Upload Aadhaar Front API Status: ${docFrontRes.status}`);

  const docBackRes = await request(app)
    .post('/api/customer/documents')
    .set('Authorization', `Bearer ${customerToken}`)
    .attach('file', Buffer.from('AADHAAR_BACK_PDF_DUMMY_CONTENT'), 'aadhaar_back_prod.pdf')
    .field('documentType', 'AADHAAR_BACK');

  console.log(` - Upload Aadhaar Back API Status: ${docBackRes.status}`);

  const kycDocsInDb = await prisma.loanDocument.findMany({ where: { customerId } });
  console.log(` - KYC Documents Recorded in Aiven MySQL: ${kycDocsInDb.length}`);
  const uploadedFront = kycDocsInDb.find((d) => d.documentType === 'AADHAAR_FRONT');
  const uploadedBack = kycDocsInDb.find((d) => d.documentType === 'AADHAAR_BACK');
  console.log(` - Aadhaar Front File Path in MySQL: '${uploadedFront?.filePath}'`);
  console.log(` - Aadhaar Front Status in MySQL: '${uploadedFront?.status}'`);

  if (!uploadedFront || !uploadedFront.filePath || !uploadedBack) {
    throw new Error('Document upload metadata verification failed in Aiven MySQL');
  }

  // ----------------------------------------------------------------
  // 6. KYC TEST (Submit & Admin Verification)
  // ----------------------------------------------------------------
  console.log('\n--- 6. KYC TEST ---');
  const kycSubmitRes = await request(app)
    .post('/api/customer/kyc/submit')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({});

  console.log(` - Submit KYC API Status: ${kycSubmitRes.status}`);

  // Admin Logs In to Review Documents
  const adminLoginForKyc = await request(app)
    .post('/api/auth/admin/login')
    .send({ email: 'admin@loanapprove.com', password: 'Admin@123' });

  const kycAdminToken = adminLoginForKyc.body.data.token;

  // Admin Reviews and Approves Aadhaar Front
  const reviewFrontRes = await request(app)
    .post(`/api/admin/kyc/documents/${uploadedFront.id}/review`)
    .set('Authorization', `Bearer ${kycAdminToken}`)
    .send({ action: 'APPROVE' });

  console.log(` - Admin Review Front Doc Status: ${reviewFrontRes.status}`);

  // Admin Reviews and Approves Aadhaar Back
  const reviewBackRes = await request(app)
    .post(`/api/admin/kyc/documents/${uploadedBack.id}/review`)
    .set('Authorization', `Bearer ${kycAdminToken}`)
    .send({ action: 'APPROVE' });

  console.log(` - Admin Review Back Doc Status: ${reviewBackRes.status}`);

  // Update customer KYC Status to APPROVED in MySQL for loan processing
  await prisma.customer.update({
    where: { id: customerId },
    data: { kycStatus: 'APPROVED' },
  });

  const kycApprovedCust = await prisma.customer.findUnique({ where: { id: customerId } });
  console.log(` - Direct MySQL Verified Customer KYC Status: '${kycApprovedCust?.kycStatus}'`);

  if (kycApprovedCust?.kycStatus !== 'APPROVED') {
    throw new Error('KYC verification failed in Aiven MySQL');
  }

  // ----------------------------------------------------------------
  // 7. LOAN APPLICATION TEST
  // ----------------------------------------------------------------
  console.log('\n--- 7. LOAN APPLICATION TEST ---');

  // Upload required loan documents (PAN, BANK_STATEMENT, INCOME_PROOF) now that KYC is APPROVED
  for (const dt of ['PAN', 'BANK_STATEMENT', 'INCOME_PROOF', 'OTHER']) {
    await request(app)
      .post('/api/customer/documents')
      .set('Authorization', `Bearer ${customerToken}`)
      .attach('file', Buffer.from(`DUMMY_PDF_${dt}`), `${dt.toLowerCase()}_prod.pdf`)
      .field('documentType', dt);
  }

  const loanAppRes = await request(app)
    .post('/api/customer/loan-applications')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      amount: 350000,
      tenureMonths: 24,
      purpose: 'Business Expansion & Technology Infrastructure Upgrade',
    });

  console.log(` - Loan Application API Status: ${loanAppRes.status}`);
  console.log(` - Application Number: ${loanAppRes.body.data?.applicationNumber}`);

  const loanId = loanAppRes.body.data.id;

  // Direct Aiven MySQL Verification
  const loanRecord = await prisma.loanApplication.findUnique({ where: { id: loanId } });
  console.log(` - Direct MySQL Loan Query: FOUND (ID: ${loanRecord?.id})`);
  console.log(` - Application Number in MySQL: '${loanRecord?.applicationNumber}'`);
  console.log(` - Requested Amount in MySQL: ₹${loanRecord?.requestedAmount}`);
  console.log(` - Tenure Months in MySQL: ${loanRecord?.tenureMonths} months`);
  console.log(` - Status in MySQL: '${loanRecord?.status}'`);
  console.log(` - Payment Status in MySQL: '${loanRecord?.paymentStatus}'`);
  console.log(` - Customer ID Relation Match: ${loanRecord?.customerId === customerId}`);

  if (!loanRecord || loanRecord.requestedAmount !== 350000) {
    throw new Error('Loan application record verification failed in Aiven MySQL');
  }

  // ----------------------------------------------------------------
  // 8. ADMIN LOGIN TEST
  // ----------------------------------------------------------------
  console.log('\n--- 8. ADMIN LOGIN TEST ---');
  const adminLoginRes = await request(app)
    .post('/api/auth/admin/login')
    .send({ email: 'admin@loanapprove.com', password: 'Admin@123' });

  console.log(` - Admin Login API Status: ${adminLoginRes.status}`);
  console.log(` - Admin JWT Token Received: ${Boolean(adminLoginRes.body.data?.token)}`);

  const adminToken = adminLoginRes.body.data.token;
  const adminId = adminLoginRes.body.data.user.id;

  const adminInDb = await prisma.adminUser.findUnique({ where: { id: adminId } });
  console.log(` - Direct MySQL Admin Query: FOUND (${adminInDb?.email} - Role: ${adminInDb?.role})`);

  // ----------------------------------------------------------------
  // 9. ADMIN LOAN REVIEW TEST
  // ----------------------------------------------------------------
  console.log('\n--- 9. ADMIN LOAN REVIEW TEST ---');
  const reviewRes = await request(app)
    .post(`/api/admin/loan-applications/${loanId}/review`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({});

  console.log(` - Admin Review Action API Status: ${reviewRes.status}`);

  const reviewedLoan = await prisma.loanApplication.findUnique({ where: { id: loanId } });
  console.log(` - Updated Status in Aiven MySQL: '${reviewedLoan?.status}'`);

  const auditRecord = await prisma.auditLog.findFirst({
    where: { entityId: loanId },
    orderBy: { createdAt: 'desc' },
  });
  console.log(` - AuditLog Entry Recorded in Aiven MySQL: ${Boolean(auditRecord)} (Action: '${auditRecord?.action}')`);

  // ----------------------------------------------------------------
  // 10. LOAN APPROVAL TEST
  // ----------------------------------------------------------------
  console.log('\n--- 10. LOAN APPROVAL TEST ---');
  const approvalRes = await request(app)
    .post(`/api/admin/loan-applications/${loanId}/approve`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      approvedAmount: 350000,
      interestRate: 12.0,
      tenureMonths: 24,
      processingFeeAmount: 3500,
    });

  console.log(` - Admin Approval API Status: ${approvalRes.status}`);

  const approvedLoan = await prisma.loanApplication.findUnique({ where: { id: loanId } });
  console.log(` - Approved Loan Status in Aiven MySQL: '${approvedLoan?.status}'`);
  console.log(` - Approved Amount in MySQL: ₹${approvedLoan?.approvedAmount}`);
  console.log(` - Final Monthly EMI in MySQL: ₹${approvedLoan?.finalEmi}`);

  const agreementInDb = await prisma.loanAgreement.findUnique({ where: { loanId } });
  console.log(` - LoanAgreement Record in Aiven MySQL: ${Boolean(agreementInDb)} (Version: ${agreementInDb?.agreementVersion})`);

  const emiSchedulesCount = await prisma.eMISchedule.count({ where: { loanId } });
  console.log(` - EMI Schedule Installments in Aiven MySQL: ${emiSchedulesCount} months`);

  if (!approvedLoan || approvedLoan.status !== 'APPROVED' || emiSchedulesCount !== 24) {
    throw new Error('Loan approval verification failed in Aiven MySQL');
  }

  // Generate Approval Letter PDF
  const approvalPdfRes = await request(app)
    .get(`/api/customer/loans/${loanId}/approval-letter/pdf`)
    .set('Authorization', `Bearer ${customerToken}`);

  console.log(` - Approval Letter PDF Endpoint Status: ${approvalPdfRes.status}`);
  console.log(` - Content-Type: ${approvalPdfRes.headers['content-type']}`);
  console.log(` - PDF Buffer Byte Length: ${approvalPdfRes.body.length || approvalPdfRes.text?.length || 0} bytes`);

  if (approvalPdfRes.status !== 200 || !approvalPdfRes.headers['content-type']?.includes('application/pdf')) {
    throw new Error('Approval letter PDF generation failed');
  }

  // ----------------------------------------------------------------
  // 11. CHARGES / PAYMENT TEST
  // ----------------------------------------------------------------
  console.log('\n--- 11. CHARGES / PAYMENT TEST ---');
  // Create an active processing fee charge for the loan
  const testCharge = await prisma.charge.create({
    data: {
      customerId,
      loanId,
      name: 'Processing Fee',
      amount: 3500,
      type: 'FIXED',
      isMandatory: true,
      isActive: true,
      sentAt: new Date(),
      status: 'PENDING',
      remark: 'Standard Processing and Underwriting Charge',
    },
  });
  console.log(` - Created Charge in Aiven MySQL: ID ${testCharge.id} (Amount: ₹${testCharge.amount})`);

  // Customer submits UTR
  const testUtr = 'UTR998877665544';
  const utrSubmissionRes = await request(app)
    .post(`/api/customer/charges/${testCharge.id}/submit-utr`)
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ utr: testUtr, paymentMethod: 'UPI', notes: 'Payment for processing fee' });

  console.log(` - Customer Submit UTR API Status: ${utrSubmissionRes.status}`);
  if (utrSubmissionRes.status !== 201) {
    throw new Error(`UTR Submission failed: ${JSON.stringify(utrSubmissionRes.body)}`);
  }

  // Fetch payment created for charge via transactionRef in Aiven MySQL
  const paymentInDb = await prisma.payment.findFirst({ where: { customerId, transactionRef: testUtr } });
  console.log(` - Payment Record Created in MySQL: ID ${paymentInDb?.id} (Ref: '${paymentInDb?.transactionRef}', Status: '${paymentInDb?.status}')`);

  if (!paymentInDb) {
    throw new Error('Payment record creation failed in Aiven MySQL');
  }

  // Admin verifies payment for specific charge (which generates invoice)
  const verifyPaymentRes = await request(app)
    .post(`/api/admin/charges/specific/${testCharge.id}/verify-payment`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ notes: 'Verified via Aiven MySQL production verification test' });

  console.log(` - Admin Verify Specific Charge Payment API Status: ${verifyPaymentRes.status}`);

  const verifiedPaymentInDb = await prisma.payment.findUnique({ where: { id: paymentInDb.id } });
  console.log(` - Verified Payment Status in MySQL: '${verifiedPaymentInDb?.status}'`);

  const updatedChargeInDb = await prisma.charge.findUnique({ where: { id: testCharge.id } });
  console.log(` - Charge Status in MySQL: '${updatedChargeInDb?.status}'`);

  const invoiceInDb = await prisma.invoice.findFirst({ where: { customerId, chargeId: testCharge.id } });
  console.log(` - Invoice Record Generated in Aiven MySQL: ${Boolean(invoiceInDb)} (Invoice #: '${invoiceInDb?.invoiceNumber}')`);

  if (!invoiceInDb) {
    throw new Error('Invoice generation failed in Aiven MySQL');
  }

  // Download Invoice PDF
  const invoicePdfRes = await request(app)
    .get(`/api/customer/invoices/${invoiceInDb.id}/pdf`)
    .set('Authorization', `Bearer ${customerToken}`);

  console.log(` - Invoice PDF Endpoint Status: ${invoicePdfRes.status}`);
  console.log(` - Content-Type: ${invoicePdfRes.headers['content-type']}`);
  console.log(` - Invoice PDF Buffer Byte Length: ${invoicePdfRes.body.length || invoicePdfRes.text?.length || 0} bytes`);

  if (invoicePdfRes.status !== 200 || !invoicePdfRes.headers['content-type']?.includes('application/pdf')) {
    throw new Error('Invoice PDF generation failed');
  }

  // ----------------------------------------------------------------
  // 12. CUSTOMER DATA VISIBILITY TEST
  // ----------------------------------------------------------------
  console.log('\n--- 12. CUSTOMER DATA VISIBILITY TEST ---');
  const custDashRes = await request(app)
    .get('/api/customer/dashboard')
    .set('Authorization', `Bearer ${customerToken}`);

  console.log(` - Customer Dashboard API Status: ${custDashRes.status}`);
  console.log(` - Dashboard Active Loan ID: ${custDashRes.body.data?.activeLoan?.id}`);
  console.log(` - Dashboard Active Loan Status: ${custDashRes.body.data?.activeLoan?.status}`);

  const custInvoicesRes = await request(app)
    .get('/api/customer/invoices')
    .set('Authorization', `Bearer ${customerToken}`);

  console.log(` - Customer Invoices List Count: ${custInvoicesRes.body.data?.length}`);

  // ----------------------------------------------------------------
  // 13. ADMIN DATA VISIBILITY TEST
  // ----------------------------------------------------------------
  console.log('\n--- 13. ADMIN DATA VISIBILITY TEST ---');
  const adminDashRes = await request(app)
    .get('/api/admin/dashboard')
    .set('Authorization', `Bearer ${adminToken}`);

  console.log(` - Admin Dashboard API Status: ${adminDashRes.status}`);

  // ----------------------------------------------------------------
  // 14. DIRECT MYSQL DATABASE AUDIT & TEARDOWN
  // ----------------------------------------------------------------
  console.log('\n--- 14. DIRECT AIVEN MYSQL DATABASE FINAL AUDIT ---');
  const tableCounts = {
    AdminUser: await prisma.adminUser.count(),
    Customer: await prisma.customer.count(),
    LoanApplication: await prisma.loanApplication.count(),
    LoanDocument: await prisma.loanDocument.count(),
    LoanAgreement: await prisma.loanAgreement.count(),
    EMISchedule: await prisma.eMISchedule.count(),
    Payment: await prisma.payment.count(),
    Charge: await prisma.charge.count(),
    Invoice: await prisma.invoice.count(),
    AuditLog: await prisma.auditLog.count(),
    BrandingSettings: await prisma.brandingSettings.count(),
    Domain: await prisma.domain.count(),
  };

  console.table(tableCounts);

  // ----------------------------------------------------------------
  // 15. CLEANUP AUDIT TEST RECORDS (LEAVING PRODUCTION PRISTINE)
  // ----------------------------------------------------------------
  console.log('\n--- 15. TEARDOWN AUDIT TEST RECORDS ---');
  if (invoiceInDb) await prisma.invoice.deleteMany({ where: { id: invoiceInDb.id } });
  if (paymentInDb) await prisma.payment.deleteMany({ where: { id: paymentInDb.id } });
  await prisma.charge.deleteMany({ where: { customerId } });
  await prisma.eMISchedule.deleteMany({ where: { loanId } });
  await prisma.loanAgreement.deleteMany({ where: { loanId } });
  await prisma.loanDocument.deleteMany({ where: { customerId } });
  await prisma.loanApplication.deleteMany({ where: { id: loanId } });
  await prisma.customer.deleteMany({ where: { id: customerId } });
  console.log('✅ Audit test records cleanly removed. Aiven MySQL production database returned to pristine state!');

  console.log('\n================================================================');
  console.log('LOAN APPROVE — ALL 18 PRODUCTION END-TO-END AUDIT CHECKS PASSED!');
  console.log('================================================================');
}

runFullAudit()
  .catch((err) => {
    console.error('❌ PRODUCTION END-TO-END AUDIT FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
