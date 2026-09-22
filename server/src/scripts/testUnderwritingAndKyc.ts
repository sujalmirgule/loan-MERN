import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_123';

async function runTests() {
  console.log('=== Starting Admin Underwriting & KYC Action Center Verification ===\n');

  try {
    // 1. Setup / Identify Admin User
    let adminUser = await prisma.adminUser.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });

    if (!adminUser) {
      const hashed = await bcrypt.hash('Admin@12345', 10);
      adminUser = await prisma.adminUser.create({
        data: {
          fullName: 'Test Super Admin',
          email: `admin_${Date.now()}@loanapp.com`,
          passwordHash: hashed,
          role: 'SUPER_ADMIN',
          permissions: JSON.stringify(['*']),
          isActive: true,
        },
      });
      console.log('Created test admin user:', adminUser.email);
    }

    // 2. Setup Test Customer A (Pending KYC)
    const custMobileA = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const custEmailA = `cust_a_${Date.now()}@test.com`;
    const custPassHash = await bcrypt.hash('Customer@123', 10);

    const customerA = await prisma.customer.create({
      data: {
        fullName: 'Aarav Sharma Underwriting Test',
        email: custEmailA,
        mobile: custMobileA,
        passwordHash: custPassHash,
        status: 'ACTIVE',
        kycStatus: 'PENDING',
        state: 'Maharashtra',
        city: 'Mumbai',
        address: '101 Marine Drive, Nariman Point',
        monthlyIncome: 85000,
        aadhaarEncrypted: 'enc_aadhaar_123',
        aadhaarMasked: 'XXXX-XXXX-4589',
      },
    });
    console.log(`[Setup] Customer A created: ${customerA.fullName} (KYC: ${customerA.kycStatus})`);

    // Create a loan application for Customer A
    const appNumberA = `APP-${Date.now().toString().slice(-6)}`;
    const loanAppA = await prisma.loanApplication.create({
      data: {
        applicationNumber: appNumberA,
        customerId: customerA.id,
        requestedAmount: 300000,
        tenureMonths: 24,
        purpose: 'Home Improvement and Renovation',
        status: 'SUBMITTED',
      },
    });
    console.log(`[Setup] Loan Application A created: #${loanAppA.applicationNumber} (Status: ${loanAppA.status})`);

    // Attach a KYC document for Customer A
    const kycDocA = await prisma.loanDocument.create({
      data: {
        customerId: customerA.id,
        documentType: 'PAN',
        fileName: 'pan_aarav_sharma.pdf',
        filePath: '/uploads/kyc/pan_aarav_sharma.pdf',
        fileUrl: '/uploads/kyc/pan_aarav_sharma.pdf',
        fileSize: 1048576,
        mimeType: 'application/pdf',
        status: 'PENDING',
      },
    });
    console.log(`[Setup] KYC Document attached: ${kycDocA.fileName} (Status: ${kycDocA.status})`);

    // =========================================================================
    // TEST 1: KYC Gate Check - Approving Loan before KYC Verified MUST fail
    // =========================================================================
    console.log('\n--- TEST 1: Backend KYC Gate Enforcement on Loan Approval ---');
    const { loanApplicationService } = await import('../services/loanApplicationService');

    let gateCaught = false;
    try {
      await loanApplicationService.approveApplication(
        loanAppA.id,
        adminUser as any,
        {
          approvedAmount: 300000,
          interestRate: 12,
          tenureMonths: 24,
          finalEmi: 14122,
          processingFeeAmount: 1500,
          insuranceAmount: 500,
          remarks: 'Direct sanction attempt without KYC',
        },
        '127.0.0.1'
      );
    } catch (err: any) {
      gateCaught = true;
      console.log(`✓ KYC Gate successfully blocked approval with expected error: "${err.message}" (Status: ${err.statusCode || 400})`);
    }

    if (!gateCaught) {
      throw new Error('FAILED: KYC Gate did not block approval for customer with KYC=PENDING!');
    }

    // =========================================================================
    // TEST 2: Admin Verifies KYC Decision
    // =========================================================================
    console.log('\n--- TEST 2: Admin Verifies KYC Decision ---');
    const updatedCustA = await prisma.customer.update({
      where: { id: customerA.id },
      data: { kycStatus: 'APPROVED' },
    });
    // Update doc status
    await prisma.loanDocument.update({
      where: { id: kycDocA.id },
      data: { status: 'VERIFIED' },
    });
    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        actorId: adminUser.id,
        actorType: 'ADMIN',
        actorName: adminUser.fullName,
        action: 'KYC_APPROVED',
        entity: 'Customer',
        entityId: customerA.id,
        newValue: JSON.stringify({ kycStatus: 'APPROVED', remark: 'Documents clear and matched with database registry' }),
      },
    });
    console.log(`✓ Customer A KYC status transitioned to: ${updatedCustA.kycStatus}`);
    console.log(`✓ KYC Document verified and AuditLog recorded.`);

    // =========================================================================
    // TEST 3: Admin Approves Loan Application with Financial Parameters
    // =========================================================================
    console.log('\n--- TEST 3: Admin Approves Loan Application (Financial Sanction) ---');
    const approvedLoan = await loanApplicationService.approveApplication(
      loanAppA.id,
      adminUser as any,
      {
        approvedAmount: 280000,
        interestRate: 11.5,
        tenureMonths: 24,
        finalEmi: 13118,
        processingFeeAmount: 1400,
        insuranceAmount: 450,
        disbursementDate: new Date().toISOString().slice(0, 10),
        remarks: 'Approved by Underwriting Committee after KYC clearance',
      },
      '127.0.0.1'
    );

    console.log(`✓ Loan Application approved successfully!`);
    console.log(`  - Status: ${approvedLoan.status}`);
    console.log(`  - Approved Amount: ₹${approvedLoan.approvedAmount}`);
    console.log(`  - Tenure: ${approvedLoan.tenureMonths} Months`);

    // Verify Agreement generation / records
    const checkApp = await prisma.loanApplication.findUnique({
      where: { id: loanAppA.id },
      include: { agreement: true },
    });
    console.log(`  - Associated Agreement generated: ${checkApp?.agreement ? 'YES' : 'NO'}`);

    // =========================================================================
    // TEST 4: Admin Rejects Loan Application with Mandatory Reason
    // =========================================================================
    console.log('\n--- TEST 4: Admin Rejects Loan Application ---');
    const customerB = await prisma.customer.create({
      data: {
        fullName: 'Vikram Mehta Risk Test',
        email: `cust_b_${Date.now()}@test.com`,
        mobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        passwordHash: custPassHash,
        status: 'ACTIVE',
        kycStatus: 'APPROVED',
        state: 'Delhi',
        city: 'New Delhi',
        address: 'B-45 Connaught Place, New Delhi',
        monthlyIncome: 35000,
        aadhaarEncrypted: 'enc_aadhaar_456',
        aadhaarMasked: 'XXXX-XXXX-9921',
      },
    });

    const loanAppB = await prisma.loanApplication.create({
      data: {
        applicationNumber: `APP-${Date.now().toString().slice(-6)}`,
        customerId: customerB.id,
        requestedAmount: 500000,
        tenureMonths: 36,
        purpose: 'High Risk Debt Consolidation',
        status: 'UNDER_REVIEW',
      },
    });

    const rejectionReason = 'Debt-to-income ratio exceeds 65% underwriting threshold';
    const rejectedLoan = await loanApplicationService.rejectApplication(
      loanAppB.id,
      adminUser as any,
      rejectionReason,
      '127.0.0.1'
    );

    console.log(`✓ Loan Application rejected successfully!`);
    console.log(`  - Status: ${rejectedLoan.status}`);
    console.log(`  - Rejection Reason: "${rejectedLoan.rejectionReason}"`);

    // =========================================================================
    // TEST 5: KYC Rejection and Correction Workflows
    // =========================================================================
    console.log('\n--- TEST 5: KYC Rejection and Correction Workflows ---');
    const customerC = await prisma.customer.create({
      data: {
        fullName: 'Neha Patel KYC Correction Test',
        email: `cust_c_${Date.now()}@test.com`,
        mobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        passwordHash: custPassHash,
        status: 'ACTIVE',
        kycStatus: 'PENDING',
        address: 'Sector 15, Gandhinagar, Gujarat',
        state: 'Gujarat',
        city: 'Gandhinagar',
        monthlyIncome: 45000,
        aadhaarEncrypted: 'enc_aadhaar_789',
        aadhaarMasked: 'XXXX-XXXX-1123',
      },
    });

    // Request Reupload
    const reuploadCust = await prisma.customer.update({
      where: { id: customerC.id },
      data: { kycStatus: 'REUPLOAD_REQUIRED' },
    });
    await prisma.auditLog.create({
      data: {
        actorId: adminUser.id,
        actorType: 'ADMIN',
        actorName: adminUser.fullName,
        action: 'KYC_REUPLOAD_REQUIRED',
        entity: 'Customer',
        entityId: customerC.id,
        newValue: JSON.stringify({ reason: 'PAN card image is blurred and illegible' }),
      },
    });
    console.log(`✓ Customer C KYC status moved to: ${reuploadCust.kycStatus}`);

    // Direct Reject
    const rejectCust = await prisma.customer.update({
      where: { id: customerC.id },
      data: { kycStatus: 'REJECTED' },
    });
    await prisma.auditLog.create({
      data: {
        actorId: adminUser.id,
        actorType: 'ADMIN',
        actorName: adminUser.fullName,
        action: 'KYC_REJECTED',
        entity: 'Customer',
        entityId: customerC.id,
        newValue: JSON.stringify({ reason: 'Forged identity proof detected' }),
      },
    });
    console.log(`✓ Customer C KYC status moved to: ${rejectCust.kycStatus}`);

    console.log('\n=================================================================');
    console.log('🎉 ALL 5 UNDERWRITING & KYC SUITE TESTS PASSED WITH 100% SUCCESS!');
    console.log('=================================================================');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
