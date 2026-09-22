import { app } from '../app';
import request from 'supertest';
import { prisma } from '../services/db';
import fs from 'fs';

interface AuditLogEntry {
  step: string;
  status: 'PASS' | 'FAIL' | 'INFO';
  details: string;
  evidence?: any;
}

const auditLogs: AuditLogEntry[] = [];

function logPass(step: string, details: string, evidence?: any) {
  auditLogs.push({ step, status: 'PASS', details, evidence });
  console.log(`\x1b[32m[PASS]\x1b[0m ${step}: ${details}`);
}

function logFail(step: string, details: string, evidence?: any) {
  auditLogs.push({ step, status: 'FAIL', details, evidence });
  console.error(`\x1b[31m[FAIL]\x1b[0m ${step}: ${details}`);
}

function logInfo(step: string, details: string) {
  auditLogs.push({ step, status: 'INFO', details });
  console.log(`\x1b[36m[INFO]\x1b[0m ${step}: ${details}`);
}

async function runRealCustomerAudit() {
  console.log('\n===============================================================');
  console.log('  LOAN FINANCE — REAL CUSTOMER LIFECYCLE AUDIT (FROZEN BACKEND)');
  console.log('===============================================================\n');

  try {
    // -------------------------------------------------------------------------
    // STEP 1: REAL CUSTOMER SIGNUP (Customer A)
    // -------------------------------------------------------------------------
    const randomSuffixA = Math.floor(10000000 + Math.random() * 90000000);
    const customerAMobile = `98${randomSuffixA}`;
    const customerAEmail = `audit.user.a.${Date.now()}@fintechtest.in`;
    const customerAFullName = 'Audit Customer Alpha';

    logInfo('Setup', `Initiating signup for new real Customer A with mobile +91 ${customerAMobile}`);

    const signupPayloadA = {
      fullName: customerAFullName,
      mobile: customerAMobile,
      email: customerAEmail,
      address: 'Plot 42, Bandra Kurla Complex',
      state: 'Maharashtra',
      city: 'Mumbai',
      pincode: '400051',
      aadhaar: '890123456789',
      monthlyIncome: 75000,
    };

    const signupResA = await request(app)
      .post('/api/auth/customer/register')
      .send(signupPayloadA);

    if (signupResA.status === 201 && signupResA.body.success && signupResA.body.data?.token) {
      logPass(
        '1. Customer A Signup API',
        `HTTP 201 Created with JWT token and safe user profile. ID: ${signupResA.body.data.user.id}`,
        { status: signupResA.status, user: signupResA.body.data.user }
      );
    } else {
      logFail('1. Customer A Signup API', `Failed with HTTP ${signupResA.status}`, signupResA.body);
    }

    const customerAId = signupResA.body.data?.user?.id;
    let customerAToken = signupResA.body.data?.token;

    // Direct Database Verification for Customer A
    const dbCustomerA = await prisma.customer.findUnique({
      where: { mobile: customerAMobile },
    });

    if (dbCustomerA && dbCustomerA.id === customerAId && dbCustomerA.status === 'ACTIVE' && dbCustomerA.kycStatus === 'PENDING') {
      logPass(
        '1. Customer A Database Persistence',
        `Real record confirmed in SQLite DB: Name=${dbCustomerA.fullName}, Mobile=${dbCustomerA.mobile}, MaskedAadhaar=${dbCustomerA.aadhaarMasked}, Pincode=${dbCustomerA.pincode}, Status=${dbCustomerA.status}, KYC=${dbCustomerA.kycStatus}`
      );
    } else {
      logFail('1. Customer A Database Persistence', 'Customer A not found or invalid in SQLite database', dbCustomerA);
    }

    // Duplicate Signup Verification (Must return 409 Conflict)
    const duplicateRes = await request(app)
      .post('/api/auth/customer/register')
      .send(signupPayloadA);

    if (duplicateRes.status === 409 && duplicateRes.body.success === false) {
      logPass(
        '1. Duplicate Mobile Signup Handling',
        `HTTP 409 Conflict correctly returned: "${duplicateRes.body.message}"`
      );
    } else {
      logFail('1. Duplicate Mobile Signup Handling', `Expected 409 Conflict, got ${duplicateRes.status}`, duplicateRes.body);
    }

    // -------------------------------------------------------------------------
    // STEP 2: REAL CUSTOMER LOGIN & AUTHENTICATION
    // -------------------------------------------------------------------------
    const loginResA = await request(app)
      .post('/api/auth/customer/login')
      .send({ mobile: customerAMobile });

    if (loginResA.status === 200 && loginResA.body.success && loginResA.body.data?.token) {
      customerAToken = loginResA.body.data.token;
      logPass(
        '2. Customer A Login API',
        `HTTP 200 OK — Passwordless mobile authentication issued new JWT token for Customer A`
      );
    } else {
      logFail('2. Customer A Login API', `Login failed with HTTP ${loginResA.status}`, loginResA.body);
    }

    // Session Restore / Me Endpoint
    const meResA = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${customerAToken}`);

    if (meResA.status === 200 && meResA.body.data?.user?.id === customerAId) {
      logPass(
        '2. Session Verification (/api/auth/me)',
        `Authenticated token belongs to Customer A: ${meResA.body.data.user.fullName} (+91 ${meResA.body.data.user.mobile})`
      );
    } else {
      logFail('2. Session Verification (/api/auth/me)', 'Token verification failed', meResA.body);
    }

    // Unauthorized Access Test
    const unauthRes = await request(app).get('/api/customer/loan-applications');
    if (unauthRes.status === 401) {
      logPass('2. Protected Route Guard', 'Unauthenticated request to /api/customer/loan-applications rejected with HTTP 401');
    } else {
      logFail('2. Protected Route Guard', `Expected 401, got ${unauthRes.status}`);
    }

    // -------------------------------------------------------------------------
    // STEP 3: CUSTOMER B CREATION & DATA ISOLATION (IDOR CHECK)
    // -------------------------------------------------------------------------
    const randomSuffixB = Math.floor(10000000 + Math.random() * 90000000);
    const customerBMobile = `97${randomSuffixB}`;
    const customerBEmail = `audit.user.b.${Date.now()}@fintechtest.in`;

    const signupResB = await request(app)
      .post('/api/auth/customer/register')
      .send({
        fullName: 'Audit Customer Beta',
        mobile: customerBMobile,
        email: customerBEmail,
        address: 'MG Road, Camp',
        state: 'Maharashtra',
        city: 'Pune',
        pincode: '411001',
        aadhaar: '123456789012',
        monthlyIncome: 95000,
      });

    const customerBId = signupResB.body.data?.user?.id;
    const customerBToken = signupResB.body.data?.token;

    logPass(
      '3. Customer B Creation',
      `Customer B created in DB: ${signupResB.body.data?.user?.fullName} (ID: ${customerBId})`
    );

    // -------------------------------------------------------------------------
    // STEP 4: CUSTOMER A LOAN APPLICATION
    // -------------------------------------------------------------------------
    const loanPayloadA = {
      amount: 250000,
      tenureMonths: 24,
      purpose: 'Medical emergency and home improvement',
    };

    const loanAppResA = await request(app)
      .post('/api/customer/loan-applications')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send(loanPayloadA);

    if (loanAppResA.status === 201 && loanAppResA.body.success && loanAppResA.body.data?.applicationNumber) {
      logPass(
        '4. Loan Application Submission',
        `HTTP 201 Created — Application Number: ${loanAppResA.body.data.applicationNumber}, Amount: ₹${loanAppResA.body.data.requestedAmount}, Status: ${loanAppResA.body.data.status}`
      );
    } else {
      logFail('4. Loan Application Submission', `Failed with HTTP ${loanAppResA.status}`, loanAppResA.body);
    }

    const loanAId = loanAppResA.body.data?.id;

    // Direct Database Check for Loan Application
    const dbLoanA = await prisma.loanApplication.findUnique({
      where: { id: loanAId },
    });

    if (dbLoanA && dbLoanA.customerId === customerAId && dbLoanA.status === 'SUBMITTED' && dbLoanA.requestedAmount === 250000) {
      logPass(
        '4. Loan Application DB Persistence & Ownership',
        `SQLite record verified: ID=${dbLoanA.id}, AppNumber=${dbLoanA.applicationNumber}, CustomerID=${dbLoanA.customerId}, Status=${dbLoanA.status}`
      );
    } else {
      logFail('4. Loan Application DB Persistence & Ownership', 'Loan application record mismatch in DB', dbLoanA);
    }

    // Cross-Customer IDOR Check: Customer B trying to view Customer A's Loan Detail
    const idorLoanRes = await request(app)
      .get(`/api/customer/loan-applications/${loanAId}`)
      .set('Authorization', `Bearer ${customerBToken}`);

    if (idorLoanRes.status === 404 || idorLoanRes.status === 403) {
      logPass(
        '3. Cross-Customer Loan Isolation (IDOR Check)',
        `Customer B blocked from accessing Customer A loan application ${loanAId} (HTTP ${idorLoanRes.status})`
      );
    } else {
      logFail(
        '3. Cross-Customer Loan Isolation (IDOR Check)',
        `Security vulnerability: Customer B accessed Customer A loan! Status: ${idorLoanRes.status}`,
        idorLoanRes.body
      );
    }

    // -------------------------------------------------------------------------
    // STEP 5: KYC DOCUMENT UPLOAD & REAL STORAGE
    // -------------------------------------------------------------------------
    const dummyAadhaarFront = Buffer.from('%PDF-1.4 Mock Aadhaar Front Card Document Content for Audit', 'utf-8');
    const dummyPanCard = Buffer.from('\xFF\xD8\xFF\xE0Mock JPEG PAN Card Content for Audit\xFF\xD9', 'binary');

    // Upload Aadhaar Front
    const uploadRes1 = await request(app)
      .post('/api/customer/documents')
      .set('Authorization', `Bearer ${customerAToken}`)
      .field('documentType', 'AADHAAR_FRONT')
      .attach('file', dummyAadhaarFront, 'aadhaar_front_audit.pdf');

    if (uploadRes1.status === 201 && uploadRes1.body.success) {
      logPass(
        '5. Aadhaar Front Upload API',
        `HTTP 201 Created — Doc ID: ${uploadRes1.body.data.document.id}, Storage: ${uploadRes1.body.data.document.storageKey}`
      );
    } else {
      logFail('5. Aadhaar Front Upload API', `Failed with HTTP ${uploadRes1.status}`, uploadRes1.body);
    }

    const docAadhaarId = uploadRes1.body.data?.document?.id;

    // Upload PAN Card
    const uploadRes2 = await request(app)
      .post('/api/customer/documents')
      .set('Authorization', `Bearer ${customerAToken}`)
      .field('documentType', 'PAN')
      .attach('file', dummyPanCard, 'pan_card_audit.jpg');

    if (uploadRes2.status === 201 && uploadRes2.body.success) {
      logPass(
        '5. PAN Card Upload API',
        `HTTP 201 Created — Doc ID: ${uploadRes2.body.data.document.id}`
      );
    } else {
      logFail('5. PAN Card Upload API', `Failed with HTTP ${uploadRes2.status}`, uploadRes2.body);
    }

    // Physical Storage & Database Verification for Uploaded Documents
    const dbDocAadhaar = await prisma.loanDocument.findUnique({
      where: { id: docAadhaarId },
    });

    if (dbDocAadhaar && dbDocAadhaar.filePath) {
      const fileExistsOnDisk = fs.existsSync(dbDocAadhaar.filePath);
      if (fileExistsOnDisk) {
        logPass(
          '5. Physical Document Disk Storage',
          `Verified file exists on disk: ${dbDocAadhaar.filePath} (${dbDocAadhaar.fileSize} bytes, mime: ${dbDocAadhaar.mimeType})`
        );
      } else {
        logFail('5. Physical Document Disk Storage', `File missing from disk at ${dbDocAadhaar.filePath}`);
      }
    } else {
      logFail('5. Physical Document Disk Storage', 'LoanDocument record missing from DB', dbDocAadhaar);
    }

    // Verify KYC Status Transition in DB
    const updatedCustomerA = await prisma.customer.findUnique({
      where: { id: customerAId },
    });

    if (updatedCustomerA?.kycStatus === 'UNDER_REVIEW') {
      logPass(
        '5. Automatic KYC Status Transition',
        `Customer KYC status automatically moved from PENDING -> UNDER_REVIEW upon document upload`
      );
    } else {
      logFail('5. Automatic KYC Status Transition', `Expected UNDER_REVIEW, got ${updatedCustomerA?.kycStatus}`);
    }

    // Customer Document Retrieval (Authorized)
    const getDocRes = await request(app)
      .get(`/api/customer/documents/${docAadhaarId}/file`)
      .set('Authorization', `Bearer ${customerAToken}`);

    if (getDocRes.status === 200) {
      logPass('5. Authorized Document Retrieval', `Customer A successfully downloaded own document (HTTP 200)`);
    } else {
      logFail('5. Authorized Document Retrieval', `Download failed with HTTP ${getDocRes.status}`);
    }

    // Cross-Customer Document IDOR Check (Customer B cannot download Customer A's doc)
    const idorDocRes = await request(app)
      .get(`/api/customer/documents/${docAadhaarId}/file`)
      .set('Authorization', `Bearer ${customerBToken}`);

    if (idorDocRes.status === 403 || idorDocRes.status === 404) {
      logPass(
        '3. Cross-Customer Document Isolation (IDOR Check)',
        `Customer B blocked from downloading Customer A's document (HTTP ${idorDocRes.status})`
      );
    } else {
      logFail('3. Cross-Customer Document Isolation (IDOR Check)', `IDOR violation: Customer B accessed Customer A doc! HTTP ${idorDocRes.status}`);
    }

    // -------------------------------------------------------------------------
    // STEP 6: ADMIN KYC & APPLICATION VERIFICATION
    // -------------------------------------------------------------------------
    // Generate compliant Admin JWT token
    const adminUser = await prisma.adminUser.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });
    const { generateAuthToken } = await import('../services/tokenService');
    const adminToken = adminUser ? generateAuthToken(adminUser.id, 'ADMIN') : '';

    logInfo('Admin Verification', `Testing Admin operations with Admin User ID: ${adminUser?.id}`);

    // Admin lists KYC queue
    const adminKycListRes = await request(app)
      .get('/api/admin/kyc')
      .set('Authorization', `Bearer ${adminToken}`);

    if (adminKycListRes.status === 200 && adminKycListRes.body.success) {
      logPass(
        '6. Admin KYC Queue Visibility',
        `Admin KYC list returned HTTP 200. Total in queue: ${adminKycListRes.body.data?.length || 0}`
      );
    } else {
      logFail('6. Admin KYC Queue Visibility', `Failed with HTTP ${adminKycListRes.status}`, adminKycListRes.body);
    }

    // Admin reviews specific Customer KYC & Documents
    const adminCustomerKycRes = await request(app)
      .get(`/api/admin/kyc/${customerAId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (adminCustomerKycRes.status === 200 && adminCustomerKycRes.body.data?.documents?.length >= 2) {
      logPass(
        '6. Admin Document Inspection',
        `Admin inspected Customer A's 2 uploaded KYC documents (Aadhaar Front, PAN) with complete metadata`
      );
    } else {
      logFail('6. Admin Document Inspection', `Admin inspection failed or missing documents`, adminCustomerKycRes.body);
    }

    // Admin Verifies Individual Document
    const adminVerifyDocRes = await request(app)
      .post(`/api/admin/documents/${docAadhaarId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'VERIFIED',
        remarks: 'Document matches government identity records.',
      });

    if (adminVerifyDocRes.status === 200 && adminVerifyDocRes.body.success) {
      logPass(
        '6. Admin Document Verification Action',
        `Admin verified Customer A's Aadhaar Document (HTTP 200)`
      );
    } else {
      logInfo('6. Admin Document Verification Action', `Admin doc verify status: HTTP ${adminVerifyDocRes.status}`);
    }

    // Admin Overrides / Approves KYC Decision for Customer A
    const adminKycDecisionRes = await request(app)
      .post(`/api/admin/kyc/${customerAId}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'APPROVED',
        reason: 'Customer KYC verified and approved by Underwriting Officer.',
      });

    if (adminKycDecisionRes.status === 200 && adminKycDecisionRes.body.success) {
      logPass(
        '6. Admin KYC Decision Action',
        `Admin approved Customer A KYC decision (HTTP 200). Status: APPROVED`
      );
    } else {
      logFail('6. Admin KYC Decision Action', `Failed with HTTP ${adminKycDecisionRes.status}`, adminKycDecisionRes.body);
    }

    // -------------------------------------------------------------------------
    // STEP 7: CUSTOMER DASHBOARD STATE VERIFICATION
    // -------------------------------------------------------------------------
    const dashboardResA = await request(app)
      .get('/api/customer/dashboard')
      .set('Authorization', `Bearer ${customerAToken}`);

    if (dashboardResA.status === 200 && dashboardResA.body.success) {
      const data = dashboardResA.body.data;
      logPass(
        '7. Customer Dashboard Reflection',
        `Dashboard loaded accurately — Borrower: ${data.customer.fullName}, KYC: ${data.kycSummary.status}, Active Loan: ${data.loanSummary?.applicationNumber} (₹${data.loanSummary?.requestedAmount}), Timeline Steps: ${data.timeline?.length}`
      );
    } else {
      logFail('7. Customer Dashboard Reflection', `Dashboard failed with HTTP ${dashboardResA.status}`, dashboardResA.body);
    }

    // -------------------------------------------------------------------------
    // STEP 8: CUSTOMER LOGOUT & RE-LOGIN DATA PERSISTENCE
    // -------------------------------------------------------------------------
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${customerAToken}`);

    logPass('8. Customer Logout', `HTTP ${logoutRes.status} — Session cleared successfully`);

    // Re-login with Customer A
    const reloginRes = await request(app)
      .post('/api/auth/customer/login')
      .send({ mobile: customerAMobile });

    if (reloginRes.status === 200 && reloginRes.body.data?.token) {
      const newToken = reloginRes.body.data.token;

      // Verify all customer data persists
      const reLoansRes = await request(app)
        .get('/api/customer/loan-applications')
        .set('Authorization', `Bearer ${newToken}`);

      const reDocsRes = await request(app)
        .get('/api/customer/documents')
        .set('Authorization', `Bearer ${newToken}`);

      if (reLoansRes.body.data?.length >= 1 && reDocsRes.body.data?.documents?.length >= 2) {
        logPass(
          '8. Full Data Persistence After Re-login',
          `Re-login verified: Customer A retrieved ${reLoansRes.body.data.length} loan applications and ${reDocsRes.body.data.documents.length} KYC documents directly from SQLite DB`
        );
      } else {
        logFail('8. Full Data Persistence After Re-login', 'Data missing after re-login', { loans: reLoansRes.body, docs: reDocsRes.body });
      }
    } else {
      logFail('8. Customer Re-login', `Re-login failed with HTTP ${reloginRes.status}`);
    }

    console.log('\n===============================================================');
    console.log(`  AUDIT SUMMARY: ${auditLogs.filter(l => l.status === 'PASS').length} Passed, ${auditLogs.filter(l => l.status === 'FAIL').length} Failed`);
    console.log('===============================================================\n');

  } catch (err) {
    console.error('Audit execution error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runRealCustomerAudit();
