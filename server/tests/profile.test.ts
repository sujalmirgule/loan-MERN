import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/services/db';
import { generateAuthToken } from '../src/services/tokenService';

describe('Customer Profile Management Suite', () => {
  const customerMobile = '9111223344';
  let customerId: string;
  let customerToken: string;

  beforeAll(async () => {
    // Clean up
    await prisma.customer.deleteMany({ where: { mobile: customerMobile } });

    // Create test customer
    const customer = await prisma.customer.create({
      data: {
        mobile: customerMobile,
        fullName: 'Initial Profile User',
        email: 'profile.user@example.com',
        address: '456 MG Road',
        state: 'Karnataka',
        city: 'Bengaluru',
        aadhaarEncrypted: 'mock_hash_profile',
        aadhaarMasked: 'XXXX XXXX 1234',
        monthlyIncome: 55000,
        status: 'ACTIVE',
      },
    });

    customerId = customer.id;
    customerToken = generateAuthToken(customerId, 'CUSTOMER');
  });

  afterAll(async () => {
    await prisma.customer.deleteMany({ where: { mobile: customerMobile } });
  });

  describe('GET /api/customer/profile', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/customer/profile');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return safe customer profile with masked Aadhaar', async () => {
      const res = await request(app)
        .get('/api/customer/profile')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile.fullName).toBe('Initial Profile User');
      expect(res.body.data.profile.mobile).toBe(customerMobile);
      expect(res.body.data.profile.aadhaarMasked).toBe('XXXX XXXX 1234');
      expect(res.body.data.profile.aadhaarEncrypted).toBeUndefined();
      expect(res.body.data.profile.passwordHash).toBeUndefined();
      expect(res.body.data.profile.monthlyIncome).toBe(55000);
      expect(res.body.data.profile.state).toBe('Karnataka');
      expect(res.body.data.profile.city).toBe('Bengaluru');
    });
  });

  describe('PATCH /api/customer/profile', () => {
    it('should reject unauthenticated profile update with 401', async () => {
      const res = await request(app)
        .patch('/api/customer/profile')
        .send({
          fullName: 'New Name',
          email: 'new@example.com',
          address: 'New Address 123',
          state: 'Karnataka',
          city: 'Bengaluru',
          monthlyIncome: 60000,
        });

      expect(res.status).toBe(401);
    });

    it('should reject invalid profile updates with 400 validation error', async () => {
      const res = await request(app)
        .patch('/api/customer/profile')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          fullName: 'A', // too short
          email: 'not-an-email',
          address: '1', // too short
          state: '',
          city: '',
          monthlyIncome: -500, // negative
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.length).toBeGreaterThan(0);
    });

    it('should successfully update editable profile fields', async () => {
      const res = await request(app)
        .patch('/api/customer/profile')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          fullName: 'Updated Profile User',
          email: 'updated.user@example.com',
          address: '789 Indiranagar 100 Feet Rd',
          state: 'Karnataka',
          city: 'Bengaluru',
          monthlyIncome: 75000,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile.fullName).toBe('Updated Profile User');
      expect(res.body.data.profile.email).toBe('updated.user@example.com');
      expect(res.body.data.profile.address).toBe('789 Indiranagar 100 Feet Rd');
      expect(res.body.data.profile.monthlyIncome).toBe(75000);
      expect(res.body.data.profile.mobile).toBe(customerMobile); // Mobile remained unchanged
    });

    it('should successfully update fatherName in customer profile', async () => {
      const res = await request(app)
        .patch('/api/customer/profile')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          fullName: 'Updated Profile User',
          fatherName: 'Ramesh Sharma',
          email: 'updated.user@example.com',
          address: '789 Indiranagar 100 Feet Rd',
          state: 'Karnataka',
          city: 'Bengaluru',
          monthlyIncome: 75000,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile.fatherName).toBe('Ramesh Sharma');
    });

    it('should securely update Aadhaar when provided and record audit log', async () => {
      const res = await request(app)
        .patch('/api/customer/profile')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          fullName: 'Updated Profile User',
          email: 'updated.user@example.com',
          address: '789 Indiranagar 100 Feet Rd',
          state: 'Karnataka',
          city: 'Bengaluru',
          monthlyIncome: 75000,
          aadhaar: '987654321098',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.profile.aadhaarMasked).toBe('XXXX XXXX 1098');

      // Check audit log
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'PROFILE_UPDATED',
          entityId: customerId,
        },
        orderBy: { timestamp: 'desc' },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.newValue).not.toContain('987654321098'); // Full Aadhaar is NEVER in audit log
      expect(auditLog?.newValue).toContain('XXXX XXXX 1098');
    });
  });
});
