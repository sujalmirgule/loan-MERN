import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/services/db';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';
import { ALL_PERMISSION_KEYS } from '../src/constants/permissions';
import { WaBridgeWhatsAppProvider } from '../src/providers/whatsapp/waBridgeProvider';
import { SmtpEmailProvider } from '../src/providers/email/smtpEmailProvider';

import { encryptSecret } from '../src/utils/security';

import { generateAuthToken } from '../src/services/tokenService';
import bcrypt from 'bcryptjs';

describe('WA Bridge WhatsApp Provider & SMTP Email Provider Suite', () => {
  let adminToken: string;
  let testCustomerId: string;
  let testLoanId: string;

  beforeEach(async () => {
    // Upsert AdminUser
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Admin@123', salt);
    const admin = await prisma.adminUser.upsert({
      where: { email: 'admin-wabridge@loanapprove.com' },
      update: { isActive: true },
      create: {
        id: 'admin-wabridge-test-id',
        email: 'admin-wabridge@loanapprove.com',
        fullName: 'Wabridge Admin',
        passwordHash,
        role: 'SUPER_ADMIN',
        permissions: JSON.stringify(ALL_PERMISSION_KEYS),
        isActive: true,
      },
    });

    adminToken = generateAuthToken(admin.id, 'ADMIN');

    // Seed test customer & loan via register endpoint
    const uniqueMobile = `90${Math.floor(10000000 + Math.random() * 90000000)}`;
    const uniqueEmail = `test.${Date.now()}.${Math.random().toString(36).slice(2, 6)}@loanapprove.com`;
    const regRes = await request(app)
      .post('/api/auth/customer/register')
      .send({
        fullName: 'Mahadev Test User',
        mobile: uniqueMobile,
        email: uniqueEmail,
        address: '123 Main Road, Pune, Maharashtra',
        city: 'Pune',
        state: 'Maharashtra',
        aadhaar: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        monthlyIncome: 65000,
      });

    testCustomerId = regRes.body.data?.user?.id || regRes.body.data?.id;

    const loan = await prisma.loanApplication.create({
      data: {
        customerId: testCustomerId,
        applicationNumber: `LA-WABRIDGE-${Date.now()}`,
        accountNumber: `ACC-WABRIDGE-${Date.now()}`,
        requestedAmount: 50000,
        approvedAmount: 50000,
        interestRate: 2.0,
        tenureMonths: 12,
        status: 'SUBMITTED',
      },
    });
    testLoanId = loan.id;
  });

  afterEach(async () => {
    if (testCustomerId) {
      await prisma.whatsAppMessage.deleteMany({ where: { customerId: testCustomerId } }).catch(() => null);
      await prisma.emailMessage.deleteMany({ where: { customerId: testCustomerId } }).catch(() => null);
      await prisma.loanApplication.deleteMany({ where: { customerId: testCustomerId } }).catch(() => null);
      await prisma.customer.deleteMany({ where: { id: testCustomerId } }).catch(() => null);
    }
  });

  describe('WaBridgeWhatsAppProvider Unit Tests', () => {
    it('initializes with default server-to-server settings', () => {
      const provider = new WaBridgeWhatsAppProvider({
        apiUrl: 'https://web.wabridge.com/api',
        accessToken: 'test_token_123',
        deviceId: '69b16310667cead707b893e1',
        phoneNumberId: '1032424393284050',
        wabaId: '946428907892164',
        senderNumber: '+919046833151',
      });

      expect(provider.getName()).toBe('WA Bridge (Official Integration)');
      expect(provider.isConfigured()).toBe(true);
    });

    it('normalizes international phone numbers accurately without hardcoding India', () => {
      const provider = new WaBridgeWhatsAppProvider();
      
      expect(provider.normalizePhoneNumber('+91 90468 33151')).toBe('919046833151');
      expect(provider.normalizePhoneNumber('919046833151')).toBe('919046833151');
      expect(provider.normalizePhoneNumber('+1 (555) 123-4567')).toBe('15551234567');
      expect(provider.normalizePhoneNumber('09046833151')).toBe('919046833151');
    });

    it('redacts tokens and keys from logs', () => {
      const provider = new WaBridgeWhatsAppProvider();
      expect(provider.redactSecret('secret_access_token_123456')).toBe('secret••••••••3456');
      expect(provider.redactSecret('abc')).toBe('[REDACTED]');
    });

    it('returns honest CONFIGURED status when no validation health endpoint is provided', async () => {
      const provider = new WaBridgeWhatsAppProvider({
        apiUrl: 'https://web.wabridge.com/api',
        accessToken: 'test_token_123',
      });

      const result = await provider.testConnection();
      expect(result.success).toBe(true);
      expect(result.status).toBe('CONFIGURED');
      expect(result.message).toContain('API endpoint configured');
    });

    it('returns NOT_CONFIGURED when no credentials are provided', async () => {
      const provider = new WaBridgeWhatsAppProvider();
      const result = await provider.testConnection();
      expect(result.success).toBe(false);
      expect(result.status).toBe('NOT_CONFIGURED');
    });
  });

  describe('Admin WhatsApp Configuration Endpoints', () => {
    it('updates WA Bridge settings in database and retrieves masked token', async () => {
      const updateRes = await request(app)
        .patch('/api/admin/settings/whatsapp')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          provider: 'WABRIDGE',
          apiBaseUrl: 'https://web.wabridge.com/api',
          sendEndpoint: '/v1/send',
          authType: 'API_KEY',
          apiKeyHeaderName: 'x-access-token',
          authHeaderPrefix: '',
          accessToken: 'my_wabridge_secret_key_123',
          phoneNumber: '+919046833151',
          phoneNumberId: '1032424393284050',
          businessAccountId: '69b16310667cead707b893e1',
          enabled: true,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.data.hasAccessToken).toBe(true);
      expect(updateRes.body.data.maskedAccessToken).toBe('••••••••••••');
      expect(updateRes.body.data.provider).toBe('WABRIDGE');
      expect(updateRes.body.data.status).toBe('CONFIGURED');

      const getRes = await request(app)
        .get('/api/admin/settings/whatsapp')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.provider).toBe('WABRIDGE');
      expect(getRes.body.data.maskedAccessToken).toBe('••••••••••••');
    });

    it('tests WhatsApp connection via test-connection endpoint', async () => {
      const res = await request(app)
        .post('/api/admin/settings/whatsapp/test-connection')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Bulk Communication Endpoints (WhatsApp & Email)', () => {
    it('dispatches bulk WhatsApp messages by application IDs', async () => {
      const res = await request(app)
        .post('/api/admin/communication/whatsapp/bulk-applications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          applicationIds: [testLoanId],
          message: 'Hello {{customerName}}, your application {{applicationId}} is updated.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1);
    });

    it('dispatches bulk WhatsApp messages via generic /admin/whatsapp/bulk-send alias', async () => {
      const res = await request(app)
        .post('/api/admin/whatsapp/bulk-send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          applicationIds: [testLoanId],
          message: 'Hello {{customerName}}, your application {{applicationId}} is updated.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1);
    });

    it('dispatches bulk Email messages by application IDs', async () => {
      const res = await request(app)
        .post('/api/admin/communication/email/bulk-applications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          applicationIds: [testLoanId],
          subject: 'Important update for {{applicationId}}',
          message: 'Hello {{customerName}}, please check your portal.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(1);
    }, 15000);

    it('dispatches bulk Email messages via generic /admin/email/bulk-send alias', async () => {
      const res = await request(app)
        .post('/api/admin/email/bulk-send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          applicationIds: [testLoanId],
          subject: 'Loan Status Update',
          message: 'Hello {{customerName}}, your application is in process.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(1);
    }, 15000);
  });
});
