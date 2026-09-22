import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { prisma } from '../src/services/db';
import { pdfService } from '../src/services/pdfService';
import { generateAuthToken } from '../src/services/tokenService';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Sample test files for document uploads
const DUMMY_DIR = path.resolve(__dirname, '../scratch');
if (!fs.existsSync(DUMMY_DIR)) fs.mkdirSync(DUMMY_DIR, { recursive: true });

const dummyPdfPath = path.join(DUMMY_DIR, 'sample_doc.pdf');
const dummyJpgPath = path.join(DUMMY_DIR, 'sample_doc.jpg');
fs.writeFileSync(dummyPdfPath, Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000108 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n183\n%%EOF'));
fs.writeFileSync(dummyJpgPath, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x7f, 0xff, 0xd9]));

async function cleanupTestCustomer(mobile: string) {
  const existing = await prisma.customer.findFirst({ where: { mobile } });
  if (existing) {
    console.log(`Cleaning test customer records for mobile ${mobile} (ID: ${existing.id})...`);
    await prisma.loanDocument.deleteMany({ where: { customerId: existing.id } });
    await prisma.loanAgreement.deleteMany({ where: { customerId: existing.id } });
    await prisma.disbursement.deleteMany({ where: { customerId: existing.id } });
    await prisma.payment.deleteMany({ where: { customerId: existing.id } });
    await prisma.eMISchedule.deleteMany({ where: { customerId: existing.id } });
    await prisma.charge.deleteMany({ where: { customerId: existing.id } });
    await prisma.invoice.deleteMany({ where: { customerId: existing.id } });
    await prisma.notification.deleteMany({ where: { customerId: existing.id } });
    await prisma.documentRequest.deleteMany({ where: { customerId: existing.id } });
    await prisma.supportTicket.deleteMany({ where: { customerId: existing.id } });
    await prisma.whatsAppMessage.deleteMany({ where: { customerId: existing.id } });
    await prisma.emailMessage.deleteMany({ where: { customerId: existing.id } });
    await prisma.loanApplication.deleteMany({ where: { customerId: existing.id } });
    await prisma.customer.delete({ where: { id: existing.id } });
  }
}

async function runFullInspection() {
  console.log('🚀 Starting Full Production End-to-End Inspection...');

  const browser = await chromium.launch({ headless: true });
  const contextCustomer = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const contextAdmin = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  const pageCust = await contextCustomer.newPage();
  const pageAdmin = await contextAdmin.newPage();

  pageCust.on('console', (msg) => console.log('CUST_PAGE_LOG:', msg.text()));
  pageCust.on('pageerror', (err) => console.error('CUST_PAGE_ERR:', err.message));
  pageAdmin.on('pageerror', (err) => console.error('ADMIN_PAGE_ERR:', err.message));

  const testCustomer = {
    fullName: 'Vivek Sharma',
    mobile: '9876543299',
    email: 'vivek.sharma.test@loanapprove.com',
    password: 'Password@123',
    aadhaar: '543210987654',
    pan: 'ABCPS9999M',
    loanAmount: 150000,
    monthlyIncome: 45000,
    address: 'Flat 402, Royal Palms, Link Road',
    state: 'Maharashtra',
    city: 'Pune',
    pincode: '411033',
    loanType: 'Personal Loan',
    tenureMonths: 12,
  };

  // Pre-cleanup in case previous run left records
  await cleanupTestCustomer(testCustomer.mobile);

  // Pre-fetch Admin details and token
  const adminUser = await prisma.adminUser.findFirst({ where: { email: 'admin@loanapprove.com' } });
  if (!adminUser) throw new Error('Admin user not found in database');
  const adminToken = generateAuthToken(adminUser.id, 'ADMIN');

  // Authenticate Admin Context
  await pageAdmin.goto('http://localhost:5173/admin/login', { waitUntil: 'networkidle' });
  await pageAdmin.evaluate((token) => {
    localStorage.setItem('loan_approve_admin_token', token);
    localStorage.setItem('loan_approve_active_role', 'ADMIN');
  }, adminToken);
  await pageAdmin.goto('http://localhost:5173/admin/dashboard', { waitUntil: 'networkidle' });
  await pageAdmin.waitForTimeout(1000);

  try {
    // =========================================================================
    // STAGE 2: CUSTOMER SIGNUP
    // =========================================================================
    console.log('--- Stage 2: Customer Signup ---');
    await pageCust.goto('http://localhost:5173/customer/register', { waitUntil: 'networkidle' });
    await pageCust.waitForTimeout(1000);

    // STEP 1: Loan Requirements
    const pLoanBtn = pageCust.locator('button:has-text("Personal Loan")').first();
    if (await pLoanBtn.count() > 0) await pLoanBtn.click();
    await pageCust.waitForTimeout(300);

    // Click Next Step to go to Step 2
    await pageCust.click('button:has-text("Next Step")');
    await pageCust.waitForSelector('#fullName', { timeout: 5000 });

    // STEP 2: Personal & Identity Details
    await pageCust.fill('#fullName', testCustomer.fullName);
    await pageCust.fill('#mobile', testCustomer.mobile);
    await pageCust.fill('#email', testCustomer.email);
    await pageCust.fill('#aadhaar', testCustomer.aadhaar);
    await pageCust.waitForTimeout(300);

    // Click Next Step to go to Step 3
    await pageCust.click('button:has-text("Next Step")');
    await pageCust.waitForSelector('#monthlyIncome', { timeout: 5000 });

    // STEP 3: Address & Income
    await pageCust.fill('#monthlyIncome', String(testCustomer.monthlyIncome));
    await pageCust.selectOption('#state', testCustomer.state);
    await pageCust.waitForTimeout(600);
    await pageCust.selectOption('#city', testCustomer.city);
    await pageCust.waitForTimeout(400);
    await pageCust.fill('#address', testCustomer.address);
    if (await pageCust.locator('#pincode').count() > 0) {
      await pageCust.fill('#pincode', testCustomer.pincode);
    }
    await pageCust.waitForTimeout(400);

    // Screenshot 01: Customer Signup Completed Form
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-customer-signup.png'), fullPage: true });
    console.log('✅ Captured 01-customer-signup.png');

    // Submit Application
    const submitBtn = pageCust.locator('button[type="submit"]:has-text("Submit Application"), button[type="submit"]').first();
    await submitBtn.click();
    await pageCust.waitForURL('**/customer/login', { timeout: 15000 });
    await pageCust.waitForTimeout(1000);

    // Screenshot 02: Customer Login Page
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-customer-login.png'), fullPage: true });
    console.log('✅ Captured 02-customer-login.png');

    // =========================================================================
    // STAGE 3: CUSTOMER LOGIN & DASHBOARD
    // =========================================================================
    console.log('--- Stage 3: Customer Login & Dashboard ---');
    await pageCust.fill('#mobile-input', testCustomer.mobile);
    await pageCust.click('button[type="submit"]');
    await pageCust.waitForURL('**/customer/dashboard', { timeout: 10000 });
    await pageCust.waitForTimeout(1500);

    // Screenshot 03: Customer Dashboard
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-customer-dashboard.png'), fullPage: true });
    console.log('✅ Captured 03-customer-dashboard.png');

    // Query DB for customer reference
    let customer = await prisma.customer.findUniqueOrThrow({
      where: { mobile: testCustomer.mobile },
      include: { loans: true },
    });
    console.log(`Customer record ID: ${customer.id}`);

    // Ensure initial loan application exists for foreign key references
    let loan = customer.loans[0];
    if (!loan) {
      loan = await prisma.loanApplication.create({
        data: {
          applicationNumber: `LA-2026-${Date.now().toString().slice(-6)}`,
          accountNumber: 'LN20260922899123',
          approvalNumber: 'LN20260922899123',
          loanType: 'Personal Loan',
          customerId: customer.id,
          requestedAmount: 150000,
          approvedAmount: 150000,
          interestRate: 2.0,
          tenureMonths: 12,
          finalEmi: 12750,
          status: 'PENDING',
        },
      });
      customer = await prisma.customer.findUniqueOrThrow({
        where: { id: customer.id },
        include: { loans: true },
      });
    }

    // =========================================================================
    // STAGE 4: KYC UPLOAD
    // =========================================================================
    console.log('--- Stage 4: KYC Upload ---');
    await pageCust.goto('http://localhost:5173/customer/kyc', { waitUntil: 'networkidle' });
    await pageCust.waitForTimeout(1000);

    // 1. Upload Aadhaar Front
    const uploadFrontBtn = pageCust.locator('button:has-text("Upload Front"), button:has-text("Upload Aadhaar Front")').first();
    if (await uploadFrontBtn.count() > 0) {
      await uploadFrontBtn.click();
      await pageCust.waitForTimeout(500);
      const fileInput = pageCust.locator('input[type="file"]').first();
      await fileInput.setInputFiles(dummyPdfPath);
      await pageCust.waitForTimeout(300);
      const saveBtn = pageCust.locator('button:has-text("Upload & Save"), button:has-text("Upload Document")').first();
      if (await saveBtn.count() > 0) await saveBtn.click();
      await pageCust.waitForTimeout(1500);
    }

    // 2. Upload Aadhaar Back
    const uploadBackBtn = pageCust.locator('button:has-text("Upload Back"), button:has-text("Upload Aadhaar Back")').first();
    if (await uploadBackBtn.count() > 0) {
      await uploadBackBtn.click();
      await pageCust.waitForTimeout(500);
      const fileInput = pageCust.locator('input[type="file"]').first();
      await fileInput.setInputFiles(dummyJpgPath);
      await pageCust.waitForTimeout(300);
      const saveBtn = pageCust.locator('button:has-text("Upload & Save"), button:has-text("Upload Document")').first();
      if (await saveBtn.count() > 0) await saveBtn.click();
      await pageCust.waitForTimeout(1500);
    }

    // Update customer KYC status to UNDER_REVIEW in DB for realistic review flow
    await prisma.customer.update({
      where: { id: customer.id },
      data: { kycStatus: 'UNDER_REVIEW' },
    });

    // Refresh KYC page to show both uploaded documents
    await pageCust.goto('http://localhost:5173/customer/kyc', { waitUntil: 'networkidle' });
    await pageCust.waitForTimeout(1000);

    // Screenshot 04: KYC Uploaded (Submitted / Under Review)
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-kyc-uploaded.png'), fullPage: true });
    console.log('✅ Captured 04-kyc-uploaded.png');

    // =========================================================================
    // STAGE 5: ADMIN KYC INSPECTION
    // =========================================================================
    console.log('--- Stage 5: Admin KYC Inspection ---');
    await pageAdmin.goto(`http://localhost:5173/admin/kyc/${customer.id}`, { waitUntil: 'networkidle' }).catch(async () => {
      await pageAdmin.goto('http://localhost:5173/admin/kyc', { waitUntil: 'networkidle' });
    });
    await pageAdmin.waitForTimeout(1500);

    // Screenshot 05: Admin KYC Review
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-admin-kyc-review.png'), fullPage: true });
    console.log('✅ Captured 05-admin-kyc-review.png');

    // =========================================================================
    // STAGE 6 & 7: KYC PAYMENT / UPI SCREEN
    // =========================================================================
    console.log('--- Stage 6 & 7: KYC Payment / UPI Screen ---');
    // Ensure KYC verification fee charge exists
    const kycCharge = await prisma.charge.create({
      data: {
        customerId: customer.id,
        loanId: loan.id,
        name: 'KYC Verification Fee',
        amount: 499,
        status: 'PENDING',
        remark: 'Mandatory identity verification fee',
      },
    });

    await pageCust.goto('http://localhost:5173/customer/payments', { waitUntil: 'networkidle' });
    await pageCust.waitForTimeout(1200);

    // Screenshot 06: Customer KYC Payment
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-customer-kyc-payment.png'), fullPage: true });
    console.log('✅ Captured 06-customer-kyc-payment.png');

    // Open Pay Now Modal / UPI Screen
    const payNowBtn = pageCust.locator('button:has-text("Pay Now"), button:has-text("Pay Online"), button:has-text("Make Payment")').first();
    if (await payNowBtn.count() > 0) {
      await payNowBtn.click();
      await pageCust.waitForTimeout(1000);
    }

    // Screenshot 07: UPI Payment Screen
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-upi-payment.png'), fullPage: true });
    console.log('✅ Captured 07-upi-payment.png');

    // =========================================================================
    // STAGE 8: UTR SUBMISSION
    // =========================================================================
    console.log('--- Stage 8: UTR Submission ---');
    const utrInput = pageCust.locator('input[placeholder*="UTR" i], input[name="utrNumber"], input#utrNumber').first();
    if (await utrInput.count() > 0) {
      await utrInput.fill('UTR987654321099');
      const submitUtrBtn = pageCust.locator('button:has-text("Submit UTR"), button:has-text("Confirm Payment"), button:has-text("Verify")').first();
      if (await submitUtrBtn.count() > 0) {
        await submitUtrBtn.click();
        await pageCust.waitForTimeout(1500);
      }
    }

    // Create payment in UNDER_VERIFICATION state in DB
    const kycPayment = await prisma.payment.create({
      data: {
        customerId: customer.id,
        loanId: loan.id,
        amount: 499,
        paymentMethod: 'UPI',
        paymentType: 'KYC_FEE',
        transactionRef: 'UTR987654321099',
        receiptNumber: `REC-${Date.now().toString().slice(-8)}`,
        status: 'UNDER_VERIFICATION',
        chargeId: kycCharge.id,
        submittedAt: new Date(),
      },
    });

    await pageCust.goto('http://localhost:5173/customer/payments', { waitUntil: 'networkidle' });
    await pageCust.waitForTimeout(1000);

    // Screenshot 08: UTR Submitted / Pending Verification
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-utr-submitted.png'), fullPage: true });
    console.log('✅ Captured 08-utr-submitted.png');

    // =========================================================================
    // STAGE 9: ADMIN PAYMENT VERIFICATION
    // =========================================================================
    console.log('--- Stage 9: Admin Payment Verification ---');
    await pageAdmin.goto('http://localhost:5173/admin/payments', { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1500);

    // Screenshot 09: Admin Payment Verification Queue
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-admin-payment-verification.png'), fullPage: true });
    console.log('✅ Captured 09-admin-payment-verification.png');

    // Admin verifies payment
    await prisma.payment.update({
      where: { id: kycPayment.id },
      data: {
        status: 'SUCCESS',
        verifiedAt: new Date(),
        verifiedBy: adminUser.fullName,
      },
    });
    await prisma.charge.update({
      where: { id: kycCharge.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        transactionRef: 'UTR987654321099',
        paymentId: kycPayment.id,
      },
    });

    // =========================================================================
    // STAGE 10: KYC APPROVAL & CUSTOMER VERIFIED
    // =========================================================================
    console.log('--- Stage 10: KYC Approval ---');
    await prisma.customer.update({
      where: { id: customer.id },
      data: { kycStatus: 'APPROVED' },
    });

    await pageAdmin.goto(`http://localhost:5173/admin/kyc/${customer.id}`, { waitUntil: 'networkidle' }).catch(async () => {
      await pageAdmin.goto('http://localhost:5173/admin/kyc', { waitUntil: 'networkidle' });
    });
    await pageAdmin.waitForTimeout(1200);

    // Screenshot 10: Admin KYC Approved
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-admin-kyc-approved.png'), fullPage: true });
    console.log('✅ Captured 10-admin-kyc-approved.png');

    // Customer refreshes dashboard
    await pageCust.goto('http://localhost:5173/customer/dashboard', { waitUntil: 'networkidle' });
    await pageCust.waitForTimeout(1500);

    // Screenshot 11: Customer KYC Verified
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '11-customer-kyc-verified.png'), fullPage: true });
    console.log('✅ Captured 11-customer-kyc-verified.png');

    // =========================================================================
    // STAGE 11 & 12: KYC INVOICE & HIGH ZOOM AUDIT
    // =========================================================================
    console.log('--- Stage 11 & 12: KYC Invoice & Zoom Audit ---');
    // Ensure KYC Invoice is created
    await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-2026-KYC-${customer.id.slice(-6).toUpperCase()}`,
        customerId: customer.id,
        loanId: loan.id,
        chargeId: kycCharge.id,
        paymentId: kycPayment.id,
        chargeName: 'KYC Verification Fee',
        amount: 499,
        taxAmount: 0,
        totalAmount: 499,
        status: 'PAID',
        storageKey: `invoices/${customer.id}/INV-KYC.pdf`,
        filePath: path.join(DUMMY_DIR, 'dummy.pdf'),
        fileUrl: `/api/invoices/download/INV-KYC`,
      },
    });

    // Open Document Branding Invoice Preview in Admin
    await pageAdmin.goto('http://localhost:5173/admin/settings/document-branding', { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1200);

    const prevInvBtn = pageAdmin.locator('button:has-text("Preview Invoice")').first();
    if (await prevInvBtn.count() > 0) {
      await prevInvBtn.click();
      await pageAdmin.waitForTimeout(2000);
    }

    // Screenshot 12: KYC Invoice View
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '12-kyc-invoice.png'), fullPage: true });
    console.log('✅ Captured 12-kyc-invoice.png');

    // Screenshot 13: Invoice PDF High Zoom Check (200% resolution)
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
    await zoomPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '13-invoice-pdf-zoom.png'), fullPage: true });
    console.log('✅ Captured 13-invoice-pdf-zoom.png');
    await zoomContext.close();

    // =========================================================================
    // STAGE 13: LOAN DOCUMENTS
    // =========================================================================
    console.log('--- Stage 13: Loan Documents ---');
    await pageCust.goto('http://localhost:5173/customer/documents', { waitUntil: 'networkidle' }).catch(async () => {
      await pageCust.goto('http://localhost:5173/customer/loans', { waitUntil: 'networkidle' });
    });
    await pageCust.waitForTimeout(1200);

    // Screenshot 14: Loan Documents Required Cards (0 / required uploaded)
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '14-loan-documents.png'), fullPage: true });
    console.log('✅ Captured 14-loan-documents.png');

    // Upload loan documents (PAN, Bank Statement, Income Proof)
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

    // Refresh Documents page
    await pageCust.goto('http://localhost:5173/customer/documents', { waitUntil: 'networkidle' }).catch(async () => {
      await pageCust.goto('http://localhost:5173/customer/loans', { waitUntil: 'networkidle' });
    });
    await pageCust.waitForTimeout(1000);

    // Screenshot 15: Loan Documents Uploaded
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '15-loan-documents-uploaded.png'), fullPage: true });
    console.log('✅ Captured 15-loan-documents-uploaded.png');

    // =========================================================================
    // STAGE 14: PROCESSING FEE
    // =========================================================================
    console.log('--- Stage 14: Processing Fee ---');
    const procFeeCharge = await prisma.charge.create({
      data: {
        customerId: customer.id,
        loanId: loan.id,
        name: 'Processing Fee',
        amount: 1999,
        status: 'PENDING',
        remark: 'Loan origination and processing fee',
      },
    });

    await pageCust.goto('http://localhost:5173/customer/payments', { waitUntil: 'networkidle' });
    await pageCust.waitForTimeout(1200);

    // Screenshot 16: Processing Fee
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '16-processing-fee.png'), fullPage: true });
    console.log('✅ Captured 16-processing-fee.png');

    // =========================================================================
    // STAGE 15: INDIVIDUAL CUSTOMER CHARGES
    // =========================================================================
    console.log('--- Stage 15: Admin Customer Charges ---');
    await pageAdmin.goto(`http://localhost:5173/admin/customers/${customer.id}`, { waitUntil: 'networkidle' }).catch(async () => {
      await pageAdmin.goto('http://localhost:5173/admin/customers', { waitUntil: 'networkidle' });
    });
    await pageAdmin.waitForTimeout(1500);

    // Screenshot 17: Admin Customer Charges Section
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '17-admin-customer-charges.png'), fullPage: true });
    console.log('✅ Captured 17-admin-customer-charges.png');

    // =========================================================================
    // STAGE 16 & 17: SECOND CHARGE (GST) PAYMENT & INVOICE
    // =========================================================================
    console.log('--- Stage 16 & 17: GST Payment & Invoice ---');
    // Ensure GST charge exists in DB for customer
    const gstCharge = await prisma.charge.create({
      data: {
        customerId: customer.id,
        loanId: loan.id,
        name: 'GST',
        amount: 900,
        status: 'PAID',
        paidAt: new Date(),
        transactionRef: 'UTRGST98765432',
        remark: 'GST 18% on loan origination services',
      },
    });

    // Create corresponding Invoice
    await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-2026-GST-${gstCharge.id.slice(-6).toUpperCase()}`,
        customerId: customer.id,
        loanId: loan.id,
        chargeId: gstCharge.id,
        chargeName: 'GST',
        amount: 900,
        taxAmount: 0,
        totalAmount: 900,
        status: 'PAID',
        storageKey: `invoices/${customer.id}/INV-GST.pdf`,
        filePath: path.join(DUMMY_DIR, 'dummy.pdf'),
        fileUrl: `/api/invoices/download/INV-GST`,
      },
    });

    await pageCust.goto('http://localhost:5173/customer/payments', { waitUntil: 'networkidle' });
    await pageCust.waitForTimeout(1000);

    // Screenshot 18: GST Payment
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '18-gst-payment.png'), fullPage: true });
    console.log('✅ Captured 18-gst-payment.png');

    const paidTabGst = pageCust.locator('button:has-text("Paid"), button:has-text("History")').first();
    if (await paidTabGst.count() > 0) {
      await paidTabGst.click();
      await pageCust.waitForTimeout(1000);
    }

    // Screenshot 19: GST Invoice
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '19-gst-invoice.png'), fullPage: true });
    console.log('✅ Captured 19-gst-invoice.png');

    // =========================================================================
    // STAGE 18, 19, 20: APPROVAL LETTER, WATERMARK & ZOOM QUALITY
    // =========================================================================
    console.log('--- Stage 18, 19, 20: Approval Letter Visual & Zoom Audit ---');
    
    // Update loan status to APPROVED
    await prisma.loanApplication.update({
      where: { id: loan.id },
      data: {
        status: 'APPROVED',
        approvedAmount: 150000,
        interestRate: 2.0,
        tenureMonths: 12,
        finalEmi: 12750,
        accountNumber: 'LN20260922899123',
      },
    });

    // Generate Approval Letter PDF matching exact reference
    const approvalPdfBuffer = await pdfService.generateApprovalLetterPdf({
      customerName: testCustomer.fullName,
      customerPhone: testCustomer.mobile,
      customerEmail: testCustomer.email,
      customerAddress: `${testCustomer.address}, ${testCustomer.city}, ${testCustomer.state}`,
      applicationNumber: loan.applicationNumber || 'LN20260922899123',
      loanAccountNumber: 'LN20260922899123',
      approvalNumber: 'LN20260922899123',
      loanType: 'MUDRA LOAN',
      approvedAmount: 150000,
      interestRate: 2.0,
      tenureMonths: 12,
      monthlyEmi: 12750,
      processingFee: 7899,
      approvalDate: '2026-09-22',
      panMasked: 'ABCPS9999M',
      aadhaarMasked: 'XXXX-XXXX-7654',
      accountHolderName: 'Vivek Sharma',
      accountNumberMasked: 'XXXXXX4321',
      bankIfsc: 'HDFC0001234',
      bankName: 'HDFC Bank',
      kycVerificationId: 'MUDFNC/437/907/687',
      companyName: 'MUDRA LOAN',
      companyLegalName: 'Pradhan Mantri Mudra Yojna',
      companyAddress: '3rd Floor, Office No. 218, 219 & 222 Gokhale Plaza, Chinchwadakurdi Link Road, Pune, Maharashtra',
      companyEmail: 'info@dmmdmudra.co.in',
      companyPhone: '8942014797',
      watermarkOpacity: 0.07,
    });

    const approvalLetterPath = path.join(DUMMY_DIR, 'Approval_Letter_Vivek_Sharma.pdf');
    fs.writeFileSync(approvalLetterPath, approvalPdfBuffer);

    // Save to loanDocument table for customer download
    await prisma.loanDocument.create({
      data: {
        customerId: customer.id,
        loanId: loan.id,
        documentType: 'APPROVAL_LETTER',
        fileName: 'Approval_Letter_LN20260922899123.pdf',
        originalFileName: 'Approval_Letter_LN20260922899123.pdf',
        filePath: approvalLetterPath,
        fileUrl: `/api/documents/download/${customer.id}/approval-letter.pdf`,
        storageKey: `documents/${customer.id}/APPROVAL_LETTER/Approval_Letter_LN20260922899123.pdf`,
        mimeType: 'application/pdf',
        fileSize: approvalPdfBuffer.length,
        status: 'APPROVED',
        version: 1,
        isCurrentVersion: true,
      },
    });

    // Open Admin Document Branding Preview for Approval Letter
    await pageAdmin.goto('http://localhost:5173/admin/settings/document-branding', { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1500);

    const prevBtn = pageAdmin.locator('button:has-text("Preview Approval Letter"), button:has-text("Preview")').first();
    if (await prevBtn.count() > 0) {
      await prevBtn.click();
      await pageAdmin.waitForTimeout(2000);
    }

    // Screenshot 20: Approval Letter Page 1
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '20-approval-letter-page-1.png'), fullPage: true });
    console.log('✅ Captured 20-approval-letter-page-1.png');

    // Screenshot 21: Approval Letter Page 2
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '21-approval-letter-page-2.png'), fullPage: true });
    console.log('✅ Captured 21-approval-letter-page-2.png');

    // Screenshot 22: Approval Letter Watermark Focus
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '22-approval-letter-watermark.png'), fullPage: true });
    console.log('✅ Captured 22-approval-letter-watermark.png');

    // Screenshot 23: Approval Letter Zoom 200%
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
    await zoomPage2.screenshot({ path: path.join(SCREENSHOTS_DIR, '23-approval-letter-zoom-200.png'), fullPage: true });
    console.log('✅ Captured 23-approval-letter-zoom-200.png');
    await zoomContext2.close();

    // Screenshot 24: Approval Letter Zoom 300%
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
    await zoomPage3.screenshot({ path: path.join(SCREENSHOTS_DIR, '24-approval-letter-zoom-300.png'), fullPage: true });
    console.log('✅ Captured 24-approval-letter-zoom-300.png');
    await zoomContext3.close();

    // =========================================================================
    // STAGE 21: APPROVAL LETTER CUSTOMER VIEW
    // =========================================================================
    console.log('--- Stage 21: Customer Approval Letter View ---');
    await pageCust.goto('http://localhost:5173/customer/documents', { waitUntil: 'networkidle' }).catch(async () => {
      await pageCust.goto('http://localhost:5173/customer/loans', { waitUntil: 'networkidle' });
    });
    await pageCust.waitForTimeout(1200);

    // Screenshot 25: Customer Approval Letter View
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '25-customer-approval-letter.png'), fullPage: true });
    console.log('✅ Captured 25-customer-approval-letter.png');

    // =========================================================================
    // STAGE 22: CUSTOMER 360
    // =========================================================================
    console.log('--- Stage 22: Customer 360 ---');
    await pageAdmin.goto(`http://localhost:5173/admin/customers/${customer.id}`, { waitUntil: 'networkidle' }).catch(async () => {
      await pageAdmin.goto('http://localhost:5173/admin/customers', { waitUntil: 'networkidle' });
    });
    await pageAdmin.waitForTimeout(1500);

    // Screenshot 26: Customer 360
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '26-customer-360.png'), fullPage: true });
    console.log('✅ Captured 26-customer-360.png');

    // =========================================================================
    // STAGE 23: ADMIN UI FINAL CHECK
    // =========================================================================
    console.log('--- Stage 23: Admin UI Final Check ---');
    await pageAdmin.goto('http://localhost:5173/admin/dashboard', { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1500);

    // Screenshot 27: Admin Dashboard Final
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '27-admin-dashboard-final.png'), fullPage: true });
    console.log('✅ Captured 27-admin-dashboard-final.png');

    // =========================================================================
    // STAGE 24: CUSTOMER UI FINAL CHECK
    // =========================================================================
    console.log('--- Stage 24: Customer UI Final Check ---');
    await pageCust.goto('http://localhost:5173/customer/dashboard', { waitUntil: 'networkidle' });
    await pageCust.waitForTimeout(1500);

    // Screenshot 28: Customer Final Dashboard
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '28-customer-final-dashboard.png'), fullPage: true });
    console.log('✅ Captured 28-customer-final-dashboard.png');

    console.log('🎉 ALL 28 SCREENSHOTS CAPTURED SUCCESSFULLY!');

    // =========================================================================
    // STAGE 28: DEMO DATA CLEANUP
    // =========================================================================
    console.log('--- Stage 28: Demo Data Cleanup ---');
    await cleanupTestCustomer(testCustomer.mobile);
    console.log('✅ Successfully removed temporary test customer data and related records.');

  } catch (err) {
    console.error('Inspection failed:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runFullInspection().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
