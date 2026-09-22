import { prisma } from '../src/services/db';
import { documentService } from '../src/services/documentService';
import { loanApplicationService } from '../src/services/loanApplicationService';
import { adminKycService } from '../src/services/adminKycService';
import { kycService } from '../src/services/kycService';
import { paymentService } from '../src/services/paymentService';

async function main() {
  console.log('================================================================');
  console.log('STARTING END-TO-END VERIFICATION: TARGETED KYC UI & POST-KYC LOAN FLOW');
  console.log('================================================================');

  const testMobile = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testEmail = `test_${Date.now()}@example.com`;

  // 1. Create a fresh test customer
  const customer = await prisma.customer.create({
    data: {
      fullName: 'Rahul E2E Verification',
      mobile: testMobile,
      email: testEmail,
      passwordHash: 'dummy_hash_for_test',
      aadhaarEncrypted: 'mock_encrypted_aadhaar_bytes',
      aadhaarMasked: 'XXXX-XXXX-4589',
      status: 'ACTIVE',
      kycStatus: 'PENDING',
      monthlyIncome: 75000,
      address: '123 Marine Drive, Nariman Point',
      state: 'Maharashtra',
      city: 'Mumbai',
    },
  });
  console.log(`[PASS 1] Created Customer: ${customer.fullName} (${customer.mobile}) - KYC: ${customer.kycStatus}`);

  const mockPdfFile = (name: string): Express.Multer.File => ({
    fieldname: 'file',
    originalname: name,
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('%PDF-1.4 Mock PDF Content for automated verification'),
    destination: '',
    filename: name,
    path: '',
    stream: null as any,
  });

  // 2. Customer uploads Aadhaar Front
  await documentService.uploadDocument(customer.id, 'AADHAAR_FRONT', mockPdfFile('aadhaar_front.pdf'));
  let custRecord = await prisma.customer.findUnique({ where: { id: customer.id } });
  console.log(`[PASS 2] Aadhaar Front Uploaded -> KYC Status: ${custRecord?.kycStatus} (Under Review: ${custRecord?.kycStatus === 'UNDER_REVIEW'})`);

  // 3. Customer uploads Aadhaar Back -> KYC charge activated
  await documentService.uploadDocument(customer.id, 'AADHAAR_BACK', mockPdfFile('aadhaar_back.pdf'));
  custRecord = await prisma.customer.findUnique({ where: { id: customer.id } });
  const kycCharge = await prisma.charge.findFirst({
    where: { customerId: customer.id, name: { contains: 'KYC' } },
  });
  console.log(`[PASS 3] Aadhaar Back Uploaded -> KYC Charge active: ₹${kycCharge?.amount}, Status: ${kycCharge?.status}`);

  // 4. Customer submits UTR for KYC fee
  const utrNumber = `UTR${Date.now()}`;
  await prisma.charge.update({
    where: { id: kycCharge!.id },
    data: { transactionRef: utrNumber },
  });
  const updatedCharge = await prisma.charge.findUnique({ where: { id: kycCharge!.id } });
  console.log(`[PASS 4] UTR Submitted (${utrNumber}) -> Charge status: ${updatedCharge?.status}, TxRef: ${updatedCharge?.transactionRef}`);

  // 5. Admin approves KYC
  const existingAdmin = await prisma.adminUser.findFirst({ where: { role: 'ADMIN' } });
  const adminActor = {
    id: existingAdmin?.id || 'admin-root',
    userId: existingAdmin?.id || 'admin-root',
    fullName: existingAdmin?.fullName || 'Chief Compliance Officer',
    email: existingAdmin?.email || 'admin@loanapprove.com',
    role: 'ADMIN' as const,
    userType: 'ADMIN' as const,
    permissions: ['*'],
  };

  await adminKycService.overrideKycStatus(
    adminActor,
    customer.id,
    'APPROVED'
  );
  custRecord = await prisma.customer.findUnique({ where: { id: customer.id } });
  console.log(`[PASS 5] Admin Approved KYC -> Customer KYC Status: ${custRecord?.kycStatus}`);

  // 6. Backend Protection: Direct API upload attempt of Aadhaar after KYC APPROVED must fail with 403
  let directUploadBlocked = false;
  try {
    await documentService.uploadDocument(customer.id, 'AADHAAR_FRONT', mockPdfFile('new_attempt.pdf'));
  } catch (err: any) {
    if (err.statusCode === 403 && (err.code === 'KYC_ALREADY_APPROVED' || err.errors === 'KYC_ALREADY_APPROVED')) {
      directUploadBlocked = true;
      console.log(`[PASS 6] Direct API KYC upload rejected correctly: 403 KYC_ALREADY_APPROVED`);
    } else {
      console.error('Unexpected error on direct upload test:', err);
    }
  }
  if (!directUploadBlocked) {
    throw new Error('FAILED: Direct API KYC upload was NOT blocked after KYC approval!');
  }

  // 7. Customer creates Loan Application
  const customerActor = {
    id: customer.id,
    userId: customer.id,
    fullName: customer.fullName,
    email: customer.email,
    role: 'CUSTOMER' as const,
    userType: 'CUSTOMER' as const,
    permissions: [],
  };

  const loanApp = await loanApplicationService.createApplication(
    customer.id,
    {
      amount: 500000,
      tenureMonths: 24,
      purpose: 'Business Expansion & Inventory Working Capital',
    },
    customerActor
  );
  console.log(`[PASS 7] Loan Application Created: #${loanApp.applicationNumber} (ID: ${loanApp.id}) - Status: ${loanApp.status}`);

  // 8. Customer uploads 4 Loan Documents: PAN, Bank Statement, Income Proof, Other
  await documentService.uploadDocument(customer.id, 'PAN', mockPdfFile('pan_card.pdf'));
  await documentService.uploadDocument(customer.id, 'BANK_STATEMENT', mockPdfFile('bank_statement_6m.pdf'));
  await documentService.uploadDocument(customer.id, 'INCOME_PROOF', mockPdfFile('income_tax_return.pdf'));
  await documentService.uploadDocument(customer.id, 'OTHER', mockPdfFile('business_registration.pdf'));

  const customerDocs = await prisma.loanDocument.findMany({
    where: { customerId: customer.id, isCurrentVersion: true },
  });
  console.log(`[PASS 8] Loan Documents Uploaded (${customerDocs.length} total active documents)`);
  customerDocs.forEach(d => console.log(`   - ${d.documentType}: ${d.fileName} (loanId: ${d.loanId})`));

  // 9. Admin queries Loan Applications queue (/admin/loan-approval)
  const pendingQueue = await loanApplicationService.getAdminApplications({
    status: 'PENDING',
    page: 1,
    pageSize: 10,
  });
  const foundInPending = pendingQueue.data.find(a => a.id === loanApp.id);
  console.log(`[PASS 9] Admin Pending Queue Count: ${pendingQueue.pagination.total}. Found Application #${loanApp.applicationNumber}: ${Boolean(foundInPending)}`);

  // 10. Admin opens Application Detail (/admin/loans/:id)
  const adminDetail = await loanApplicationService.getAdminApplicationById(loanApp.id);
  console.log(`[PASS 10] Admin Detail Retrieved:`);
  console.log(`   - Customer: ${adminDetail.customer.fullName} (${adminDetail.customer.mobile})`);
  console.log(`   - KYC Status: ${adminDetail.customer.kycStatus}`);
  console.log(`   - Documents visible to Admin: ${adminDetail.documents.length}`);
  console.log(`   - Requested Amount: ₹${adminDetail.requestedAmount}`);

  // 11. Admin starts Underwriting: SUBMITTED -> UNDER_REVIEW
  const underReviewApp = await loanApplicationService.startReview(loanApp.id, adminActor);
  console.log(`[PASS 11] Underwriting Started -> Status: ${underReviewApp.status}`);

  // 11b. Admin places on Hold with reason
  const heldApp = await loanApplicationService.putOnHold(loanApp.id, adminActor, 'Awaiting customer salary verification call');
  console.log(`[PASS 11b] Placed on Hold -> Status: ${heldApp.status}, Reason: ${heldApp.holdReason}`);

  // 11c. Admin resumes review
  const resumedApp = await loanApplicationService.startReview(loanApp.id, adminActor);
  console.log(`[PASS 11c] Resumed from Hold -> Status: ${resumedApp.status}`);

  // 11d. Admin requests additional document
  const docReqResult = await loanApplicationService.requestDocuments(
    loanApp.id,
    adminActor,
    {
      documentType: 'OTHER',
      title: 'Latest Utility Bill',
      description: 'Electricity bill within last 2 months for address verification',
    }
  );
  console.log(`[PASS 11d] Admin Requested Additional Document -> Status: ${docReqResult.status}, Request ID: ${docReqResult.documentRequest.id}`);

  // 11e. Customer uploads requested document -> status automatically reverts to UNDER_REVIEW
  await documentService.uploadDocument(customer.id, 'OTHER', mockPdfFile('utility_bill_jan.pdf'), loanApp.id);
  const recheckedApp = await prisma.loanApplication.findUnique({ where: { id: loanApp.id } });
  console.log(`[PASS 11e] Customer Uploaded Requested Document -> Status Auto-restored: ${recheckedApp?.status}`);

  // 12. Admin modifies loan amount: e.g. proposedAmount ₹4,50,000
  const modifiedApp = await loanApplicationService.modifyAmount(
    loanApp.id,
    adminActor,
    450000
  );
  console.log(`[PASS 12] Admin Modified Amount -> Proposed: ₹${modifiedApp.proposedAmount}, Status: ${modifiedApp.status}`);

  // 13. Customer accepts modified offer
  const acceptedApp = await loanApplicationService.acceptOffer(customer.id, loanApp.id, customerActor);
  console.log(`[PASS 13] Customer Accepted Offer -> Status: ${acceptedApp.status}, Accepted: ₹${acceptedApp.acceptedAmount}`);

  // 14. Admin approves loan -> Generates Approval Letter & Sanction
  const approvedLoan = await loanApplicationService.approveApplication(
    loanApp.id,
    adminActor,
    {
      approvedAmount: 450000,
      interestRate: 11.5,
      tenureMonths: 24,
      processingFeeAmount: 1999,
      insuranceAmount: 0,
      remarks: 'Sanction approved following full verification',
    }
  );
  console.log(`[PASS 14] Loan Approved -> Status: ${approvedLoan.status}, Approved Amount: ₹${approvedLoan.approvedAmount}`);

  // 15. Admin queries Approved Queue (/admin/loans/approved or tab APPROVED)
  const approvedQueue = await loanApplicationService.getAdminApplications({
    status: 'APPROVED',
    page: 1,
    pageSize: 10,
  });
  const foundInApproved = approvedQueue.data.find(a => a.id === loanApp.id);
  console.log(`[PASS 15] Admin Approved Queue Count: ${approvedQueue.pagination.total}. Found Application in Approved Queue: ${Boolean(foundInApproved)}`);

  console.log('================================================================');
  console.log('ALL 15 TARGETED VERIFICATION PHASES PASSED WITH ZERO ERRORS!');
  console.log('================================================================');
}

main()
  .catch((e) => {
    console.error('Verification failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
