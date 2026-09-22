import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/services/db';
import { MetaWhatsAppProvider } from '../src/providers/whatsapp/metaWhatsAppProvider';
import { whatsappService } from '../src/services/whatsappService';
import { loanApplicationService } from '../src/services/loanApplicationService';
import { generateAuthToken } from '../src/services/tokenService';
import { hashPassword, hashAadhaar } from '../src/utils/security';
import { config } from '../src/config';

describe('WhatsApp Integration & Meta Cloud API Suite', () => {
  let adminToken: string;
  let unauthorizedAdminToken: string;
  let customerToken1: string;
  let customerToken2: string;
  let customerId1: string;
  let customerId2: string;
  let loanId1: string;

  beforeAll(async () => {
    // 1. Setup Admin with full communication permissions
    const adminPassHash = await hashPassword('Admin@123');
    const admin = await prisma.adminUser.upsert({
      where: { email: 'wa-admin@fintech.test' },
      update: {
        permissions: JSON.stringify(['customers.view', 'communication.whatsapp', 'communication.history', 'settings.view', 'settings.manage', 'applications.view', 'applications.reject', 'applications.approve']),
      },
      create: {
        email: 'wa-admin@fintech.test',
        fullName: 'WhatsApp Underwriting Admin',
        passwordHash: adminPassHash,
        role: 'ADMIN',
        permissions: JSON.stringify(['customers.view', 'communication.whatsapp', 'communication.history', 'settings.view', 'settings.manage', 'applications.view', 'applications.reject', 'applications.approve']),
      },
    });
    adminToken = generateAuthToken(admin.id, 'ADMIN');

    // 2. Setup Admin WITHOUT communication.whatsapp permission
    const staffAdmin = await prisma.adminUser.upsert({
      where: { email: 'wa-staff@fintech.test' },
      update: {
        permissions: JSON.stringify(['customers.view']),
      },
      create: {
        email: 'wa-staff@fintech.test',
        fullName: 'Staff Without WhatsApp',
        passwordHash: adminPassHash,
        role: 'STAFF',
        permissions: JSON.stringify(['customers.view']),
      },
    });
    unauthorizedAdminToken = generateAuthToken(staffAdmin.id, 'ADMIN');

    // 3. Setup Test Customer 1
    const cust1 = await prisma.customer.upsert({
      where: { mobile: '9046833151' },
      update: {
        fullName: 'Aarav Patel',
        email: 'aarav.patel@fintech.test',
        kycStatus: 'APPROVED',
      },
      create: {
        fullName: 'Aarav Patel',
        mobile: '9046833151',
        email: 'aarav.patel@fintech.test',
        address: '101 Marine Drive',
        state: 'Maharashtra',
        city: 'Mumbai',
        pincode: '400020',
        aadhaarEncrypted: 'mock-enc-aadhaar-1',
        aadhaarMasked: 'XXXX XXXX 1111',
        monthlyIncome: 85000,
        kycStatus: 'APPROVED',
      },
    });
    customerId1 = cust1.id;
    customerToken1 = generateAuthToken(cust1.id, 'CUSTOMER');

    // 4. Setup Test Customer 2
    const cust2 = await prisma.customer.upsert({
      where: { mobile: '9876543210' },
      update: {
        fullName: 'Sneha Rao',
        email: 'sneha.rao@fintech.test',
        kycStatus: 'APPROVED',
      },
      create: {
        fullName: 'Sneha Rao',
        mobile: '9876543210',
        email: 'sneha.rao@fintech.test',
        address: '202 Indiranagar',
        state: 'Karnataka',
        city: 'Bengaluru',
        pincode: '560038',
        aadhaarEncrypted: 'mock-enc-aadhaar-2',
        aadhaarMasked: 'XXXX XXXX 2222',
        monthlyIncome: 95000,
        kycStatus: 'APPROVED',
      },
    });
    customerId2 = cust2.id;
    customerToken2 = generateAuthToken(cust2.id, 'CUSTOMER');

    // 5. Setup Loan for Customer 1
    const loan1 = await prisma.loanApplication.create({
      data: {
        applicationNumber: `LA-WA-${Date.now()}`,
        customerId: customerId1,
        requestedAmount: 250000,
        tenureMonths: 24,
        status: 'SUBMITTED',
      },
    });
    loanId1 = loan1.id;
  });

  // -----------------------------------------------------------------
  // 1. PHONE NUMBER NORMALIZATION
  // -----------------------------------------------------------------
  describe('Phone Number Normalization', () => {
    const provider = new MetaWhatsAppProvider();

    it('normalizes 10-digit Indian numbers with +91 country code', () => {
      expect(provider.formatPhoneNumber('9046833151')).toBe('+919046833151');
      expect(provider.formatPhoneNumber(' 9876543210 ')).toBe('+919876543210');
    });

    it('does not duplicate country codes if 91 or +91 is already present', () => {
      expect(provider.formatPhoneNumber('919046833151')).toBe('+919046833151');
      expect(provider.formatPhoneNumber('+919046833151')).toBe('+919046833151');
      expect(provider.formatPhoneNumber('+91 90468 33151')).toBe('+919046833151');
    });

    it('normalizes numbers with leading zero (09046833151 -> +919046833151)', () => {
      expect(provider.formatPhoneNumber('09046833151')).toBe('+919046833151');
    });

    it('preserves valid international numbers without forcing +91', () => {
      expect(provider.formatPhoneNumber('+14155552671')).toBe('+14155552671');
      expect(provider.formatPhoneNumber('+447911123456')).toBe('+447911123456');
    });
  });

  // -----------------------------------------------------------------
  // 2. UNCONFIGURED PROVIDER (TEST 1)
  // -----------------------------------------------------------------
  describe('TEST 1: Provider Not Configured', () => {
    beforeEach(async () => {
      delete process.env.WHATSAPP_ACCESS_TOKEN;
      await prisma.whatsAppSettings.upsert({
        where: { id: 'default' },
        update: { enabled: false, accessTokenEnc: '', phoneNumberId: '' },
        create: { id: 'default', enabled: false, accessTokenEnc: '', phoneNumberId: '' },
      });
      whatsappService.setProvider(new MetaWhatsAppProvider({ accessToken: '', phoneNumberId: '' }));
    });

    it('returns WHATSAPP_PROVIDER_NOT_CONFIGURED and does not report fake success', async () => {
      const res = await request(app)
        .post('/api/admin/communication/whatsapp')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: customerId1,
          message: 'Hello Aarav, your application is under review.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('WHATSAPP_PROVIDER_NOT_CONFIGURED');
      expect(res.body.data.status).toBe('FAILED');
      expect(res.body.data.failureReason).toBe('WHATSAPP_PROVIDER_NOT_CONFIGURED');

      // Verify recorded in DB
      const dbMsg = await prisma.whatsAppMessage.findUnique({
        where: { id: res.body.data.id },
      });
      expect(dbMsg?.status).toBe('FAILED');
      expect(dbMsg?.failureReason).toBe('WHATSAPP_PROVIDER_NOT_CONFIGURED');
    });
  });

  // -----------------------------------------------------------------
  // 3. VALID CONFIGURATION BUT INVALID CREDENTIALS (TEST 2)
  // -----------------------------------------------------------------
  describe('TEST 2: Provider Error Handling (Invalid Credentials / Meta Rejection)', () => {
    beforeEach(() => {
      process.env.WHATSAPP_ACCESS_TOKEN = 'EAAG_INVALID_EXPIRED_MOCK_TOKEN';
      process.env.WHATSAPP_PHONE_NUMBER_ID = '1032424393284050';

      // Mock global fetch to simulate Meta Graph API error response
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            message: 'Invalid OAuth access token - Cannot parse access token',
            type: 'OAuthException',
            code: 190,
            fbtrace_id: 'A1B2C3D4E5',
          },
        }),
      }));

      whatsappService.setProvider(
        new MetaWhatsAppProvider({
          accessToken: 'EAAG_INVALID_EXPIRED_MOCK_TOKEN',
          phoneNumberId: '1032424393284050',
        })
      );
    });

    afterEach(() => {
      delete process.env.WHATSAPP_ACCESS_TOKEN;
      vi.unstubAllGlobals();
    });

    it('safely handles Meta API 401/error without exposing secrets or crashing', async () => {
      const res = await request(app)
        .post('/api/admin/communication/whatsapp')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: customerId1,
          message: 'Verification reminder for your loan application.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid OAuth access token');
      expect(res.body.data.status).toBe('FAILED');

      // Token must NOT appear in response
      const resString = JSON.stringify(res.body);
      expect(resString).not.toContain('EAAG_INVALID_EXPIRED_MOCK_TOKEN');
      expect(resString).not.toContain('Authorization');
    });
  });

  // -----------------------------------------------------------------
  // 4. SUCCESSFUL PROVIDER RESPONSE (TEST 3)
  // -----------------------------------------------------------------
  describe('TEST 3: Successful Meta Provider Response', () => {
    beforeEach(() => {
      process.env.WHATSAPP_ACCESS_TOKEN = 'VALID_MOCK_META_TOKEN_XYZ';
      process.env.WHATSAPP_PHONE_NUMBER_ID = '1032424393284050';
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = '946428907892164';

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          messaging_product: 'whatsapp',
          contacts: [{ input: '919046833151', wa_id: '919046833151' }],
          messages: [{ id: 'wamid.HBgMOTA0NjgzMzE1MRUCABEYEjA1MUI5NEJCOEEwMUE4MUFDMgA=' }],
        }),
      }));

      whatsappService.setProvider(
        new MetaWhatsAppProvider({
          accessToken: 'VALID_MOCK_META_TOKEN_XYZ',
          phoneNumberId: '1032424393284050',
          businessAccountId: '946428907892164',
        })
      );
    });

    afterEach(() => {
      delete process.env.WHATSAPP_ACCESS_TOKEN;
      vi.unstubAllGlobals();
    });

    it('creates WhatsAppMessage history and AuditLog with providerMessageId', async () => {
      const res = await request(app)
        .post('/api/admin/communication/whatsapp')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: customerId1,
          message: 'Hello {{customerName}}, your loan application {{applicationId}} is approved!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SENT');
      expect(res.body.data.message).toContain('Hello Aarav Patel');

      // Check DB communication history
      const waRecord = await prisma.whatsAppMessage.findUnique({
        where: { id: res.body.data.id },
      });
      expect(waRecord).toBeDefined();
      expect(waRecord?.status).toBe('SENT');
      expect(waRecord?.providerMessageId).toBe('wamid.HBgMOTA0NjgzMzE1MRUCABEYEjA1MUI5NEJCOEEwMUE4MUFDMgA=');
      expect(waRecord?.phone).toBe('+919046833151');

      // Check AuditLog
      const auditLog = await prisma.auditLog.findFirst({
        where: { action: 'WHATSAPP_SENT', entityId: customerId1 },
        orderBy: { timestamp: 'desc' },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog?.actorType).toBe('ADMIN');
    });
  });

  // -----------------------------------------------------------------
  // 5. BULK WHATSAPP DISPATCH (TEST 4)
  // -----------------------------------------------------------------
  describe('TEST 4: Bulk WhatsApp Dispatching', () => {
    beforeEach(() => {
      process.env.WHATSAPP_ACCESS_TOKEN = 'VALID_MOCK_META_TOKEN_XYZ';
      process.env.WHATSAPP_PHONE_NUMBER_ID = '1032424393284050';

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          messages: [{ id: `wamid.bulk_${Date.now()}` }],
        }),
      }));

      whatsappService.setProvider(
        new MetaWhatsAppProvider({
          accessToken: 'VALID_MOCK_META_TOKEN_XYZ',
          phoneNumberId: '1032424393284050',
        })
      );
    });

    afterEach(() => {
      delete process.env.WHATSAPP_ACCESS_TOKEN;
      vi.unstubAllGlobals();
    });

    it('dispatches bulk WhatsApp to multiple recipients with variable resolution', async () => {
      const res = await request(app)
        .post('/api/admin/communication/whatsapp/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerIds: [customerId1, customerId2],
          message: 'Dear {{customerName}}, festive season loan interest rates are now 10.5% p.a.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(2);
      expect(res.body.data.sentCount).toBe(2);
      expect(res.body.data.failedCount).toBe(0);

      // Verify separate communication history entries exist for both customers
      const wa1 = await prisma.whatsAppMessage.findFirst({
        where: { customerId: customerId1 },
        orderBy: { createdAt: 'desc' },
      });
      const wa2 = await prisma.whatsAppMessage.findFirst({
        where: { customerId: customerId2 },
        orderBy: { createdAt: 'desc' },
      });

      expect(wa1?.message).toContain('Dear Aarav Patel');
      expect(wa2?.message).toContain('Dear Sneha Rao');
    });
  });

  // -----------------------------------------------------------------
  // 6. SECURITY AUDIT & TOKEN LEAKAGE (TEST 5)
  // -----------------------------------------------------------------
  describe('TEST 5: Security & Secret Protection', () => {
    it('never exposes raw access token via settings GET API', async () => {
      const res = await request(app)
        .get('/api/admin/settings/whatsapp')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeUndefined();
      if (res.body.data.hasAccessToken) {
        expect(res.body.data.maskedAccessToken).toBe('••••••••••••');
      }
      const rawBody = JSON.stringify(res.body);
      expect(rawBody).not.toContain('VALID_MOCK_META_TOKEN_XYZ');
      expect(rawBody).not.toContain('EAAG_INVALID_EXPIRED_MOCK_TOKEN');
    });

    it('never returns access token in communication history API', async () => {
      const res = await request(app)
        .get('/api/admin/communication/history?channel=WHATSAPP')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const rawBody = JSON.stringify(res.body);
      expect(rawBody).not.toContain('accessToken');
      expect(rawBody).not.toContain('Bearer');
    });
  });

  // -----------------------------------------------------------------
  // 7. CUSTOMER ISOLATION & RBAC (TEST 6)
  // -----------------------------------------------------------------
  describe('TEST 6: Customer Isolation & RBAC', () => {
    it('denies customer from accessing admin WhatsApp send endpoint', async () => {
      const res = await request(app)
        .post('/api/admin/communication/whatsapp')
        .set('Authorization', `Bearer ${customerToken1}`)
        .send({
          customerId: customerId2,
          message: 'Malicious spoof attempt',
        });

      expect(res.status).toBe(403);
    });

    it('denies staff without communication.whatsapp permission', async () => {
      const res = await request(app)
        .post('/api/admin/communication/whatsapp')
        .set('Authorization', `Bearer ${unauthorizedAdminToken}`)
        .send({
          customerId: customerId1,
          message: 'Attempt from unauthorized staff',
        });

      expect(res.status).toBe(403);
    });
  });

  // -----------------------------------------------------------------
  // 8. AUTOMATED EVENT TRIGGERS (APPROVAL & REJECTION)
  // -----------------------------------------------------------------
  describe('TEST 7: Automated Event Triggers (Approval & Rejection)', () => {
    beforeEach(() => {
      process.env.WHATSAPP_ACCESS_TOKEN = 'VALID_MOCK_META_TOKEN_XYZ';
      process.env.WHATSAPP_PHONE_NUMBER_ID = '1032424393284050';

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          messages: [{ id: `wamid.event_${Date.now()}` }],
        }),
      }));

      whatsappService.setProvider(
        new MetaWhatsAppProvider({
          accessToken: 'VALID_MOCK_META_TOKEN_XYZ',
          phoneNumberId: '1032424393284050',
        })
      );
    });

    afterEach(() => {
      delete process.env.WHATSAPP_ACCESS_TOKEN;
      vi.unstubAllGlobals();
    });

    it('triggers automated WhatsApp notification on loan rejection when configured', async () => {
      // Enable autoWhatsAppOnLoanRejected in DB
      await prisma.communicationSettings.upsert({
        where: { id: 'default' },
        update: { autoWhatsAppOnLoanRejected: true, whatsAppEnabled: true },
        create: { id: 'default', autoWhatsAppOnLoanRejected: true, whatsAppEnabled: true },
      });

      // Create fresh loan to reject
      const loanToReject = await prisma.loanApplication.create({
        data: {
          applicationNumber: `LA-REJ-${Date.now()}`,
          customerId: customerId1,
          requestedAmount: 150000,
          tenureMonths: 12,
          status: 'SUBMITTED',
        },
      });

      const updated = await loanApplicationService.rejectApplication(
        loanToReject.id,
        { id: 'admin-1', fullName: 'Credit Manager', role: 'ADMIN' } as any,
        'CIBIL score below required threshold'
      );

      expect(updated.status).toBe('REJECTED');

      // Verify WhatsApp message was recorded with LOAN_REJECTED template
      const waMsg = await prisma.whatsAppMessage.findFirst({
        where: { customerId: customerId1, templateName: 'LOAN_REJECTED' },
        orderBy: { createdAt: 'desc' },
      });

      expect(waMsg).toBeDefined();
      expect(waMsg?.status).toBe('SENT');
      expect(waMsg?.message).toContain('Declined');
    }, 15000);

    it('triggers automated WhatsApp notification on loan approval when configured', async () => {
      // Enable autoWhatsAppOnLoanApproved in DB
      await prisma.communicationSettings.upsert({
        where: { id: 'default' },
        update: { autoWhatsAppOnLoanApproved: true, whatsAppEnabled: true },
        create: { id: 'default', autoWhatsAppOnLoanApproved: true, whatsAppEnabled: true },
      });

      // Delete existing loans, agreements, EMI schedules and documents for customerId1 to satisfy single active approved loan policy
      const existingLoans = await prisma.loanApplication.findMany({ where: { customerId: customerId1 }, select: { id: true } });
      const loanIds = existingLoans.map(l => l.id);
      if (loanIds.length > 0) {
        await prisma.loanAgreement.deleteMany({ where: { loanId: { in: loanIds } } });
        await prisma.eMISchedule.deleteMany({ where: { loanId: { in: loanIds } } });
        await prisma.payment.deleteMany({ where: { loanId: { in: loanIds } } });
        await prisma.charge.deleteMany({ where: { loanId: { in: loanIds } } });
        await prisma.invoice.deleteMany({ where: { loanId: { in: loanIds } } });
        await prisma.loanDocument.deleteMany({ where: { loanId: { in: loanIds } } });
        await prisma.whatsAppMessage.deleteMany({ where: { customerId: customerId1 } });
        await prisma.loanApplication.deleteMany({ where: { id: { in: loanIds } } });
      }

      // Create fresh loan to approve
      const loanToApprove = await prisma.loanApplication.create({
        data: {
          applicationNumber: `LA-APP-${Date.now()}`,
          customerId: customerId1,
          requestedAmount: 200000,
          tenureMonths: 12,
          status: 'SUBMITTED',
        },
      });

      const approved = await loanApplicationService.approveApplication(
        loanToApprove.id,
        { id: 'admin-1', fullName: 'Credit Manager', role: 'ADMIN' } as any,
        { approvedAmount: 200000, interestRate: 12, tenureMonths: 12 }
      );

      expect(approved.status).toBe('APPROVED');

      // Verify WhatsApp message was recorded with LOAN_APPROVED template
      const waMsg = await prisma.whatsAppMessage.findFirst({
        where: { customerId: customerId1, templateName: 'LOAN_APPROVED' },
        orderBy: { createdAt: 'desc' },
      });

      expect(waMsg).toBeDefined();
      expect(waMsg?.status).toBe('SENT');
      expect(waMsg?.message).toContain('APPROVED');
    }, 15000);
  });
});

