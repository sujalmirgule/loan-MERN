import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/services/db';
import bcrypt from 'bcryptjs';
import { ALL_PERMISSION_KEYS } from '../src/constants/permissions';

describe('Admin KYC Verification & UTR Validation Flow', () => {
  const adminEmail = 'kyc-admin-test@loanapprove.local';
  const adminPassword = 'AdminPassword123!';
  let adminToken: string;

  const custAMobile = '9811122233';
  let custAId: string;
  let custAToken: string;
  let custAChargeId: string;

  const custBMobile = '9822233344';
  let custBId: string;
  let custBToken: string;
  let custBChargeId: string;

  beforeAll(async () => {
    // Clean up test data
    await prisma.whatsAppMessage.deleteMany({});
    await prisma.emailMessage.deleteMany({});
    await prisma.eMISchedule.deleteMany({});
    await prisma.loanAgreement.deleteMany({});
    await prisma.documentRequest.deleteMany({});
    await prisma.disbursement.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.charge.deleteMany({});
    await prisma.loanDocument.deleteMany({});
    await prisma.loanApplication.deleteMany({});
    await prisma.customer.deleteMany({
      where: { mobile: { in: [custAMobile, custBMobile] } },
    });
    await prisma.adminUser.deleteMany({
      where: { email: adminEmail },
    });

    // Create Admin
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);
    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        passwordHash,
        fullName: 'KYC Compliance Lead',
        role: 'SUPER_ADMIN',
        permissions: JSON.stringify(ALL_PERMISSION_KEYS),
        isActive: true,
      },
    });

    const adminLoginRes = await request(app)
      .post('/api/auth/admin/login')
      .send({ email: adminEmail, password: adminPassword });
    adminToken = adminLoginRes.body.data.token;

    // Register Customer A
    const custARes = await request(app)
      .post('/api/auth/customer/register')
      .send({
        fullName: 'Anuj Test',
        mobile: custAMobile,
        email: 'anuj.test@domain.local',
        state: 'Maharashtra',
        city: 'Mumbai',
        address: 'Bandra West, Mumbai',
        monthlyIncome: 65000,
        aadhaar: '123456789564',
      });
    custAId = custARes.body.data.user.id;
    custAToken = custARes.body.data.token;

    // Register Customer B
    const custBRes = await request(app)
      .post('/api/auth/customer/register')
      .send({
        fullName: 'Ravi Test',
        mobile: custBMobile,
        email: 'ravi.test@domain.local',
        state: 'Delhi',
        city: 'New Delhi',
        address: 'Connaught Place, New Delhi',
        monthlyIncome: 75000,
        aadhaar: '987654321012',
      });
    custBId = custBRes.body.data.user.id;
    custBToken = custBRes.body.data.token;
  });

  afterAll(async () => {
    await prisma.whatsAppMessage.deleteMany({});
    await prisma.emailMessage.deleteMany({});
    await prisma.eMISchedule.deleteMany({});
    await prisma.loanAgreement.deleteMany({});
    await prisma.documentRequest.deleteMany({});
    await prisma.disbursement.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.charge.deleteMany({});
    await prisma.loanDocument.deleteMany({});
    await prisma.loanApplication.deleteMany({});
    await prisma.customer.deleteMany({
      where: { mobile: { in: [custAMobile, custBMobile] } },
    });
    await prisma.adminUser.deleteMany({
      where: { email: adminEmail },
    });
  });

  it('1. Rejects KYC approval if Aadhaar documents are missing', async () => {
    const res = await request(app)
      .post(`/api/admin/kyc/${custAId}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Both Aadhaar Front and Aadhaar Back must be uploaded');
  });

  it('2. Customer uploads only Aadhaar Front; Admin still cannot approve', async () => {
    await request(app)
      .post('/api/customer/documents')
      .set('Authorization', `Bearer ${custAToken}`)
      .attach('file', Buffer.from('mock front'), 'front.pdf')
      .field('documentType', 'AADHAAR_FRONT');

    const res = await request(app)
      .post(`/api/admin/kyc/${custAId}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Both Aadhaar Front and Aadhaar Back must be uploaded');
  });

  it('3. Customer uploads Aadhaar Back; KYC status is UNDER_REVIEW', async () => {
    await request(app)
      .post('/api/customer/documents')
      .set('Authorization', `Bearer ${custAToken}`)
      .attach('file', Buffer.from('mock back'), 'back.pdf')
      .field('documentType', 'AADHAAR_BACK');

    const cust = await prisma.customer.findUnique({ where: { id: custAId } });
    expect(cust?.kycStatus).toBe('UNDER_REVIEW');
  });

  it('4. Admin CANNOT approve KYC if UTR is missing', async () => {
    const res = await request(app)
      .post(`/api/admin/kyc/${custAId}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('UTR number is required before KYC approval');
  });

  it('5. Admin KYC list correctly exposes UTR Missing badge data', async () => {
    const listRes = await request(app)
      .get('/api/admin/kyc')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    const customers = listRes.body.data.customers;
    const itemA = customers.find((c: any) => c.id === custAId);
    expect(itemA).toBeDefined();
    expect(itemA.hasUtr).toBe(false);
    expect(itemA.isKycFeePaid).toBe(false);
    expect(itemA.utr).toBeNull();
  });

  it('6. Admin KYC detail endpoint returns kycPayment block with Not Provided UTR', async () => {
    const detailRes = await request(app)
      .get(`/api/admin/kyc/${custAId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.kycPayment).toBeDefined();
    expect(detailRes.body.data.kycPayment.hasUtr).toBe(false);
    expect(detailRes.body.data.kycPayment.utr).toBe('Not Provided');
    expect(detailRes.body.data.kycPayment.isPaid).toBe(false);
  });

  it('7. Customer submits invalid format UTR (< 8 chars); rejected by API', async () => {
    // Find active KYC charge
    const chargesRes = await request(app)
      .get('/api/customer/charges')
      .set('Authorization', `Bearer ${custAToken}`);
    custAChargeId = chargesRes.body.data[0].id;

    const payRes = await request(app)
      .post(`/api/customer/charges/${custAChargeId}/pay`)
      .set('Authorization', `Bearer ${custAToken}`)
      .send({ utr: '123' });

    expect(payRes.status).toBe(400);
  });

  it('8. Customer submits valid UTR; KYC list shows UTR Provided', async () => {
    const payRes = await request(app)
      .post(`/api/customer/charges/${custAChargeId}/pay`)
      .set('Authorization', `Bearer ${custAToken}`)
      .send({ utr: 'UTR123456789012' });

    expect(payRes.status).toBe(201);
    expect(payRes.body.data.charge.transactionRef).toBe('UTR123456789012');

    const listRes = await request(app)
      .get('/api/admin/kyc')
      .set('Authorization', `Bearer ${adminToken}`);

    const itemA = listRes.body.data.customers.find((c: any) => c.id === custAId);
    expect(itemA.hasUtr).toBe(true);
    expect(itemA.utr).toBe('UTR123456789012');
    expect(itemA.isKycFeePaid).toBe(false);
  });

  it('9. Admin successfully approves KYC with UTR present -> KYC becomes VERIFIED, payment becomes PAID, Invoice generated', async () => {
    const res = await request(app)
      .post(`/api/admin/kyc/${custAId}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });

    expect(res.status).toBe(200);

    // 1. Customer KYC status updated
    const customer = await prisma.customer.findUnique({ where: { id: custAId } });
    expect(customer?.kycStatus).toBe('APPROVED');

    // 2. KYC charge is PAID
    const charge = await prisma.charge.findUnique({ where: { id: custAChargeId } });
    expect(charge?.status).toBe('PAID');

    // 3. 1:1 dynamic Tax Invoice generated
    const invoice = await prisma.invoice.findUnique({ where: { chargeId: custAChargeId } });
    expect(invoice).toBeDefined();
    expect(invoice?.customerId).toBe(custAId);
    expect(invoice?.status).toBe('PAID');

    // 4. Customer notification created
    const notif = await prisma.notification.findFirst({
      where: { customerId: custAId, eventType: 'KYC_STATUS' },
      orderBy: { createdAt: 'desc' },
    });
    expect(notif?.message).toBe('KYC verification completed successfully.');

    // 5. Audit log created
    const audit = await prisma.auditLog.findFirst({
      where: { entityId: custAId, action: 'KYC_APPROVED' },
    });
    expect(audit).toBeDefined();
  });

  it('10. Another customer B cannot reuse Customer A’s UTR (Duplicate UTR prevention)', async () => {
    // Upload Customer B docs
    await request(app)
      .post('/api/customer/documents')
      .set('Authorization', `Bearer ${custBToken}`)
      .attach('file', Buffer.from('mock front b'), 'front.pdf')
      .field('documentType', 'AADHAAR_FRONT');

    await request(app)
      .post('/api/customer/documents')
      .set('Authorization', `Bearer ${custBToken}`)
      .attach('file', Buffer.from('mock back b'), 'back.pdf')
      .field('documentType', 'AADHAAR_BACK');

    const chargesRes = await request(app)
      .get('/api/customer/charges')
      .set('Authorization', `Bearer ${custBToken}`);
    custBChargeId = chargesRes.body.data[0].id;

    // Attempt to submit customer A's UTR
    const dupRes = await request(app)
      .post(`/api/customer/charges/${custBChargeId}/pay`)
      .set('Authorization', `Bearer ${custBToken}`)
      .send({ utr: 'UTR123456789012' });

    expect(dupRes.status).toBe(400);
    expect(dupRes.body.message).toContain('Duplicate UTR');
  });
});
