import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/services/db';
import bcrypt from 'bcryptjs';

describe('Authentication & Authorization Suite', () => {
  const testCustomerMobile = '9876543210';
  const duplicateMobile = '9876543211';
  const inactiveCustomerMobile = '9876543212';
  const testAdminEmail = 'testadmin@loanapprove.com';
  const testAdminPassword = 'AdminSecret@2026';
  const inactiveAdminEmail = 'inactiveadmin@loanapprove.com';

  let customerToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // Clean up test records
    await prisma.auditLog.deleteMany({});
    await prisma.customer.deleteMany({
      where: {
        mobile: { in: [testCustomerMobile, duplicateMobile, inactiveCustomerMobile] },
      },
    });
    await prisma.adminUser.deleteMany({
      where: { email: { in: [testAdminEmail, inactiveAdminEmail] } },
    });

    // Create a seeded active admin for tests
    const passwordHash = await bcrypt.hash(testAdminPassword, 10);
    await prisma.adminUser.create({
      data: {
        email: testAdminEmail,
        passwordHash,
        fullName: 'Test Admin User',
        role: 'ADMIN',
        isActive: true,
      },
    });

    // Create a seeded inactive admin for tests
    await prisma.adminUser.create({
      data: {
        email: inactiveAdminEmail,
        passwordHash,
        fullName: 'Inactive Admin User',
        role: 'ADMIN',
        isActive: false,
      },
    });

    // Create an inactive customer for testing status checks
    await prisma.customer.create({
      data: {
        fullName: 'Inactive User',
        mobile: inactiveCustomerMobile,
        email: 'inactive@example.com',
        address: '123 Suspended St',
        state: 'Maharashtra',
        city: 'Mumbai',
        aadhaarEncrypted: 'mock_enc',
        aadhaarMasked: 'XXXX XXXX 9999',
        monthlyIncome: 30000,
        status: 'SUSPENDED',
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.auditLog.deleteMany({});
    await prisma.customer.deleteMany({
      where: {
        mobile: { in: [testCustomerMobile, duplicateMobile, inactiveCustomerMobile] },
      },
    });
    await prisma.adminUser.deleteMany({
      where: { email: { in: [testAdminEmail, inactiveAdminEmail] } },
    });
  });

  describe('1. Customer Registration', () => {
    it('successfully registers a new customer with valid data and returns token', async () => {
      const res = await request(app)
        .post('/api/auth/customer/register')
        .send({
          fullName: 'Sujal Mirgule',
          mobile: testCustomerMobile,
          email: 'sujal@example.com',
          address: '404 Fintech Heights, Worli',
          state: 'Maharashtra',
          city: 'Mumbai',
          aadhaar: '123456789012',
          monthlyIncome: 75000,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.role).toBe('CUSTOMER');
      expect(res.body.data.user.mobile).toBe(testCustomerMobile);
      expect(res.body.data.user.aadhaarMasked).toBe('XXXX XXXX 9012');
      // Ensure sensitive data is NOT returned
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
      expect(res.body.data.user).not.toHaveProperty('aadhaarEncrypted');
      expect(res.body.data.user).not.toHaveProperty('aadhaar');

      customerToken = res.body.data.token;
    });

    it('rejects duplicate mobile number with HTTP 409', async () => {
      const res = await request(app)
        .post('/api/auth/customer/register')
        .send({
          fullName: 'Duplicate Borrower',
          mobile: testCustomerMobile,
          email: 'duplicate@example.com',
          address: '123 Test Street',
          state: 'Maharashtra',
          city: 'Mumbai',
          aadhaar: '987654321098',
          monthlyIncome: 45000,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already registered');
    });

    it('rejects registration with invalid email or Aadhaar length with HTTP 400', async () => {
      const res = await request(app)
        .post('/api/auth/customer/register')
        .send({
          fullName: 'Bad Input',
          mobile: '9123456780',
          email: 'not-an-email',
          address: 'Too short',
          state: 'Maharashtra',
          city: 'Mumbai',
          aadhaar: '1234', // invalid length
          monthlyIncome: -100, // invalid income
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Validation failed');
      expect(res.body.errors).toBeDefined();
    });

    it('blocks mass assignment by rejecting unexpected or privileged fields with HTTP 400', async () => {
      const res = await request(app)
        .post('/api/auth/customer/register')
        .send({
          fullName: 'Hacker Attempt',
          mobile: duplicateMobile,
          email: 'hacker@example.com',
          address: '404 Insecure Way',
          state: 'Maharashtra',
          city: 'Mumbai',
          aadhaar: '123456789099',
          monthlyIncome: 50000,
          role: 'ADMIN',
          isAdmin: true,
          isActive: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Validation failed');
    });
  });

  describe('2. Customer Login', () => {
    it('successfully logs in an existing customer using mobile number only', async () => {
      const res = await request(app)
        .post('/api/auth/customer/login')
        .send({ mobile: testCustomerMobile });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.fullName).toBe('Sujal Mirgule');
      expect(res.body.data.user.role).toBe('CUSTOMER');
    });

    it('returns HTTP 404 for unknown mobile number', async () => {
      const res = await request(app)
        .post('/api/auth/customer/login')
        .send({ mobile: '9999999999' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found');
    });

    it('returns HTTP 403 for suspended or deactivated customer', async () => {
      const res = await request(app)
        .post('/api/auth/customer/login')
        .send({ mobile: inactiveCustomerMobile });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('deactivated or suspended');
    });

    it('rejects invalid mobile number format with HTTP 400', async () => {
      const res = await request(app)
        .post('/api/auth/customer/login')
        .send({ mobile: '12345' }); // Invalid format / length

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('3. Admin Authentication', () => {
    it('successfully logs in admin with valid email and password', async () => {
      const res = await request(app)
        .post('/api/auth/admin/login')
        .send({
          email: testAdminEmail,
          password: testAdminPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.role).toBe('ADMIN');
      expect(res.body.data.user.email).toBe(testAdminEmail);
      expect(res.body.data.user).not.toHaveProperty('passwordHash');

      adminToken = res.body.data.token;
    });

    it('returns HTTP 401 with generic error for invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/admin/login')
        .send({
          email: testAdminEmail,
          password: 'WrongPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password.');
    });

    it('returns HTTP 401 with generic error for non-existent admin email', async () => {
      const res = await request(app)
        .post('/api/auth/admin/login')
        .send({
          email: 'nonexistent@loanapprove.com',
          password: testAdminPassword,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password.');
    });

    it('returns HTTP 401 when attempting to log in as deactivated admin', async () => {
      const res = await request(app)
        .post('/api/auth/admin/login')
        .send({
          email: inactiveAdminEmail,
          password: testAdminPassword,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password.');
    });
  });

  describe('4. Role-Based Authorization & Protected Endpoints', () => {
    it('returns HTTP 401 for unauthenticated access to /api/auth/me', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns HTTP 401 for malformed token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not-a-valid-jwt-token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns HTTP 401 for missing Bearer scheme', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Basic dGVzdA==');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns current customer identity from /api/auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('CUSTOMER');
      expect(res.body.data.user.mobile).toBe(testCustomerMobile);
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('returns current admin identity from /api/auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('ADMIN');
      expect(res.body.data.user.email).toBe(testAdminEmail);
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('allows customer to access customer-protected route /api/customers/profile', async () => {
      const res = await request(app)
        .get('/api/customers/profile')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile.mobile).toBe(testCustomerMobile);
    });

    it('returns HTTP 403 when customer tries to access admin route /api/admin/status', async () => {
      const res = await request(app)
        .get('/api/admin/status')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Requires ADMIN privileges');
    });

    it('returns HTTP 403 when admin tries to access customer route /api/customers/profile', async () => {
      const res = await request(app)
        .get('/api/customers/profile')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Requires CUSTOMER privileges');
    });

    it('allows admin to access admin-protected route /api/admin/status', async () => {
      const res = await request(app)
        .get('/api/admin/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.admin.role).toBe('ADMIN');
    });
  });

  describe('5. Logout & Audit', () => {
    it('successfully calls /api/auth/logout and records audit log', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify audit log has entries
      const logs = await prisma.auditLog.findMany({
        where: { action: { in: ['CUSTOMER_REGISTER', 'CUSTOMER_LOGIN', 'LOGOUT'] } },
      });
      expect(logs.length).toBeGreaterThan(0);
    });
  });
});
