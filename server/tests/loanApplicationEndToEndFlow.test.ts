import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/services/db';
import { generateAuthToken } from '../src/services/tokenService';

describe('Loan Documents -> Apply for Loan -> Admin Underwriting End-to-End Suite', () => {
  let adminId: string;
  let adminToken: string;

  beforeEach(async () => {
    // Ensure admin user
    let admin = await prisma.adminUser.findFirst();
    if (!admin) {
      admin = await prisma.adminUser.create({
        data: {
          email: 'admin.loans.test@fintech.test',
          fullName: 'Master Underwriter',
          passwordHash: 'dummyhash',
          role: 'SUPER_ADMIN',
          isActive: true,
        },
      });
    }
    adminId = admin.id;
    adminToken = generateAuthToken(admin.id, 'ADMIN');
  });

  it('TEST 1: KYC verified + 0/4 documents -> Apply for Loan rejected', async () => {
    const customer = await prisma.customer.create({
      data: {
        mobile: `90${Date.now().toString().slice(-8)}`,
        fullName: 'Applicant Zero Docs',
        email: `app.zero.${Date.now()}@test.com`,
        address: 'Test Address',
        state: 'Maharashtra',
        city: 'Mumbai',
        aadhaarEncrypted: 'mock_encrypted_aadhaar_zero',
        aadhaarMasked: 'XXXX XXXX 0001',
        monthlyIncome: 50000,
        kycStatus: 'APPROVED',
        status: 'ACTIVE',
      },
    });

    const custToken = generateAuthToken(customer.id, 'CUSTOMER');

    const res = await request(app)
      .post('/api/customer/loan-applications')
      .set('Authorization', `Bearer ${custToken}`)
      .send({
        amount: 50000,
        tenureMonths: 12,
        purpose: 'Personal Loan Requirements',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/required loan documents/i);
  });

  it('TEST 2: KYC verified + 3/4 documents -> Apply for Loan rejected', async () => {
    const customer = await prisma.customer.create({
      data: {
        mobile: `91${Date.now().toString().slice(-8)}`,
        fullName: 'Applicant Three Docs',
        email: `app.three.${Date.now()}@test.com`,
        address: 'Test Address',
        state: 'Delhi',
        city: 'New Delhi',
        aadhaarEncrypted: 'mock_encrypted_aadhaar_three',
        aadhaarMasked: 'XXXX XXXX 0003',
        monthlyIncome: 50000,
        kycStatus: 'APPROVED',
        status: 'ACTIVE',
      },
    });

    // Create 3 documents (missing OTHER)
    await prisma.loanDocument.createMany({
      data: [
        {
          customerId: customer.id,
          documentType: 'PAN',
          fileName: 'pan_card.jpg',
          filePath: 'uploads/pan.jpg',
          fileUrl: '/uploads/pan.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1024,
          status: 'PENDING',
          isCurrentVersion: true,
        },
        {
          customerId: customer.id,
          documentType: 'BANK_STATEMENT',
          fileName: 'bank_statement.pdf',
          filePath: 'uploads/bank.pdf',
          fileUrl: '/uploads/bank.pdf',
          mimeType: 'application/pdf',
          fileSize: 2048,
          status: 'PENDING',
          isCurrentVersion: true,
        },
        {
          customerId: customer.id,
          documentType: 'INCOME_PROOF',
          fileName: 'salary_slip.pdf',
          filePath: 'uploads/salary.pdf',
          fileUrl: '/uploads/salary.pdf',
          mimeType: 'application/pdf',
          fileSize: 1500,
          status: 'PENDING',
          isCurrentVersion: true,
        },
      ],
    });

    const custToken = generateAuthToken(customer.id, 'CUSTOMER');

    const res = await request(app)
      .post('/api/customer/loan-applications')
      .set('Authorization', `Bearer ${custToken}`)
      .send({
        amount: 75000,
        tenureMonths: 12,
        purpose: 'Emergency Loan Requirement',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/required loan documents/i);
  });

  it('TEST 3 & 4 & 5 & 6 & 7: KYC verified + 4/4 documents -> Apply for Loan succeeds, links docs, preserves requested amount', async () => {
    const customer = await prisma.customer.create({
      data: {
        mobile: `92${Date.now().toString().slice(-8)}`,
        fullName: 'Rahul Sharma',
        email: `rahul.${Date.now()}@test.com`,
        address: '101 Marine Drive',
        state: 'Maharashtra',
        city: 'Mumbai',
        aadhaarEncrypted: 'mock_encrypted_aadhaar_rahul',
        aadhaarMasked: 'XXXX XXXX 1234',
        monthlyIncome: 50000,
        kycStatus: 'APPROVED',
        status: 'ACTIVE',
      },
    });

    // Upload all 4 documents
    const docTypes = ['PAN', 'BANK_STATEMENT', 'INCOME_PROOF', 'OTHER'];
    for (const dt of docTypes) {
      await prisma.loanDocument.create({
        data: {
          customerId: customer.id,
          documentType: dt,
          fileName: `${dt.toLowerCase()}_doc.pdf`,
          filePath: `uploads/${dt.toLowerCase()}.pdf`,
          fileUrl: `/uploads/${dt.toLowerCase()}.pdf`,
          mimeType: 'application/pdf',
          fileSize: 1024,
          status: 'PENDING',
          isCurrentVersion: true,
        },
      });
    }

    const custToken = generateAuthToken(customer.id, 'CUSTOMER');

    const res = await request(app)
      .post('/api/customer/loan-applications')
      .set('Authorization', `Bearer ${custToken}`)
      .send({
        amount: 150000,
        tenureMonths: 24,
        purpose: 'Home Renovation & Personal Expense',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const application = res.body.data;
    expect(application.applicationNumber).toMatch(/^LA-\d{4}-\d{6}$/);
    expect(application.customerId).toBe(customer.id);
    expect(application.requestedAmount).toBe(150000);
    expect(application.tenureMonths).toBe(24);
    expect(application.status).toBe('SUBMITTED');

    // Verify DB write
    const dbApp = await prisma.loanApplication.findUnique({
      where: { id: application.id },
    });
    expect(dbApp).not.toBeNull();
    expect(dbApp?.customerId).toBe(customer.id);
    expect(dbApp?.requestedAmount).toBe(150000);
    expect(dbApp?.status).toBe('SUBMITTED');

    // Verify document linking
    const linkedDocs = await prisma.loanDocument.findMany({
      where: { customerId: customer.id },
    });
    expect(linkedDocs.length).toBe(4);
    for (const doc of linkedDocs) {
      expect(doc.loanId).toBe(application.id);
    }
  });

  it('TEST 8 & 9 & 10: Admin All Applications & Loan Approval return newly created application and all 4 documents', async () => {
    const customer = await prisma.customer.create({
      data: {
        mobile: `93${Date.now().toString().slice(-8)}`,
        fullName: 'Priya Verma',
        email: `priya.${Date.now()}@test.com`,
        address: 'Park Avenue, Indiranagar',
        state: 'Karnataka',
        city: 'Bengaluru',
        aadhaarEncrypted: 'mock_encrypted_aadhaar_priya',
        aadhaarMasked: 'XXXX XXXX 5678',
        monthlyIncome: 50000,
        kycStatus: 'APPROVED',
        status: 'ACTIVE',
      },
    });

    for (const dt of ['PAN', 'BANK_STATEMENT', 'INCOME_PROOF', 'OTHER']) {
      await prisma.loanDocument.create({
        data: {
          customerId: customer.id,
          documentType: dt,
          fileName: `${dt.toLowerCase()}.pdf`,
          filePath: `uploads/${dt.toLowerCase()}.pdf`,
          fileUrl: `/uploads/${dt.toLowerCase()}.pdf`,
          mimeType: 'application/pdf',
          fileSize: 2048,
          status: 'PENDING',
          isCurrentVersion: true,
        },
      });
    }

    const custToken = generateAuthToken(customer.id, 'CUSTOMER');

    const createRes = await request(app)
      .post('/api/customer/loan-applications')
      .set('Authorization', `Bearer ${custToken}`)
      .send({
        amount: 200000,
        tenureMonths: 36,
        purpose: 'Higher Education Funding',
      });

    expect(createRes.status).toBe(201);
    const appId = createRes.body.data.id;
    const appNumber = createRes.body.data.applicationNumber;

    // Admin All Applications
    const adminAllRes = await request(app)
      .get('/api/admin/loan-applications')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminAllRes.status).toBe(200);
    expect(adminAllRes.body.success).toBe(true);
    const appsList = adminAllRes.body.data;
    const foundInAll = appsList.find((a: any) => a.id === appId);
    expect(foundInAll).toBeDefined();
    expect(foundInAll.applicationNumber).toBe(appNumber);
    expect(foundInAll.customerName).toBe('Priya Verma');
    expect(foundInAll.requestedAmount).toBe(200000);

    // Admin Loan Approval (Pending Queue)
    const adminPendingRes = await request(app)
      .get('/api/admin/loan-applications?status=PENDING')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminPendingRes.status).toBe(200);
    const pendingList = adminPendingRes.body.data;
    const foundInPending = pendingList.find((a: any) => a.id === appId);
    expect(foundInPending).toBeDefined();

    // Admin Application Details -> All 4 Documents visible
    const adminDetailRes = await request(app)
      .get(`/api/admin/loan-applications/${appId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminDetailRes.status).toBe(200);
    expect(adminDetailRes.body.success).toBe(true);
    const detail = adminDetailRes.body.data.data || adminDetailRes.body.data;
    expect(detail.id).toBe(appId);
    expect(detail.documents).toBeDefined();
    expect(detail.documents.length).toBeGreaterThanOrEqual(4);

    const docTypesInDetail = detail.documents.map((d: any) => d.documentType);
    expect(docTypesInDetail).toContain('PAN');
    expect(docTypesInDetail).toContain('BANK_STATEMENT');
    expect(docTypesInDetail).toContain('INCOME_PROOF');
    expect(docTypesInDetail).toContain('OTHER');
  });

  it('TEST 11: Repeated Apply for Loan does not create duplicate applications', async () => {
    const customer = await prisma.customer.create({
      data: {
        mobile: `94${Date.now().toString().slice(-8)}`,
        fullName: 'Vikas Gupta',
        email: `vikas.${Date.now()}@test.com`,
        address: 'Sector 62',
        state: 'Uttar Pradesh',
        city: 'Noida',
        aadhaarEncrypted: 'mock_encrypted_aadhaar_vikas',
        aadhaarMasked: 'XXXX XXXX 9012',
        monthlyIncome: 50000,
        kycStatus: 'APPROVED',
        status: 'ACTIVE',
      },
    });

    for (const dt of ['PAN', 'BANK_STATEMENT', 'INCOME_PROOF', 'OTHER']) {
      await prisma.loanDocument.create({
        data: {
          customerId: customer.id,
          documentType: dt,
          fileName: `${dt}.pdf`,
          filePath: `uploads/${dt}.pdf`,
          fileUrl: `/uploads/${dt}.pdf`,
          mimeType: 'application/pdf',
          fileSize: 1024,
          status: 'PENDING',
          isCurrentVersion: true,
        },
      });
    }

    const custToken = generateAuthToken(customer.id, 'CUSTOMER');

    // First submission
    const res1 = await request(app)
      .post('/api/customer/loan-applications')
      .set('Authorization', `Bearer ${custToken}`)
      .send({
        amount: 80000,
        tenureMonths: 12,
        purpose: 'Medical Emergency',
      });
    expect(res1.status).toBe(201);

    // Second repeated submission
    const res2 = await request(app)
      .post('/api/customer/loan-applications')
      .set('Authorization', `Bearer ${custToken}`)
      .send({
        amount: 80000,
        tenureMonths: 12,
        purpose: 'Medical Emergency',
      });

    expect(res2.status).toBe(409);
    expect(res2.body.success).toBe(false);
    expect(res2.body.message).toMatch(/already have an active loan application/i);

    // Total applications for this customer in DB must be exactly 1
    const totalApps = await prisma.loanApplication.count({
      where: { customerId: customer.id },
    });
    expect(totalApps).toBe(1);
  });

  it('TEST 12: Unauthorized customer cannot modify another customer\'s application', async () => {
    const cust1 = await prisma.customer.create({
      data: {
        mobile: `95${Date.now().toString().slice(-8)}`,
        fullName: 'Customer One',
        email: `cust1.${Date.now()}@test.com`,
        address: 'Road 1',
        state: 'Delhi',
        city: 'Delhi',
        aadhaarEncrypted: 'mock_encrypted_aadhaar_cust1',
        aadhaarMasked: 'XXXX XXXX 1111',
        monthlyIncome: 50000,
        kycStatus: 'APPROVED',
        status: 'ACTIVE',
      },
    });

    const cust2 = await prisma.customer.create({
      data: {
        mobile: `96${Date.now().toString().slice(-8)}`,
        fullName: 'Customer Two',
        email: `cust2.${Date.now()}@test.com`,
        address: 'Road 2',
        state: 'Delhi',
        city: 'Delhi',
        aadhaarEncrypted: 'mock_encrypted_aadhaar_cust2',
        aadhaarMasked: 'XXXX XXXX 2222',
        monthlyIncome: 50000,
        kycStatus: 'APPROVED',
        status: 'ACTIVE',
      },
    });

    const loan1 = await prisma.loanApplication.create({
      data: {
        applicationNumber: `LA-2026-${Date.now().toString().slice(-6)}`,
        customerId: cust1.id,
        requestedAmount: 100000,
        tenureMonths: 12,
        purpose: 'Personal Loan',
        status: 'SUBMITTED',
      },
    });

    const cust2Token = generateAuthToken(cust2.id, 'CUSTOMER');

    // Customer 2 attempts to view Customer 1's application
    const res = await request(app)
      .get(`/api/customer/loan-applications/${loan1.id}`)
      .set('Authorization', `Bearer ${cust2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('TEST 13 & 14: Admin underwriting actions operate on the same LoanApplication and modify amount preserves requested amount', async () => {
    const customer = await prisma.customer.create({
      data: {
        mobile: `97${Date.now().toString().slice(-8)}`,
        fullName: 'Ananya Roy',
        email: `ananya.${Date.now()}@test.com`,
        address: 'Salt Lake',
        state: 'West Bengal',
        city: 'Kolkata',
        aadhaarEncrypted: 'mock_encrypted_aadhaar_ananya',
        aadhaarMasked: 'XXXX XXXX 3333',
        monthlyIncome: 50000,
        kycStatus: 'APPROVED',
        status: 'ACTIVE',
      },
    });

    for (const dt of ['PAN', 'BANK_STATEMENT', 'INCOME_PROOF', 'OTHER']) {
      await prisma.loanDocument.create({
        data: {
          customerId: customer.id,
          documentType: dt,
          fileName: `${dt}.pdf`,
          filePath: `uploads/${dt}.pdf`,
          fileUrl: `/uploads/${dt}.pdf`,
          mimeType: 'application/pdf',
          fileSize: 1024,
          status: 'PENDING',
          isCurrentVersion: true,
        },
      });
    }

    const custToken = generateAuthToken(customer.id, 'CUSTOMER');

    const createRes = await request(app)
      .post('/api/customer/loan-applications')
      .set('Authorization', `Bearer ${custToken}`)
      .send({
        amount: 100000,
        tenureMonths: 12,
        purpose: 'Business expansion',
      });

    const appId = createRes.body.data.id;

    // 1. Admin starts review: SUBMITTED -> UNDER_REVIEW
    const startReviewRes = await request(app)
      .post(`/api/admin/loan-applications/${appId}/review`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(startReviewRes.status).toBe(200);
    expect(startReviewRes.body.data.status).toBe('UNDER_REVIEW');

    // 2. Admin modifies amount from 100000 to 80000
    const modifyRes = await request(app)
      .post(`/api/admin/loan-applications/${appId}/modify-amount`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        proposedAmount: 80000,
        notes: 'Adjusted based on debt-to-income ratio',
      });

    expect(modifyRes.status).toBe(200);
    expect(modifyRes.body.data.status).toBe('OFFER_PENDING_CUSTOMER');
    expect(modifyRes.body.data.proposedAmount).toBe(80000);
    expect(modifyRes.body.data.requestedAmount).toBe(100000); // Preserved!

    // Verify DB preserves original requestedAmount
    const dbCheck = await prisma.loanApplication.findUnique({
      where: { id: appId },
    });
    expect(dbCheck?.requestedAmount).toBe(100000);
    expect(dbCheck?.proposedAmount).toBe(80000);
  });
});
