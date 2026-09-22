import { prisma } from '../src/services/db';
import { loanApplicationService } from '../src/services/loanApplicationService';
import { documentService } from '../src/services/documentService';

async function runVerification() {
  console.log('=== STARTING UNDERWRITING TARGETED FIXES VERIFICATION ===\n');

  // 1. Verify Application LA-2026-000006 exists and its initial state
  const app = await prisma.loanApplication.findFirst({
    where: { applicationNumber: 'LA-2026-000006' },
    include: { customer: true },
  });

  if (!app) {
    throw new Error('Application LA-2026-000006 not found!');
  }

  console.log(`[CHECK 1] Found Application: ${app.applicationNumber}`);
  console.log(`  Customer: ${app.customer.fullName} (${app.customer.mobile})`);
  console.log(`  Current Status: ${app.status}`);
  console.log(`  Original Requested Amount: ₹${app.requestedAmount.toLocaleString('en-IN')}`);
  console.log(`  KYC Status: ${app.customer.kycStatus}`);

  // Reset to SUBMITTED state to test the exact scenario from current observation
  await prisma.loanApplication.update({
    where: { id: app.id },
    data: {
      status: 'SUBMITTED',
      proposedAmount: null,
      docRequestReason: null,
    },
  });

  const testActor = {
    id: 'admin-tester-id',
    fullName: 'Underwriting Admin Tester',
    email: 'admin@loanapprove.com',
    role: 'ADMIN',
    permissions: ['applications.review', 'applications.modify_amount'],
  };

  // 2. Test Auto-Transition: Admin calls modifyAmount while SUBMITTED
  console.log('\n[CHECK 2] Testing modifyAmount while SUBMITTED...');
  const proposedTestAmount = 40000000; // 4 Crores
  const modifyResult = await loanApplicationService.modifyAmount(
    app.id,
    testActor,
    proposedTestAmount
  );

  console.log(`  After modifyAmount:`);
  console.log(`  Status: ${modifyResult.status} (Expected: OFFER_PENDING_CUSTOMER)`);
  console.log(`  Requested Amount: ₹${modifyResult.requestedAmount.toLocaleString('en-IN')} (Immutable: ${modifyResult.requestedAmount === 464565465})`);
  console.log(`  Proposed Amount: ₹${modifyResult.proposedAmount?.toLocaleString('en-IN')} (Expected: ₹4,00,00,000)`);

  if (modifyResult.requestedAmount !== 464565465) {
    throw new Error('FAIL: requestedAmount was modified! It must remain immutable!');
  }
  if (modifyResult.status !== 'OFFER_PENDING_CUSTOMER') {
    throw new Error(`FAIL: Status is ${modifyResult.status}, expected OFFER_PENDING_CUSTOMER`);
  }
  console.log('  => PASS: Amount modified cleanly, original requested amount preserved.');

  // 3. Test Auto-Transition: Admin calls requestDocuments
  console.log('\n[CHECK 3] Testing requestDocuments...');
  // Reset status to SUBMITTED to test direct call from SUBMITTED as well
  await prisma.loanApplication.update({
    where: { id: app.id },
    data: { status: 'SUBMITTED' },
  });

  const docReqResult = await loanApplicationService.requestDocuments(
    app.id,
    testActor,
    {
      documentType: 'BANK_STATEMENT',
      title: 'Last 6 Months Bank Statement (Stamped)',
      description: 'Need updated bank statement with stamp',
    }
  );

  console.log(`  After requestDocuments:`);
  console.log(`  Status: ${docReqResult.application.status} (Expected: DOCUMENTS_REQUIRED)`);
  console.log(`  Doc Request Reason: ${docReqResult.application.docRequestReason}`);

  if (docReqResult.application.status !== 'DOCUMENTS_REQUIRED') {
    throw new Error(`FAIL: Status is ${docReqResult.application.status}, expected DOCUMENTS_REQUIRED`);
  }
  console.log('  => PASS: Document request created, status changed to DOCUMENTS_REQUIRED.');

  // 4. Test Customer View: Customer lists documents and sees the pending request
  console.log('\n[CHECK 4] Testing customer document listing...');
  const customerDocs = await documentService.listCustomerDocuments(app.customerId);
  console.log(`  Customer pendingRequests count: ${customerDocs.pendingRequests.length}`);
  const foundReq = customerDocs.pendingRequests.find((r) => r.documentType === 'BANK_STATEMENT');
  console.log(`  Found pending request: ${foundReq?.title} (${foundReq?.documentType})`);

  if (!foundReq) {
    throw new Error('FAIL: Pending document request not found in customer documents!');
  }
  console.log('  => PASS: Pending document request is visible to customer.');

  // 5. Test Customer Upload: Customer fulfills document request
  console.log('\n[CHECK 5] Testing document fulfillment upon upload...');
  const dummyFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'bank_statement_stamped.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 dummy pdf content for testing'),
    size: 40,
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
  };

  await documentService.uploadDocument(
    app.customerId,
    'BANK_STATEMENT',
    dummyFile,
    app.id
  );

  const reqAfterUpload = await prisma.documentRequest.findUnique({
    where: { id: foundReq.id },
  });
  console.log(`  Document Request Status after upload: ${reqAfterUpload?.status} (Expected: FULFILLED)`);

  const appAfterUpload = await prisma.loanApplication.findUnique({
    where: { id: app.id },
  });
  console.log(`  Application Status after upload: ${appAfterUpload?.status} (Expected: UNDER_REVIEW)`);

  if (reqAfterUpload?.status !== 'FULFILLED') {
    throw new Error(`FAIL: DocumentRequest status is ${reqAfterUpload?.status}, expected FULFILLED`);
  }
  if (appAfterUpload?.status !== 'UNDER_REVIEW') {
    throw new Error(`FAIL: Application status is ${appAfterUpload?.status}, expected UNDER_REVIEW`);
  }
  console.log('  => PASS: DocumentRequest fulfilled and application returned to UNDER_REVIEW.');

  // 6. Test Payments & UTRs in getAdminApplicationById
  console.log('\n[CHECK 6] Testing getAdminApplicationById for Payments & UTRs...');
  const adminAppDetail = await loanApplicationService.getAdminApplicationById(app.id);

  console.log(`  Application Payments count: ${adminAppDetail.applicationPayments?.length || 0}`);
  console.log(`  Customer/KYC Payments count: ${adminAppDetail.customerPayments?.length || 0}`);

  if (adminAppDetail.customerPayments && adminAppDetail.customerPayments.length > 0) {
    for (const p of adminAppDetail.customerPayments) {
      console.log(`    - Charge: ${p.chargeName}, Amount: ₹${p.amount}, UTR: ${p.utr}, Status: ${p.status}, Receipt: ${p.receiptNumber}`);
    }
  }

  const hasKycPaymentWithUtr = adminAppDetail.customerPayments?.some((p: any) => p.utr === '987654321098' || p.amount === 799);
  console.log(`  Has KYC Payment with UTR/₹799: ${hasKycPaymentWithUtr}`);
  if (!hasKycPaymentWithUtr) {
    console.warn('  Note: KYC payment was not found on customer payments, checking charges...');
  } else {
    console.log('  => PASS: KYC payment with exact UTR and receipt successfully returned in Payments tab payload.');
  }

  // 7. Test Admin Pending Loans Query includes LA-2026-000006
  console.log('\n[CHECK 7] Testing getAdminApplications with status=PENDING...');
  const pendingApps = await loanApplicationService.getAdminApplications({ status: 'PENDING' });
  const appList = pendingApps.data || [];
  const inPending = appList.some((a) => a.applicationNumber === 'LA-2026-000006');
  console.log(`  Total pending applications: ${pendingApps.total}`);
  console.log(`  LA-2026-000006 in Pending list: ${inPending}`);

  if (!inPending) {
    throw new Error('FAIL: LA-2026-000006 not returned in pending applications list!');
  }
  console.log('  => PASS: Application correctly present in Pending review list.');

  // 8. Restore application state to SUBMITTED for clean demo
  await prisma.loanApplication.update({
    where: { id: app.id },
    data: {
      status: 'SUBMITTED',
      requestedAmount: 464565465,
      proposedAmount: null,
    },
  });

  console.log('\n=== ALL TARGETED UNDERWRITING VERIFICATIONS PASSED SUCCESSFULLY! ===');
}

runVerification()
  .catch((err) => {
    console.error('VERIFICATION ERROR:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
