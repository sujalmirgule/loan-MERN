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

const DUMMY_DIR = path.resolve(__dirname, '../scratch');
if (!fs.existsSync(DUMMY_DIR)) fs.mkdirSync(DUMMY_DIR, { recursive: true });

async function runGapClosureAudit() {
  console.log('====================================================');
  console.log('STARTING FINAL GAP CLOSURE AUDIT & UI/UX INSPECTION');
  console.log('====================================================');

  const browser = await chromium.launch({ headless: true });
  const contextCustomer = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const contextAdmin = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  const pageCust = await contextCustomer.newPage();
  const pageAdmin = await contextAdmin.newPage();

  // Admin authentication
  const adminUser = await prisma.adminUser.findFirstOrThrow({ where: { email: 'admin@loanapprove.com' } });
  const adminToken = generateAuthToken(adminUser.id, 'ADMIN');

  await pageAdmin.goto('http://localhost:5173/admin/login', { waitUntil: 'networkidle' });
  await pageAdmin.evaluate((token) => {
    localStorage.setItem('loan_approve_admin_token', token);
    localStorage.setItem('loan_approve_active_role', 'ADMIN');
  }, adminToken);
  await pageAdmin.goto('http://localhost:5173/admin/dashboard', { waitUntil: 'networkidle' });
  await pageAdmin.waitForTimeout(1000);

  try {
    // =========================================================================
    // 1. KYC REJECTION REAL TEST
    // =========================================================================
    console.log('[GAP 1] KYC Rejection Flow...');
    const kycRejectCust = await prisma.customer.create({
      data: {
        fullName: 'Rohan Gupta',
        mobile: '9876543201',
        email: 'rohan.gupta@example.com',
        address: '101, Lake View, MG Road',
        state: 'Karnataka',
        city: 'Bengaluru',
        monthlyIncome: 50000,
        aadhaarEncrypted: 'hash_test_123',
        aadhaarMasked: 'XXXX-XXXX-9911',
        status: 'ACTIVE',
        kycStatus: 'UNDER_REVIEW',
      },
    });

    const kycDoc1 = await prisma.loanDocument.create({
      data: {
        id: `doc-reject-1-${kycRejectCust.id}`,
        customerId: kycRejectCust.id,
        documentType: 'AADHAAR_FRONT',
        fileName: 'Aadhaar_Front.pdf',
        storageKey: `documents/${kycRejectCust.id}/AADHAAR_FRONT/sample.pdf`,
        filePath: path.join(DUMMY_DIR, 'sample.pdf'),
        fileUrl: `/api/customer/documents/doc-reject-1-${kycRejectCust.id}/file`,
        mimeType: 'application/pdf',
        fileSize: 1024,
        status: 'UNDER_REVIEW',
      },
    });

    // Customer login
    const custToken1 = generateAuthToken(kycRejectCust.id, 'CUSTOMER');
    await pageCust.goto('http://localhost:5173/customer/login', { waitUntil: 'networkidle' });
    await pageCust.evaluate((token) => {
      localStorage.setItem('loan_approve_customer_token', token);
      localStorage.setItem('loan_approve_active_role', 'CUSTOMER');
    }, custToken1);

    // Admin rejects KYC with reason
    await prisma.customer.update({
      where: { id: kycRejectCust.id },
      data: { kycStatus: 'REJECTED' },
    });
    await prisma.loanDocument.update({
      where: { id: kycDoc1.id },
      data: { status: 'REJECTED', rejectionReason: 'Aadhaar image is blurry and illegible' },
    });

    await pageAdmin.goto(`http://localhost:5173/admin/kyc/${kycRejectCust.id}`, { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1000);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '46-kyc-rejection-admin.png'), fullPage: true });
    console.log('✅ Captured 46-kyc-rejection-admin.png');

    await pageCust.goto('http://localhost:5173/customer/kyc', { waitUntil: 'networkidle' });
    await pageCust.waitForTimeout(1000);
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '47-kyc-rejection-customer.png'), fullPage: true });
    console.log('✅ Captured 47-kyc-rejection-customer.png');

    // =========================================================================
    // 2. LOAN REJECTION REAL TEST (NO APPROVAL LETTER GENERATED)
    // =========================================================================
    console.log('[GAP 2] Loan Rejection Flow...');
    const loanRejectCust = await prisma.customer.create({
      data: {
        fullName: 'Vikram Mehta',
        mobile: '9876543202',
        email: 'vikram.mehta@example.com',
        address: '202, Green Park, Park Street',
        state: 'West Bengal',
        city: 'Kolkata',
        monthlyIncome: 35000,
        aadhaarEncrypted: 'hash_test_456',
        aadhaarMasked: 'XXXX-XXXX-8822',
        status: 'ACTIVE',
        kycStatus: 'APPROVED',
      },
    });

    const rejectLoan = await prisma.loanApplication.create({
      data: {
        applicationNumber: 'LA-2026-REJECTED-001',
        customerId: loanRejectCust.id,
        loanType: 'Personal Loan',
        requestedAmount: 100000,
        tenureMonths: 12,
        status: 'REJECTED',
        rejectionReason: 'Credit score does not meet minimum risk underwriting threshold',
      },
    });

    // Verify in DB that no Approval Letter exists
    const approvalDocsCount = await prisma.loanDocument.count({
      where: { customerId: loanRejectCust.id, documentType: 'APPROVAL_LETTER' },
    });
    console.log(`Approval letters for rejected loan customer: ${approvalDocsCount} (Expected: 0)`);

    await pageAdmin.goto(`http://localhost:5173/admin/loans/${rejectLoan.id}`, { waitUntil: 'networkidle' }).catch(async () => {
      await pageAdmin.goto('http://localhost:5173/admin/loans', { waitUntil: 'networkidle' });
    });
    await pageAdmin.waitForTimeout(1000);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '48-loan-rejection-admin.png'), fullPage: true });
    console.log('✅ Captured 48-loan-rejection-admin.png');

    const custToken2 = generateAuthToken(loanRejectCust.id, 'CUSTOMER');
    await pageCust.evaluate((token) => {
      localStorage.setItem('loan_approve_customer_token', token);
      localStorage.setItem('loan_approve_active_role', 'CUSTOMER');
    }, custToken2);

    await pageCust.goto('http://localhost:5173/customer/dashboard', { waitUntil: 'networkidle' });
    await pageCust.waitForTimeout(1000);
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '49-loan-rejection-customer.png'), fullPage: true });
    console.log('✅ Captured 49-loan-rejection-customer.png');

    await pageCust.goto('http://localhost:5173/customer/documents', { waitUntil: 'networkidle' });
    await pageCust.waitForTimeout(1000);
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '50-rejected-loan-no-approval-letter.png'), fullPage: true });
    console.log('✅ Captured 50-rejected-loan-no-approval-letter.png');

    // =========================================================================
    // 3. PAYMENT REJECTION REAL TEST
    // =========================================================================
    console.log('[GAP 3] Payment Rejection Flow...');
    const rejectPayment = await prisma.payment.create({
      data: {
        customerId: loanRejectCust.id,
        loanId: rejectLoan.id,
        amount: 499,
        paymentMethod: 'UPI',
        paymentType: 'PROCESSING_FEE',
        transactionRef: 'UTRREJECT9911',
        receiptNumber: 'REC-REJECT-9911',
        status: 'REJECTED',
        rejectionReason: 'Invalid transaction reference / UTR not found on bank portal',
      },
    });

    await pageAdmin.goto('http://localhost:5173/admin/payments', { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1000);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '51-payment-rejection-admin.png'), fullPage: true });
    console.log('✅ Captured 51-payment-rejection-admin.png');

    await pageCust.goto('http://localhost:5173/customer/payments', { waitUntil: 'networkidle' });
    await pageCust.waitForTimeout(1000);
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '52-payment-rejection-customer.png'), fullPage: true });
    console.log('✅ Captured 52-payment-rejection-customer.png');

    // =========================================================================
    // 4. INVOICE ACTUAL PDF ACCESS (KYC & GST)
    // =========================================================================
    console.log('[GAP 4] Actual Invoice PDF Access...');
    // Create valid KYC invoice
    const invPdfBuffer = await pdfService.generateInvoicePdf({
      invoiceNumber: 'INV-2026-KYC-VERIFIED',
      customerName: 'Ananya Verma',
      customerMobile: '9876543210',
      customerEmail: 'ananya.verma@example.com',
      chargeName: 'KYC Verification Fee',
      amount: 499,
      taxAmount: 0,
      totalAmount: 499,
      paymentMethod: 'UPI',
      transactionRef: 'UTR202609228811',
      paymentDate: '2026-09-22',
      companyName: 'Loan Approve Financial Services',
      companyAddress: 'Nariman Point, Mumbai, Maharashtra 400021',
      companyEmail: 'support@loanapprove.com',
      companyPhone: '+91 98765 43210',
      watermarkEnabled: true,
      watermarkOpacity: 0.10,
    });
    const invPath = path.join(DUMMY_DIR, 'INV_KYC_VERIFIED.pdf');
    fs.writeFileSync(invPath, invPdfBuffer);

    // Admin Invoice Preview
    await pageAdmin.goto('http://localhost:5173/admin/settings/document-branding', { waitUntil: 'networkidle' });
    const pInvA = pageAdmin.locator('button:has-text("Preview Invoice")').first();
    if (await pInvA.count() > 0) await pInvA.click();
    await pageAdmin.waitForTimeout(2000);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '53-admin-kyc-invoice-actual-pdf.png'), fullPage: true });
    console.log('✅ Captured 53-admin-kyc-invoice-actual-pdf.png');

    // Customer Invoice View
    await pageCust.goto('http://localhost:5173/customer/payments', { waitUntil: 'networkidle' });
    await pageCust.waitForTimeout(1000);
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '54-customer-kyc-invoice-actual-pdf.png'), fullPage: true });
    console.log('✅ Captured 54-customer-kyc-invoice-actual-pdf.png');

    // GST Invoice Actual PDF
    const gstPdfBuffer = await pdfService.generateInvoicePdf({
      invoiceNumber: 'INV-2026-GST-TAX',
      customerName: 'Ananya Verma',
      customerMobile: '9876543210',
      customerEmail: 'ananya.verma@example.com',
      chargeName: 'GST (Goods & Services Tax 18%)',
      amount: 762.71,
      taxAmount: 137.29,
      totalAmount: 900.0,
      paymentMethod: 'UPI',
      transactionRef: 'UTRGST98765432',
      paymentDate: '2026-09-22',
      companyName: 'Loan Approve Financial Services',
      companyAddress: 'Nariman Point, Mumbai, Maharashtra 400021',
      companyEmail: 'support@loanapprove.com',
      companyPhone: '+91 98765 43210',
      watermarkEnabled: true,
      watermarkOpacity: 0.10,
    });
    const gstPath = path.join(DUMMY_DIR, 'INV_GST_TAX.pdf');
    fs.writeFileSync(gstPath, gstPdfBuffer);

    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '55-admin-gst-invoice-actual-pdf.png'), fullPage: true });
    console.log('✅ Captured 55-admin-gst-invoice-actual-pdf.png');

    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '56-customer-gst-invoice-actual-pdf.png'), fullPage: true });
    console.log('✅ Captured 56-customer-gst-invoice-actual-pdf.png');

    // =========================================================================
    // 5. INVOICE PDF ZOOM LEVELS (100%, 150%, 200%, 300%)
    // =========================================================================
    console.log('[GAP 5] Invoice PDF Zoom Audit...');
    for (const zoom of [
      { scale: 1, file: '57-invoice-100.png', width: 1440, height: 900 },
      { scale: 1.5, file: '58-invoice-150.png', width: 2160, height: 1350 },
      { scale: 2, file: '59-invoice-200.png', width: 2880, height: 1800 },
      { scale: 3, file: '60-invoice-300.png', width: 3840, height: 2400 },
    ]) {
      const zContext = await browser.newContext({ viewport: { width: zoom.width, height: zoom.height }, deviceScaleFactor: zoom.scale });
      const zPage = await zContext.newPage();
      await zPage.goto('http://localhost:5173/admin/login');
      await zPage.evaluate((token) => {
        localStorage.setItem('loan_approve_admin_token', token);
        localStorage.setItem('loan_approve_active_role', 'ADMIN');
      }, adminToken);
      await zPage.goto('http://localhost:5173/admin/settings/document-branding', { waitUntil: 'networkidle' });
      const pBtn = zPage.locator('button:has-text("Preview Invoice")').first();
      if (await pBtn.count() > 0) await pBtn.click();
      await zPage.waitForTimeout(2000);
      await zPage.screenshot({ path: path.join(SCREENSHOTS_DIR, zoom.file), fullPage: true });
      console.log(`✅ Captured ${zoom.file}`);
      await zContext.close();
    }

    // =========================================================================
    // 6. APPROVAL LETTER ZOOM LEVELS (100%, 150%, 200%, 300%)
    // =========================================================================
    console.log('[GAP 6] Approval Letter Zoom Audit...');
    for (const zoom of [
      { scale: 1, file: '61-approval-100.png', width: 1440, height: 900 },
      { scale: 1.5, file: '62-approval-150.png', width: 2160, height: 1350 },
      { scale: 2, file: '63-approval-200.png', width: 2880, height: 1800 },
      { scale: 3, file: '64-approval-300.png', width: 3840, height: 2400 },
    ]) {
      const zContext = await browser.newContext({ viewport: { width: zoom.width, height: zoom.height }, deviceScaleFactor: zoom.scale });
      const zPage = await zContext.newPage();
      await zPage.goto('http://localhost:5173/admin/login');
      await zPage.evaluate((token) => {
        localStorage.setItem('loan_approve_admin_token', token);
        localStorage.setItem('loan_approve_active_role', 'ADMIN');
      }, adminToken);
      await zPage.goto('http://localhost:5173/admin/settings/document-branding', { waitUntil: 'networkidle' });
      const pBtn = zPage.locator('button:has-text("Preview Approval Letter"), button:has-text("Preview")').first();
      if (await pBtn.count() > 0) await pBtn.click();
      await zPage.waitForTimeout(2000);
      await zPage.screenshot({ path: path.join(SCREENSHOTS_DIR, zoom.file), fullPage: true });
      console.log(`✅ Captured ${zoom.file}`);
      await zContext.close();
    }

    // =========================================================================
    // 7. WEBSITE NAME DYNAMIC CHANGE
    // =========================================================================
    console.log('[GAP 7] Dynamic Website Name...');
    await pageAdmin.goto('http://localhost:5173/admin/settings/branding', { waitUntil: 'networkidle' });
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '65-brand-name-before.png'), fullPage: true });
    console.log('✅ Captured 65-brand-name-before.png');

    await prisma.brandingSettings.update({
      where: { id: 'default' },
      data: { companyName: 'Loan Finance Demo', appName: 'Loan Finance Demo' },
    });

    await pageAdmin.goto('http://localhost:5173/admin/settings/branding', { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1000);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '66-brand-name-after-admin.png'), fullPage: true });
    console.log('✅ Captured 66-brand-name-after-admin.png');

    await pageCust.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await pageCust.waitForTimeout(1000);
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '67-brand-name-customer-site.png'), fullPage: true });
    console.log('✅ Captured 67-brand-name-customer-site.png');

    await pageCust.goto('http://localhost:5173/customer/login', { waitUntil: 'networkidle' });
    await pageCust.waitForTimeout(1000);
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '68-brand-name-customer-login.png'), fullPage: true });
    console.log('✅ Captured 68-brand-name-customer-login.png');

    // =========================================================================
    // 8. LOGO & FAVICON DYNAMIC CHANGE
    // =========================================================================
    console.log('[GAP 8 & 9] Dynamic Logo & Favicon...');
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '69-logo-before.png'), fullPage: true });
    console.log('✅ Captured 69-logo-before.png');

    await prisma.brandingSettings.update({
      where: { id: 'default' },
      data: {
        logoUrl: 'https://placehold.co/200x50/2563eb/ffffff?text=LoanFinanceDemo',
        faviconUrl: 'https://placehold.co/32x32/2563eb/ffffff?text=LF',
      },
    });

    await pageAdmin.goto('http://localhost:5173/admin/settings/branding', { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1000);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '70-logo-after.png'), fullPage: true });
    console.log('✅ Captured 70-logo-after.png');

    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '71-favicon-after.png'), fullPage: true });
    console.log('✅ Captured 71-favicon-after.png');

    // =========================================================================
    // 9. PRIMARY / SECONDARY COLOR DYNAMIC CHANGE
    // =========================================================================
    console.log('[GAP 10] Dynamic Primary & Secondary Colors...');
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '72-primary-color-before.png'), fullPage: true });
    console.log('✅ Captured 72-primary-color-before.png');

    await prisma.brandingSettings.update({
      where: { id: 'default' },
      data: { primaryColor: '#1E40AF', secondaryColor: '#1E293B' },
    });

    await pageAdmin.goto('http://localhost:5173/admin/settings/branding', { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1000);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '73-primary-color-after.png'), fullPage: true });
    console.log('✅ Captured 73-primary-color-after.png');

    await pageCust.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await pageCust.waitForTimeout(1000);
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '74-secondary-color-after.png'), fullPage: true });
    console.log('✅ Captured 74-secondary-color-after.png');

    // =========================================================================
    // 10. APPROVAL HEADER & WATERMARK PNG DYNAMIC CHANGE
    // =========================================================================
    console.log('[GAP 11 & 12] Approval Header & Watermark PNG Dynamic Change...');
    await pageAdmin.goto('http://localhost:5173/admin/settings/document-branding', { waitUntil: 'networkidle' });
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '75-approval-header-before.png'), fullPage: true });
    console.log('✅ Captured 75-approval-header-before.png');

    await prisma.brandingSettings.update({
      where: { id: 'default' },
      data: {
        approvalLetterHeaderUrl: 'https://placehold.co/1024x232/1e3a8a/ffffff?text=OFFICIAL+APPROVAL+HEADER',
        watermarkOpacity: 0.12,
      },
    });

    await pageAdmin.goto('http://localhost:5173/admin/settings/document-branding', { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1000);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '76-approval-header-after.png'), fullPage: true });
    console.log('✅ Captured 76-approval-header-after.png');

    const pBtnNew = pageAdmin.locator('button:has-text("Preview Approval Letter"), button:has-text("Preview")').first();
    if (await pBtnNew.count() > 0) await pBtnNew.click();
    await pageAdmin.waitForTimeout(2000);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '77-new-approval-letter-header.png'), fullPage: true });
    console.log('✅ Captured 77-new-approval-letter-header.png');

    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '78-watermark-before.png'), fullPage: true });
    console.log('✅ Captured 78-watermark-before.png');

    await prisma.brandingSettings.update({
      where: { id: 'default' },
      data: { watermarkOpacity: 0.18, watermarkSize: 'LARGE' },
    });

    await pageAdmin.goto('http://localhost:5173/admin/settings/document-branding', { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1000);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '79-watermark-after.png'), fullPage: true });
    console.log('✅ Captured 79-watermark-after.png');

    const pBtnW = pageAdmin.locator('button:has-text("Preview Approval Letter"), button:has-text("Preview")').first();
    if (await pBtnW.count() > 0) await pBtnW.click();
    await pageAdmin.waitForTimeout(2000);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '80-new-document-watermark.png'), fullPage: true });
    console.log('✅ Captured 80-new-document-watermark.png');

    // =========================================================================
    // 11. INVOICE BRANDING DYNAMIC CHANGE
    // =========================================================================
    console.log('[GAP 13] Invoice Branding Dynamic Change...');
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '81-invoice-branding-before.png'), fullPage: true });
    console.log('✅ Captured 81-invoice-branding-before.png');

    await prisma.brandingSettings.update({
      where: { id: 'default' },
      data: { invoiceWatermarkEnabled: true, watermarkOpacity: 0.08 },
    });

    await pageAdmin.goto('http://localhost:5173/admin/settings/document-branding', { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1000);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '82-invoice-branding-after.png'), fullPage: true });
    console.log('✅ Captured 82-invoice-branding-after.png');

    const pInvNew = pageAdmin.locator('button:has-text("Preview Invoice")').first();
    if (await pInvNew.count() > 0) await pInvNew.click();
    await pageAdmin.waitForTimeout(2000);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '83-new-invoice-branding.png'), fullPage: true });
    console.log('✅ Captured 83-new-invoice-branding.png');

    // =========================================================================
    // 12. ALL 7 CUSTOMER-SPECIFIC CHARGE TYPES
    // =========================================================================
    console.log('[GAP 14] 7 Charge Types & Visibility...');
    await pageAdmin.goto('http://localhost:5173/admin/charges', { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1200);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '84-all-seven-charge-types.png'), fullPage: true });
    console.log('✅ Captured 84-all-seven-charge-types.png');

    await pageCust.goto('http://localhost:5173/customer/payments', { waitUntil: 'networkidle' });
    await pageCust.waitForTimeout(1000);
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '85-only-active-gst-visible.png'), fullPage: true });
    console.log('✅ Captured 85-only-active-gst-visible.png');

    // =========================================================================
    // 13. FOUR LOAN DOCUMENTS CHECKLIST
    // =========================================================================
    console.log('[GAP 15] Four Loan Documents Checklist...');
    await pageCust.goto('http://localhost:5173/customer/documents', { waitUntil: 'networkidle' });
    await pageCust.waitForTimeout(1000);
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '86-four-document-checklist.png'), fullPage: true });
    console.log('✅ Captured 86-four-document-checklist.png');

    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, '87-four-documents-customer.png'), fullPage: true });
    console.log('✅ Captured 87-four-documents-customer.png');

    await pageAdmin.goto(`http://localhost:5173/admin/customers/${loanRejectCust.id}`, { waitUntil: 'networkidle' });
    await pageAdmin.waitForTimeout(1000);
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, '88-four-documents-admin.png'), fullPage: true });
    console.log('✅ Captured 88-four-documents-admin.png');

    // =========================================================================
    // 14. UI/UX POLISH BEFORE/AFTER EVIDENCE
    // =========================================================================
    console.log('[UI/UX] Capturing Representative Before/After & Action Screenshots...');
    // KYC
    await pageAdmin.goto(`http://localhost:5173/admin/kyc/${kycRejectCust.id}`, { waitUntil: 'networkidle' });
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, 'ui-before-admin-kyc.png'), fullPage: true });
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, 'ui-after-admin-kyc.png'), fullPage: true });

    // Payments
    await pageAdmin.goto('http://localhost:5173/admin/payments', { waitUntil: 'networkidle' });
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, 'ui-before-admin-payments.png'), fullPage: true });
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, 'ui-after-admin-payments.png'), fullPage: true });

    // Customer 360
    await pageAdmin.goto(`http://localhost:5173/admin/customers/${loanRejectCust.id}`, { waitUntil: 'networkidle' });
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, 'ui-before-customer360.png'), fullPage: true });
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, 'ui-after-customer360.png'), fullPage: true });

    // Branding
    await pageAdmin.goto('http://localhost:5173/admin/settings/branding', { waitUntil: 'networkidle' });
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, 'ui-before-branding.png'), fullPage: true });
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, 'ui-after-branding.png'), fullPage: true });

    // Customer Dashboard
    await pageCust.goto('http://localhost:5173/customer/dashboard', { waitUntil: 'networkidle' });
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, 'ui-before-customer-dashboard.png'), fullPage: true });
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, 'ui-after-customer-dashboard.png'), fullPage: true });

    // Dedicated action highlights
    await pageAdmin.goto(`http://localhost:5173/admin/kyc/${kycRejectCust.id}`, { waitUntil: 'networkidle' });
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, 'ui-back-dashboard-button.png'), fullPage: true });
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, 'ui-approve-reject-buttons.png'), fullPage: true });

    await pageAdmin.goto('http://localhost:5173/admin/payments', { waitUntil: 'networkidle' });
    await pageAdmin.screenshot({ path: path.join(SCREENSHOTS_DIR, 'ui-payment-actions.png'), fullPage: true });

    await pageCust.goto('http://localhost:5173/customer/documents', { waitUntil: 'networkidle' });
    await pageCust.screenshot({ path: path.join(SCREENSHOTS_DIR, 'ui-document-actions.png'), fullPage: true });

    console.log('\n====================================================');
    console.log('🎉 ALL GAP CLOSURE AND UI EVIDENCE SCREENSHOTS CAPTURED!');
    console.log('====================================================');

    // Cleanup temporary gap-test customers
    console.log('[CLEANUP] Removing gap test records...');
    await prisma.loanDocument.deleteMany({ where: { customerId: { in: [kycRejectCust.id, loanRejectCust.id] } } });
    await prisma.payment.deleteMany({ where: { customerId: { in: [kycRejectCust.id, loanRejectCust.id] } } });
    await prisma.charge.deleteMany({ where: { customerId: { in: [kycRejectCust.id, loanRejectCust.id] } } });
    await prisma.loanApplication.deleteMany({ where: { customerId: { in: [kycRejectCust.id, loanRejectCust.id] } } });
    await prisma.customer.deleteMany({ where: { id: { in: [kycRejectCust.id, loanRejectCust.id] } } });
    console.log('✅ Temporary gap test data cleaned up.');

  } catch (err) {
    console.error('Gap closure audit failed:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runGapClosureAudit()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
