import { prisma } from '../src/services/db';
import { documentService } from '../src/services/documentService';
import { dashboardService } from '../src/services/dashboardService';
import { loanApplicationService } from '../src/services/loanApplicationService';
import { paymentService } from '../src/services/paymentService';
import { pdfService } from '../src/services/pdfService';
import { specificChargesService, ALLOWED_SPECIFIC_CHARGE_TYPES } from '../src/services/specificChargesService';
import { updateDocumentBrandingSchema, updateBrandingSchema } from '../src/validators/phase5Validators';

async function main() {
  console.log('========================================================');
  console.log('LOAN APPROVE — FINAL TARGETED GAP CLOSURE VERIFICATION');
  console.log('========================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] ${testName}${detail ? ` (${detail})` : ''}`);
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` - Detail: ${detail}` : ''}`);
    }
  }

  // Find our golden test customer
  const customer = await prisma.customer.findFirst({
    where: { mobile: '6589423115' },
    include: {
      loans: { orderBy: { createdAt: 'desc' } },
      charges: true,
      documents: true,
      invoices: true,
    },
  });

  if (!customer) {
    console.error('[ERROR] Golden customer 6589423115 not found!');
    process.exit(1);
  }

  console.log(`Found Customer: ${customer.fullName} (${customer.mobile}), KYC: ${customer.kycStatus}`);

  // TEST 1: documentService.listCustomerDocuments returns top-level kycStatus
  const docsResult = await documentService.listCustomerDocuments(customer.id);
  assert(
    docsResult.kycStatus === customer.kycStatus && docsResult.customer.kycStatus === customer.kycStatus,
    'TEST 1: documentService.listCustomerDocuments provides both top-level and nested kycStatus',
    `kycStatus = ${docsResult.kycStatus}`
  );

  // TEST 2: KYC is Approved => Dashboard KYC Progress is 100%
  const dashboardData = await dashboardService.getCustomerDashboardData(customer.id);
  assert(
    dashboardData.kycSummary.progressPercent === 100,
    'TEST 2: Dashboard computes 100% KYC progress for APPROVED customer',
    `progress = ${dashboardData.kycSummary.progressPercent}%`
  );

  // TEST 3: Dashboard data includes customer invoices
  assert(
    Array.isArray(dashboardData.invoices) && dashboardData.invoices.length > 0,
    'TEST 3: Dashboard data includes customer invoices array',
    `invoices count = ${dashboardData.invoices?.length}`
  );

  // TEST 4: One-Loan-Per-Mobile Rule Backend Enforcement
  const eligibility = await loanApplicationService.checkEligibility(customer.id);
  assert(
    eligibility.canApply === false && Boolean(eligibility.activeApplication),
    'TEST 4: checkEligibility detects existing active application and returns canApply: false',
    `activeApp = ${eligibility.activeApplication?.applicationNumber}`
  );

  let duplicateBlocked = false;
  try {
    await loanApplicationService.createApplication(
      customer.id,
      { amount: 50000, tenureMonths: 12, purpose: 'Duplicate test' },
      { id: customer.id, role: 'CUSTOMER', fullName: customer.fullName } as any
    );
  } catch (err: any) {
    if (err.errorCode === 'ACTIVE_APPLICATION_EXISTS' || err.message?.includes('active loan application')) {
      duplicateBlocked = true;
    }
  }
  assert(
    duplicateBlocked,
    'TEST 5: createApplication rejects duplicate loan when an active application is present',
    'Blocked with ACTIVE_APPLICATION_EXISTS'
  );

  // TEST 6: Admin listPayments returns accurate chargeType
  const paymentsList = await paymentService.listPayments({ limit: 10 });
  const kycPayment = paymentsList.payments.find(p => p.customerId === customer.id);
  assert(
    Boolean(kycPayment && kycPayment.chargeType?.includes('KYC')),
    'TEST 6: Admin listPayments resolves actual chargeType (KYC Verification Charge)',
    `chargeType = ${kycPayment?.chargeType}`
  );

  // TEST 7: Document branding validator accepts relative storage paths
  const relativeBrandingTest = updateDocumentBrandingSchema.safeParse({
    approvalLetterHeaderUrl: '/uploads/branding/header-sample.png',
    watermarkLogoUrl: '/uploads/branding/watermark-sample.png',
    documentWatermarkEnabled: true,
    invoiceWatermarkEnabled: true,
    watermarkOpacity: 0.10,
  });
  assert(
    relativeBrandingTest.success,
    'TEST 7: updateDocumentBrandingSchema accepts relative storage URLs',
    relativeBrandingTest.success ? 'Valid' : JSON.stringify(relativeBrandingTest.error?.format())
  );

  const generalBrandingTest = updateBrandingSchema.safeParse({
    companyName: 'Mudra Finance',
    appName: 'Loan App',
    email: 'test@mudra.co',
    phone: '9876543210',
    address: 'Sample Address, Mumbai',
    website: 'https://mudra.co',
    primaryColor: '#047857',
    approvalLetterHeaderUrl: '/uploads/branding/header-sample.png',
    watermarkLogoUrl: '/uploads/branding/watermark-sample.png',
  });
  assert(
    generalBrandingTest.success,
    'TEST 8: updateBrandingSchema accepts relative storage URLs',
    generalBrandingTest.success ? 'Valid' : JSON.stringify(generalBrandingTest.error?.format())
  );

  // TEST 9: Allowed specific charge types includes 'Loan Document Upload Fee'
  assert(
    (ALLOWED_SPECIFIC_CHARGE_TYPES as readonly string[]).includes('Loan Document Upload Fee'),
    'TEST 9: ALLOWED_SPECIFIC_CHARGE_TYPES contains Loan Document Upload Fee',
    'Found in array'
  );

  // TEST 10: PDF Rendering - Invoice PDF generation completes cleanly and returns valid buffer
  const invoicePdf = await pdfService.generateInvoicePdf({
    invoiceNumber: 'INV-TEST-001',
    invoiceDate: new Date(),
    customerName: customer.fullName,
    customerMobile: customer.mobile,
    customerEmail: customer.email,
    customerAddress: 'Pune, Maharashtra',
    applicationNumber: 'LA-TEST-001',
    chargeType: 'KYC Verification Charge',
    chargeDescription: 'Aadhaar identity verification and compliance check',
    amount: 799,
    gstRate: 18,
    gstAmount: 143.82,
    totalAmount: 942.82,
    paymentStatus: 'PAID',
    paymentMethod: 'UPI',
    companyName: 'Mudra Loan Approval',
    companyAddress: 'Pune, Maharashtra',
    companyPhone: '8942014797',
    companyEmail: 'info@mudra.co',
    companyWebsite: 'https://mudra.co',
    authorizedSignatoryName: 'Officer',
    authorizedSignatoryDesignation: 'Manager',
    generatedDate: new Date(),
  });
  assert(
    Buffer.isBuffer(invoicePdf) && invoicePdf.length > 3000,
    'TEST 10: Invoice PDF generated successfully with crisp graphic state',
    `PDF size = ${invoicePdf.length} bytes`
  );

  // TEST 11: Approval Letter PDF generation completes cleanly and returns valid buffer
  const approvalLetterPdf = await pdfService.generateApprovalLetterPdf({
    applicationNumber: 'LA-TEST-001',
    approvalNumber: 'AL-TEST-001',
    approvalDate: new Date(),
    applicantName: customer.fullName,
    applicantMobile: customer.mobile,
    applicantEmail: customer.email,
    approvedAmount: 150000,
    tenureMonths: 24,
    interestRateApr: 10.5,
    emiAmount: 6950,
    purpose: 'Business expansion',
    companyName: 'FAST LOAN FINANCIAL',
    companyLegalName: 'Fast Loan Financial Services Ltd',
  });
  assert(
    Buffer.isBuffer(approvalLetterPdf) && approvalLetterPdf.length > 10000,
    'TEST 11: Approval Letter PDF generated successfully with dynamic company header',
    `PDF size = ${approvalLetterPdf.length} bytes`
  );

  console.log('\n========================================================');
  console.log(`VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('========================================================\n');

  if (passedTests === totalTests) {
    console.log('ALL TESTS PASSED SUCCESSFULLY!');
  } else {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('Fatal Verification Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
