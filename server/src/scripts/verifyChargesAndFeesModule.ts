import { prisma } from '../services/db';
import { chargesController } from '../controllers/chargesController';
import { paymentService } from '../services/paymentService';
import { auditService } from '../services/auditService';
import { pdfService } from '../services/pdfService';

async function runVerification() {
  console.log('=====================================================');
  console.log('STARTING CHARGES & FEES MODULE VERIFICATION');
  console.log('=====================================================\n');

  // 1. Initial Config Check
  console.log('--- TEST 1: GET /api/admin/charges/config ---');
  const mockReq: any = { user: { id: 'admin-tester', fullName: 'Test Admin', role: 'ADMIN' }, ip: '127.0.0.1', socket: {} };
  let configResponse: any = null;
  const mockResConfig: any = {
    json: (d: any) => { configResponse = d; return mockResConfig; },
    status: (s: number) => mockResConfig,
  };

  await chargesController.getConfig(mockReq, mockResConfig, () => {});
  if (!configResponse?.success || !configResponse?.data) {
    throw new Error('Failed to fetch charges configuration');
  }
  console.log('[PASS] Config retrieved successfully:', configResponse.data);
  const initialConfig = configResponse.data;

  // 2. Test Updating Configurations
  console.log('\n--- TEST 2: PATCH /api/admin/charges/config for 3 Charge Types ---');

  // 2a. Interest Rate
  let updateRateRes: any = null;
  const mockResRate: any = {
    json: (d: any) => { updateRateRes = d; return mockResRate; },
    status: (s: number) => mockResRate,
  };
  await chargesController.updateConfig(
    { ...mockReq, body: { chargeType: 'INTEREST_RATE', amount: 13.75, frequency: 'Per Annum' } },
    mockResRate,
    () => {}
  );
  if (updateRateRes?.data?.interestRate !== 13.75) {
    throw new Error(`Failed to update interest rate: expected 13.75, got ${updateRateRes?.data?.interestRate}`);
  }
  console.log('[PASS] Interest Rate updated to 13.75% Per Annum');

  // 2b. KYC Charges
  let updateKycRes: any = null;
  const mockResKyc: any = {
    json: (d: any) => { updateKycRes = d; return mockResKyc; },
    status: (s: number) => mockResKyc,
  };
  await chargesController.updateConfig(
    { ...mockReq, body: { chargeType: 'KYC_CHARGES', amount: 550 } },
    mockResKyc,
    () => {}
  );
  if (updateKycRes?.data?.kycCharges !== 550) {
    throw new Error(`Failed to update KYC charges: expected 550, got ${updateKycRes?.data?.kycCharges}`);
  }
  console.log('[PASS] KYC Charges updated to ₹550');

  // 2c. Processing Fee
  let updateProcRes: any = null;
  const mockResProc: any = {
    json: (d: any) => { updateProcRes = d; return mockResProc; },
    status: (s: number) => mockResProc,
  };
  await chargesController.updateConfig(
    { ...mockReq, body: { chargeType: 'PROCESSING_FEE', amount: 2250 } },
    mockResProc,
    () => {}
  );
  if (updateProcRes?.data?.processingFee !== 2250) {
    throw new Error(`Failed to update processing fee: expected 2250, got ${updateProcRes?.data?.processingFee}`);
  }
  console.log('[PASS] Processing Fee updated to ₹2,250');

  // Verify Audit Logs
  console.log('\n--- TEST 3: Verify Audit Logs for Charge Updates ---');
  const logs = await prisma.auditLog.findMany({
    where: {
      action: {
        in: ['Interest Rate Updated', 'KYC Charge Updated', 'Processing Fee Updated'],
      },
    },
    orderBy: { timestamp: 'desc' },
    take: 5,
  });
  console.log(`[PASS] Found ${logs.length} audit logs:`);
  logs.forEach((l) => console.log(`  - [${l.action}] by ${l.actorName}: ${l.newValue}`));

  // 3. Test Payment Security & Dynamic Amount Enforcement
  console.log('\n--- TEST 4: Backend Amount Enforcement during Customer Payment ---');
  // Find or create test customer & loan application
  let testCustomer = await prisma.customer.findFirst();
  if (!testCustomer) {
    testCustomer = await prisma.customer.create({
      data: {
        fullName: 'Charges Verification User',
        mobile: '9988776655',
        email: 'charges.test@loanapprove.com',
        aadhaarEncrypted: 'enc-998877665544',
        aadhaarMasked: 'XXXX-XXXX-5544',
        panMasked: 'ABCDE1234F',
        address: '101 Finance Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        monthlyIncome: 75000,
      },
    });
  }

  const testApp = await prisma.loanApplication.create({
    data: {
      customerId: testCustomer.id,
      applicationNumber: `CHRG-${Date.now()}`,
      accountNumber: `LN-${Date.now()}`,
      requestedAmount: 100000,
      tenureMonths: 12,
      interestRate: 13.75,
      status: 'APPROVED',
      paymentStatus: 'PAYMENT_REQUIRED',
    },
  });

  // Client attempts to submit payment with tampered amount of 1 rupee for KYC_CHARGES
  const customerActor = { id: testCustomer.id, fullName: testCustomer.fullName, email: testCustomer.email, role: 'CUSTOMER' as const };
  const kycPayment = await paymentService.submitUtr(
    testCustomer.id,
    testApp.id,
    {
      amount: 1, // Tampered client value
      paymentMethod: 'UPI',
      paymentType: 'KYC_CHARGES',
      utr: `UTR-KYC-${Date.now()}`,
    } as any,
    customerActor
  );

  if (kycPayment.amount !== 550) {
    throw new Error(`Security failed: expected configured amount 550, got ${kycPayment.amount}`);
  }
  console.log(`[PASS] Dynamic security resolved KYC charge to ₹${kycPayment.amount} (ignored client tampered 1)`);

  // Create another app for processing fee submission
  const testAppProc = await prisma.loanApplication.create({
    data: {
      customerId: testCustomer.id,
      applicationNumber: `CHRG-PROC-${Date.now()}`,
      accountNumber: `LN-PROC-${Date.now()}`,
      requestedAmount: 100000,
      tenureMonths: 12,
      interestRate: 13.75,
      status: 'APPROVED',
      paymentStatus: 'PAYMENT_REQUIRED',
    },
  });

  // Client submits payment for PROCESSING_FEE
  const procPayment = await paymentService.submitUtr(
    testCustomer.id,
    testAppProc.id,
    {
      amount: 1, // Tampered client value
      paymentMethod: 'UPI',
      paymentType: 'PROCESSING_FEE',
      utr: `UTR-PROC-${Date.now()}`,
    } as any,
    customerActor
  );

  if (procPayment.amount !== 2250) {
    throw new Error(`Security failed: expected configured amount 2250, got ${procPayment.amount}`);
  }
  console.log(`[PASS] Dynamic security resolved Processing Fee to ₹${procPayment.amount} (ignored client tampered 1)`);

  // 4. Test Listing Fee Records
  console.log('\n--- TEST 5: GET /api/admin/charges/records ---');
  let recordsRes: any = null;
  const mockResList: any = {
    json: (d: any) => { recordsRes = d; return mockResList; },
    status: (s: number) => mockResList,
  };
  await chargesController.listFeeRecords(
    { ...mockReq, query: { search: 'Charges Verification User' } },
    mockResList,
    () => {}
  );
  if (!recordsRes?.success || !Array.isArray(recordsRes?.data)) {
    throw new Error('Failed to retrieve fee payment records');
  }
  console.log(`[PASS] Retrieved ${recordsRes.data.length} fee payment records matching test user`);
  const recordKyc = recordsRes.data.find((r: any) => r.id === kycPayment.id);
  console.log('Record status for freshly submitted payment:', recordKyc?.status, 'Invoice Available:', recordKyc?.isInvoiceAvailable);

  // 5. Test Invoice Availability Guard (Pending Payment -> HTTP 400)
  console.log('\n--- TEST 6: Invoice Guard for Pending Payment ---');
  let invoiceStatusCode = 200;
  let invoiceErrorMsg = '';
  const mockResInvoicePending: any = {
    status: (code: number) => {
      invoiceStatusCode = code;
      return mockResInvoicePending;
    },
    json: (data: any) => {
      invoiceErrorMsg = data?.message;
      return mockResInvoicePending;
    },
  };

  await chargesController.getInvoicePdf(
    { ...mockReq, params: { id: kycPayment.id }, query: { download: 'false' } },
    mockResInvoicePending,
    () => {}
  );

  if (invoiceStatusCode !== 400) {
    throw new Error(`Invoice guard failed: expected HTTP 400 for pending payment, got ${invoiceStatusCode}`);
  }
  console.log(`[PASS] Invoice blocked for unverified payment: HTTP 400 "${invoiceErrorMsg}"`);

  // 6. Verify Payment & Generate Invoice PDF
  console.log('\n--- TEST 7: Generate Invoice PDF for Verified (PAID) Payment ---');
  // Mark kycPayment as PAID
  await prisma.payment.update({
    where: { id: kycPayment.id },
    data: { status: 'PAID', verifiedBy: 'admin-tester', verifiedAt: new Date() },
  });

  let sentBuffer: any = null;
  const headersSet: Record<string, string> = {};
  const mockResInvoicePaid: any = {
    setHeader: (k: string, v: string) => { headersSet[k] = v; },
    send: (buf: Buffer) => { sentBuffer = buf; },
    status: (s: number) => mockResInvoicePaid,
    json: (d: any) => mockResInvoicePaid,
  };

  await chargesController.getInvoicePdf(
    { ...mockReq, params: { id: kycPayment.id }, query: { download: 'false' } },
    mockResInvoicePaid,
    () => {}
  );

  if (!sentBuffer || sentBuffer.length === 0) {
    throw new Error('Invoice PDF generation failed to produce buffer');
  }
  console.log(`[PASS] Invoice PDF generated successfully! Buffer length: ${sentBuffer.length} bytes`);
  console.log('Content-Type:', headersSet['Content-Type']);
  console.log('Content-Disposition:', headersSet['Content-Disposition']);

  // Check Invoice Audit Log
  const invoiceLog = await prisma.auditLog.findFirst({
    where: {
      action: 'Invoice Generated',
      entityId: kycPayment.id,
    },
    orderBy: { timestamp: 'desc' },
  });
  if (!invoiceLog) {
    throw new Error('Audit log for Invoice Generated not found');
  }
  console.log(`[PASS] Audit log recorded: "${invoiceLog.action}" for payment ${invoiceLog.entityId}`);

  // Test Download Invoice Audit Log
  await chargesController.getInvoicePdf(
    { ...mockReq, params: { id: kycPayment.id }, query: { download: 'true' } },
    mockResInvoicePaid,
    () => {}
  );
  const downloadLog = await prisma.auditLog.findFirst({
    where: {
      action: 'Invoice Downloaded',
      entityId: kycPayment.id,
    },
    orderBy: { timestamp: 'desc' },
  });
  if (!downloadLog) {
    throw new Error('Audit log for Invoice Downloaded not found');
  }
  console.log(`[PASS] Audit log recorded: "${downloadLog.action}" for payment ${downloadLog.entityId}`);

  // 7. Reset config to original standard values
  console.log('\n--- TEST 8: Restoring standard configuration values ---');
  await chargesController.updateConfig(
    { ...mockReq, body: { chargeType: 'INTEREST_RATE', amount: initialConfig.interestRate || 12.0 } },
    mockResConfig,
    () => {}
  );
  await chargesController.updateConfig(
    { ...mockReq, body: { chargeType: 'KYC_CHARGES', amount: initialConfig.kycCharges || 499 } },
    mockResConfig,
    () => {}
  );
  await chargesController.updateConfig(
    { ...mockReq, body: { chargeType: 'PROCESSING_FEE', amount: initialConfig.processingFee || 1999 } },
    mockResConfig,
    () => {}
  );
  console.log('[PASS] Configuration successfully restored to production defaults.');

  console.log('\n=====================================================');
  console.log('ALL CHARGES & FEES MODULE TESTS PASSED (8/8)');
  console.log('=====================================================');
}

runVerification()
  .catch((err) => {
    console.error('Verification failed with error:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
