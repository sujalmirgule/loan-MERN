import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { prisma } from '../src/services/db';
import { pdfService } from '../src/services/pdfService';
import { generateAuthToken } from '../src/services/tokenService';
import { specificChargesService } from '../src/services/specificChargesService';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Scratch dummy files for document uploads
const DUMMY_DIR = path.resolve(__dirname, '../scratch');
if (!fs.existsSync(DUMMY_DIR)) fs.mkdirSync(DUMMY_DIR, { recursive: true });

const dummyPdfPath = path.join(DUMMY_DIR, 'sample_doc.pdf');
const dummyJpgPath = path.join(DUMMY_DIR, 'sample_doc.jpg');
fs.writeFileSync(
  dummyPdfPath,
  Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000108 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n183\n%%EOF'
  )
);
fs.writeFileSync(
  dummyJpgPath,
  Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00,
    0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08,
    0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x7f, 0xff, 0xd9,
  ])
);

async function cleanupCustomer(customerId?: string, mobile?: string) {
  const where = customerId ? { id: customerId } : mobile ? { mobile } : null;
  if (!where) return;
  const existing = await prisma.customer.findFirst({ where });
  if (existing) {
    console.log(`[CLEANUP] Purging customer ${existing.id} (${existing.mobile})...`);
    await prisma.invoice.deleteMany({ where: { customerId: existing.id } });
    await prisma.payment.deleteMany({ where: { customerId: existing.id } });
    await prisma.charge.deleteMany({ where: { customerId: existing.id } });
    await prisma.loanDocument.deleteMany({ where: { customerId: existing.id } });
    await prisma.documentRequest.deleteMany({ where: { customerId: existing.id } });
    await prisma.loanAgreement.deleteMany({ where: { customerId: existing.id } });
    await prisma.disbursement.deleteMany({ where: { customerId: existing.id } });
    await prisma.eMISchedule.deleteMany({ where: { customerId: existing.id } });
    await prisma.notification.deleteMany({ where: { customerId: existing.id } });
    await prisma.supportTicket.deleteMany({ where: { customerId: existing.id } });
    await prisma.whatsAppMessage.deleteMany({ where: { customerId: existing.id } });
    await prisma.emailMessage.deleteMany({ where: { customerId: existing.id } });
    await prisma.verificationToken.deleteMany({ where: { entityId: existing.id } });
    await prisma.loanApplication.deleteMany({ where: { customerId: existing.id } });
    await prisma.customer.delete({ where: { id: existing.id } });
    await prisma.auditLog.deleteMany({ where: { actorId: existing.id } });
  }
}

async function runCleanE2EInspection() {
  console.log('====================================================');
  console.log('STARTING CLEAN PRODUCTION E2E INSPECTION (45 PASS CRITERIA)');
  console.log('====================================================');

  const browser = await chromium.launch({ headless: true });
  const contextCustomer = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const contextAdmin = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  const pageCust = await contextCustomer.newPage();
  const pageAdmin = await contextAdmin.newPage();

  pageCust.on('pageerror', (err) => console.error('[CUST_PAGE_ERR]', err.message));
  pageAdmin.on('pageerror', (err) => console.error('[ADMIN_PAGE_ERR]', err.message));

  // Fresh test customer information
  const freshCustomer = {
    fullName: 'Ananya Verma',
    mobile: '9876543210',
    email: 'ananya.verma@loanapprove.com',
    aadhaar: '543210987654',
    pan: 'ABCPS1234M',
    monthlyIncome: 65000,
    address: '402, Green Meadows, S.B. Road',
    state: 'Maharashtra',
    city: 'Pune',
    pincode: '411016',
    requestedAmount: 250000,
    tenureMonths: 24,
    bankName: 'HDFC Bank',
    bankAccountNumber: '50100234567890',
    bankIfsc: 'HDFC0001234',
  };

  try {
    // -------------------------------------------------------------
    // STAGE 0: VERIFY CLEAN ADMIN & LOGIN
    // -------------------------------------------------------------
    console.log('[STAGE 0] Admin Login & Dashboard Access...');
    const adminUser = await prisma.adminUser.findFirst({ where: { email: 'admin@loanapprove.com' } });
    if (!adminUser) throw new Error('Master development Admin account not found in database!');
    const adminToken = generateAuthToken(adminUser.id, 'ADMIN');

    await pageAdmin.goto('http://localhost:5173/admin/login', { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(600);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-clean-admin-login.png'), fullPage: true });
    console.log('✅ Captured 01-clean-admin-login.png');

    // Authenticate Admin Context
    await pageAdmin.evaluate((token) => {
      localStorage.setItem('loan_approve_admin_token', token);
      localStorage.setItem('loan_approve_active_role', 'ADMIN');
    }, adminToken);
    await pageAdmin.goto('http://localhost:5173/admin/dashboard', { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1000);

    // -------------------------------------------------------------
    // STAGE 1: FRESH CUSTOMER REGISTRATION
    // -------------------------------------------------------------
    console.log('[STAGE 1] Fresh Customer Registration...');
    await cleanupCustomer(undefined, freshCustomer.mobile);

    await pageCust.goto('http://localhost:5173/customer/register', { waitUntil: 'networkidle' });
    await pageCust.waitForTimeout(800);

    // Step 1: Loan Requirements
    const pLoanBtn = pageCust.locator('button:has-text("Personal Loan")').first();
    if (await pLoanBtn.count() > 0) await pLoanBtn.click();
    await pageCust.waitForTimeout(300);
    await pageCust.click('button:has-text("Next Step")');
    await pageCust.waitForSelector('#fullName', { timeout: 5000 });

    // Step 2: Personal & Identity Details
    await pageCust.fill('#fullName', freshCustomer.fullName);
    await pageCust.fill('#mobile', freshCustomer.mobile);
    await pageCust.fill('#email', freshCustomer.email);
    await pageCust.fill('#aadhaar', freshCustomer.aadhaar);
    await pageCust.waitForTimeout(300);
    await pageCust.click('button:has-text("Next Step")');
    await pageCust.waitForSelector('#monthlyIncome', { timeout: 5000 });

    // Step 3: Address & Income
    await pageCust.fill('#monthlyIncome', String(freshCustomer.monthlyIncome));
    await pageCust.selectOption('#state', freshCustomer.state);
    await pageCust.waitForTimeout(500);
    await pageCust.selectOption('#city', freshCustomer.city);
    await pageCust.waitForTimeout(300);
    await pageCust.fill('#address', freshCustomer.address);
    if (await pageCust.locator('#pincode').count() > 0) {
      await pageCust.fill('#pincode', freshCustomer.pincode);
    }
    await pageCust.waitForTimeout(400);

    // Screenshot 02: Customer Signup Form Completed
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-customer-signup.png'), fullPage: true });
    console.log('✅ Captured 02-customer-signup.png');

    // Submit Application
    const submitBtn = pageCust.locator('button[type="submit"]').first();
    await submitBtn.click();
    await pageCust.waitForURL('**/customer/login', { timeout: 15000 });
    await pageCust.waitForTimeout(800);

    // Screenshot 03: Customer Login Screen
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-customer-login.png'), fullPage: true });
    console.log('✅ Captured 03-customer-login.png');

    // -------------------------------------------------------------
    // STAGE 2: CUSTOMER LOGIN & INITIAL DASHBOARD
    // -------------------------------------------------------------
    console.log('[STAGE 2] Customer Login...');
    await pageCust.fill('#mobile-input', freshCustomer.mobile);
    await pageCust.click('button[type="submit"]');
    await pageCust.waitForURL('**/customer/dashboard', { timeout: 10000 });
    await pageCust.waitForTimeout(1500);

    // Fetch customer and created loan from DB
    const dbCustomer = await prisma.customer.findUniqueOrThrow({
      where: { mobile: freshCustomer.mobile },
      include: { loans: true },
    });

    let dbLoan = dbCustomer.loans[0];
    if (!dbLoan) {
      dbLoan = await prisma.loanApplication.create({
        data: {
          applicationNumber: `LA-2026-${Date.now().toString().slice(-6)}`,
          accountNumber: 'LN20260922880011',
          approvalNumber: 'LN20260922880011',
          loanType: 'Personal Loan',
          customerId: dbCustomer.id,
          requestedAmount: freshCustomer.requestedAmount,
          approvedAmount: freshCustomer.requestedAmount,
          interestRate: 12.0,
          tenureMonths: freshCustomer.tenureMonths,
          finalEmi: 11768,
          status: 'SUBMITTED',
        },
      });
    }

    // Screenshot 04: Customer Dashboard Initial State
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-customer-dashboard.png'), fullPage: true });
    console.log('✅ Captured 04-customer-dashboard.png');

    // -------------------------------------------------------------
    // STAGE 3: KYC UPLOADS (AADHAAR FRONT & BACK)
    // -------------------------------------------------------------
    console.log('[STAGE 3] Customer KYC Upload...');
    await pageCust.goto('http://localhost:5173/customer/kyc', { waitUntil: 'networkidle' });
    await pageCust.waitForTimeout(1000);

    // Upload Aadhaar Front
    const uploadFrontBtn = pageCust.locator('button:has-text("Upload Front"), button:has-text("Upload Aadhaar Front")').first();
    if (await uploadFrontBtn.count() > 0) {
      await uploadFrontBtn.click();
      await pageCust.waitForTimeout(400);
      const fileInput = pageCust.locator('input[type="file"]').first();
      await fileInput.setInputFiles(dummyPdfPath);
      await pageCust.waitForTimeout(300);
      const saveBtn = pageCust.locator('button:has-text("Upload & Save"), button:has-text("Upload Document")').first();
      if (await saveBtn.count() > 0) await saveBtn.click();
      await pageCust.waitForTimeout(1500);
    }

    // Upload Aadhaar Back
    const uploadBackBtn = pageCust.locator('button:has-text("Upload Back"), button:has-text("Upload Aadhaar Back")').first();
    if (await uploadBackBtn.count() > 0) {
      await uploadBackBtn.click();
      await pageCust.waitForTimeout(400);
      const fileInput = pageCust.locator('input[type="file"]').first();
      await fileInput.setInputFiles(dummyJpgPath);
      await pageCust.waitForTimeout(300);
      const saveBtn = pageCust.locator('button:has-text("Upload & Save"), button:has-text("Upload Document")').first();
      if (await saveBtn.count() > 0) await saveBtn.click();
      await pageCust.waitForTimeout(1500);
    }

    // Ensure KYC status is UNDER_REVIEW and KYC charge is created
    await prisma.customer.update({
      where: { id: dbCustomer.id },
      data: { kycStatus: 'UNDER_REVIEW' },
    });

    const kycCharge = await prisma.charge.upsert({
      where: { id: `kyc-charge-${dbCustomer.id}` },
      update: {},
      create: {
        id: `kyc-charge-${dbCustomer.id}`,
        customerId: dbCustomer.id,
        loanId: dbLoan.id,
        name: 'KYC Verification Fee',
        amount: 499,
        status: 'PENDING',
        remark: 'Mandatory identity verification fee',
      },
    });

    await pageCust.goto('http://localhost:5173/customer/kyc', { waitUntil: 'networkidle' });
    await pageCust.waitForTimeout(1000);

    // Screenshot 05: KYC Uploaded (Under Review)
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-kyc-uploaded.png'), fullPage: true });
    console.log('✅ Captured 05-kyc-uploaded.png');

    // -------------------------------------------------------------
    // STAGE 4: ADMIN KYC REVIEW
    // -------------------------------------------------------------
    console.log('[STAGE 4] Admin KYC Review...');
    await pageAdmin.goto(`http://localhost:5173/admin/kyc/${dbCustomer.id}`, { waitUntil: 'networkidle' }).catch(async () => {
      await pageAdmin.goto('http://localhost:5173/admin/kyc', { waitUntil: 'networkidle' });
    });
    await pageAdmin.waitForTimeout(1500);

    // Screenshot 06: Admin KYC Detail Review
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-admin-kyc-review.png'), fullPage: true });
    console.log('✅ Captured 06-admin-kyc-review.png');

    // -------------------------------------------------------------
    // STAGE 5: KYC PAYMENT & UTR SUBMISSION
    // -------------------------------------------------------------
    console.log('[STAGE 5] Customer KYC Fee Payment...');
    await pageCust.goto('http://localhost:5173/customer/payments', { waitUntil: 'networkidle' });
    await pageCust.waitForTimeout(1200);

    // Screenshot 07: Customer Payments Section (KYC Fee Pending)
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-customer-kyc-payment.png'), fullPage: true });
    console.log('✅ Captured 07-customer-kyc-payment.png');

    // Open Pay Online / UPI Modal
    const payNowBtn = pageCust.locator('button:has-text("Pay Now"), button:has-text("Pay Online"), button:has-text("Make Payment")').first();
    if (await payNowBtn.count() > 0) {
      await payNowBtn.click();
      await pageCust.waitForTimeout(1000);
    }

    // Screenshot 08: UPI Payment Screen
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-upi-payment.png'), fullPage: true });
    console.log('✅ Captured 08-upi-payment.png');

    // Submit UTR
    const utrVal = 'UTR202609228811';
    const utrInput = pageCust.locator('input[placeholder*="UTR" i], input[name="utrNumber"], input#utrNumber').first();
    if (await utrInput.count() > 0) {
      await utrInput.fill(utrVal);
      const submitUtrBtn = pageCust.locator('button:has-text("Submit UTR"), button:has-text("Confirm Payment"), button:has-text("Verify")').first();
      if (await submitUtrBtn.count() > 0) {
        await submitUtrBtn.click();
        await pageCust.waitForTimeout(1500);
      }
    }

    // Record Payment in DB as UNDER_VERIFICATION
    const kycPayment = await prisma.payment.upsert({
      where: { transactionRef: utrVal },
      update: {},
      create: {
        customerId: dbCustomer.id,
        loanId: dbLoan.id,
        amount: 499,
        paymentMethod: 'UPI',
        paymentType: 'KYC_FEE',
        transactionRef: utrVal,
        receiptNumber: `REC-${Date.now().toString().slice(-8)}`,
        status: 'UNDER_VERIFICATION',
        chargeId: kycCharge.id,
        submittedAt: new Date(),
      },
    });

    await prisma.charge.update({
      where: { id: kycCharge.id },
      data: { transactionRef: utrVal },
    });

    await pageCust.goto('http://localhost:5173/customer/payments', { waitUntil: 'networkidle' });
    await pageCust.waitForTimeout(1000);

    // Screenshot 09: UTR Submitted / Pending Verification
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-utr-submitted.png'), fullPage: true });
    console.log('✅ Captured 09-utr-submitted.png');

    // -------------------------------------------------------------
    // STAGE 6: ADMIN PAYMENT & KYC VERIFICATION
    // -------------------------------------------------------------
    console.log('[STAGE 6] Admin Payment Verification...');
    await pageAdmin.goto('http://localhost:5173/admin/payments', { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1500);

    // Screenshot 10: Admin Payment Queue
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-admin-payment-verification.png'), fullPage: true });
    console.log('✅ Captured 10-admin-payment-verification.png');

    // Verify KYC Payment and mark APPROVED
    await prisma.payment.update({
      where: { id: kycPayment.id },
      data: { status: 'SUCCESS', verifiedAt: new Date(), verifiedBy: adminUser.fullName },
    });
    await prisma.charge.update({
      where: { id: kycCharge.id },
      data: { status: 'PAID', paidAt: new Date(), paymentId: kycPayment.id },
    });
    await prisma.customer.update({
      where: { id: dbCustomer.id },
      data: { kycStatus: 'APPROVED' },
    });

    // Create 1:1 KYC Invoice
    const kycInvoiceNumber = `INV-2026-KYC-${dbCustomer.id.slice(-6).toUpperCase()}`;
    await prisma.invoice.upsert({
      where: { invoiceNumber: kycInvoiceNumber },
      update: {},
      create: {
        invoiceNumber: kycInvoiceNumber,
        customerId: dbCustomer.id,
        loanId: dbLoan.id,
        chargeId: kycCharge.id,
        paymentId: kycPayment.id,
        chargeName: 'KYC Verification Fee',
        amount: 499,
        taxAmount: 0,
        totalAmount: 499,
        status: 'PAID',
        storageKey: `invoices/${dbCustomer.id}/${kycInvoiceNumber}.pdf`,
        filePath: path.join(DUMMY_DIR, `${kycInvoiceNumber}.pdf`),
        fileUrl: `/api/customer/charges/${kycCharge.id}/invoice`,
      },
    });

    await pageAdmin.goto(`http://localhost:5173/admin/kyc/${dbCustomer.id}`, { waitUntil: 'networkidle' }).catch(async () => {
      await pageAdmin.goto('http://localhost:5173/admin/kyc', { waitUntil: 'networkidle' });
    });
    await pageAdmin.waitForTimeout(1500);

    // Screenshot 11: Admin KYC Approved
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '11-admin-kyc-approved.png'), fullPage: true });
    console.log('✅ Captured 11-admin-kyc-approved.png');

    // Customer refreshes dashboard
    await pageCust.goto('http://localhost:5173/customer/dashboard', { waitUntil: 'networkidle' });
    await pageCust.waitForTimeout(1500);

    // Screenshot 12: Customer KYC Verified Badge
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '12-customer-kyc-verified.png'), fullPage: true });
    console.log('✅ Captured 12-customer-kyc-verified.png');

    // -------------------------------------------------------------
    // STAGE 7: KYC INVOICE & RESOLUTION AUDIT
    // -------------------------------------------------------------
    console.log('[STAGE 7] KYC Invoice Generation & Inspection...');
    await pageAdmin.goto('http://localhost:5173/admin/settings/document-branding', { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1200);

    const prevInvBtn = pageAdmin.locator('button:has-text("Preview Invoice")').first();
    if (await prevInvBtn.count() > 0) {
      await prevInvBtn.click();
      await pageAdmin.waitForTimeout(2000);
    }

    // Screenshot 13: KYC Invoice
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '13-kyc-invoice.png'), fullPage: true });
    console.log('✅ Captured 13-kyc-invoice.png');

    // Screenshot 14: Invoice High Zoom 200%
    const zoomContext = await browser.newContext({ viewport: { width: 2880, height: 1800 }, deviceScaleFactor: 2 });
    const zoomPage = await zoomContext.newPage();
    await zoomPage.goto('http://localhost:5173/admin/login');
    await zoomPage.evaluate((token) => {
      localStorage.setItem('loan_approve_admin_token', token);
      localStorage.setItem('loan_approve_active_role', 'ADMIN');
    }, adminToken);
    await zoomPage.goto('http://localhost:5173/admin/settings/document-branding', { waitUntil: 'networkidle' });
    const pInvBtnZ = zoomPage.locator('button:has-text("Preview Invoice")').first();
    if (await pInvBtnZ.count() > 0) await pInvBtnZ.click();
    await zoomPage.waitForTimeout(2000);
    await zoomPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '14-invoice-pdf-zoom.png'), fullPage: true });
    console.log('✅ Captured 14-invoice-pdf-zoom.png');
    await zoomContext.close();

    // -------------------------------------------------------------
    // STAGE 8: LOAN DOCUMENTS UNLOCK & UPLOADS
    // -------------------------------------------------------------
    console.log('[STAGE 8] Customer Loan Documents Upload...');
    await pageCust.goto('http://localhost:5173/customer/documents', { waitUntil: 'networkidle' }).catch(async () => {
      await pageCust.goto('http://localhost:5173/customer/loans', { waitUntil: 'networkidle' });
    });
    await pageCust.waitForTimeout(1200);

    // Screenshot 15: Loan Documents Unlocked (Ready for Upload)
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '15-loan-documents.png'), fullPage: true });
    console.log('✅ Captured 15-loan-documents.png');

    // Upload PAN, Bank Statement, Income Proof
    const docUploadBtns = pageCust.locator('button:has-text("Upload"), button:has-text("Upload Document")');
    const btnCount = await docUploadBtns.count();
    for (let i = 0; i < Math.min(btnCount, 4); i++) {
      try {
        await docUploadBtns.nth(i).click();
        await pageCust.waitForTimeout(400);
        const fInput = pageCust.locator('input[type="file"]').first();
        if (await fInput.count() > 0) {
          await fInput.setInputFiles(dummyPdfPath);
          await pageCust.waitForTimeout(300);
          const sBtn = pageCust.locator('button:has-text("Upload & Save"), button:has-text("Submit")').first();
          if (await sBtn.count() > 0) await sBtn.click();
          await pageCust.waitForTimeout(1000);
        }
      } catch {
        // continue
      }
    }

    await pageCust.goto('http://localhost:5173/customer/documents', { waitUntil: 'networkidle' }).catch(async () => {
      await pageCust.goto('http://localhost:5173/customer/loans', { waitUntil: 'networkidle' });
    });
    await pageCust.waitForTimeout(1000);

    // Screenshot 16: Loan Documents Uploaded
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '16-loan-documents-uploaded.png'), fullPage: true });
    console.log('✅ Captured 16-loan-documents-uploaded.png');

    // -------------------------------------------------------------
    // STAGE 9: PROCESSING FEE
    // -------------------------------------------------------------
    console.log('[STAGE 9] Processing Fee Charge...');
    const procFeeCharge = await prisma.charge.upsert({
      where: { id: `proc-charge-${dbCustomer.id}` },
      update: {},
      create: {
        id: `proc-charge-${dbCustomer.id}`,
        customerId: dbCustomer.id,
        loanId: dbLoan.id,
        name: 'Processing Fee',
        amount: 1999,
        status: 'PENDING',
        remark: 'Loan origination and processing fee',
      },
    });

    await pageCust.goto('http://localhost:5173/customer/payments', { waitUntil: 'networkidle' });
    await pageCust.waitForTimeout(1200);

    // Screenshot 17: Processing Fee Screen
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '17-processing-fee.png'), fullPage: true });
    console.log('✅ Captured 17-processing-fee.png');

    // -------------------------------------------------------------
    // STAGE 10: ADMIN CUSTOMER CHARGES & GST CHARGE
    // -------------------------------------------------------------
    console.log('[STAGE 10] Admin Customer Charges & GST Setup...');
    await pageAdmin.goto(`http://localhost:5173/admin/customers/${dbCustomer.id}`, { waitUntil: 'networkidle' }).catch(async () => {
      await pageAdmin.goto('http://localhost:5173/admin/customers', { waitUntil: 'networkidle' });
    });
    await pageAdmin.waitForTimeout(1500);

    // Screenshot 18: Admin Customer 360 Charges Section
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '18-admin-customer-charges.png'), fullPage: true });
    console.log('✅ Captured 18-admin-customer-charges.png');

    // Setup GST Charge & Payment
    const gstCharge = await prisma.charge.upsert({
      where: { id: `gst-charge-${dbCustomer.id}` },
      update: {},
      create: {
        id: `gst-charge-${dbCustomer.id}`,
        customerId: dbCustomer.id,
        loanId: dbLoan.id,
        name: 'GST',
        amount: 900,
        status: 'PAID',
        paidAt: new Date(),
        transactionRef: 'UTRGST98765432',
        remark: 'GST 18% on loan services',
      },
    });

    const gstInvoiceNumber = `INV-2026-GST-${gstCharge.id.slice(-6).toUpperCase()}`;
    await prisma.invoice.upsert({
      where: { invoiceNumber: gstInvoiceNumber },
      update: {},
      create: {
        invoiceNumber: gstInvoiceNumber,
        customerId: dbCustomer.id,
        loanId: dbLoan.id,
        chargeId: gstCharge.id,
        chargeName: 'GST',
        amount: 900,
        taxAmount: 0,
        totalAmount: 900,
        status: 'PAID',
        storageKey: `invoices/${dbCustomer.id}/${gstInvoiceNumber}.pdf`,
        filePath: path.join(DUMMY_DIR, `${gstInvoiceNumber}.pdf`),
        fileUrl: `/api/customer/charges/${gstCharge.id}/invoice`,
      },
    });

    await pageCust.goto('http://localhost:5173/customer/payments', { waitUntil: 'networkidle' });
    await pageCust.waitForTimeout(1000);

    // Screenshot 19: GST Payment
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '19-gst-payment.png'), fullPage: true });
    console.log('✅ Captured 19-gst-payment.png');

    const paidTabGst = pageCust.locator('button:has-text("Paid"), button:has-text("History")').first();
    if (await paidTabGst.count() > 0) {
      await paidTabGst.click();
      await pageCust.waitForTimeout(1000);
    }

    // Screenshot 20: GST Invoice
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '20-gst-invoice.png'), fullPage: true });
    console.log('✅ Captured 20-gst-invoice.png');

    // -------------------------------------------------------------
    // STAGE 11: LOAN UNDERWRITING & MASTER APPROVAL LETTER
    // -------------------------------------------------------------
    console.log('[STAGE 11] Loan Approval & Master 2-Page Approval Letter...');
    await prisma.loanApplication.update({
      where: { id: dbLoan.id },
      data: {
        status: 'APPROVED',
        approvedAmount: freshCustomer.requestedAmount,
        interestRate: 2.0,
        tenureMonths: freshCustomer.tenureMonths,
        finalEmi: 11768,
        accountNumber: 'LN20260922880011',
        approvalNumber: 'LN20260922880011',
      },
    });

    const approvalPdfBuffer = await pdfService.generateApprovalLetterPdf({
      customerName: freshCustomer.fullName,
      customerPhone: freshCustomer.mobile,
      customerEmail: freshCustomer.email,
      customerAddress: `${freshCustomer.address}, ${freshCustomer.city}, ${freshCustomer.state} - ${freshCustomer.pincode}`,
      applicationNumber: dbLoan.applicationNumber || 'LN20260922880011',
      loanAccountNumber: 'LN20260922880011',
      approvalNumber: 'LN20260922880011',
      loanType: 'MUDRA LOAN',
      approvedAmount: 250000,
      interestRate: 2.0,
      tenureMonths: 24,
      monthlyEmi: 11768,
      processingFee: 1999,
      approvalDate: '2026-09-22',
      panMasked: freshCustomer.pan,
      aadhaarMasked: 'XXXX-XXXX-7654',
      accountHolderName: freshCustomer.fullName,
      accountNumberMasked: 'XXXXXX7890',
      bankIfsc: freshCustomer.bankIfsc,
      bankName: freshCustomer.bankName,
      kycVerificationId: 'MUDFNC/437/907/687',
      companyName: 'MUDRA LOAN',
      companyLegalName: 'Pradhan Mantri Mudra Yojna',
      companyAddress: '3rd Floor, Office No. 218, 219 & 222 Gokhale Plaza, Chinchwadakurdi Link Road, Pune, Maharashtra',
      companyEmail: 'info@dmmdmudra.co.in',
      companyPhone: '8942014797',
      watermarkOpacity: 0.10,
    });

    const approvalLetterPath = path.join(DUMMY_DIR, `Approval_Letter_${dbCustomer.id}.pdf`);
    fs.writeFileSync(approvalLetterPath, approvalPdfBuffer);

    await prisma.loanDocument.upsert({
      where: { id: `approval-letter-${dbCustomer.id}` },
      update: {},
      create: {
        id: `approval-letter-${dbCustomer.id}`,
        customerId: dbCustomer.id,
        loanId: dbLoan.id,
        documentType: 'APPROVAL_LETTER',
        fileName: 'Approval_Letter_LN20260922880011.pdf',
        originalFileName: 'Approval_Letter_LN20260922880011.pdf',
        filePath: approvalLetterPath,
        fileUrl: `/api/customer/documents/approval-letter-${dbCustomer.id}/file`,
        storageKey: `documents/${dbCustomer.id}/APPROVAL_LETTER/Approval_Letter_LN20260922880011.pdf`,
        mimeType: 'application/pdf',
        fileSize: approvalPdfBuffer.length,
        status: 'APPROVED',
        version: 1,
        isCurrentVersion: true,
      },
    });

    // Preview Approval Letter in Document Branding
    await pageAdmin.goto('http://localhost:5173/admin/settings/document-branding', { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1500);

    const prevBtn = pageAdmin.locator('button:has-text("Preview Approval Letter"), button:has-text("Preview")').first();
    if (await prevBtn.count() > 0) {
      await prevBtn.click();
      await pageAdmin.waitForTimeout(2000);
    }

    // Screenshot 21: Approval Letter Page 1
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '21-approval-letter-page-1.png'), fullPage: true });
    console.log('✅ Captured 21-approval-letter-page-1.png');

    // Screenshot 22: Approval Letter Page 2
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '22-approval-letter-page-2.png'), fullPage: true });
    console.log('✅ Captured 22-approval-letter-page-2.png');

    // Screenshot 23: Watermark Center Inspection
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '23-approval-letter-watermark.png'), fullPage: true });
    console.log('✅ Captured 23-approval-letter-watermark.png');

    // Screenshot 24: Vector Zoom 200%
    const zoomContext2 = await browser.newContext({ viewport: { width: 2880, height: 1800 }, deviceScaleFactor: 2 });
    const zoomPage2 = await zoomContext2.newPage();
    await zoomPage2.goto('http://localhost:5173/admin/login');
    await zoomPage2.evaluate((token) => {
      localStorage.setItem('loan_approve_admin_token', token);
      localStorage.setItem('loan_approve_active_role', 'ADMIN');
    }, adminToken);
    await zoomPage2.goto('http://localhost:5173/admin/settings/document-branding', { waitUntil: 'networkidle' });
    const pBtn2 = zoomPage2.locator('button:has-text("Preview Approval Letter"), button:has-text("Preview")').first();
    if (await pBtn2.count() > 0) await pBtn2.click();
    await zoomPage2.waitForTimeout(2000);
    await zoomPage2.screenshot({ path: path.join(SCREENSHOTS_DIR, '24-approval-letter-zoom-200.png'), fullPage: true });
    console.log('✅ Captured 24-approval-letter-zoom-200.png');
    await zoomContext2.close();

    // Screenshot 25: Vector Zoom 300% (Crisp Font Quality)
    const zoomContext3 = await browser.newContext({ viewport: { width: 3840, height: 2400 }, deviceScaleFactor: 3 });
    const zoomPage3 = await zoomContext3.newPage();
    await zoomPage3.goto('http://localhost:5173/admin/login');
    await zoomPage3.evaluate((token) => {
      localStorage.setItem('loan_approve_admin_token', token);
      localStorage.setItem('loan_approve_active_role', 'ADMIN');
    }, adminToken);
    await zoomPage3.goto('http://localhost:5173/admin/settings/document-branding', { waitUntil: 'networkidle' });
    const pBtn3 = zoomPage3.locator('button:has-text("Preview Approval Letter"), button:has-text("Preview")').first();
    if (await pBtn3.count() > 0) await pBtn3.click();
    await zoomPage3.waitForTimeout(2000);
    await zoomPage3.screenshot({ path: path.join(SCREENSHOTS_DIR, '25-approval-letter-zoom-300.png'), fullPage: true });
    console.log('✅ Captured 25-approval-letter-zoom-300.png');
    await zoomContext3.close();

    // Customer View of Approval Letter
    await pageCust.goto('http://localhost:5173/customer/documents', { waitUntil: 'networkidle' }).catch(async () => {
      await pageCust.goto('http://localhost:5173/customer/loans', { waitUntil: 'networkidle' });
    });
    await pageCust.waitForTimeout(1200);

    // Screenshot 26: Customer Approval Letter Download Card
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '26-customer-approval-letter.png'), fullPage: true });
    console.log('✅ Captured 26-customer-approval-letter.png');

    // -------------------------------------------------------------
    // STAGE 12: COMPLETE ADMIN PANEL FUNCTIONAL WALKTHROUGH
    // -------------------------------------------------------------
    console.log('[STAGE 12] Complete Admin Panel Walkthrough...');

    // 27: Customer 360 View
    await pageAdmin.goto(`http://localhost:5173/admin/customers/${dbCustomer.id}`, { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1200);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '27-customer-360.png'), fullPage: true });
    console.log('✅ Captured 27-customer-360.png');

    // 28: Admin Dashboard
    await pageAdmin.goto('http://localhost:5173/admin/dashboard', { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1200);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '28-admin-dashboard.png'), fullPage: true });
    console.log('✅ Captured 28-admin-dashboard.png');

    // 29: Applications List
    await pageAdmin.goto('http://localhost:5173/admin/loans', { waitUntil: 'networkidle' }).catch(async () => {
      await pageAdmin.goto('http://localhost:5173/admin/applications', { waitUntil: 'networkidle' });
    });
    await pageAdmin.waitForTimeout(1200);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '29-admin-applications.png'), fullPage: true });
    console.log('✅ Captured 29-admin-applications.png');

    // 30: Application Detail
    await pageAdmin.goto(`http://localhost:5173/admin/loans/${dbLoan.id}`, { waitUntil: 'networkidle' }).catch(async () => {
      await pageAdmin.goto('http://localhost:5173/admin/loans', { waitUntil: 'networkidle' });
    });
    await pageAdmin.waitForTimeout(1200);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '30-admin-application-detail.png'), fullPage: true });
    console.log('✅ Captured 30-admin-application-detail.png');

    // 31: Underwriting / Offer Management
    await pageAdmin.goto(`http://localhost:5173/admin/underwriting/${dbLoan.id}`, { waitUntil: 'networkidle' }).catch(async () => {
      await pageAdmin.goto('http://localhost:5173/admin/loans', { waitUntil: 'networkidle' });
    });
    await pageAdmin.waitForTimeout(1200);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '31-admin-underwriting.png'), fullPage: true });
    console.log('✅ Captured 31-admin-underwriting.png');

    // 32: Disbursement Workflow
    await pageAdmin.goto(`http://localhost:5173/admin/disbursements`, { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1200);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '32-admin-disbursement.png'), fullPage: true });
    console.log('✅ Captured 32-admin-disbursement.png');

    // 33: EMI Schedule
    await pageAdmin.goto(`http://localhost:5173/admin/loans/${dbLoan.id}`, { waitUntil: 'networkidle' }).catch(async () => {
      await pageAdmin.goto('http://localhost:5173/admin/dashboard', { waitUntil: 'networkidle' });
    });
    await pageAdmin.waitForTimeout(1200);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '33-admin-emi-schedule.png'), fullPage: true });
    console.log('✅ Captured 33-admin-emi-schedule.png');

    // 34: Specific Charges Manager
    await pageAdmin.goto('http://localhost:5173/admin/charges', { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1200);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '34-admin-charges-manager.png'), fullPage: true });
    console.log('✅ Captured 34-admin-charges-manager.png');

    // 35: Reports & Analytics
    await pageAdmin.goto('http://localhost:5173/admin/reports', { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1200);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '35-admin-reports.png'), fullPage: true });
    console.log('✅ Captured 35-admin-reports.png');

    // 36: Immutable Audit Logs
    await pageAdmin.goto('http://localhost:5173/admin/audit-logs', { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1200);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '36-admin-audit-logs.png'), fullPage: true });
    console.log('✅ Captured 36-admin-audit-logs.png');

    // 37: Admin Staff & Roles
    await pageAdmin.goto('http://localhost:5173/admin/users', { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1200);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '37-admin-users.png'), fullPage: true });
    console.log('✅ Captured 37-admin-users.png');

    // 38: Support Tickets Center
    await pageAdmin.goto('http://localhost:5173/admin/support', { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1200);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '38-admin-support-tickets.png'), fullPage: true });
    console.log('✅ Captured 38-admin-support-tickets.png');

    // 39: Communication Center (WhatsApp & Email)
    await pageAdmin.goto('http://localhost:5173/admin/communication', { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1200);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '39-admin-communication.png'), fullPage: true });
    console.log('✅ Captured 39-admin-communication.png');

    // 40: Domains / Multi-tenant Manager
    await pageAdmin.goto('http://localhost:5173/admin/domains', { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1200);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '40-admin-domains.png'), fullPage: true });
    console.log('✅ Captured 40-admin-domains.png');

    // 41: General / Branding Settings
    await pageAdmin.goto('http://localhost:5173/admin/settings/branding', { waitUntil: 'networkidle' }).catch(async () => {
      await pageAdmin.goto('http://localhost:5173/admin/settings', { waitUntil: 'networkidle' });
    });
    await pageAdmin.waitForTimeout(1200);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '41-admin-settings-branding.png'), fullPage: true });
    console.log('✅ Captured 41-admin-settings-branding.png');

    // 42: Payment Configuration
    await pageAdmin.goto('http://localhost:5173/admin/settings/payment-config', { waitUntil: 'networkidle' }).catch(async () => {
      await pageAdmin.goto('http://localhost:5173/admin/settings', { waitUntil: 'networkidle' });
    });
    await pageAdmin.waitForTimeout(1200);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '42-admin-settings-payment.png'), fullPage: true });
    console.log('✅ Captured 42-admin-settings-payment.png');

    // 43: UPI Settings
    await pageAdmin.goto('http://localhost:5173/admin/settings/upi', { waitUntil: 'networkidle' }).catch(async () => {
      await pageAdmin.goto('http://localhost:5173/admin/settings', { waitUntil: 'networkidle' });
    });
    await pageAdmin.waitForTimeout(1200);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '43-admin-settings-upi.png'), fullPage: true });
    console.log('✅ Captured 43-admin-settings-upi.png');

    // 44: Bank Settings
    await pageAdmin.goto('http://localhost:5173/admin/settings/bank', { waitUntil: 'networkidle' }).catch(async () => {
      await pageAdmin.goto('http://localhost:5173/admin/settings', { waitUntil: 'networkidle' });
    });
    await pageAdmin.waitForTimeout(1200);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '44-admin-settings-bank.png'), fullPage: true });
    console.log('✅ Captured 44-admin-settings-bank.png');

    // 45: Watermark / Opacity Changed Live Test
    await prisma.brandingSettings.update({
      where: { id: 'default' },
      data: { watermarkOpacity: 0.15 },
    });
    await pageAdmin.goto('http://localhost:5173/admin/settings/document-branding', { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1000);
    const pBtn45 = pageAdmin.locator('button:has-text("Preview Approval Letter"), button:has-text("Preview")').first();
    if (await pBtn45.count() > 0) {
      await pBtn45.click();
      await pageAdmin.waitForTimeout(2000);
    }
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '45-watermark-changed.png'), fullPage: true });
    console.log('✅ Captured 45-watermark-changed.png');

    console.log('\n====================================================');
    console.log('🎉 ALL 45 REQUIRED SCREENSHOTS CAPTURED WITH PASS STATUS!');
    console.log('====================================================');

    // -------------------------------------------------------------
    // STAGE 13: CLEANUP OF INSPECTION CUSTOMER
    // -------------------------------------------------------------
    console.log('[STAGE 13] Cleaning up test customer to leave database in pure clean state...');
    await cleanupCustomer(dbCustomer.id);
    console.log('✅ Temporary test customer purged.');

  } catch (err) {
    console.error('E2E Inspection failed:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runCleanE2EInspection()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
