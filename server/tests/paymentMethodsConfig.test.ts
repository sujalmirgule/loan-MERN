import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/services/db';
import { generateAuthToken } from '../src/services/tokenService';
import { hashPassword } from '../src/utils/security';

describe('Payment Methods Dynamic Enable/Disable Configuration Suite', () => {
  let adminToken: string;
  let unauthorizedAdminToken: string;
  let customerToken: string;
  let customerId: string;

  beforeAll(async () => {
    const adminPassHash = await hashPassword('Admin@123');

    // 1. Authorized Admin with upi.manage, settings.manage, upi.view, settings.view
    const admin = await prisma.adminUser.upsert({
      where: { email: 'pm-admin@fintech.test' },
      update: {
        permissions: JSON.stringify(['upi.view', 'upi.manage', 'settings.view', 'settings.manage', 'payments.view', 'payments.verify']),
      },
      create: {
        email: 'pm-admin@fintech.test',
        fullName: 'Payment Config Admin',
        passwordHash: adminPassHash,
        role: 'ADMIN',
        permissions: JSON.stringify(['upi.view', 'upi.manage', 'settings.view', 'settings.manage', 'payments.view', 'payments.verify']),
      },
    });
    adminToken = generateAuthToken(admin.id, 'ADMIN');

    // 2. Staff Admin without upi.manage or settings.manage
    const staff = await prisma.adminUser.upsert({
      where: { email: 'pm-staff@fintech.test' },
      update: {
        permissions: JSON.stringify(['customers.view']),
      },
      create: {
        email: 'pm-staff@fintech.test',
        fullName: 'Staff Without Payment Manage',
        passwordHash: adminPassHash,
        role: 'STAFF',
        permissions: JSON.stringify(['customers.view']),
      },
    });
    unauthorizedAdminToken = generateAuthToken(staff.id, 'ADMIN');

    // 3. Customer User
    const customer = await prisma.customer.upsert({
      where: { mobile: '9988776655' },
      update: {
        fullName: 'Test Borrower',
        email: 'borrower@fintech.test',
      },
      create: {
        mobile: '9988776655',
        fullName: 'Test Borrower',
        email: 'borrower@fintech.test',
        address: '123 Fintech Lane, Mumbai',
        state: 'Maharashtra',
        city: 'Mumbai',
        pincode: '400001',
        aadhaarEncrypted: 'mock-enc-aadhaar-pm',
        aadhaarMasked: 'XXXX XXXX 9999',
        monthlyIncome: 75000,
        status: 'ACTIVE',
        passwordHash: adminPassHash,
      },
    });
    customerId = customer.id;
    customerToken = generateAuthToken(customer.id, 'CUSTOMER');
  });

  afterAll(async () => {
    // Reset defaults
    await prisma.uPISettings.upsert({
      where: { id: 'default' },
      update: { upiEnabled: true, otherUpiEnabled: true },
      create: { id: 'default', upiEnabled: true, otherUpiEnabled: true },
    });
    await prisma.bankSettings.upsert({
      where: { id: 'default' },
      update: { bankEnabled: true },
      create: { id: 'default', bankEnabled: true },
    });
  });

  it('1. Admin can fetch initial payment methods configuration', async () => {
    const res = await request(app)
      .get('/api/admin/settings/payment-methods')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(typeof res.body.data.upi).toBe('boolean');
    expect(typeof res.body.data.bankTransfer).toBe('boolean');
    expect(typeof res.body.data.merchantVpa).toBe('boolean');
  });

  it('2. Admin updates config: ONLY UPI enabled (UPI=true, Bank=false, MerchantVPA=false)', async () => {
    const putRes = await request(app)
      .put('/api/admin/settings/payment-methods')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        upi: true,
        bankTransfer: false,
        merchantVpa: false,
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body.success).toBe(true);
    expect(putRes.body.data).toEqual({
      upi: true,
      bankTransfer: false,
      merchantVpa: false,
    });

    // Verify public/customer payment options endpoint reflects this exact configuration
    const pubRes = await request(app).get('/api/public/payments/options');
    expect(pubRes.status).toBe(200);
    expect(pubRes.body.success).toBe(true);
    expect(pubRes.body.data.paymentMethods).toEqual({
      upi: true,
      bankTransfer: false,
      merchantVpa: false,
    });
    expect(pubRes.body.data.upi.enabled).toBe(true);
    expect(pubRes.body.data.bank.enabled).toBe(false);
    expect(pubRes.body.data.upi.merchantVpa.enabled).toBe(false);
  });

  it('3. Admin updates config: UPI + Bank Transfer enabled (UPI=true, Bank=true, MerchantVPA=false)', async () => {
    const putRes = await request(app)
      .put('/api/admin/settings/payment-methods')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        upi: true,
        bankTransfer: true,
        merchantVpa: false,
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body.success).toBe(true);
    expect(putRes.body.data).toEqual({
      upi: true,
      bankTransfer: true,
      merchantVpa: false,
    });

    // Check customer-authenticated endpoint
    const custRes = await request(app)
      .get('/api/customer/payments/options')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(custRes.status).toBe(200);
    expect(custRes.body.success).toBe(true);
    expect(custRes.body.data.paymentMethods).toEqual({
      upi: true,
      bankTransfer: true,
      merchantVpa: false,
    });
    expect(custRes.body.data.upi.enabled).toBe(true);
    expect(custRes.body.data.bank.enabled).toBe(true);
    expect(custRes.body.data.upi.merchantVpa.enabled).toBe(false);
  });

  it('4. Select All: Enable ALL payment methods (UPI=true, Bank=true, MerchantVPA=true)', async () => {
    const putRes = await request(app)
      .put('/api/admin/settings/payment-methods')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        upi: true,
        bankTransfer: true,
        merchantVpa: true,
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body.data).toEqual({
      upi: true,
      bankTransfer: true,
      merchantVpa: true,
    });

    const pubRes = await request(app).get('/api/public/payments/options');
    expect(pubRes.body.data.paymentMethods).toEqual({
      upi: true,
      bankTransfer: true,
      merchantVpa: true,
    });
    expect(pubRes.body.data.upi.enabled).toBe(true);
    expect(pubRes.body.data.bank.enabled).toBe(true);
    expect(pubRes.body.data.upi.merchantVpa.enabled).toBe(true);
  });

  it('5. Disable ALL payment methods (UPI=false, Bank=false, MerchantVPA=false)', async () => {
    const patchRes = await request(app)
      .patch('/api/admin/settings/payment-methods')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        upi: false,
        bankTransfer: false,
        merchantVpa: false,
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data).toEqual({
      upi: false,
      bankTransfer: false,
      merchantVpa: false,
    });

    const pubRes = await request(app).get('/api/public/payments/options');
    expect(pubRes.body.data.paymentMethods).toEqual({
      upi: false,
      bankTransfer: false,
      merchantVpa: false,
    });
    expect(pubRes.body.data.upi.enabled).toBe(false);
    expect(pubRes.body.data.bank.enabled).toBe(false);
    expect(pubRes.body.data.upi.merchantVpa.enabled).toBe(false);
  });

  it('6. Security & RBAC: Customer or unauthorized admin cannot modify payment configuration', async () => {
    // Unauthenticated
    const unauthRes = await request(app)
      .put('/api/admin/settings/payment-methods')
      .send({ upi: true, bankTransfer: true, merchantVpa: true });
    expect(unauthRes.status).toBe(401);

    // Customer Token (Read-Only)
    const custRes = await request(app)
      .put('/api/admin/settings/payment-methods')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ upi: true, bankTransfer: true, merchantVpa: true });
    expect(custRes.status).toBe(403);

    // Staff without upi.manage permission
    const staffRes = await request(app)
      .put('/api/admin/settings/payment-methods')
      .set('Authorization', `Bearer ${unauthorizedAdminToken}`)
      .send({ upi: true, bankTransfer: true, merchantVpa: true });
    expect(staffRes.status).toBe(403);
  });
});
