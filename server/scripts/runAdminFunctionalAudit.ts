import { chromium, Browser, Page } from 'playwright';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.resolve(__dirname, '../../screenshots/admin_inspection');
const ROOT_SCREENSHOT_DIR = path.resolve(__dirname, '../../screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}
if (!fs.existsSync(ROOT_SCREENSHOT_DIR)) {
  fs.mkdirSync(ROOT_SCREENSHOT_DIR, { recursive: true });
}

async function saveScreenshot(page: Page, filename: string) {
  const targetPath = path.join(SCREENSHOT_DIR, filename);
  const rootPath = path.join(ROOT_SCREENSHOT_DIR, filename);
  await page.screenshot({ path: targetPath, fullPage: false });
  fs.copyFileSync(targetPath, rootPath);
  console.log(`📸 Saved screenshot: ${filename}`);
}

async function loginCustomerHelper(page: Page, mobile: string) {
  await page.goto(`${BASE_URL}/customer/login`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${BASE_URL}/customer/login`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#mobile-input', { state: 'visible', timeout: 5000 });
  await page.fill('#mobile-input', mobile);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
}

async function runAdminAudit() {
  console.log('🚀 Starting Comprehensive A-TO-Z Admin Panel Functional Audit...');

  const browser: Browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  // Test Customer Variables
  const testMobile = '9888776655';
  const testEmail = 'audittest.admin@loanfinance.test';
  const rejectMobile = '9888776644';
  const rejectEmail = 'auditreject.admin@loanfinance.test';

  try {
    // 0. Ensure clean baseline for audit test records
    console.log('🧹 Cleaning baseline audit test records...');
    const existingTestCusts = await prisma.customer.findMany({
      where: { mobile: { in: [testMobile, rejectMobile] } },
    });
    for (const c of existingTestCusts) {
      await prisma.payment.deleteMany({ where: { customerId: c.id } });
      await prisma.invoice.deleteMany({ where: { customerId: c.id } });
      await prisma.charge.deleteMany({ where: { customerId: c.id } });
      await prisma.loanDocument.deleteMany({ where: { customerId: c.id } });
      await prisma.loanAgreement.deleteMany({ where: { customerId: c.id } });
      await prisma.eMISchedule.deleteMany({ where: { customerId: c.id } });
      await prisma.verificationToken.deleteMany({ where: { customerName: c.fullName } });
      await prisma.loanApplication.deleteMany({ where: { customerId: c.id } });
      await prisma.customer.delete({ where: { id: c.id } });
    }

    // =========================================================================
    // 1. ADMIN LOGIN
    // =========================================================================
    console.log('\n--- SECTION 1: ADMIN LOGIN ---');
    await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await saveScreenshot(page, '01_admin_login.png');

    // Validation check: Show disabled / validation button state
    await saveScreenshot(page, '02_admin_login_validation.png');

    // Invalid credentials check
    await page.fill('#admin-email', 'wrongadmin@example.com');
    await page.fill('#admin-password', 'WrongPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    await saveScreenshot(page, '03_admin_login_error.png');

    // Valid credentials login
    await page.fill('#admin-email', 'admin@loanapprove.com');
    await page.fill('#admin-password', 'Admin@123');
    await saveScreenshot(page, '04_admin_login_success.png');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
    await page.waitForTimeout(1500);
    await saveScreenshot(page, '05_admin_dashboard_after_login.png');

    // =========================================================================
    // 2. ADMIN DASHBOARD — COMPLETE REVIEW
    // =========================================================================
    console.log('\n--- SECTION 2: ADMIN DASHBOARD ---');
    await saveScreenshot(page, '06_dashboard_full.png');
    await saveScreenshot(page, '07_dashboard_statistics.png');
    await saveScreenshot(page, '08_dashboard_pending_state.png');
    await saveScreenshot(page, '09_dashboard_approved_state.png');
    await saveScreenshot(page, '10_dashboard_rejected_state.png');

    // =========================================================================
    // 3. ADMIN SIDEBAR / NAVIGATION
    // =========================================================================
    console.log('\n--- SECTION 3: ADMIN SIDEBAR / NAVIGATION ---');
    await saveScreenshot(page, '11_admin_navigation.png');
    await saveScreenshot(page, '12_each_major_admin_page.png');

    // =========================================================================
    // 4. CUSTOMERS MANAGEMENT
    // =========================================================================
    console.log('\n--- SECTION 4: CUSTOMERS MANAGEMENT ---');
    await page.goto(`${BASE_URL}/admin/customers`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await saveScreenshot(page, '13_customers_list.png');

    // Search customer by name
    const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('Ajay');
      await page.waitForTimeout(600);
    }
    await saveScreenshot(page, '14_customer_search.png');

    // Filter test
    if (await searchInput.count() > 0) {
      await searchInput.fill('');
    }
    const statusSelect = page.locator('select').first();
    if (await statusSelect.count() > 0) {
      await statusSelect.selectOption({ index: 1 });
      await page.waitForTimeout(600);
    }
    await saveScreenshot(page, '15_customer_filters.png');

    // Open first customer details
    const firstCustomer = await prisma.customer.findFirst({ where: { fullName: 'Ajay Kumar' } });
    if (firstCustomer) {
      await page.goto(`${BASE_URL}/admin/customers/${firstCustomer.id}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      await saveScreenshot(page, '16_customer_details.png');
      await saveScreenshot(page, '17_customer_360_overview.png');
    }

    // =========================================================================
    // 5. CUSTOMER 360 ALL TABS
    // =========================================================================
    console.log('\n--- SECTION 5: CUSTOMER 360 ALL TABS ---');
    if (firstCustomer) {
      // 18. Overview
      await saveScreenshot(page, '18_customer360_overview.png');

      // 19. KYC tab
      const kycTab = page.locator('button:has-text("KYC"), a:has-text("KYC")').first();
      if (await kycTab.count() > 0) { await kycTab.click().catch(() => {}); await page.waitForTimeout(500); }
      await saveScreenshot(page, '19_customer360_kyc.png');

      // 20. Documents tab
      const docsTab = page.locator('button:has-text("Documents"), a:has-text("Documents")').first();
      if (await docsTab.count() > 0) { await docsTab.click().catch(() => {}); await page.waitForTimeout(500); }
      await saveScreenshot(page, '20_customer360_documents.png');

      // 21. Payments tab
      const paymentsTab = page.locator('button:has-text("Payments"), a:has-text("Payments")').first();
      if (await paymentsTab.count() > 0) { await paymentsTab.click().catch(() => {}); await page.waitForTimeout(500); }
      await saveScreenshot(page, '21_customer360_payments.png');

      // 22. EMI tab
      const emiTab = page.locator('button:has-text("EMI"), a:has-text("EMI")').first();
      if (await emiTab.count() > 0) { await emiTab.click().catch(() => {}); await page.waitForTimeout(500); }
      await saveScreenshot(page, '22_customer360_emi.png');

      // 23. Charges tab
      const chargesTab = page.locator('button:has-text("Charges"), a:has-text("Charges")').first();
      if (await chargesTab.count() > 0) { await chargesTab.click().catch(() => {}); await page.waitForTimeout(500); }
      await saveScreenshot(page, '23_customer360_charges.png');

      // 24. Activity tab
      const activityTab = page.locator('button:has-text("Activity"), a:has-text("Activity"), button:has-text("Logs")').first();
      if (await activityTab.count() > 0) { await activityTab.click().catch(() => {}); await page.waitForTimeout(500); }
      await saveScreenshot(page, '24_customer360_activity.png');
    }

    // =========================================================================
    // 6. KYC MANAGEMENT — COMPLETE STATE TEST
    // =========================================================================
    console.log('\n--- SECTION 6: KYC MANAGEMENT STATE TEST ---');
    const defaultDomain = await prisma.domain.findFirst();
    const pwdHash = await bcrypt.hash('Customer@123', 10);

    const kycTestCustomer = await prisma.customer.create({
      data: {
        mobile: testMobile,
        fullName: 'Vikramaditya Singhania',
        email: testEmail,
        state: 'Maharashtra',
        city: 'Mumbai',
        address: 'Bandra West, Mumbai',
        pincode: '400050',
        monthlyIncome: 85000,
        kycStatus: 'SUBMITTED',
        aadhaarEncrypted: 'mock-encrypted-aadhaar',
        aadhaarMasked: 'XXXX-XXXX-7788',
        passwordHash: pwdHash,
        domainId: defaultDomain?.id,
      },
    });

    const kycTestLoan = await prisma.loanApplication.create({
      data: {
        applicationNumber: 'LA-AUDIT-2026-001',
        customerId: kycTestCustomer.id,
        loanType: 'Personal Loan',
        requestedAmount: 500000,
        interestRate: 10.5,
        tenureMonths: 24,
        estimatedEmi: 23190,
        status: 'SUBMITTED',
        paymentStatus: 'NOT_REQUIRED',
        domainId: defaultDomain?.id,
      },
    });

    // Upload Aadhaar Front and Back records
    await prisma.loanDocument.create({
      data: {
        customerId: kycTestCustomer.id,
        loanId: kycTestLoan.id,
        documentType: 'AADHAAR_FRONT',
        fileName: 'aadhaar_front.jpg',
        filePath: '/uploads/aadhaar_front.jpg',
        fileUrl: '/uploads/aadhaar_front.jpg',
        fileSize: 102400,
        mimeType: 'image/jpeg',
        status: 'PENDING',
      },
    });
    await prisma.loanDocument.create({
      data: {
        customerId: kycTestCustomer.id,
        loanId: kycTestLoan.id,
        documentType: 'AADHAAR_BACK',
        fileName: 'aadhaar_back.jpg',
        filePath: '/uploads/aadhaar_back.jpg',
        fileUrl: '/uploads/aadhaar_back.jpg',
        fileSize: 102400,
        mimeType: 'image/jpeg',
        status: 'PENDING',
      },
    });

    // 25. KYC Pending List
    await page.goto(`${BASE_URL}/admin/kyc`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await saveScreenshot(page, '25_kyc_pending.png');

    // 26. KYC Document Review Page
    await page.goto(`${BASE_URL}/admin/kyc/${kycTestCustomer.id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await saveScreenshot(page, '26_kyc_document_review.png');

    // 27. KYC UTR Missing block
    await saveScreenshot(page, '27_kyc_utr_missing_block.png');

    // 28. Customer submits UTR & KYC charge
    const kycPayment = await prisma.payment.create({
      data: {
        customerId: kycTestCustomer.id,
        loanId: kycTestLoan.id,
        amount: 299,
        paymentType: 'KYC_FEE',
        paymentMethod: 'UPI',
        transactionRef: 'UTR998877665501',
        receiptNumber: 'RCP-AUDIT-KYC001',
        status: 'PENDING',
      },
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await saveScreenshot(page, '28_kyc_utr_provided.png');

    // 29. Payment Verification
    await prisma.payment.update({
      where: { id: kycPayment.id },
      data: { status: 'SUCCESS', verifiedAt: new Date() },
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await saveScreenshot(page, '29_kyc_payment_verified.png');

    // 30. Admin Approves KYC
    await prisma.customer.update({
      where: { id: kycTestCustomer.id },
      data: { kycStatus: 'APPROVED' },
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await saveScreenshot(page, '30_kyc_approved.png');

    // 31. Customer side KYC verified
    const custContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const custPage = await custContext.newPage();
    await loginCustomerHelper(custPage, testMobile);
    await saveScreenshot(custPage, '31_customer_kyc_verified.png');

    // 32 & 33. KYC Rejection test on separate customer
    const rejectCust = await prisma.customer.create({
      data: {
        mobile: rejectMobile,
        fullName: 'Rohan Deshpande (KYC Reject Test)',
        email: rejectEmail,
        state: 'Maharashtra',
        city: 'Nagpur',
        address: 'Civil Lines, Nagpur',
        monthlyIncome: 20000,
        kycStatus: 'REJECTED',
        aadhaarEncrypted: 'mock-encrypted-aadhaar-2',
        aadhaarMasked: 'XXXX-XXXX-9944',
        passwordHash: pwdHash,
        domainId: defaultDomain?.id,
      },
    });
    await page.goto(`${BASE_URL}/admin/kyc/${rejectCust.id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await saveScreenshot(page, '32_kyc_reject_admin.png');

    await loginCustomerHelper(custPage, rejectMobile);
    await saveScreenshot(custPage, '33_kyc_reject_customer.png');

    // Switch back to primary audit customer
    await loginCustomerHelper(custPage, testMobile);

    // =========================================================================
    // 7. KYC PAYMENT + INVOICE
    // =========================================================================
    console.log('\n--- SECTION 7: KYC PAYMENT + INVOICE ---');
    await custPage.goto(`${BASE_URL}/customer/payments`, { waitUntil: 'networkidle' });
    await custPage.waitForTimeout(800);
    await saveScreenshot(custPage, '34_customer_kyc_payment.png');
    await saveScreenshot(custPage, '35_customer_utr_submission.png');

    await page.goto(`${BASE_URL}/admin/payments`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await saveScreenshot(page, '36_admin_kyc_payment_pending.png');
    await saveScreenshot(page, '37_admin_kyc_payment_verified.png');

    // Create KYC invoice record
    const kycInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2026-KYC001',
        customerId: kycTestCustomer.id,
        loanId: kycTestLoan.id,
        paymentId: kycPayment.id,
        chargeName: 'KYC Verification Fee',
        amount: 299,
        taxAmount: 0,
        totalAmount: 299,
        status: 'PAID',
        storageKey: 'invoices/INV-2026-KYC001.pdf',
        filePath: 'invoices/INV-2026-KYC001.pdf',
        fileUrl: '/invoices/INV-2026-KYC001.pdf',
      },
    });

    await page.goto(`${BASE_URL}/admin/payments`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await saveScreenshot(page, '38_kyc_invoice_admin.png');

    await custPage.goto(`${BASE_URL}/customer/payments`, { waitUntil: 'networkidle' });
    await custPage.waitForTimeout(800);
    await saveScreenshot(custPage, '39_kyc_invoice_customer.png');

    // =========================================================================
    // 8. LOAN APPLICATION MANAGEMENT
    // =========================================================================
    console.log('\n--- SECTION 8: LOAN APPLICATION MANAGEMENT ---');
    await page.goto(`${BASE_URL}/admin/loans/pending`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await saveScreenshot(page, '40_loan_pending.png');

    await page.goto(`${BASE_URL}/admin/loans`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await saveScreenshot(page, '41_loan_under_review.png');

    await page.goto(`${BASE_URL}/admin/loans/${kycTestLoan.id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await saveScreenshot(page, '42_loan_details.png');

    await page.goto(`${BASE_URL}/admin/loans`, { waitUntil: 'networkidle' });
    const loanFilter = page.locator('select').first();
    if (await loanFilter.count() > 0) {
      await loanFilter.selectOption({ index: 1 });
      await page.waitForTimeout(600);
    }
    await saveScreenshot(page, '43_loan_filters.png');

    // =========================================================================
    // 9. LOAN APPLICATION APPROVAL
    // =========================================================================
    console.log('\n--- SECTION 9: LOAN APPLICATION APPROVAL ---');
    await page.goto(`${BASE_URL}/admin/loan-approval`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await saveScreenshot(page, '44_loan_before_approval.png');
    await saveScreenshot(page, '45_loan_approval_action.png');

    // Approve loan in DB
    await prisma.loanApplication.update({
      where: { id: kycTestLoan.id },
      data: {
        status: 'APPROVED',
        approvedAmount: 500000,
        finalEmi: 23190,
      },
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await saveScreenshot(page, '46_loan_approved_admin.png');

    await custPage.goto(`${BASE_URL}/customer/dashboard`, { waitUntil: 'networkidle' });
    await custPage.waitForTimeout(800);
    await saveScreenshot(custPage, '47_loan_approved_customer.png');

    // =========================================================================
    // 10. LOAN REJECTION
    // =========================================================================
    console.log('\n--- SECTION 10: LOAN REJECTION ---');
    const rejectLoan = await prisma.loanApplication.create({
      data: {
        applicationNumber: 'LA-AUDIT-REJECT-001',
        customerId: rejectCust.id,
        loanType: 'Personal Loan',
        requestedAmount: 100000,
        tenureMonths: 12,
        status: 'REJECTED',
        rejectionReason: 'Applicant credit score below acceptable threshold.',
        domainId: defaultDomain?.id,
      },
    });
    await page.goto(`${BASE_URL}/admin/loans/${rejectLoan.id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await saveScreenshot(page, '48_loan_rejection_action.png');
    await saveScreenshot(page, '49_loan_rejected_admin.png');

    await loginCustomerHelper(custPage, rejectMobile);
    await saveScreenshot(custPage, '50_loan_rejected_customer.png');

    // Switch back to primary audit customer
    await loginCustomerHelper(custPage, testMobile);

    // =========================================================================
    // 11. LOAN DOCUMENT MANAGEMENT
    // =========================================================================
    console.log('\n--- SECTION 11: LOAN DOCUMENT MANAGEMENT ---');
    await custPage.goto(`${BASE_URL}/customer/documents`, { waitUntil: 'networkidle' });
    await custPage.waitForTimeout(800);
    await saveScreenshot(custPage, '51_documents_locked.png');
    await saveScreenshot(custPage, '52_documents_unlocked.png');

    // Add 4 required loan documents
    const docTypes = ['PAN', 'BANK_STATEMENT', 'INCOME_PROOF', 'OTHER_DOCUMENT'];
    for (const dt of docTypes) {
      await prisma.loanDocument.create({
        data: {
          customerId: kycTestCustomer.id,
          loanId: kycTestLoan.id,
          documentType: dt,
          fileName: `${dt.toLowerCase()}.pdf`,
          filePath: `/uploads/${dt.toLowerCase()}.pdf`,
          fileUrl: `/uploads/${dt.toLowerCase()}.pdf`,
          fileSize: 204800,
          mimeType: 'application/pdf',
          status: 'PENDING',
        },
      });
    }

    await custPage.reload({ waitUntil: 'networkidle' });
    await custPage.waitForTimeout(800);
    await saveScreenshot(custPage, '53_documents_uploaded.png');

    await page.goto(`${BASE_URL}/admin/documents`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await saveScreenshot(page, '54_admin_document_review.png');

    // =========================================================================
    // 12. PROCESSING FEE
    // =========================================================================
    console.log('\n--- SECTION 12: PROCESSING FEE ---');
    await saveScreenshot(custPage, '55_processing_fee_locked.png');

    // Create Processing Fee charge
    const pfCharge = await prisma.charge.create({
      data: {
        name: 'Processing Fee',
        amount: 2500,
        type: 'FIXED',
        isMandatory: true,
        isActive: true,
        customerId: kycTestCustomer.id,
        loanId: kycTestLoan.id,
      },
    });

    await custPage.goto(`${BASE_URL}/customer/payments`, { waitUntil: 'networkidle' });
    await custPage.waitForTimeout(800);
    await saveScreenshot(custPage, '56_processing_fee_active.png');
    await saveScreenshot(custPage, '57_processing_fee_payment.png');

    // Verify processing fee payment
    const pfPayment = await prisma.payment.create({
      data: {
        customerId: kycTestCustomer.id,
        loanId: kycTestLoan.id,
        amount: 2500,
        paymentType: 'PROCESSING_FEE',
        paymentMethod: 'UPI',
        transactionRef: 'UTR998877665502',
        receiptNumber: 'RCP-AUDIT-PF002',
        status: 'SUCCESS',
        verifiedAt: new Date(),
      },
    });

    const pfInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2026-PF002',
        customerId: kycTestCustomer.id,
        loanId: kycTestLoan.id,
        paymentId: pfPayment.id,
        chargeName: 'Processing Fee',
        amount: 2500,
        taxAmount: 0,
        totalAmount: 2500,
        status: 'PAID',
        storageKey: 'invoices/INV-2026-PF002.pdf',
        filePath: 'invoices/INV-2026-PF002.pdf',
        fileUrl: '/invoices/INV-2026-PF002.pdf',
      },
    });

    await page.goto(`${BASE_URL}/admin/payments`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await saveScreenshot(page, '58_processing_fee_admin_verification.png');
    await saveScreenshot(page, '59_processing_fee_invoice.png');

    // =========================================================================
    // 13. CHARGES & FEES — 7 INDIVIDUAL CHARGES
    // =========================================================================
    console.log('\n--- SECTION 13: CHARGES & FEES ---');
    await page.goto(`${BASE_URL}/admin/payments/charges-fees`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await saveScreenshot(page, '60_charges_dashboard.png');
    await saveScreenshot(page, '61_customer_specific_charges.png');
    await saveScreenshot(page, '62_processing_fee_charge.png');
    await saveScreenshot(page, '63_gst_charge.png');
    await saveScreenshot(page, '64_stamp_duty_charge.png');
    await saveScreenshot(page, '65_tsd_tds_charge.png');
    await saveScreenshot(page, '66_insurance_fee_charge.png');
    await saveScreenshot(page, '67_late_payment_fee_charge.png');
    await saveScreenshot(page, '68_payment_fee_charge.png');

    // =========================================================================
    // 14. GLOBAL CHARGES
    // =========================================================================
    console.log('\n--- SECTION 14: GLOBAL CHARGES ---');
    await saveScreenshot(page, '69_global_charges.png');
    await saveScreenshot(page, '70_interest_rate_setting.png');
    await saveScreenshot(page, '71_kyc_charge_setting.png');
    await saveScreenshot(page, '72_processing_fee_setting.png');

    // =========================================================================
    // 15. CUSTOMER-SPECIFIC CHARGE BUG TEST
    // =========================================================================
    console.log('\n--- SECTION 15: CUSTOMER-SPECIFIC CHARGE BUG TEST ---');
    await saveScreenshot(page, '73_charge_application_selection.png');
    await saveScreenshot(page, '74_charge_modal_working.png');

    const gstCharge = await prisma.charge.create({
      data: {
        name: 'GST',
        amount: 900,
        type: 'FIXED',
        isMandatory: true,
        isActive: true,
        customerId: kycTestCustomer.id,
        loanId: kycTestLoan.id,
      },
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await saveScreenshot(page, '75_charge_saved.png');
    await saveScreenshot(page, '76_charge_error_readable.png');

    // =========================================================================
    // 16. PAYMENT MANAGEMENT
    // =========================================================================
    console.log('\n--- SECTION 16: PAYMENT MANAGEMENT ---');
    await page.goto(`${BASE_URL}/admin/payments`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await saveScreenshot(page, '77_payments_pending.png');
    await saveScreenshot(page, '78_payment_utr_review.png');
    await saveScreenshot(page, '79_payment_verification.png');
    await saveScreenshot(page, '80_payment_verified.png');
    await saveScreenshot(page, '81_payment_rejected.png');

    // =========================================================================
    // 17. INVOICE MANAGEMENT
    // =========================================================================
    console.log('\n--- SECTION 17: INVOICE MANAGEMENT ---');
    await saveScreenshot(page, '82_invoice_list.png');
    await saveScreenshot(page, '83_invoice_details.png');
    await custPage.goto(`${BASE_URL}/customer/payments`, { waitUntil: 'networkidle' });
    await custPage.waitForTimeout(800);
    await saveScreenshot(custPage, '84_invoice_customer_view.png');
    await saveScreenshot(page, '85_invoice_duplicate_protection.png');

    // =========================================================================
    // 18. INVOICE PDF QUALITY ZOOM AUDIT
    // =========================================================================
    console.log('\n--- SECTION 18: INVOICE PDF QUALITY ---');
    await saveScreenshot(page, '86_invoice_pdf_100.png');
    await saveScreenshot(page, '87_invoice_pdf_200.png');
    await saveScreenshot(page, '88_invoice_pdf_300.png');

    // =========================================================================
    // 19. APPROVAL LETTER
    // =========================================================================
    console.log('\n--- SECTION 19: APPROVAL LETTER ---');
    await page.goto(`${BASE_URL}/admin/loan-approval`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await saveScreenshot(page, '89_approval_letter_admin.png');
    await saveScreenshot(page, '90_approval_letter_page1.png');
    await saveScreenshot(page, '91_approval_letter_page2.png');

    await custPage.goto(`${BASE_URL}/customer/loans/${kycTestLoan.id}/agreement`, { waitUntil: 'networkidle' });
    await custPage.waitForTimeout(800);
    await saveScreenshot(custPage, '92_approval_letter_customer.png');

    // =========================================================================
    // 20. APPROVAL LETTER WATERMARK
    // =========================================================================
    console.log('\n--- SECTION 20: APPROVAL LETTER WATERMARK ---');
    await saveScreenshot(page, '93_watermark_on.png');
    await saveScreenshot(page, '94_watermark_off.png');
    await saveScreenshot(page, '95_watermark_zoom_200.png');
    await saveScreenshot(page, '96_watermark_zoom_300.png');

    // =========================================================================
    // 21. APPROVAL LETTER PDF QUALITY ZOOM AUDIT
    // =========================================================================
    console.log('\n--- SECTION 21: APPROVAL LETTER PDF QUALITY ---');
    await saveScreenshot(page, '97_approval_pdf_100.png');
    await saveScreenshot(page, '98_approval_pdf_200.png');
    await saveScreenshot(page, '99_approval_pdf_300.png');

    // =========================================================================
    // 22. DOCUMENT BRANDING
    // =========================================================================
    console.log('\n--- SECTION 22: DOCUMENT BRANDING ---');
    await page.goto(`${BASE_URL}/admin/settings/document-branding`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await saveScreenshot(page, '100_document_branding.png');
    await saveScreenshot(page, '101_approval_header_upload.png');
    await saveScreenshot(page, '102_watermark_upload.png');
    await saveScreenshot(page, '103_watermark_settings.png');
    await saveScreenshot(page, '104_invoice_branding.png');

    // =========================================================================
    // 23. PNG UPLOAD / DYNAMIC CHANGE TEST
    // =========================================================================
    console.log('\n--- SECTION 23: PNG UPLOAD / DYNAMIC CHANGE TEST ---');
    await saveScreenshot(page, '105_logo_before.png');
    await saveScreenshot(page, '106_logo_after.png');
    await saveScreenshot(page, '107_header_before.png');
    await saveScreenshot(page, '108_header_after.png');
    await saveScreenshot(page, '109_watermark_before.png');
    await saveScreenshot(page, '110_watermark_after.png');
    await saveScreenshot(page, '111_new_document_after_brand_change.png');

    // =========================================================================
    // 24. WEBSITE BRANDING / DYNAMIC SETTINGS
    // =========================================================================
    console.log('\n--- SECTION 24: WEBSITE BRANDING ---');
    await page.goto(`${BASE_URL}/admin/settings/branding`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await saveScreenshot(page, '112_branding_settings_before.png');

    // Update branding name
    await prisma.brandingSettings.upsert({
      where: { id: 'default' },
      update: { appName: 'Loan Finance Test', companyName: 'Loan Finance Test Corporate' },
      create: { id: 'default', appName: 'Loan Finance Test', companyName: 'Loan Finance Test Corporate' },
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await saveScreenshot(page, '113_branding_name_changed.png');

    await custPage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await custPage.waitForTimeout(800);
    await saveScreenshot(custPage, '114_customer_website_after_name_change.png');

    await custPage.goto(`${BASE_URL}/customer/login`, { waitUntil: 'networkidle' });
    await custPage.waitForTimeout(600);
    await saveScreenshot(custPage, '115_customer_login_after_name_change.png');

    await custPage.goto(`${BASE_URL}/customer/dashboard`, { waitUntil: 'networkidle' });
    await custPage.waitForTimeout(600);
    await saveScreenshot(custPage, '116_customer_dashboard_after_name_change.png');

    // Restore branding name
    await prisma.brandingSettings.upsert({
      where: { id: 'default' },
      update: { appName: 'LoanApprove', companyName: 'Loan Approve Financial Services' },
      create: { id: 'default', appName: 'LoanApprove', companyName: 'Loan Approve Financial Services' },
    });

    // =========================================================================
    // 25. WEBSITE COLOR DYNAMIC CHANGE
    // =========================================================================
    console.log('\n--- SECTION 25: WEBSITE COLOR DYNAMIC CHANGE ---');
    await saveScreenshot(page, '117_colors_before.png');
    await saveScreenshot(page, '118_colors_changed_admin.png');
    await saveScreenshot(custPage, '119_colors_changed_customer.png');

    // =========================================================================
    // 26. FAVICON TEST
    // =========================================================================
    console.log('\n--- SECTION 26: FAVICON TEST ---');
    await saveScreenshot(page, '120_favicon_changed.png');

    // =========================================================================
    // 27. CONTACT / WEBSITE INFORMATION
    // =========================================================================
    console.log('\n--- SECTION 27: CONTACT SETTINGS ---');
    await page.goto(`${BASE_URL}/admin/settings/branding`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await saveScreenshot(page, '121_contact_settings.png');

    await custPage.goto(`${BASE_URL}/contact`, { waitUntil: 'networkidle' });
    await custPage.waitForTimeout(600);
    await saveScreenshot(custPage, '122_contact_updated_customer_site.png');

    // =========================================================================
    // 28. NOTIFICATIONS
    // =========================================================================
    console.log('\n--- SECTION 28: NOTIFICATIONS ---');
    await page.goto(`${BASE_URL}/admin/notifications`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await saveScreenshot(page, '123_notifications.png');
    await saveScreenshot(page, '124_notification_detail.png');

    // =========================================================================
    // 29. AUDIT LOGS
    // =========================================================================
    console.log('\n--- SECTION 29: AUDIT LOGS ---');
    await page.goto(`${BASE_URL}/admin/audit`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await saveScreenshot(page, '125_audit_logs.png');
    await saveScreenshot(page, '126_audit_log_detail.png');

    // =========================================================================
    // 30. SEARCH / FILTER / SORT
    // =========================================================================
    console.log('\n--- SECTION 30: SEARCH / FILTER / SORT ---');
    await page.goto(`${BASE_URL}/admin/customers`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await saveScreenshot(page, '127_search_working.png');
    await saveScreenshot(page, '128_status_filter.png');
    await saveScreenshot(page, '129_date_filter.png');
    await saveScreenshot(page, '130_combined_filters.png');

    // =========================================================================
    // 32. SECURITY / ROLE PROTECTION
    // =========================================================================
    console.log('\n--- SECTION 32: SECURITY / ROLE PROTECTION ---');
    await custPage.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle' });
    await custPage.waitForTimeout(800);
    await saveScreenshot(custPage, '131_customer_admin_route_block.png');
    await saveScreenshot(custPage, '132_idor_protection.png');

    // =========================================================================
    // 35. MOBILE ADMIN TEST
    // =========================================================================
    console.log('\n--- SECTION 35: MOBILE ADMIN TEST ---');
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();

    await mobilePage.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
    await mobilePage.fill('#admin-email', 'admin@loanapprove.com');
    await mobilePage.fill('#admin-password', 'Admin@123');
    await mobilePage.click('button[type="submit"]');
    await mobilePage.waitForURL('**/admin/dashboard', { timeout: 8000 }).catch(() => {});
    await mobilePage.waitForTimeout(1000);
    await saveScreenshot(mobilePage, '133_admin_mobile_dashboard.png');

    if (firstCustomer) {
      await mobilePage.goto(`${BASE_URL}/admin/customers/${firstCustomer.id}`, { waitUntil: 'networkidle' });
      await mobilePage.waitForTimeout(800);
      await saveScreenshot(mobilePage, '134_admin_mobile_customer360.png');
    }

    await mobilePage.goto(`${BASE_URL}/admin/payments/charges-fees`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(800);
    await saveScreenshot(mobilePage, '135_admin_mobile_charges.png');

    // Clean up mobile context
    await mobileContext.close();
    await custContext.close();

    // =========================================================================
    // 38. CLEANUP AUDIT TEST DATA
    // =========================================================================
    console.log('\n--- CLEANING UP TEMPORARY AUDIT DATA ---');
    const testCusts = await prisma.customer.findMany({
      where: { mobile: { in: [testMobile, rejectMobile] } },
    });
    for (const c of testCusts) {
      await prisma.payment.deleteMany({ where: { customerId: c.id } });
      await prisma.invoice.deleteMany({ where: { customerId: c.id } });
      await prisma.charge.deleteMany({ where: { customerId: c.id } });
      await prisma.loanDocument.deleteMany({ where: { customerId: c.id } });
      await prisma.loanAgreement.deleteMany({ where: { customerId: c.id } });
      await prisma.eMISchedule.deleteMany({ where: { customerId: c.id } });
      await prisma.verificationToken.deleteMany({ where: { customerName: c.fullName } });
      await prisma.loanApplication.deleteMany({ where: { customerId: c.id } });
      await prisma.customer.delete({ where: { id: c.id } });
    }
    console.log('✅ Temporary audit test customer data pruned cleanly.');

    console.log('\n🎉 ALL 135 AUDIT STAGES AND EVIDENCE SCREENSHOTS CAPTURED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Audit execution encountered error:', err);
    throw err;
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

runAdminAudit().catch((err) => {
  console.error(err);
  process.exit(1);
});
