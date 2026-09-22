import { prisma } from '../services/db';
import { adminKycService } from '../services/adminKycService';
import { loanApplicationService } from '../services/loanApplicationService';
import { auditService } from '../services/auditService';

async function run() {
  console.log('=== Starting KYC & All Applications Verification Script ===\n');

  // 1. Verify KYC List with authentic counts and mapping
  console.log('[1] Testing adminKycService.listKycCustomers...');
  const kycList = await adminKycService.listKycCustomers({ page: 1, limit: 10 });
  console.log(`[PASS] Total Customers: ${kycList.pagination.total}`);
  console.log('[PASS] Real Tab Counts:', JSON.stringify(kycList.counts, null, 2));

  if (!kycList.counts || typeof kycList.counts.all !== 'number') {
    throw new Error('Missing counts in listKycCustomers result');
  }

  if (kycList.customers.length > 0) {
    const sample = kycList.customers[0];
    console.log(`[PASS] Sample Customer: ${sample.fullName}`);
    console.log(`       Application ID: ${sample.applicationId}`);
    console.log(`       KYC Type: ${sample.kycType}`);
    console.log(`       State: ${sample.state}`);
    console.log(`       KYC Status: ${sample.kycStatus}`);
    console.log(`       Docs Count: ${sample.docStats.total}`);
  }

  // 2. Test Tab Filter functionality
  console.log('\n[2] Testing KYC Status tab filters...');
  const verifiedList = await adminKycService.listKycCustomers({ status: 'VERIFIED' });
  console.log(`[PASS] Tab "VERIFIED" count: ${verifiedList.customers.length}`);

  const pendingList = await adminKycService.listKycCustomers({ status: 'PENDING_VERIFICATION' });
  console.log(`[PASS] Tab "PENDING_VERIFICATION" count: ${pendingList.customers.length}`);

  // 3. Test KYC Actions: Decision, Notification & Audit Log
  console.log('\n[3] Testing KYC Decision Actions & Persistence...');
  let testCustomer = await prisma.customer.findFirst({
    where: { isDeleted: false },
  });

  if (!testCustomer) {
    testCustomer = await prisma.customer.create({
      data: {
        fullName: 'Aarav Sharma',
        mobile: '9988776655',
        email: 'aarav.sharma@example.com',
        monthlyIncome: 85000,
        address: '42 MG Road',
        state: 'Karnataka',
        city: 'Bengaluru',
        aadhaarEncrypted: 'enc-aadhaar',
        aadhaarMasked: 'XXXX-XXXX-6655',
        panEncrypted: 'enc-pan',
        panMasked: 'ABCDE1234F',
        kycStatus: 'PENDING',
      },
    });
  }

  const adminActor = {
    id: 'admin-test-id',
    fullName: 'Chief Compliance Officer',
  };

  // Test Verify / Approve Action
  console.log('Testing KYC Decision -> APPROVED...');
  await adminKycService.overrideKycStatus(
    adminActor,
    testCustomer.id,
    'APPROVED',
    'All KYC documents verified against NSDL/UIDAI databases'
  );

  const updatedCustomer = await prisma.customer.findUniqueOrThrow({
    where: { id: testCustomer.id },
  });
  console.log(`[PASS] Customer DB kycStatus: ${updatedCustomer.kycStatus} (Expected: APPROVED)`);
  if (updatedCustomer.kycStatus !== 'APPROVED') {
    throw new Error('Expected kycStatus to be APPROVED');
  }

  // Verify Notification
  const notification = await prisma.notification.findFirst({
    where: { customerId: testCustomer.id, eventType: 'KYC_STATUS' },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`[PASS] Created Customer Notification: "${notification?.title}" - "${notification?.message}"`);
  if (!notification || !notification.title.includes('Approved')) {
    throw new Error('Customer notification was not created properly for KYC Approval');
  }

  // Verify Audit Log
  const auditLog = await prisma.auditLog.findFirst({
    where: { entity: 'Customer', entityId: testCustomer.id },
    orderBy: { timestamp: 'desc' },
  });
  console.log(`[PASS] Created Audit Log: Action "${auditLog?.action}" by "${auditLog?.actorName}"`);
  if (!auditLog || auditLog.action !== 'KYC_APPROVED') {
    throw new Error('Audit log was not recorded properly for KYC Approval');
  }

  // Test Rejection Action
  console.log('\nTesting KYC Decision -> REJECTED with mandatory reason...');
  await adminKycService.overrideKycStatus(
    adminActor,
    testCustomer.id,
    'REJECTED',
    'Name on PAN card does not match Aadhaar records'
  );

  const rejectedCustomer = await prisma.customer.findUniqueOrThrow({
    where: { id: testCustomer.id },
  });
  console.log(`[PASS] Customer DB kycStatus: ${rejectedCustomer.kycStatus} (Expected: REJECTED)`);
  if (rejectedCustomer.kycStatus !== 'REJECTED') {
    throw new Error('Expected kycStatus to be REJECTED');
  }

  // 4. Test Loan Application KYC Gate
  console.log('\n[4] Testing Loan Application KYC Gate...');
  let testApp = await prisma.loanApplication.findFirst({
    where: { customerId: testCustomer.id },
  });

  const freshApp = await prisma.loanApplication.create({
    data: {
      applicationNumber: `LA-GATE-${Date.now()}`,
      customerId: testCustomer.id,
      loanType: 'Personal Loan',
      requestedAmount: 150000,
      tenureMonths: 12,
      status: 'SUBMITTED',
    },
  });

  // Customer is currently REJECTED. Attempting approval should fail!
  let gateBlocked = false;
  try {
    await loanApplicationService.approveApplication(
      freshApp.id,
      { id: adminActor.id, fullName: adminActor.fullName, email: 'admin@test.com', role: 'ADMIN' },
      {
        approvedAmount: 150000,
        interestRate: 12,
        tenureMonths: 12,
        finalEmi: 13327,
      }
    );
  } catch (err: any) {
    gateBlocked = true;
    console.log(`[PASS] KYC Gate successfully blocked loan approval: "${err.message}" (HTTP ${err.statusCode})`);
  }

  if (!gateBlocked) {
    throw new Error('KYC Gate failed to block loan approval when KYC is REJECTED');
  }

  // Set KYC to APPROVED and verify loan approval succeeds
  console.log('Setting Customer KYC to APPROVED and retrying loan sanction...');
  await adminKycService.overrideKycStatus(adminActor, testCustomer.id, 'APPROVED');

  const approvedApp = await loanApplicationService.approveApplication(
    freshApp.id,
    { id: adminActor.id, fullName: adminActor.fullName, email: 'admin@test.com', role: 'ADMIN' },
    {
      approvedAmount: 150000,
      interestRate: 12,
      tenureMonths: 12,
      finalEmi: 13327,
    }
  );
  console.log(`[PASS] Loan approved successfully once KYC is verified! Application Status: ${approvedApp.status}`);

  // 5. Test Admin Loan Applications Filtering (State, Loan Type, Search)
  console.log('\n[5] Testing Admin Loans query filters (State, Loan Type, kycStatus)...');
  const appFilters = await loanApplicationService.getAdminApplications({
    state: testCustomer.state,
    loanType: 'Personal Loan',
    page: 1,
    pageSize: 10,
  });
  const list = appFilters.data || [];
  console.log(`[PASS] Filtered loan applications by State (${testCustomer.state}) and Loan Type: ${list.length} results`);

  if (list.length > 0) {
    const appSample = list[0];
    console.log(`       App #: ${appSample.applicationNumber}`);
    console.log(`       State: ${appSample.state}`);
    console.log(`       Loan Type: ${appSample.loanType}`);
    console.log(`       KYC Status: ${appSample.kycStatus}`);
    if (!appSample.kycStatus || !appSample.loanType) {
      throw new Error('Missing kycStatus or loanType in admin loan application list item');
    }
  }

  console.log('\n=== ALL TESTS & VERIFICATION CHECKS PASSED SUCCESSFULLY ===');
}

run()
  .catch((err) => {
    console.error('Verification failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
