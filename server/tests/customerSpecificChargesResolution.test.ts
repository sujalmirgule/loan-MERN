import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/services/db';
import bcrypt from 'bcryptjs';
import { ALL_PERMISSION_KEYS } from '../src/constants/permissions';

describe('Customer-Specific Charges Resolution & Validation Suite', () => {
  const adminEmail = 'charge-resolution-admin@loanapprove.local';
  const adminPassword = 'AdminPassword123!';
  let adminToken: string;

  const noLoanCustMobile = '9877700001';
  let noLoanCustId: string;

  const withLoanCustMobile = '9877700002';
  let withLoanCustId: string;
  let withLoanAppId: string;
  let withLoanAppNumber: string;

  beforeAll(async () => {
    // Clean up previous test artifacts
    await prisma.whatsAppMessage.deleteMany({});
    await prisma.emailMessage.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.charge.deleteMany({});
    await prisma.disbursement.deleteMany({});
    await prisma.eMISchedule.deleteMany({});
    await prisma.loanAgreement.deleteMany({});
    await prisma.loanDocument.deleteMany({});
    await prisma.documentRequest.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.loanApplication.deleteMany({});
    await prisma.customer.deleteMany({
      where: { mobile: { in: [noLoanCustMobile, withLoanCustMobile] } },
    });
    await prisma.adminUser.deleteMany({
      where: { email: adminEmail },
    });

    // Create Admin User
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);
    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        passwordHash,
        fullName: 'Charges Underwriter',
        role: 'SUPER_ADMIN',
        permissions: JSON.stringify(ALL_PERMISSION_KEYS),
        isActive: true,
      },
    });

    const adminLoginRes = await request(app)
      .post('/api/auth/admin/login')
      .send({ email: adminEmail, password: adminPassword });
    adminToken = adminLoginRes.body.data.token;

    // Create Customer 1: Has NO loan application
    const noLoanCustomer = await prisma.customer.create({
      data: {
        fullName: 'No Loan Borrower',
        mobile: noLoanCustMobile,
        email: 'noloan@borrower.test',
        passwordHash,
        aadhaarEncrypted: 'test-encrypted-aadhaar-1',
        aadhaarMasked: 'XXXX XXXX 1111',
        monthlyIncome: 45000,
        address: '123 Test Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        kycStatus: 'PENDING',
      },
    });
    noLoanCustId = noLoanCustomer.id;

    // Create Customer 2: Has active loan application
    const withLoanCustomer = await prisma.customer.create({
      data: {
        fullName: 'Active Borrower Anuj',
        mobile: withLoanCustMobile,
        email: 'anuj.borrower@fintech.test',
        passwordHash,
        aadhaarEncrypted: 'test-encrypted-aadhaar-2',
        aadhaarMasked: 'XXXX XXXX 9564',
        monthlyIncome: 85000,
        address: '456 MG Road',
        city: 'Pune',
        state: 'Maharashtra',
        kycStatus: 'APPROVED',
      },
    });
    withLoanCustId = withLoanCustomer.id;

    const loanApp = await prisma.loanApplication.create({
      data: {
        customerId: withLoanCustId,
        applicationNumber: 'LA-2026-000001',
        requestedAmount: 346545,
        approvedAmount: 346545,
        tenureMonths: 24,
        loanType: 'PERSONAL',
        status: 'UNDER_REVIEW',
        interestRate: 12.0,
      },
    });
    withLoanAppId = loanApp.id;
    withLoanAppNumber = loanApp.applicationNumber;
  });

  afterAll(async () => {
    await prisma.whatsAppMessage.deleteMany({});
    await prisma.emailMessage.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.charge.deleteMany({});
    await prisma.disbursement.deleteMany({});
    await prisma.eMISchedule.deleteMany({});
    await prisma.loanAgreement.deleteMany({});
    await prisma.loanDocument.deleteMany({});
    await prisma.documentRequest.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.loanApplication.deleteMany({});
    await prisma.customer.deleteMany({
      where: { mobile: { in: [noLoanCustMobile, withLoanCustMobile] } },
    });
    await prisma.adminUser.deleteMany({
      where: { email: adminEmail },
    });
  });

  it('1. When customer has NO loan application: returns structured LOAN_APPLICATION_NOT_FOUND error', async () => {
    const res = await request(app)
      .post('/api/admin/charges/specific')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: noLoanCustId,
        chargeType: 'GST',
        amount: 900,
        remark: 'GST Fee',
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('No valid loan application was found for this customer.');
    expect(res.body.error).toBe('LOAN_APPLICATION_NOT_FOUND');
  });

  it('2. When customer has a loan but frontend passes customerId as applicationId: backend intelligently resolves to customer active loan', async () => {
    // This was the exact bug reported in the user prompt:
    // frontend sent applicationId = customer.id (UUID)
    const res = await request(app)
      .post('/api/admin/charges/specific')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: withLoanCustId,
        applicationId: withLoanCustId, // Pass customer ID as application reference
        chargeType: 'GST',
        amount: 900,
        remark: 'Standard GST',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('GST');
    expect(res.body.data.amount).toBe(900);
    expect(res.body.data.loanId).toBe(withLoanAppId);
    expect(res.body.data.status).toBe('PENDING');
  });

  it('3. Can create another independent charge using explicit applicationNumber (LA-2026-000001)', async () => {
    const res = await request(app)
      .post('/api/admin/charges/specific')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: withLoanCustId,
        applicationId: withLoanAppNumber,
        loanId: withLoanAppId,
        chargeType: 'Processing Fee',
        amount: 2500,
        remark: 'Standard Loan Processing Fee',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Processing Fee');
    expect(res.body.data.amount).toBe(2500);
    expect(res.body.data.loanId).toBe(withLoanAppId);
  });

  it('4. Rejects cross-customer assignment if application does not belong to the specified customer', async () => {
    const res = await request(app)
      .post('/api/admin/charges/specific')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: noLoanCustId, // Customer without loans
        applicationId: withLoanAppNumber, // Belongs to Customer 2
        loanId: withLoanAppId,
        chargeType: 'Stamp Duty',
        amount: 500,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Security Error');
  });

  it('5. Duplicate warning is triggered if the same charge type already exists and forceDuplicate is false', async () => {
    const res = await request(app)
      .post('/api/admin/charges/specific')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: withLoanCustId,
        applicationId: withLoanAppNumber,
        loanId: withLoanAppId,
        chargeType: 'GST', // Already created in test 2
        amount: 900,
        forceDuplicate: false,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('already exists for this application');
  });
});
