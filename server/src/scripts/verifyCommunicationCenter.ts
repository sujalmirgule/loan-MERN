import { prisma } from '../services/db';
import { emailService } from '../services/emailService';
import { communicationController } from '../controllers/communicationController';

async function runVerification() {
  console.log('=====================================================');
  console.log('STARTING CUSTOMER COMMUNICATION CENTER VERIFICATION');
  console.log('=====================================================\n');

  const adminActor = { id: 'admin-comm-tester', fullName: 'Communication Admin', role: 'ADMIN' };
  const mockReq: any = { user: adminActor, ip: '127.0.0.1', socket: {} };

  // 1. Check Communication Customers API with Status Filters
  console.log('--- TEST 1: GET /api/admin/communication/customers ---');
  let customersResponse: any = null;
  const mockResCustomers: any = {
    json: (d: any) => { customersResponse = d; return mockResCustomers; },
    status: (s: number) => mockResCustomers,
  };

  await communicationController.listCommunicationCustomers(
    { ...mockReq, query: { status: 'ALL' } },
    mockResCustomers,
    () => {}
  );

  if (!customersResponse?.success || !Array.isArray(customersResponse?.data)) {
    throw new Error('Failed to fetch communication customers');
  }
  console.log(`[PASS] Total Customers Retrieved: ${customersResponse.data.length}`);
  console.log('[PASS] Filter Counts:', customersResponse.counts);

  // Test with PENDING status filter
  let pendingResponse: any = null;
  const mockResPending: any = {
    json: (d: any) => { pendingResponse = d; return mockResPending; },
    status: (s: number) => mockResPending,
  };
  await communicationController.listCommunicationCustomers(
    { ...mockReq, query: { status: 'PENDING' } },
    mockResPending,
    () => {}
  );
  console.log(`[PASS] PENDING Filter Retrieved: ${pendingResponse.data.length} matching customers`);

  // 2. Check Communication Templates API
  console.log('\n--- TEST 2: GET /api/admin/communication/templates ---');
  let templatesResponse: any = null;
  const mockResTemplates: any = {
    json: (d: any) => { templatesResponse = d; return mockResTemplates; },
    status: (s: number) => mockResTemplates,
  };
  communicationController.getTemplates(mockReq, mockResTemplates);

  if (!templatesResponse?.success || !Array.isArray(templatesResponse?.data)) {
    throw new Error('Failed to fetch email templates');
  }
  console.log(`[PASS] Templates Retrieved: ${templatesResponse.data.length} status-specific templates`);
  templatesResponse.data.forEach((t: any) => console.log(`  - [${t.category}] ${t.name}: "${t.subject}"`));

  if (templatesResponse.data.length < 9) {
    throw new Error(`Expected at least 9 status templates, got ${templatesResponse.data.length}`);
  }

  // 3. Test Dynamic Variable Resolution
  console.log('\n--- TEST 3: Dynamic Variable Resolution Engine ---');
  let testCustomer = await prisma.customer.findFirst({
    include: { loans: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });

  if (!testCustomer) {
    testCustomer = await prisma.customer.create({
      data: {
        fullName: 'Rahul Sharma',
        mobile: '9876543210',
        email: 'rahul.sharma@example.com',
        aadhaarEncrypted: 'enc-9876543210',
        aadhaarMasked: 'XXXX-XXXX-3210',
        panMasked: 'ABCDE5678F',
        address: '202 Marine Lines',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400020',
        monthlyIncome: 85000,
      },
      include: { loans: true },
    });
  }

  let testLoan = testCustomer.loans && testCustomer.loans.length > 0 ? testCustomer.loans[0] : null;
  if (!testLoan) {
    testLoan = await prisma.loanApplication.create({
      data: {
        customerId: testCustomer.id,
        applicationNumber: `LA-TEST-${Date.now()}`,
        accountNumber: `LN-TEST-${Date.now()}`,
        requestedAmount: 250000,
        tenureMonths: 24,
        interestRate: 12.0,
        status: 'UNDER_REVIEW',
        paymentStatus: 'PAYMENT_REQUIRED',
      },
    });
  }

  const rawSubject = 'Loan Application Update - {{applicationId}}';
  const rawBody = 'Hello {{customerName}},\n\nYour loan application {{applicationId}} is currently {{loanStatus}} (KYC: {{kycStatus}}, Payment: {{paymentStatus}}).\n\nThank you,\n{{companyName}}';

  const customerVars = await emailService.getCustomerVariables(testCustomer.id);
  const resolvedSub = emailService.resolveVariables(rawSubject, customerVars.variables);
  const resolvedBody = emailService.resolveVariables(rawBody, customerVars.variables);

  console.log('Resolved Subject:', resolvedSub);
  console.log('Resolved Body:\n', resolvedBody);

  if (resolvedSub.includes('{{') || resolvedBody.includes('{{')) {
    throw new Error('Dynamic variables failed to resolve: unresolved template placeholders remain');
  }
  if (!resolvedBody.includes(testCustomer.fullName)) {
    throw new Error(`Expected resolved body to include customer name "${testCustomer.fullName}"`);
  }
  console.log('[PASS] All dynamic variables resolved cleanly from authoritative database records.');

  // 4. Test Single Customer Email Dispatch & Authoritative Email Verification
  console.log('\n--- TEST 4: Single Customer Email Dispatch (POST /api/admin/communication/email) ---');
  let sendSingleRes: any = null;
  const mockResSendSingle: any = {
    json: (d: any) => { sendSingleRes = d; return mockResSendSingle; },
    status: (s: number) => mockResSendSingle,
  };

  await communicationController.sendCustomerEmail(
    {
      ...mockReq,
      body: {
        customerIds: [testCustomer.id],
        subject: rawSubject,
        message: rawBody,
        templateName: 'Pending Application',
        forceMock: true,
      },
    },
    mockResSendSingle,
    () => {}
  );

  if (!sendSingleRes?.success || sendSingleRes?.data?.sentCount !== 1) {
    throw new Error('Single email dispatch failed');
  }
  console.log(`[PASS] Email dispatched to ${testCustomer.email} (Status: SENT)`);

  // Verify record in EmailMessage table
  const emailRecord = await prisma.emailMessage.findFirst({
    where: { customerId: testCustomer.id },
    orderBy: { createdAt: 'desc' },
  });
  if (!emailRecord || emailRecord.status !== 'SENT') {
    throw new Error('EmailMessage record not found or status not SENT');
  }
  console.log(`[PASS] EmailMessage record created in database: ID ${emailRecord.id}, Recipient: ${emailRecord.recipientEmail}`);

  // Verify AuditLog
  const auditEntry = await prisma.auditLog.findFirst({
    where: {
      action: 'Email Sent',
      entityId: emailRecord.id,
    },
    orderBy: { timestamp: 'desc' },
  });
  if (!auditEntry) {
    throw new Error('AuditLog entry for Email Sent not found');
  }
  console.log(`[PASS] AuditLog recorded: "${auditEntry.action}" by ${auditEntry.actorName}`);

  // 5. Test Bulk Email Dispatch
  console.log('\n--- TEST 5: Bulk Email Dispatch (Multiple Recipients) ---');
  // Find or create a second customer for bulk test
  let testCustomer2 = await prisma.customer.findFirst({
    where: { id: { not: testCustomer.id } },
  });
  if (!testCustomer2) {
    testCustomer2 = await prisma.customer.create({
      data: {
        fullName: 'Priya Patel',
        mobile: '9876543211',
        email: 'priya.patel@example.com',
        aadhaarEncrypted: 'enc-9876543211',
        aadhaarMasked: 'XXXX-XXXX-3211',
        panMasked: 'ABCDE9999F',
        address: '505 Ring Road',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '380015',
        monthlyIncome: 65000,
      },
    });
  }

  let sendBulkRes: any = null;
  const mockResSendBulk: any = {
    json: (d: any) => { sendBulkRes = d; return mockResSendBulk; },
    status: (s: number) => mockResSendBulk,
  };

  await communicationController.sendCustomerEmail(
    {
      ...mockReq,
      body: {
        customerIds: [testCustomer.id, testCustomer2.id],
        subject: 'General Account Notice - {{applicationId}}',
        message: 'Dear {{customerName}},\n\nThis is a bulk update regarding your account status with {{companyName}}.',
        templateName: 'General Update',
        forceMock: true,
      },
    },
    mockResSendBulk,
    () => {}
  );

  if (!sendBulkRes?.success || sendBulkRes?.data?.total !== 2) {
    throw new Error('Bulk email dispatch failed');
  }
  console.log(`[PASS] Bulk email completed: ${sendBulkRes.data.sentCount} sent, ${sendBulkRes.data.failedCount} failed`);

  // Verify AuditLog for bulk
  const bulkAudit = await prisma.auditLog.findFirst({
    where: { action: 'Bulk Email Sent' },
    orderBy: { timestamp: 'desc' },
  });
  if (!bulkAudit) {
    throw new Error('AuditLog entry for Bulk Email Sent not found');
  }
  console.log(`[PASS] Bulk AuditLog recorded: "${bulkAudit.action}" (Details: ${bulkAudit.newValue})`);

  // 6. Test Email Failure Handling with live SMTP transmission failure
  console.log('\n--- TEST 6: Real Failure Handling & Error State Storage ---');
  let failureRes: any = null;
  const mockResFailure: any = {
    json: (d: any) => { failureRes = d; return mockResFailure; },
    status: (s: number) => mockResFailure,
  };

  // Attempt real live send against unauthenticated test SendGrid host without forceMock
  await communicationController.sendCustomerEmail(
    {
      ...mockReq,
      body: {
        customerIds: [testCustomer.id],
        subject: 'Real Failure Verification Subject',
        message: 'This message verifies live SMTP error handling.',
        templateName: 'TEST',
        forceMock: false,
      },
    },
    mockResFailure,
    () => {}
  );

  const failedRecord = await prisma.emailMessage.findFirst({
    where: {
      customerId: testCustomer.id,
      subject: 'Real Failure Verification Subject',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!failedRecord || failedRecord.status !== 'FAILED') {
    throw new Error('Expected transmission to fail with FAILED status for unauthenticated SMTP host');
  }
  console.log(`[PASS] Real SMTP failure properly caught & stored: Status "${failedRecord.status}", Reason: "${failedRecord.failureReason}"`);

  const failureAudit = await prisma.auditLog.findFirst({
    where: {
      action: 'Email Failed',
      entityId: failedRecord.id,
    },
    orderBy: { timestamp: 'desc' },
  });
  if (!failureAudit) {
    throw new Error('AuditLog entry for Email Failed not found');
  }
  console.log(`[PASS] Failure AuditLog recorded: "${failureAudit.action}" for message ${failedRecord.id}`);

  // 7. Test Customer Communication History APIs
  console.log('\n--- TEST 7: Customer Communication History APIs ---');
  let customerHistoryRes: any = null;
  const mockResCustHistory: any = {
    json: (d: any) => { customerHistoryRes = d; return mockResCustHistory; },
    status: (s: number) => mockResCustHistory,
  };

  await communicationController.getCustomerHistory(
    { ...mockReq, params: { customerId: testCustomer.id } },
    mockResCustHistory,
    () => {}
  );

  if (!customerHistoryRes?.success || !Array.isArray(customerHistoryRes?.data)) {
    throw new Error('Failed to retrieve customer-specific communication history');
  }
  console.log(`[PASS] Customer History retrieved: ${customerHistoryRes.data.length} records for ${testCustomer.fullName}`);

  // Test Global History
  let globalHistoryRes: any = null;
  const mockResGlobalHistory: any = {
    json: (d: any) => { globalHistoryRes = d; return mockResGlobalHistory; },
    status: (s: number) => mockResGlobalHistory,
  };

  await communicationController.getCommunicationHistory(
    { ...mockReq, query: {} },
    mockResGlobalHistory,
    () => {}
  );

  if (!globalHistoryRes?.success || !Array.isArray(globalHistoryRes?.data)) {
    throw new Error('Failed to retrieve global communication history');
  }
  console.log(`[PASS] Global Communication Log retrieved: ${globalHistoryRes.pagination.total} total logged messages`);

  console.log('\n=====================================================');
  console.log('ALL CUSTOMER COMMUNICATION CENTER TESTS PASSED (7/7)');
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
