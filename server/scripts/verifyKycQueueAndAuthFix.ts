import { prisma } from '../src/services/db';
import { generateAuthToken } from '../src/services/tokenService';
import request from 'supertest';
import { app } from '../src/app';
import fs from 'fs';
import path from 'path';

async function runKycQueueAndAuthAudit() {
  console.log('====================================================');
  console.log('STARTING KYC QUEUE, AUTH & DYNAMIC CHARGE AUDIT');
  console.log('====================================================');

  // Setup Admin
  const admin = await prisma.adminUser.findFirstOrThrow({ where: { email: 'admin@loanapprove.com' } });
  const adminToken = generateAuthToken(admin.id, 'ADMIN');

  // Dummy file
  const dummyDir = path.resolve(__dirname, '../scratch');
  if (!fs.existsSync(dummyDir)) fs.mkdirSync(dummyDir, { recursive: true });
  const dummyDoc = path.join(dummyDir, 'test_aadhaar.pdf');
  fs.writeFileSync(dummyDoc, '%PDF-1.4\n%Test KYC Document content\n%%EOF');

  // 1. Create fresh test customer Ananya Verma
  const testMobile1 = '9988771122';
  await prisma.loanDocument.deleteMany({ where: { customer: { mobile: testMobile1 } } });
  await prisma.invoice.deleteMany({ where: { customer: { mobile: testMobile1 } } });
  await prisma.payment.deleteMany({ where: { customer: { mobile: testMobile1 } } });
  await prisma.charge.deleteMany({ where: { customer: { mobile: testMobile1 } } });
  await prisma.loanApplication.deleteMany({ where: { customer: { mobile: testMobile1 } } });
  await prisma.customer.deleteMany({ where: { mobile: testMobile1 } });

  console.log('\n[STEP 1] Customer Registration...');
  const regRes = await request(app)
    .post('/api/auth/customer/register')
    .send({
      fullName: 'Ananya Verma',
      mobile: testMobile1,
      email: 'ananya.verma@test.com',
      address: 'Flat 402, Lotus Towers',
      state: 'Maharashtra',
      city: 'Pune',
      pincode: '411001',
      monthlyIncome: 65000,
      aadhaar: '998877665544',
    });

  if (regRes.status !== 201) {
    throw new Error(`Registration failed: [${regRes.status}] ${JSON.stringify(regRes.body)}`);
  }
  const customerToken = regRes.body.data.token;
  const customerId = regRes.body.data.user.id;
  console.log(`✓ Customer registered: ${customerId}, Token issued.`);

  // 2. Customer uploads Aadhaar Front + Aadhaar Back
  console.log('\n[STEP 2] Customer Uploads Aadhaar Front + Back...');
  const upFrontRes = await request(app)
    .post('/api/customer/documents')
    .set('Authorization', `Bearer ${customerToken}`)
    .field('documentType', 'AADHAAR_FRONT')
    .attach('file', dummyDoc);

  if (upFrontRes.status !== 201) {
    throw new Error(`Aadhaar Front upload failed: [${upFrontRes.status}] ${JSON.stringify(upFrontRes.body)}`);
  }
  console.log('✓ Aadhaar Front uploaded.');

  const upBackRes = await request(app)
    .post('/api/customer/documents')
    .set('Authorization', `Bearer ${customerToken}`)
    .field('documentType', 'AADHAAR_BACK')
    .attach('file', dummyDoc);

  if (upBackRes.status !== 201) {
    throw new Error(`Aadhaar Back upload failed: [${upBackRes.status}] ${JSON.stringify(upBackRes.body)}`);
  }
  console.log('✓ Aadhaar Back uploaded.');

  // 3. Admin KYC Queue check before payment / UTR
  console.log('\n[STEP 3] Admin KYC Queue Check (Unpaid / No UTR)...');
  const adminQueueRes = await request(app)
    .get('/api/admin/kyc')
    .set('Authorization', `Bearer ${adminToken}`);

  if (adminQueueRes.status !== 200) {
    throw new Error(`Admin KYC queue request failed: [${adminQueueRes.status}] ${JSON.stringify(adminQueueRes.body)}`);
  }
  const kycList = adminQueueRes.body.data.customers;
  const targetKyc = kycList.find((c: any) => c.id === customerId);
  if (!targetKyc) {
    throw new Error(`Customer ${customerId} is MISSING from Admin KYC Queue before payment!`);
  }
  console.log(`✓ Customer found in Admin KYC Queue: ${targetKyc.fullName}`);
  console.log(`  - KYC Status: ${targetKyc.kycStatus}`);
  console.log(`  - Has UTR: ${targetKyc.hasUtr} (${targetKyc.utr || 'NOT SUBMITTED'})`);
  console.log(`  - Payment Verified: ${targetKyc.isKycFeePaid}`);

  // 4. Dynamic KYC Charge Update Test
  console.log('\n[STEP 4] Dynamic KYC Charge Update Test...');
  // Admin updates KYC Charge to ₹799
  const updateChargeRes = await request(app)
    .patch('/api/admin/charges/config')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ chargeType: 'KYC_CHARGES', amount: 799 });

  if (updateChargeRes.status !== 200 || updateChargeRes.body.data.kycCharges !== 799) {
    throw new Error(`Admin charge update failed: ${JSON.stringify(updateChargeRes.body)}`);
  }
  console.log('✓ Admin set KYC Charge = ₹799 in DB.');

  // Customer fetches active charges
  const custChargesRes = await request(app)
    .get('/api/customer/charges')
    .set('Authorization', `Bearer ${customerToken}`);

  if (custChargesRes.status !== 200) {
    throw new Error(`Customer charges fetch failed: ${JSON.stringify(custChargesRes.body)}`);
  }
  const kycChargeItem = custChargesRes.body.data.find((c: any) => c.name.includes('KYC') || c.remark?.includes('KYC'));
  if (!kycChargeItem || kycChargeItem.amount !== 799) {
    throw new Error(`Customer side expected ₹799 but received: ${JSON.stringify(kycChargeItem)}`);
  }
  console.log(`✓ Customer dynamically receives updated KYC Charge: ₹${kycChargeItem.amount} (Charge ID: ${kycChargeItem.id})`);

  // 5. Customer UTR Submission Test with Authorization Bearer
  console.log('\n[STEP 5] Customer Submits UTR 789654123425...');
  const utrRes = await request(app)
    .post(`/api/customer/charges/${kycChargeItem.id}/submit-utr`)
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      utr: '789654123425',
      paymentMethod: 'UPI',
      notes: 'KYC Verification Fee settlement',
    });

  if (utrRes.status !== 201) {
    throw new Error(`UTR submission failed: [${utrRes.status}] ${JSON.stringify(utrRes.body)}`);
  }
  console.log('✓ UTR submitted successfully without authentication error.');
  console.log(`  - Payment state: ${utrRes.body.data.payment.status}`);
  console.log(`  - Charge state: ${utrRes.body.data.charge.status}`);

  // 6. Admin KYC details & UTR inspection
  console.log('\n[STEP 6] Admin Inspects KYC Details & UTR...');
  const adminDetailRes = await request(app)
    .get(`/api/admin/kyc/${customerId}`)
    .set('Authorization', `Bearer ${adminToken}`);

  if (adminDetailRes.status !== 200) {
    throw new Error(`Admin KYC detail fetch failed: ${JSON.stringify(adminDetailRes.body)}`);
  }
  const detailData = adminDetailRes.body.data;
  if (!detailData.kycPayment?.hasUtr || detailData.kycPayment?.utr !== '789654123425') {
    throw new Error(`Admin detail does not show submitted UTR: ${JSON.stringify(detailData.kycPayment)}`);
  }
  console.log(`✓ Admin sees submitted UTR: ${detailData.kycPayment.utr} (Payment Status: ${detailData.kycPayment.paymentStatus})`);

  // 7. Admin KYC Approval & Invoice Generation
  console.log('\n[STEP 7] Admin Approves KYC...');
  const approveRes = await request(app)
    .post(`/api/admin/kyc/${customerId}/decision`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'APPROVED' });

  if (approveRes.status !== 200) {
    throw new Error(`Admin KYC approval failed: [${approveRes.status}] ${JSON.stringify(approveRes.body)}`);
  }
  console.log('✓ Admin approved KYC.');

  // Verify Invoice in DB
  const invoice = await prisma.invoice.findFirst({
    where: { customerId, chargeId: kycChargeItem.id },
  });
  if (!invoice) {
    throw new Error('KYC Invoice was NOT created in Database after KYC approval!');
  }
  console.log(`✓ KYC Invoice persisted in DB: ${invoice.invoiceNumber} (Amount: ₹${invoice.amount}, Total: ₹${invoice.totalAmount})`);

  // 8. Customer Accesses KYC Invoice PDF
  console.log('\n[STEP 8] Customer Streams KYC Invoice PDF...');
  const custInvoiceRes = await request(app)
    .get(`/api/customer/charges/${kycChargeItem.id}/invoice`)
    .set('Authorization', `Bearer ${customerToken}`);

  if (custInvoiceRes.status !== 200) {
    throw new Error(`Customer invoice download failed: [${custInvoiceRes.status}] ${JSON.stringify(custInvoiceRes.body)}`);
  }
  if (!custInvoiceRes.headers['content-type']?.includes('application/pdf')) {
    throw new Error(`Expected application/pdf but got: ${custInvoiceRes.headers['content-type']}`);
  }
  if (custInvoiceRes.body.length < 100) {
    throw new Error(`Invoice PDF buffer too small: ${custInvoiceRes.body.length} bytes`);
  }
  console.log(`✓ Customer successfully downloaded real invoice PDF (${custInvoiceRes.body.length} bytes).`);

  // 9. Negative Test: KYC Rejection with Mandatory Reason
  console.log('\n[STEP 9] KYC Rejection Flow Test...');
  const testMobile2 = '9988771133';
  await prisma.loanDocument.deleteMany({ where: { customer: { mobile: testMobile2 } } });
  await prisma.customer.deleteMany({ where: { mobile: testMobile2 } });

  const reg2 = await request(app)
    .post('/api/auth/customer/register')
    .send({
      fullName: 'Vikram Sethi',
      mobile: testMobile2,
      email: 'vikram.sethi@test.com',
      address: '22, MG Road',
      state: 'Delhi',
      city: 'New Delhi',
      pincode: '110001',
      monthlyIncome: 45000,
      aadhaar: '112233445566',
    });

  const cust2Id = reg2.body.data.user.id;
  const cust2Token = reg2.body.data.token;

  await request(app)
    .post('/api/customer/documents')
    .set('Authorization', `Bearer ${cust2Token}`)
    .field('documentType', 'AADHAAR_FRONT')
    .attach('file', dummyDoc);

  await request(app)
    .post('/api/customer/documents')
    .set('Authorization', `Bearer ${cust2Token}`)
    .field('documentType', 'AADHAAR_BACK')
    .attach('file', dummyDoc);

  // Admin attempts to approve without UTR -> MUST FAIL with 400
  const invalidApprove = await request(app)
    .post(`/api/admin/kyc/${cust2Id}/decision`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'APPROVED' });

  if (invalidApprove.status !== 400) {
    throw new Error(`Expected approval without UTR to be rejected with 400, but got: ${invalidApprove.status}`);
  }
  console.log('✓ Approval without UTR is strictly blocked by backend rule.');

  // Admin rejects with reason
  const rejectRes = await request(app)
    .post(`/api/admin/kyc/${cust2Id}/decision`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      status: 'REJECTED',
      reason: 'Aadhaar information could not be verified.',
    });

  if (rejectRes.status !== 200) {
    throw new Error(`Rejection failed: [${rejectRes.status}] ${JSON.stringify(rejectRes.body)}`);
  }

  const cust2Db = await prisma.customer.findUniqueOrThrow({ where: { id: cust2Id } });
  if (cust2Db.kycStatus !== 'REJECTED') {
    throw new Error(`Expected KYC status REJECTED, but got: ${cust2Db.kycStatus}`);
  }
  console.log(`✓ Customer KYC rejected properly: ${cust2Db.kycStatus}`);

  // Clean up test data
  console.log('\n[CLEANUP] Purging test audit records...');
  await prisma.loanDocument.deleteMany({ where: { customerId: { in: [customerId, cust2Id] } } });
  await prisma.invoice.deleteMany({ where: { customerId: { in: [customerId, cust2Id] } } });
  await prisma.payment.deleteMany({ where: { customerId: { in: [customerId, cust2Id] } } });
  await prisma.charge.deleteMany({ where: { customerId: { in: [customerId, cust2Id] } } });
  await prisma.loanApplication.deleteMany({ where: { customerId: { in: [customerId, cust2Id] } } });
  await prisma.customer.deleteMany({ where: { id: { in: [customerId, cust2Id] } } });

  console.log('\n====================================================');
  console.log('ALL KYC WORKFLOWS & FIXES VERIFIED SUCCESSFULLY!');
  console.log('====================================================');
}

runKycQueueAndAuthAudit()
  .catch((err) => {
    console.error('AUDIT FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
