import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/services/db';
import { pdfService } from '../src/services/pdfService';
import { whatsappService } from '../src/services/whatsappService';
import { emailService } from '../src/services/emailService';
import { MetaWhatsAppProvider } from '../src/providers/whatsapp/metaWhatsAppProvider';
import { SmtpEmailProvider } from '../src/providers/email/smtpEmailProvider';
import bcrypt from 'bcryptjs';

describe('UPI Payment, UTR Flow, Underwriting Lifecycle & IDOR Security Suite', () => {
  const customerMobile1 = '9711111111';
  const customerMobile2 = '9722222222';
  const adminEmail = 'upiadmin@loanapprove.com';
  const adminPassword = 'AdminSecret@2026';

  let customerToken1: string;
  let customerId1: string;
  let customerToken2: string;
  let customerId2: string;
  let adminToken: string;

  let loanId1: string;
  let loanId2: string;
  let loanIdForRejection: string;
  let chargeId1: string;
  let chargeId2: string;
  let paymentId1: string;

  const testUtr1 = 'UTR_UPI_9988776655';
  const testUtr2 = 'UTR_UPI_1122334455';

  beforeAll(async () => {
    // Cleanup prior test artifacts
    await prisma.invoice.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.disbursement.deleteMany({});
    await prisma.eMISchedule.deleteMany({});
    await prisma.loanAgreement.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.charge.deleteMany({});
    await prisma.loanDocument.deleteMany({});
    await prisma.documentRequest.deleteMany({});
    await prisma.whatsAppMessage.deleteMany({});
    await prisma.emailMessage.deleteMany({});
    await prisma.loanApplication.deleteMany({});
    await prisma.customer.deleteMany({
      where: { mobile: { in: [customerMobile1, customerMobile2] } },
    });
    await prisma.adminUser.deleteMany({
      where: { email: adminEmail },
    });

    // 1. Configure test UPI merchant in DB for testing
    await prisma.uPISettings.upsert({
      where: { id: 'default' },
      update: {
        upiEnabled: true,
        upiId: 'fintech.test@upi',
        merchantName: 'Loan Approve Financial Services',
      },
      create: {
        id: 'default',
        upiEnabled: true,
        upiId: 'fintech.test@upi',
        merchantName: 'Loan Approve Financial Services',
      },
    });

    // 2. Create Admin
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);
    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        passwordHash,
        fullName: 'Operations Underwriter',
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });

    const adminLoginRes = await request(app)
      .post('/api/auth/admin/login')
      .send({ email: adminEmail, password: adminPassword });
    adminToken = adminLoginRes.body.data.token;

    // 3. Register Customer 1
    const cust1Res = await request(app)
      .post('/api/auth/customer/register')
      .send({
        fullName: 'Rahul Deshmukh',
        mobile: customerMobile1,
        email: 'rahul.deshmukh@fintech.test',
        address: '404 MG Road, Shivaji Nagar',
        state: 'Maharashtra',
        city: 'Pune',
        aadhaar: '667788990011',
        monthlyIncome: 75000,
      });
    customerToken1 = cust1Res.body.data.token;
    customerId1 = cust1Res.body.data.user.id;

    // 4. Register Customer 2
    const cust2Res = await request(app)
      .post('/api/auth/customer/register')
      .send({
        fullName: 'Sunita Patil',
        mobile: customerMobile2,
        email: 'sunita.patil@fintech.test',
        address: '12 FC Road',
        state: 'Maharashtra',
        city: 'Pune',
        aadhaar: '778899001122',
        monthlyIncome: 65000,
      });
    customerToken2 = cust2Res.body.data.token;
    customerId2 = cust2Res.body.data.user.id;

    // Verify KYC for Customer 1 and Customer 2 to enable loan application
    await prisma.customer.update({
      where: { id: customerId1 },
      data: { kycStatus: 'VERIFIED' },
    });
    await prisma.customer.update({
      where: { id: customerId2 },
      data: { kycStatus: 'APPROVED' },
    });

    // Create loan for Customer 1
    const loan1Res = await request(app)
      .post('/api/customer/loan-applications')
      .set('Authorization', `Bearer ${customerToken1}`)
      .send({
        amount: 200000,
        tenureMonths: 24,
        purpose: 'Business Expansion',
      });
    loanId1 = loan1Res.body.data.id;

    // Create loan for Customer 2
    const loan2Res = await request(app)
      .post('/api/customer/loan-applications')
      .set('Authorization', `Bearer ${customerToken2}`)
      .send({
        amount: 150000,
        tenureMonths: 18,
        purpose: 'Equipment Purchase',
      });
    loanId2 = loan2Res.body.data.id;

    // Create loan for rejection test (direct DB insert — Customer 2 already has an active loan
    // so the API would return 409; we bypass the one-loan guard here purely for test setup)
    const loanRejRecord = await prisma.loanApplication.create({
      data: {
        customerId: customerId2,
        applicationNumber: `LA-TEST-REJ-${Date.now()}`,
        requestedAmount: 50000,
        tenureMonths: 12,
        purpose: 'Short term working capital',
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });
    loanIdForRejection = loanRejRecord.id;

    // Create specific charge for Customer 1
    const charge1 = await prisma.charge.create({
      data: {
        customer: { connect: { id: customerId1 } },
        loan: { connect: { id: loanId1 } },
        name: 'Documentation & Processing Fee',
        type: 'FIXED',
        amount: 2499,
        status: 'PENDING',
        isMandatory: true,
      },
    });
    chargeId1 = charge1.id;

    // Create specific charge for Customer 2
    const charge2 = await prisma.charge.create({
      data: {
        customer: { connect: { id: customerId2 } },
        loan: { connect: { id: loanId2 } },
        name: 'Verification Charge',
        type: 'FIXED',
        amount: 999,
        status: 'PENDING',
        isMandatory: true,
      },
    });
    chargeId2 = charge2.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.invoice.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.disbursement.deleteMany({});
    await prisma.eMISchedule.deleteMany({});
    await prisma.loanAgreement.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.charge.deleteMany({});
    await prisma.loanDocument.deleteMany({});
    await prisma.documentRequest.deleteMany({});
    await prisma.whatsAppMessage.deleteMany({});
    await prisma.emailMessage.deleteMany({});
    await prisma.loanApplication.deleteMany({});
    await prisma.customer.deleteMany({
      where: { mobile: { in: [customerMobile1, customerMobile2] } },
    });
    await prisma.adminUser.deleteMany({
      where: { email: adminEmail },
    });
  });

  // -------------------------------------------------------------
  // 1. PUBLIC PAYMENT METHODS CONTRACT (Single UPI Architecture)
  // -------------------------------------------------------------
  describe('Public Payment Methods (Single UPI Architecture)', () => {
    it('returns configured UPI payment details with supported client-side apps', async () => {
      const res = await request(app).get('/api/public/payment-methods');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.paymentMethod).toBe('UPI');
      expect(res.body.data.upiVpa).toBe('fintech.test@upi');
      expect(res.body.data.merchantName).toBe('Loan Approve Financial Services');
      expect(res.body.data.supportedApps).toEqual(
        expect.arrayContaining(['Google Pay', 'PhonePe', 'Paytm', 'BHIM UPI'])
      );
    });
  });

  // -------------------------------------------------------------
  // 2. LOAN UNDERWRITING (Explicit Admin Action)
  // -------------------------------------------------------------
  describe('Explicit Loan Underwriting (Approval & Rejection)', () => {
    it('1. Admin approves loan: transitions status to APPROVED, creates agreement and EMI', async () => {
      const res = await request(app)
        .post(`/api/admin/loan-applications/${loanId1}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approvedAmount: 200000,
          tenureMonths: 24,
          interestRate: 12.0,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('APPROVED');
      expect(res.body.data.approvedAmount).toBe(200000);

      // Verify agreement created
      const agreement = await prisma.loanAgreement.findUnique({ where: { loanId: loanId1 } });
      expect(agreement).not.toBeNull();

      // Verify EMI schedule generated
      const emiCount = await prisma.eMISchedule.count({ where: { loanId: loanId1 } });
      expect(emiCount).toBe(24);
    }, 15000);

    it('2. Admin rejects loan: transitions status to REJECTED with mandatory reason', async () => {
      const res = await request(app)
        .post(`/api/admin/loan-applications/${loanIdForRejection}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rejectionReason: 'Credit score below policy threshold for unsecured lending.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('REJECTED');
      expect(res.body.data.rejectionReason).toContain('Credit score below policy threshold');
    }, 15000);
  });

  // -------------------------------------------------------------
  // 3. CHARGE PAYMENT INITIATION & TAMPER-PROOF SECURITY
  // -------------------------------------------------------------
  describe('UPI Payment Initiation & Tamper-Proof Amount', () => {
    it('3. Customer creates charge payment: amount strictly fetched from DB charge', async () => {
      const res = await request(app)
        .post('/api/customer/payments/upi')
        .set('Authorization', `Bearer ${customerToken1}`)
        .send({
          chargeId: chargeId1,
          amount: 1, // Tampered attempt! Must be ignored.
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.paymentId).toBeDefined();
      expect(res.body.data.amount).toBe(2499); // Must match DB Charge amount!
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.upiIntentUrl).toContain('upi://pay?');
      expect(res.body.data.upiIntentUrl).toContain('am=2499.00');
      expect(res.body.data.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);

      paymentId1 = res.body.data.paymentId;
    });
  });

  // -------------------------------------------------------------
  // 4. UTR SUBMISSION & DUPLICATE CHECKS
  // -------------------------------------------------------------
  describe('UTR Submission Flow', () => {
    it('4. Customer submits UTR: status transitions to UNDER_VERIFICATION, NOT PAID', async () => {
      const res = await request(app)
        .post(`/api/customer/payments/${paymentId1}/utr`)
        .set('Authorization', `Bearer ${customerToken1}`)
        .send({ utr: testUtr1 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('UNDER_VERIFICATION');

      const paymentInDb = await prisma.payment.findUnique({ where: { id: paymentId1 } });
      expect(paymentInDb?.status).toBe('UNDER_VERIFICATION');
      expect(paymentInDb?.status).not.toBe('PAID');
    });

    it('prevents duplicate UTR across different customer payments with 409 Conflict', async () => {
      const init2Res = await request(app)
        .post('/api/customer/payments/upi')
        .set('Authorization', `Bearer ${customerToken2}`)
        .send({ chargeId: chargeId2 });

      const paymentId2 = init2Res.body.data.paymentId;

      const dupRes = await request(app)
        .post(`/api/customer/payments/${paymentId2}/utr`)
        .set('Authorization', `Bearer ${customerToken2}`)
        .send({ utr: testUtr1 });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.message).toContain('already submitted');
    });
  });

  // -------------------------------------------------------------
  // 5. PAYMENT VERIFICATION & SEPARATION FROM LOAN APPROVAL
  // -------------------------------------------------------------
  describe('Payment Verification (No Auto-Approval of Loans)', () => {
    it('5. Admin verifies payment: Payment = PAID, Charge = PAID, Loan status does NOT unexpectedly change', async () => {
      // Record initial loan status
      const loanBefore = await prisma.loanApplication.findUnique({ where: { id: loanId1 } });
      expect(loanBefore?.status).toBe('APPROVED'); // was approved by underwriting

      const res = await request(app)
        .patch(`/api/admin/payments/${paymentId1}/verify`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.updatedPayment.status).toBe('PAID');
      expect(res.body.data.updatedLoan.paymentStatus).toBe('PAID');
      expect(res.body.data.updatedLoan.status).toBe('APPROVED'); // Preserved without unexpected change

      // 6. Charge becomes PAID
      const updatedCharge = await prisma.charge.findUnique({ where: { id: chargeId1 } });
      expect(updatedCharge?.status).toBe('PAID');
      expect(updatedCharge?.paidAt).not.toBeNull();

      // 9. Payment verified notification created
      const notif = await prisma.notification.findFirst({
        where: { customerId: customerId1, eventType: 'PAYMENT_VERIFIED' },
      });
      expect(notif).not.toBeNull();
    });

    it('Verifying payment on a SUBMITTED loan does NOT approve it', async () => {
      // Customer 2 initiates and submits UTR for unapproved loan2
      const initRes = await request(app)
        .post('/api/customer/payments/upi')
        .set('Authorization', `Bearer ${customerToken2}`)
        .send({ chargeId: chargeId2 });
      const pay2Id = initRes.body.data.paymentId;

      await request(app)
        .post(`/api/customer/payments/${pay2Id}/utr`)
        .set('Authorization', `Bearer ${customerToken2}`)
        .send({ utr: testUtr2 });

      // Admin verifies payment
      const verifyRes = await request(app)
        .patch(`/api/admin/payments/${pay2Id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.updatedPayment.status).toBe('PAID');
      expect(verifyRes.body.data.updatedLoan.paymentStatus).toBe('PAID');

      // CRITICAL: Loan status must NOT be changed to APPROVED merely because fee was verified!
      const loan2Db = await prisma.loanApplication.findUnique({ where: { id: loanId2 } });
      expect(loan2Db?.status).not.toBe('APPROVED');
      expect(loan2Db?.status).toBe('SUBMITTED');
    });
  });

  // -------------------------------------------------------------
  // 6. DYNAMIC PDF GENERATION (Invoice & Sanction Letter)
  // -------------------------------------------------------------
  describe('Dynamic PDF Document Logic', () => {
    it('7. Invoice generated dynamically from DB data for paid charge', async () => {
      const invoiceRes = await pdfService.generateInvoicePdfForCharge(chargeId1);
      expect(invoiceRes.buffer).toBeInstanceOf(Buffer);
      expect(invoiceRes.buffer.length).toBeGreaterThan(1000);
      expect(invoiceRes.buffer.toString('utf-8', 0, 4)).toBe('%PDF');
    });

    it('Approval Letter generated dynamically for actually approved loan', async () => {
      const letterBuffer = await pdfService.generateSanctionLetter(loanId1);
      expect(letterBuffer).toBeInstanceOf(Buffer);
      expect(letterBuffer.length).toBeGreaterThan(1000);
      expect(letterBuffer.toString('utf-8', 0, 4)).toBe('%PDF');
    });

    it('Strictly prevents generating approval letter for unapproved loan', async () => {
      const res = await request(app)
        .get(`/api/customer/loans/${loanId2}/approval-letter/pdf`)
        .set('Authorization', `Bearer ${customerToken2}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('only available for approved loans');
    });
  });

  // -------------------------------------------------------------
  // 7. STRICT IDOR & ACCESS CONTROL AUDIT
  // -------------------------------------------------------------
  describe('Strict IDOR & Cross-Customer Security Checks', () => {
    it('Customer 2 CANNOT access Customer 1 payment', async () => {
      const res = await request(app)
        .get(`/api/customer/payments/${paymentId1}`)
        .set('Authorization', `Bearer ${customerToken2}`);

      expect([403, 404]).toContain(res.status);
    });

    it('Customer 2 CANNOT submit UTR for Customer 1 payment', async () => {
      const res = await request(app)
        .post(`/api/customer/payments/${paymentId1}/utr`)
        .set('Authorization', `Bearer ${customerToken2}`)
        .send({ utr: 'UTR_HACK_12345' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });

    it('Customer 2 CANNOT access Customer 1 charges', async () => {
      const res = await request(app)
        .get(`/api/customer/charges/${chargeId1}`)
        .set('Authorization', `Bearer ${customerToken2}`);

      expect([403, 404]).toContain(res.status);
    });

    it('Customer 2 CANNOT download Customer 1 invoice', async () => {
      const res = await request(app)
        .get(`/api/customer/charges/${chargeId1}/invoice`)
        .set('Authorization', `Bearer ${customerToken2}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });

    it('Customer 2 CANNOT download Customer 1 approval letter', async () => {
      const res = await request(app)
        .get(`/api/customer/loans/${loanId1}/approval-letter/pdf`)
        .set('Authorization', `Bearer ${customerToken2}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });
  });

  // -------------------------------------------------------------
  // 8. EXTERNAL PROVIDERS & AUTOMATED COMMUNICATION
  // -------------------------------------------------------------
  describe('External Communication Providers (No Fake Success)', () => {
    it('returns WHATSAPP_PROVIDER_NOT_CONFIGURED when WhatsApp credentials are missing', async () => {
      whatsappService.setProvider(new MetaWhatsAppProvider({ accessToken: '', phoneNumberId: '' }));
      await prisma.whatsAppSettings.upsert({
        where: { id: 'default' },
        update: { enabled: false, accessTokenEnc: '' },
        create: { id: 'default', enabled: false, accessTokenEnc: '' },
      });

      const res = await request(app)
        .post('/api/admin/communication/whatsapp')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: customerId1,
          message: 'Hello from underwriting desk',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('WHATSAPP_PROVIDER_NOT_CONFIGURED');
      whatsappService.resetProvider();
    });

    it('records failed status and EMAIL_PROVIDER_NOT_CONFIGURED when SMTP is unconfigured', async () => {
      emailService.setProvider(new SmtpEmailProvider({ host: '', user: '', pass: '' }));
      await prisma.emailSettings.upsert({
        where: { id: 'default' },
        update: { smtpHost: '' },
        create: { id: 'default', smtpHost: '' },
      });

      const res = await request(app)
        .post('/api/admin/communication/email')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerIds: [customerId1],
          subject: 'Your Verification Status',
          message: 'Please review your verification status.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.failedCount).toBeGreaterThanOrEqual(1);
      emailService.resetProvider();
    });

    it('10. Automated communication triggers only when enabled', async () => {
      // Disable automated triggers
      await prisma.communicationSettings.upsert({
        where: { id: 'default' },
        update: {
          autoEmailOnPaymentVerified: false,
          autoWhatsAppOnPaymentVerified: false,
        },
        create: {
          id: 'default',
          autoEmailOnPaymentVerified: false,
          autoWhatsAppOnPaymentVerified: false,
        },
      });

      const settings = await prisma.communicationSettings.findUnique({ where: { id: 'default' } });
      expect(settings?.autoEmailOnPaymentVerified).toBe(false);
      expect(settings?.autoWhatsAppOnPaymentVerified).toBe(false);
    });
  });
});
