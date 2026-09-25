import { prisma } from '../src/services/db';
import { pdfService } from '../src/services/pdfService';
import fs from 'fs';
import path from 'path';

async function runBrandingAndPdfVerification() {
  console.log('=== STARTING DYNAMIC BRANDING & PDF VERIFICATION ===');

  // 1. Fetch current branding to verify initial state
  const originalBranding = await prisma.brandingSettings.findUnique({ where: { id: 'default' } });
  console.log('Original Company Name:', originalBranding?.companyName);
  console.log('Original Email:', originalBranding?.email);

  // Define SVG data URIs for Test Logo & Test Background/Watermark
  const testLogoSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60" viewBox="0 0 200 60"><rect width="200" height="60" fill="%23dc2626" rx="8"/><text x="100" y="38" fill="white" font-size="16" font-family="sans-serif" text-anchor="middle" font-weight="bold">TEST BRAND LOGO</text></svg>`;
  const testWatermarkSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><circle cx="150" cy="150" r="140" fill="%23fee2e2" stroke="%23dc2626" stroke-width="6"/><text x="150" y="150" fill="%23991b1b" font-size="22" font-family="sans-serif" text-anchor="middle" font-weight="bold">TEST WATERMARK</text></svg>`;

  // 2. Apply TEST Branding configuration
  const testBrandingData = {
    appName: 'TEST FINANCE SERVICES',
    companyName: 'TEST FINANCE SERVICES',
    companyLegalName: 'TEST FINANCE SERVICES PRIVATE LIMITED',
    logoUrl: testLogoSvg,
    watermarkLogoUrl: testWatermarkSvg,
    phone: '9999999999',
    email: 'test@finance-demo.com',
    address: 'Test Business Address, Plot 99, BKC, Mumbai, Maharashtra 400051',
    website: 'https://testfinanceservices.com',
    documentWatermarkEnabled: true,
    invoiceWatermarkEnabled: true,
    watermarkOpacity: 0.15,
    watermarkSize: 'MEDIUM',
    watermarkPosition: 'CENTER',
  };

  console.log('\n--> Saving TEST branding parameters to Aiven MySQL...');
  const updatedBranding = await prisma.brandingSettings.upsert({
    where: { id: 'default' },
    update: testBrandingData,
    create: { id: 'default', ...testBrandingData },
  });

  console.log('DB Persisted Company Name:', updatedBranding.companyName);
  console.log('DB Persisted Email:', updatedBranding.email);
  console.log('DB Persisted Phone:', updatedBranding.phone);
  console.log('DB Persisted Address:', updatedBranding.address);

  // 3. Create a temporary TEST borrower, loan, and charge for PDF verification
  const randomMobile = `99${Date.now().toString().slice(-8)}`;
  const testCustomer = await prisma.customer.create({
    data: {
      fullName: 'Test Borrower BrandCheck',
      mobile: randomMobile,
      email: `borrower.${Date.now()}@test.com`,
      address: '123 Test Street, Mumbai',
      state: 'Maharashtra',
      city: 'Mumbai',
      monthlyIncome: 75000,
      aadhaarEncrypted: 'enc_aadhaar',
      aadhaarMasked: 'XXXX-XXXX-1234',
    },
  });

  const testLoan = await prisma.loanApplication.create({
    data: {
      applicationNumber: 'LA-TEST-BRAND-001',
      accountNumber: 'LN-TEST-BRAND-001',
      approvalNumber: 'AP-TEST-BRAND-001',
      customerId: testCustomer.id,
      requestedAmount: 250000,
      approvedAmount: 250000,
      interestRate: 12.5,
      tenureMonths: 24,
      estimatedEmi: 11825.50,
      finalEmi: 11825.50,
      processingFeeAmount: 5000,
      status: 'APPROVED',
      paymentStatus: 'PAID',
    },
  });

  const testCharge = await prisma.charge.create({
    data: {
      name: 'Processing Fee Clearance',
      amount: 5000,
      status: 'PAID',
      loanId: testLoan.id,
      customerId: testCustomer.id,
      remark: 'Test charge for invoice branding verification',
      transactionRef: 'UTR-TEST-BRAND-999',
      paidAt: new Date(),
    },
  });

  // 4. Generate Approval Letter PDF
  console.log('\n--> Generating Loan Approval Letter PDF with TEST branding...');
  const approvalPdfBuffer = await pdfService.generateApprovalLetterPdf({
    customerName: testCustomer.fullName,
    customerPhone: testCustomer.mobile,
    customerEmail: testCustomer.email,
    customerAddress: `${testCustomer.address}, ${testCustomer.city}, ${testCustomer.state}`,
    applicationNumber: testLoan.applicationNumber,
    approvalNumber: testLoan.approvalNumber!,
    accountNumber: testLoan.accountNumber!,
    approvedAmount: testLoan.approvedAmount!,
    interestRate: testLoan.interestRate,
    tenureMonths: testLoan.tenureMonths,
    monthlyEmi: testLoan.monthlyEmi!,
    processingFee: testLoan.processingFeeAmount,
    companyName: updatedBranding.companyName,
    companyLegalName: updatedBranding.companyLegalName || updatedBranding.companyName,
    companyAddress: updatedBranding.address,
    companyEmail: updatedBranding.email,
    companyPhone: updatedBranding.phone,
    logoUrl: updatedBranding.logoUrl,
    watermarkLogoUrl: updatedBranding.watermarkLogoUrl,
    documentWatermarkEnabled: updatedBranding.documentWatermarkEnabled,
    watermarkOpacity: updatedBranding.watermarkOpacity,
    watermarkSize: updatedBranding.watermarkSize,
    watermarkPosition: updatedBranding.watermarkPosition,
    issuedDate: new Date(),
  });

  const outDir = path.join(__dirname, '../scratch');
  const approvalPdfPath = path.join(outDir, 'Approval_Letter_TEST_BRAND.pdf');
  fs.writeFileSync(approvalPdfPath, approvalPdfBuffer);
  console.log(`Saved Approval Letter PDF to: ${approvalPdfPath} (${approvalPdfBuffer.length} bytes)`);

  // 5. Generate Invoice PDF
  console.log('\n--> Generating Invoice PDF with TEST branding...');
  const invoiceResult = await pdfService.generateInvoicePdfForCharge(testCharge.id);
  const invoicePdfPath = path.join(outDir, 'Invoice_TEST_BRAND.pdf');
  fs.writeFileSync(invoicePdfPath, invoiceResult.buffer);
  console.log(`Saved Invoice PDF to: ${invoicePdfPath} (${invoiceResult.buffer.length} bytes)`);

  // 6. Clean up temporary test borrower, loan, and charge
  await prisma.charge.delete({ where: { id: testCharge.id } });
  await prisma.loanApplication.delete({ where: { id: testLoan.id } });
  await prisma.customer.delete({ where: { id: testCustomer.id } });
  console.log('Cleaned up temporary test borrower, loan, and charge records.');

  console.log('\n=== BRANDING & PDF VERIFICATION COMPLETE ===');
  await prisma.$disconnect();
}

runBrandingAndPdfVerification().catch((err) => {
  console.error(err);
  process.exit(1);
});
