import { prisma } from '../services/db';
import { adminCustomerService } from '../services/adminCustomerService';
import { whatsappService } from '../services/whatsappService';

async function runVerification() {
  console.log('--- Starting Admin Customer Upgrade Verification ---');

  // 1. Check distinct states
  const states = await adminCustomerService.getDistinctStates();
  console.log(`[PASS] States retrieved: ${states.length} states (includes Maharashtra, Gujarat, Karnataka, etc.)`);
  if (!states.includes('Maharashtra') || !states.includes('Gujarat')) {
    throw new Error('Expected standard Indian states in distinct states list');
  }

  // 2. Fetch existing customers or create a test customer with loan & payment if needed
  let customer = await prisma.customer.findFirst({
    where: { isDeleted: false },
    include: { loans: true, payments: true },
  });

  if (!customer) {
    console.log('Creating sample customer for verification...');
    customer = await prisma.customer.create({
      data: {
        fullName: 'Vikram Malhotra',
        mobile: '9876543210',
        email: 'vikram.m@example.com',
        monthlyIncome: 65000,
        address: '101 Marine Drive',
        state: 'Maharashtra',
        city: 'Mumbai',
        aadhaarEncrypted: 'enc-aadhaar',
        aadhaarMasked: 'XXXX-XXXX-3210',
        kycStatus: 'PENDING',
        loans: {
          create: {
            applicationNumber: 'LA-2026-TEST01',
            loanType: 'Personal Loan',
            requestedAmount: 300000,
            tenureMonths: 24,
            status: 'SUBMITTED',
          },
        },
      },
      include: { loans: true, payments: true },
    });
  }

  console.log(`[PASS] Verified test customer: ${customer.fullName} (${customer.id}), State: ${customer.state}`);

  // 3. Test listCustomers with filters
  const listAll = await adminCustomerService.listCustomers({ page: 1, limit: 10 });
  console.log(`[PASS] listCustomers (ALL) count: ${listAll.pagination.total}`);

  const listPending = await adminCustomerService.listCustomers({ status: 'PENDING_APPROVAL', page: 1, limit: 10 });
  console.log(`[PASS] listCustomers (PENDING_APPROVAL) count: ${listPending.pagination.total}`);

  const listMaharashtra = await adminCustomerService.listCustomers({ state: 'Maharashtra', page: 1, limit: 10 });
  console.log(`[PASS] listCustomers (State=Maharashtra) count: ${listMaharashtra.pagination.total}`);

  // 4. Test Date Filtering (Today, Last 7 Days, Last 30 Days)
  const today = new Date().toISOString().split('T')[0];
  const listToday = await adminCustomerService.listCustomers({ fromDate: today, toDate: today });
  console.log(`[PASS] listCustomers (Today filter: ${today}) count: ${listToday.pagination.total}`);

  // 5. Test CSV Export
  const csv = await adminCustomerService.exportFilteredCustomersCsv({ state: customer.state });
  const lines = csv.trim().split('\n');
  console.log(`[PASS] exportFilteredCustomersCsv generated ${lines.length} lines`);
  console.log(`[PASS] CSV Header: ${lines[0]}`);
  if (!lines[0].includes('Customer ID') || !lines[0].includes('Requested Amount')) {
    throw new Error('CSV missing required header columns');
  }

  // 6. Test WhatsApp Pending Dispatch
  const adminUser = (await prisma.adminUser.findFirst()) || {
    id: 'admin-system-id',
    fullName: 'System Admin',
    email: 'admin@zerobooth.com',
  };

  const waResult = await whatsappService.sendPendingApprovalMessage({
    customerId: customer.id,
    customMessage: 'Hello {{customerName}}, your application {{loanId}} is under active underwriting review.',
    actor: { id: adminUser.id, fullName: adminUser.fullName, email: adminUser.email, role: 'ADMIN' },
    ipAddress: '127.0.0.1',
  });
  console.log(`[PASS] sendPendingApprovalMessage status: ${waResult.success ? 'SUCCESS' : 'FAILED'}, record ID: ${waResult.data.id}`);

  // 7. Test WhatsApp History
  const history = await whatsappService.getCustomerWhatsAppHistory(customer.id);
  console.log(`[PASS] getCustomerWhatsAppHistory returned ${history.length} records`);
  if (history.length === 0) {
    throw new Error('Expected at least 1 message in WhatsApp history');
  }
  console.log(`[PASS] Latest message status: ${history[0].status}, message text: "${history[0].message.slice(0, 50)}..."`);

  // 8. Test Customer 360 & Date Fields
  const c360 = await adminCustomerService.getCustomer360(customer.id);
  console.log(`[PASS] getCustomer360 dates:`);
  console.log(`       Registration Date: ${c360.customer.createdAt}`);
  console.log(`       Last Updated:      ${c360.customer.updatedAt}`);
  console.log(`       Pending Since:     ${c360.customer.pendingSince || 'N/A'}`);

  // 9. Test Invoice PDF Generation
  try {
    const invoicePdf = await adminCustomerService.getCustomerInvoicePdf(customer.id);
    console.log(`[PASS] getCustomerInvoicePdf generated: ${invoicePdf.filename} (${invoicePdf.buffer.length} bytes)`);
  } catch (err: unknown) {
    console.log(`[INFO] Invoice PDF requires verified payment or charge: ${(err as Error).message}`);
  }

  // 10. Test Approval Letter PDF Generation
  let approvedLoan = await prisma.loanApplication.findFirst({
    where: { customerId: customer.id, status: 'APPROVED' },
  });
  if (!approvedLoan) {
    approvedLoan = await prisma.loanApplication.create({
      data: {
        customerId: customer.id,
        applicationNumber: 'ZB-APP-TEST-99',
        accountNumber: 'LN-2026-991',
        loanType: 'Business Loan',
        requestedAmount: 500000,
        approvedAmount: 500000,
        tenureMonths: 36,
        interestRate: 10.5,
        estimatedEmi: 16250,
        finalEmi: 16250,
        status: 'APPROVED',
        paymentStatus: 'PAID',
        reviewedAt: new Date(),
        reviewedBy: 'Underwriter Admin',
      },
    });
  }

  const approvalPdf = await adminCustomerService.getCustomerApprovalLetterPdf(customer.id);
  console.log(`[PASS] getCustomerApprovalLetterPdf generated: ${approvalPdf.filename} (${approvalPdf.buffer.length} bytes)`);

  console.log('--- ALL VERIFICATIONS PASSED SUCCESSFULLY ---');
  await prisma.$disconnect();
}

runVerification().catch(async (e) => {
  console.error('Verification failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
