import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Loan Approve comprehensive database seeding...');

  // 1. Seed Initial Admin Users
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@loanapprove.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(adminPassword, salt);
  const customerPasswordHash = await bcrypt.hash('Customer@123', salt);

  const admin = await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: { passwordHash, role: 'SUPER_ADMIN' },
    create: {
      email: adminEmail,
      passwordHash,
      fullName: 'Chief Operations Administrator',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log(`✅ Admin user seeded: ${admin.email} (SUPER_ADMIN)`);

  // 2. Seed Default Branding Settings
  const branding = await prisma.brandingSettings.upsert({
    where: { id: 'default' },
    update: {
      primaryColor: '#2563EB',
      secondaryColor: '#7C3AED',
      companyName: 'Loan Approve Financial Services',
      appName: 'LoanApprove',
    },
    create: {
      id: 'default',
      companyName: 'Loan Approve Financial Services',
      appName: 'LoanApprove',
      primaryColor: '#2563EB',
      secondaryColor: '#7C3AED',
      email: 'support@loanapprove.com',
      phone: '+91 8042054797',
      address: 'Nariman Point, Financial District, Mumbai, Maharashtra 400021',
      website: 'https://loanapprove.com',
      termsUrl: 'https://loanapprove.com/terms',
      privacyUrl: 'https://loanapprove.com/privacy',
    },
  });
  console.log(`✅ Default branding settings seeded: ${branding.appName}`);

  // 3. Seed Multi-Tenant Domains
  const domainsData = [
    { domainName: 'loanapprove.com', helplineNumber: '+91 8042054797', contactEmail: 'contact@loanapprove.com', description: 'Primary corporate lending portal', isActive: true },
    { domainName: 'mudramantra.in', helplineNumber: '1800-200-8899', contactEmail: 'admin@mudramantra.in', description: 'MSME and micro-enterprise lending portal', isActive: true },
    { domainName: 'upwindscapital.in', helplineNumber: '1800-123-4567', contactEmail: 'support@upwindscapital.in', description: 'Corporate growth capital partners', isActive: true },
    { domainName: 'cinmmudra.me', helplineNumber: '1800-456-7890', contactEmail: 'contact@cinmmudra.me', description: 'Retail consumer loan partner', isActive: true },
    { domainName: 'creditfmcld.online', helplineNumber: '1800-789-0123', contactEmail: 'info@creditfmcld.online', description: 'Legacy affiliate domain (archived)', isActive: false },
  ];

  const domains: Record<string, string> = {};
  for (const dom of domainsData) {
    const d = await prisma.domain.upsert({
      where: { domainName: dom.domainName },
      update: { isActive: dom.isActive, helplineNumber: dom.helplineNumber, contactEmail: dom.contactEmail },
      create: dom,
    });
    domains[dom.domainName] = d.id;
  }
  console.log('✅ Multi-tenant domains seeded (5 domains)');

  // 4. Seed Advanced UPI Settings
  await prisma.uPISettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      upiEnabled: true,
      upiId: 'loanapprove@okaxis',
      gpayEnabled: true,
      gpayId: 'loanapprove.gpay@okaxis',
      phonepeEnabled: true,
      phonepeId: 'loanapprove@ybl',
      paytmEnabled: true,
      paytmId: 'loanapprove@paytm',
      otherUpiEnabled: true,
      otherUpiId: 'loanapprove@upi',
      qrCodeUrl: '/assets/qr-sample.png',
    },
  });

  // 5. Seed Advanced Bank Settings
  await prisma.bankSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      bankEnabled: true,
      accountHolder: 'Loan Approve Financial Services Pvt Ltd',
      accountNumber: '50200084729104',
      bankName: 'HDFC Bank',
      ifsc: 'HDFC0000060',
      branch: 'Fort, Mumbai',
    },
  });

  // 6. Seed Payment Links
  const linksData = [
    { title: 'Pay Processing Fee (Instant)', url: 'https://pay.loanapprove.com/pf/instant', description: 'Fast-track processing fee settlement', status: 'ACTIVE' },
    { title: 'Pay by Google Pay Direct', url: 'https://pay.loanapprove.com/gpay', description: 'One-click GPay link', status: 'ACTIVE' },
    { title: 'Pay by PhonePe Secure', url: 'https://pay.loanapprove.com/phonepe', description: 'PhonePe intent link', status: 'ACTIVE' },
  ];
  for (const l of linksData) {
    const existing = await prisma.paymentLink.findFirst({ where: { title: l.title } });
    if (!existing) { await prisma.paymentLink.create({ data: l }); }
  }

  // 7. Seed Charges & Fees
  const chargesData = [
    { name: 'Processing Fee', amount: 1250, type: 'FIXED', isMandatory: true, isActive: true, taxPercent: 18.0 },
    { name: 'Application Fee', amount: 299, type: 'FIXED', isMandatory: true, isActive: true, taxPercent: 18.0 },
    { name: 'Documentation Fee', amount: 500, type: 'FIXED', isMandatory: false, isActive: true, taxPercent: 18.0 },
    { name: 'Insurance Premium', amount: 1500, type: 'FIXED', isMandatory: false, isActive: true, taxPercent: 18.0 },
  ];
  for (const c of chargesData) {
    const existing = await prisma.charge.findFirst({ where: { name: c.name, customerId: null } });
    if (!existing) { await prisma.charge.create({ data: c }); }
  }

  // 8. Seed Default Payment Config
  await prisma.paymentConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      chargeAmount: 1250,
      chargeType: 'PROCESSING_DEPOSIT',
      upiId: 'loanapprove@okaxis',
      accountNumber: '50200084729104',
      ifscCode: 'HDFC0000060',
      accountHolderName: 'Loan Approve Financial Services Pvt Ltd',
      instructions: 'Please transfer the processing fee using UPI or IMPS and enter the 12-digit UTR number below.',
    },
  });

  // ============================================================
  // 9. DEMO CUSTOMERS (Conditioned on SEED_DEMO_DATA=true)
  // Production default: Skip fake customers, loans & payments.
  // ============================================================
  if (process.env.SEED_DEMO_DATA === 'true') {
    console.log('🌱 SEED_DEMO_DATA=true detected: Seeding demo customers and loan records...');

  // --- CUSTOMER 1: Ajay Kumar (primary demo customer) ---
  const ajay = await prisma.customer.upsert({
    where: { mobile: '8274842168' },
    update: { fullName: 'Ajay Kumar', kycStatus: 'APPROVED' },
    create: {
      mobile: '8274842168',
      fullName: 'Ajay Kumar',
      email: 'ajay3258004@gmail.com',
      state: 'Jharkhand',
      city: 'Ranchi',
      address: 'House No. 42, Circular Road, Lalpur, Ranchi',
      pincode: '834001',
      fatherName: 'Suresh Kumar',
      gender: 'Male',
      dob: '1992-05-14',
      passwordHash: customerPasswordHash,
      aadhaarEncrypted: 'mock-encrypted-aadhaar',
      aadhaarMasked: 'XXXX-XXXX-1234',
      panEncrypted: 'mock-encrypted-pan',
      panMasked: 'ABCDE****F',
      monthlyIncome: 45000,
      kycStatus: 'APPROVED',
      domainId: domains['loanapprove.com'],
      bankName: 'State Bank of India',
      bankAccountNumber: '38291047291',
      bankIfsc: 'SBIN0001234',
      bankBranch: 'Main Branch, Ranchi',
      bankAccountType: 'SAVINGS',
    },
  });

  const ajayLoan = await prisma.loanApplication.upsert({
    where: { applicationNumber: 'LN20260906142729' },
    update: { status: 'APPROVED', approvedAmount: 100000 },
    create: {
      applicationNumber: 'LN20260906142729',
      accountNumber: 'LN20260906142729',
      customerId: ajay.id,
      loanType: 'Business Loan',
      requestedAmount: 100000,
      approvedAmount: 100000,
      interestRate: 2.0,
      tenureMonths: 12,
      estimatedEmi: 8500,
      finalEmi: 8500,
      processingFeeAmount: 1250,
      totalPayable: 102000,
      remainingBalance: 102000,
      disbursementDate: new Date('2026-09-05'),
      nextEmiDate: new Date('2026-10-06'),
      purpose: 'Business Expansion',
      status: 'APPROVED',
      paymentStatus: 'PAID',
      submittedAt: new Date('2026-09-01'),
      domainId: domains['loanapprove.com'],
    },
  });

  await prisma.verificationToken.upsert({
    where: { token: 'LA-VERIFY-AJAY-2026' },
    update: {},
    create: {
      token: 'LA-VERIFY-AJAY-2026',
      documentType: 'LOAN_APPROVAL_LETTER',
      entityId: ajayLoan.id,
      customerName: 'Ajay Kumar',
      applicationNumber: 'LN20260906142729',
      loanAccountNumber: 'LN20260906142729',
      approvalDate: new Date('2026-09-11'),
      status: 'VERIFIED_VALID',
    },
  });

  await prisma.loanAgreement.upsert({
    where: { loanId: ajayLoan.id },
    update: { acceptanceStatus: 'ACCEPTED' },
    create: {
      loanId: ajayLoan.id,
      customerId: ajay.id,
      agreementVersion: 'v1.0',
      agreementContentHtml: '<p>Standard loan contract terms for Ajay Kumar (LN20260906142729).</p>',
      acceptanceStatus: 'ACCEPTED',
      acceptedAt: new Date('2026-09-11'),
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    },
  });

  const existingPaymentAjay = await prisma.payment.findFirst({ where: { loanId: ajayLoan.id } });
  if (!existingPaymentAjay) {
    await prisma.payment.create({
      data: {
        loanId: ajayLoan.id,
        customerId: ajay.id,
        amount: 1250,
        paymentMethod: 'UPI',
        paymentType: 'PROCESSING_FEE',
        transactionRef: 'UTR-20260906-8812',
        receiptNumber: 'RCP-2026-0001',
        status: 'SUCCESS',
        verifiedBy: admin.id,
        verifiedAt: new Date('2026-09-10'),
      },
    });
  }

  const existingEmiAjay = await prisma.eMISchedule.findFirst({ where: { loanId: ajayLoan.id } });
  if (!existingEmiAjay) {
    for (let i = 1; i <= 12; i++) {
      const dueDate = new Date('2026-10-06');
      dueDate.setMonth(dueDate.getMonth() + (i - 1));
      await prisma.eMISchedule.create({
        data: {
          loanId: ajayLoan.id,
          customerId: ajay.id,
          installmentNumber: i,
          dueDate,
          principalAmount: 8333.33,
          interestAmount: 166.67,
          totalAmount: 8500,
          paidAmount: 0,
          status: i === 1 ? 'DUE' : 'UPCOMING',
        },
      });
    }
  }

  // --- CUSTOMER 2: Rahul Sharma (Maharashtra, Personal Loan, SUBMITTED) ---
  const rahul = await prisma.customer.upsert({
    where: { mobile: '9876543210' },
    update: {},
    create: {
      mobile: '9876543210',
      fullName: 'Rahul Sharma',
      email: 'rahul.sharma@example.com',
      state: 'Maharashtra',
      city: 'Pune',
      address: 'Kalyani Nagar, Pune, Maharashtra',
      monthlyIncome: 55000,
      aadhaarEncrypted: 'enc-aadhaar-rahul',
      aadhaarMasked: 'XXXX-XXXX-9410',
      passwordHash: customerPasswordHash,
      domainId: domains['loanapprove.com'],
    },
  });
  await prisma.loanApplication.upsert({
    where: { applicationNumber: 'LA-2026-000002' },
    update: {},
    create: {
      applicationNumber: 'LA-2026-000002',
      customerId: rahul.id,
      loanType: 'Personal Loan',
      requestedAmount: 200000,
      interestRate: 12.0,
      tenureMonths: 24,
      estimatedEmi: 9417,
      status: 'SUBMITTED',
      paymentStatus: 'NOT_REQUIRED',
      submittedAt: new Date('2026-09-03'),
      domainId: domains['loanapprove.com'],
    },
  });

  // --- CUSTOMER 3: Priya Patil (Maharashtra, Salary Loan, APPROVED) ---
  const priya = await prisma.customer.upsert({
    where: { mobile: '9876543211' },
    update: {},
    create: {
      mobile: '9876543211',
      fullName: 'Priya Patil',
      email: 'priya.patil@example.com',
      state: 'Maharashtra',
      city: 'Mumbai',
      address: 'Dadar West, Mumbai',
      monthlyIncome: 80000,
      aadhaarEncrypted: 'enc-aadhaar-priya',
      aadhaarMasked: 'XXXX-XXXX-9411',
      kycStatus: 'APPROVED',
      passwordHash: customerPasswordHash,
      domainId: domains['loanapprove.com'],
    },
  });
  await prisma.loanApplication.upsert({
    where: { applicationNumber: 'LA-2026-000003' },
    update: {},
    create: {
      applicationNumber: 'LA-2026-000003',
      customerId: priya.id,
      loanType: 'Salary Loan',
      requestedAmount: 300000,
      approvedAmount: 300000,
      interestRate: 11.5,
      tenureMonths: 36,
      estimatedEmi: 9890,
      finalEmi: 9890,
      status: 'APPROVED',
      paymentStatus: 'PAID',
      submittedAt: new Date('2026-09-05'),
      domainId: domains['loanapprove.com'],
    },
  });

  // --- CUSTOMER 4: Amit Singh (Delhi, Personal Loan, APPROVED + Disbursed) ---
  const amit = await prisma.customer.upsert({
    where: { mobile: '9876543212' },
    update: {},
    create: {
      mobile: '9876543212',
      fullName: 'Amit Singh',
      email: 'amit.singh@example.com',
      state: 'Delhi',
      city: 'New Delhi',
      address: 'Connaught Place, New Delhi',
      monthlyIncome: 70000,
      aadhaarEncrypted: 'enc-aadhaar-amit',
      aadhaarMasked: 'XXXX-XXXX-9412',
      kycStatus: 'APPROVED',
      passwordHash: customerPasswordHash,
      domainId: domains['mudramantra.in'],
    },
  });
  const amitLoan = await prisma.loanApplication.upsert({
    where: { applicationNumber: 'LA-2026-000004' },
    update: {},
    create: {
      applicationNumber: 'LA-2026-000004',
      customerId: amit.id,
      loanType: 'Personal Loan',
      requestedAmount: 150000,
      approvedAmount: 150000,
      interestRate: 12.0,
      tenureMonths: 18,
      estimatedEmi: 9140,
      finalEmi: 9140,
      status: 'APPROVED',
      paymentStatus: 'PAID',
      submittedAt: new Date('2026-09-01'),
      domainId: domains['mudramantra.in'],
    },
  });
  const existingDisbAmit = await prisma.disbursement.findFirst({ where: { loanId: amitLoan.id } });
  if (!existingDisbAmit) {
    await prisma.disbursement.create({
      data: {
        loanId: amitLoan.id,
        customerId: amit.id,
        amount: 150000,
        method: 'BANK_TRANSFER',
        referenceId: 'NEFT-20260901-7711',
        status: 'COMPLETED',
        notes: 'Direct account transfer via NEFT',
        createdByAdminId: admin.id,
      },
    });
  }

  // --- CUSTOMER 5: Neha Verma (Karnataka, Personal Loan, REJECTED) ---
  const neha = await prisma.customer.upsert({
    where: { mobile: '9876543213' },
    update: {},
    create: {
      mobile: '9876543213',
      fullName: 'Neha Verma',
      email: 'neha.verma@example.com',
      state: 'Karnataka',
      city: 'Bengaluru',
      address: 'Indiranagar, Bengaluru',
      monthlyIncome: 25000,
      aadhaarEncrypted: 'enc-aadhaar-neha',
      aadhaarMasked: 'XXXX-XXXX-9413',
      passwordHash: customerPasswordHash,
      domainId: domains['loanapprove.com'],
    },
  });
  await prisma.loanApplication.upsert({
    where: { applicationNumber: 'LA-2026-000005' },
    update: {},
    create: {
      applicationNumber: 'LA-2026-000005',
      customerId: neha.id,
      loanType: 'Personal Loan',
      requestedAmount: 75000,
      tenureMonths: 12,
      estimatedEmi: 6650,
      status: 'REJECTED',
      rejectionReason: 'Credit bureau score does not satisfy minimum risk threshold.',
      submittedAt: new Date('2026-09-02'),
      domainId: domains['loanapprove.com'],
    },
  });

  // --- CUSTOMER 6: Ajit Kumar Sahoo (Odisha, Personal Loan, SUBMITTED) ---
  const ajit = await prisma.customer.upsert({
    where: { mobile: '9876543201' },
    update: {},
    create: {
      mobile: '9876543201',
      fullName: 'Ajit Kumar Sahoo',
      email: 'ajit.sahoo@example.com',
      state: 'Odisha',
      city: 'Bhubaneswar',
      address: 'Plot 12, Saheed Nagar, Bhubaneswar',
      monthlyIncome: 35000,
      aadhaarEncrypted: 'enc-aadhaar-ajit',
      aadhaarMasked: 'XXXX-XXXX-4501',
      passwordHash: customerPasswordHash,
      domainId: domains['cinmmudra.me'],
    },
  });
  await prisma.loanApplication.upsert({
    where: { applicationNumber: '665718' },
    update: {},
    create: {
      applicationNumber: '665718',
      customerId: ajit.id,
      loanType: 'Personal Loan',
      requestedAmount: 50000,
      tenureMonths: 12,
      estimatedEmi: 4450,
      status: 'SUBMITTED',
      paymentStatus: 'NOT_REQUIRED',
      submittedAt: new Date('2026-09-07'),
      domainId: domains['cinmmudra.me'],
    },
  });

  // --- CUSTOMER 7: Ishant Kumar Singh (Uttar Pradesh, Personal Loan, UNDER_REVIEW) ---
  const ishant = await prisma.customer.upsert({
    where: { mobile: '9876543202' },
    update: {},
    create: {
      mobile: '9876543202',
      fullName: 'Ishant Kumar Singh',
      email: 'ishant.singh@example.com',
      state: 'Uttar Pradesh',
      city: 'Varanasi',
      address: '22 Orderly Bazar, Varanasi',
      monthlyIncome: 38000,
      aadhaarEncrypted: 'enc-aadhaar-ishant',
      aadhaarMasked: 'XXXX-XXXX-4502',
      passwordHash: customerPasswordHash,
      domainId: domains['loanapprove.com'],
    },
  });
  await prisma.loanApplication.upsert({
    where: { applicationNumber: '665716' },
    update: {},
    create: {
      applicationNumber: '665716',
      customerId: ishant.id,
      loanType: 'Personal Loan',
      requestedAmount: 50000,
      tenureMonths: 12,
      estimatedEmi: 4450,
      status: 'UNDER_REVIEW',
      paymentStatus: 'NOT_REQUIRED',
      submittedAt: new Date('2026-09-06'),
      domainId: domains['loanapprove.com'],
    },
  });

  // --- CUSTOMER 8: Sumit Gharpatia (Gujarat, Business Loan, DOCUMENTS_REQUIRED) ---
  const sumit = await prisma.customer.upsert({
    where: { mobile: '9876543203' },
    update: {},
    create: {
      mobile: '9876543203',
      fullName: 'Sumit Gharpatia',
      email: 'sumit.g@example.com',
      state: 'Gujarat',
      city: 'Ahmedabad',
      address: 'B-201, Satellite, Ahmedabad',
      monthlyIncome: 65000,
      aadhaarEncrypted: 'enc-aadhaar-sumit',
      aadhaarMasked: 'XXXX-XXXX-4503',
      kycStatus: 'PENDING',
      passwordHash: customerPasswordHash,
      domainId: domains['upwindscapital.in'],
    },
  });
  await prisma.loanApplication.upsert({
    where: { applicationNumber: '665745' },
    update: {},
    create: {
      applicationNumber: '665745',
      customerId: sumit.id,
      loanType: 'Business Loan',
      requestedAmount: 325250,
      tenureMonths: 36,
      estimatedEmi: 10850,
      status: 'DOCUMENTS_REQUIRED',
      paymentStatus: 'NOT_REQUIRED',
      submittedAt: new Date('2026-09-08'),
      domainId: domains['upwindscapital.in'],
    },
  });

  // --- CUSTOMER 9: Yamuna Devi (Tamil Nadu, Business Loan, UNDER_REVIEW) ---
  const yamuna = await prisma.customer.upsert({
    where: { mobile: '9876543205' },
    update: {},
    create: {
      mobile: '9876543205',
      fullName: 'Yamuna Devi',
      email: 'yamuna.d@example.com',
      state: 'Tamil Nadu',
      city: 'Chennai',
      address: '15 Anna Nagar West, Chennai',
      monthlyIncome: 120000,
      aadhaarEncrypted: 'enc-aadhaar-yamuna',
      aadhaarMasked: 'XXXX-XXXX-4505',
      kycStatus: 'UNDER_REVIEW',
      passwordHash: customerPasswordHash,
      domainId: domains['mudramantra.in'],
    },
  });
  await prisma.loanApplication.upsert({
    where: { applicationNumber: '665739' },
    update: {},
    create: {
      applicationNumber: '665739',
      customerId: yamuna.id,
      loanType: 'Business Loan',
      requestedAmount: 1000000,
      tenureMonths: 48,
      estimatedEmi: 26300,
      status: 'UNDER_REVIEW',
      paymentStatus: 'NOT_REQUIRED',
      submittedAt: new Date('2026-09-10'),
      domainId: domains['mudramantra.in'],
    },
  });

  // --- CUSTOMER 10: Vikas Gupta (Rajasthan, Business Loan, APPROVED) ---
  const vikas = await prisma.customer.upsert({
    where: { mobile: '9811223344' },
    update: {},
    create: {
      mobile: '9811223344',
      fullName: 'Vikas Gupta',
      email: 'vikas.gupta@example.com',
      state: 'Rajasthan',
      city: 'Jaipur',
      address: 'C-Scheme, Jaipur, Rajasthan 302001',
      fatherName: 'Ramesh Gupta',
      gender: 'Male',
      dob: '1988-11-20',
      monthlyIncome: 90000,
      aadhaarEncrypted: 'enc-aadhaar-vikas',
      aadhaarMasked: 'XXXX-XXXX-5501',
      panEncrypted: 'enc-pan-vikas',
      panMasked: 'VKGP****K',
      kycStatus: 'APPROVED',
      passwordHash: customerPasswordHash,
      bankName: 'ICICI Bank',
      bankAccountNumber: '44827349102',
      bankIfsc: 'ICIC0001234',
      bankBranch: 'Jaipur Main',
      bankAccountType: 'CURRENT',
      domainId: domains['loanapprove.com'],
    },
  });
  await prisma.loanApplication.upsert({
    where: { applicationNumber: 'LA-2026-000010' },
    update: {},
    create: {
      applicationNumber: 'LA-2026-000010',
      customerId: vikas.id,
      loanType: 'Business Loan',
      requestedAmount: 500000,
      approvedAmount: 480000,
      interestRate: 13.5,
      tenureMonths: 24,
      estimatedEmi: 23100,
      finalEmi: 23100,
      processingFeeAmount: 4800,
      totalPayable: 554400,
      status: 'APPROVED',
      paymentStatus: 'PAID',
      submittedAt: new Date('2026-09-03'),
      domainId: domains['loanapprove.com'],
    },
  });

  // --- CUSTOMER 11: Sneha Reddy (Telangana, Education Loan, SUBMITTED) ---
  const sneha = await prisma.customer.upsert({
    where: { mobile: '9922334455' },
    update: {},
    create: {
      mobile: '9922334455',
      fullName: 'Sneha Reddy',
      email: 'sneha.reddy@example.com',
      state: 'Telangana',
      city: 'Hyderabad',
      address: 'Banjara Hills, Hyderabad, Telangana 500034',
      fatherName: 'Krishna Reddy',
      gender: 'Female',
      dob: '1999-03-15',
      monthlyIncome: 30000,
      aadhaarEncrypted: 'enc-aadhaar-sneha',
      aadhaarMasked: 'XXXX-XXXX-6601',
      kycStatus: 'PENDING',
      passwordHash: customerPasswordHash,
      domainId: domains['loanapprove.com'],
    },
  });
  await prisma.loanApplication.upsert({
    where: { applicationNumber: 'LA-2026-000011' },
    update: {},
    create: {
      applicationNumber: 'LA-2026-000011',
      customerId: sneha.id,
      loanType: 'Education Loan',
      requestedAmount: 250000,
      interestRate: 9.0,
      tenureMonths: 60,
      estimatedEmi: 5198,
      status: 'SUBMITTED',
      paymentStatus: 'NOT_REQUIRED',
      submittedAt: new Date('2026-09-12'),
      domainId: domains['loanapprove.com'],
    },
  });

  // --- CUSTOMER 12: Manoj Tiwari (Uttar Pradesh, Salary Loan, REJECTED) ---
  const manoj = await prisma.customer.upsert({
    where: { mobile: '9933445566' },
    update: {},
    create: {
      mobile: '9933445566',
      fullName: 'Manoj Tiwari',
      email: 'manoj.tiwari@example.com',
      state: 'Uttar Pradesh',
      city: 'Lucknow',
      address: 'Gomti Nagar, Lucknow, UP 226010',
      gender: 'Male',
      dob: '1985-07-22',
      monthlyIncome: 28000,
      aadhaarEncrypted: 'enc-aadhaar-manoj',
      aadhaarMasked: 'XXXX-XXXX-7701',
      kycStatus: 'REJECTED',
      passwordHash: customerPasswordHash,
      domainId: domains['cinmmudra.me'],
    },
  });
  await prisma.loanApplication.upsert({
    where: { applicationNumber: 'LA-2026-000012' },
    update: {},
    create: {
      applicationNumber: 'LA-2026-000012',
      customerId: manoj.id,
      loanType: 'Salary Loan',
      requestedAmount: 80000,
      tenureMonths: 12,
      estimatedEmi: 7100,
      status: 'REJECTED',
      rejectionReason: 'Monthly income below minimum eligibility threshold of ₹30,000.',
      submittedAt: new Date('2026-09-04'),
      domainId: domains['cinmmudra.me'],
    },
  });

  // --- CUSTOMER 13: Kavita Sharma (West Bengal, Education Loan, UNDER_REVIEW) ---
  const kavita = await prisma.customer.upsert({
    where: { mobile: '9944556677' },
    update: {},
    create: {
      mobile: '9944556677',
      fullName: 'Kavita Sharma',
      email: 'kavita.sharma@example.com',
      state: 'West Bengal',
      city: 'Kolkata',
      address: 'Salt Lake City, Kolkata, WB 700064',
      fatherName: 'Ranjit Sharma',
      gender: 'Female',
      dob: '1994-09-10',
      monthlyIncome: 42000,
      aadhaarEncrypted: 'enc-aadhaar-kavita',
      aadhaarMasked: 'XXXX-XXXX-8801',
      kycStatus: 'APPROVED',
      passwordHash: customerPasswordHash,
      domainId: domains['loanapprove.com'],
    },
  });
  await prisma.loanApplication.upsert({
    where: { applicationNumber: 'LA-2026-000013' },
    update: {},
    create: {
      applicationNumber: 'LA-2026-000013',
      customerId: kavita.id,
      loanType: 'Education Loan',
      requestedAmount: 400000,
      interestRate: 9.5,
      tenureMonths: 48,
      estimatedEmi: 10100,
      status: 'UNDER_REVIEW',
      paymentStatus: 'NOT_REQUIRED',
      submittedAt: new Date('2026-09-09'),
      domainId: domains['loanapprove.com'],
    },
  });

  // --- CUSTOMER 14: Suresh Patel (Gujarat, Business Loan, APPROVED) ---
  const suresh = await prisma.customer.upsert({
    where: { mobile: '9955667788' },
    update: {},
    create: {
      mobile: '9955667788',
      fullName: 'Suresh Patel',
      email: 'suresh.patel@example.com',
      state: 'Gujarat',
      city: 'Surat',
      address: 'Varachha Road, Surat, Gujarat 395010',
      fatherName: 'Hasmukh Patel',
      gender: 'Male',
      dob: '1979-12-05',
      monthlyIncome: 110000,
      aadhaarEncrypted: 'enc-aadhaar-suresh',
      aadhaarMasked: 'XXXX-XXXX-9901',
      panEncrypted: 'enc-pan-suresh',
      panMasked: 'SRPAT****L',
      kycStatus: 'APPROVED',
      passwordHash: customerPasswordHash,
      bankName: 'Axis Bank',
      bankAccountNumber: '918010061749342',
      bankIfsc: 'UTIB0001122',
      bankBranch: 'Surat Main',
      bankAccountType: 'CURRENT',
      domainId: domains['upwindscapital.in'],
    },
  });
  const sureshLoan = await prisma.loanApplication.upsert({
    where: { applicationNumber: 'LA-2026-000014' },
    update: {},
    create: {
      applicationNumber: 'LA-2026-000014',
      customerId: suresh.id,
      loanType: 'Business Loan',
      requestedAmount: 750000,
      approvedAmount: 750000,
      interestRate: 12.0,
      tenureMonths: 36,
      estimatedEmi: 24900,
      finalEmi: 24900,
      processingFeeAmount: 7500,
      totalPayable: 896400,
      status: 'APPROVED',
      paymentStatus: 'PAID',
      submittedAt: new Date('2026-09-02'),
      domainId: domains['upwindscapital.in'],
    },
  });
  const existingDisbSuresh = await prisma.disbursement.findFirst({ where: { loanId: sureshLoan.id } });
  if (!existingDisbSuresh) {
    await prisma.disbursement.create({
      data: {
        loanId: sureshLoan.id,
        customerId: suresh.id,
        amount: 750000,
        method: 'BANK_TRANSFER',
        referenceId: 'NEFT-20260905-1234',
        status: 'COMPLETED',
        notes: 'NEFT transfer to Axis Bank current account',
        createdByAdminId: admin.id,
      },
    });
  }

  // --- CUSTOMER 15: Ananya Krishnan (Karnataka, Salary Loan, SUBMITTED) ---
  const ananya = await prisma.customer.upsert({
    where: { mobile: '9966778899' },
    update: {},
    create: {
      mobile: '9966778899',
      fullName: 'Ananya Krishnan',
      email: 'ananya.k@example.com',
      state: 'Karnataka',
      city: 'Bengaluru',
      address: 'Whitefield, Bengaluru, Karnataka 560066',
      fatherName: 'Rajan Krishnan',
      gender: 'Female',
      dob: '1996-06-18',
      monthlyIncome: 65000,
      aadhaarEncrypted: 'enc-aadhaar-ananya',
      aadhaarMasked: 'XXXX-XXXX-1102',
      kycStatus: 'APPROVED',
      passwordHash: customerPasswordHash,
      domainId: domains['loanapprove.com'],
    },
  });
  await prisma.loanApplication.upsert({
    where: { applicationNumber: 'LA-2026-000015' },
    update: {},
    create: {
      applicationNumber: 'LA-2026-000015',
      customerId: ananya.id,
      loanType: 'Salary Loan',
      requestedAmount: 150000,
      interestRate: 11.0,
      tenureMonths: 18,
      estimatedEmi: 9245,
      status: 'SUBMITTED',
      paymentStatus: 'NOT_REQUIRED',
      submittedAt: new Date('2026-09-13'),
      domainId: domains['loanapprove.com'],
    },
  });

  // --- CUSTOMER 16: Deepak Nair (Kerala, Personal Loan, UNDER_REVIEW) ---
  const deepak = await prisma.customer.upsert({
    where: { mobile: '9977889900' },
    update: {},
    create: {
      mobile: '9977889900',
      fullName: 'Deepak Nair',
      email: 'deepak.nair@example.com',
      state: 'Kerala',
      city: 'Kochi',
      address: 'MG Road, Ernakulam, Kerala 682011',
      gender: 'Male',
      dob: '1991-04-25',
      monthlyIncome: 75000,
      aadhaarEncrypted: 'enc-aadhaar-deepak',
      aadhaarMasked: 'XXXX-XXXX-2203',
      kycStatus: 'UNDER_REVIEW',
      passwordHash: customerPasswordHash,
      domainId: domains['loanapprove.com'],
    },
  });
  await prisma.loanApplication.upsert({
    where: { applicationNumber: 'LA-2026-000016' },
    update: {},
    create: {
      applicationNumber: 'LA-2026-000016',
      customerId: deepak.id,
      loanType: 'Personal Loan',
      requestedAmount: 350000,
      interestRate: 12.5,
      tenureMonths: 30,
      estimatedEmi: 13800,
      status: 'UNDER_REVIEW',
      paymentStatus: 'NOT_REQUIRED',
      submittedAt: new Date('2026-09-11'),
      domainId: domains['loanapprove.com'],
    },
  });

  // --- CUSTOMER 17: Pooja Agarwal (Delhi, Education Loan, APPROVED) ---
  const pooja = await prisma.customer.upsert({
    where: { mobile: '9988001122' },
    update: {},
    create: {
      mobile: '9988001122',
      fullName: 'Pooja Agarwal',
      email: 'pooja.agarwal@example.com',
      state: 'Delhi',
      city: 'New Delhi',
      address: 'Lajpat Nagar, New Delhi 110024',
      fatherName: 'Sunil Agarwal',
      gender: 'Female',
      dob: '1997-08-30',
      monthlyIncome: 50000,
      aadhaarEncrypted: 'enc-aadhaar-pooja',
      aadhaarMasked: 'XXXX-XXXX-3304',
      kycStatus: 'APPROVED',
      passwordHash: customerPasswordHash,
      domainId: domains['loanapprove.com'],
    },
  });
  await prisma.loanApplication.upsert({
    where: { applicationNumber: 'LA-2026-000017' },
    update: {},
    create: {
      applicationNumber: 'LA-2026-000017',
      customerId: pooja.id,
      loanType: 'Education Loan',
      requestedAmount: 600000,
      approvedAmount: 550000,
      interestRate: 8.5,
      tenureMonths: 72,
      estimatedEmi: 9625,
      finalEmi: 9625,
      processingFeeAmount: 5500,
      totalPayable: 693000,
      status: 'APPROVED',
      paymentStatus: 'PAID',
      submittedAt: new Date('2026-09-04'),
      domainId: domains['loanapprove.com'],
    },
  });

  // --- CUSTOMER 18: Ravi Shankar (Tamil Nadu, Business Loan, SUBMITTED) ---
  const ravi = await prisma.customer.upsert({
    where: { mobile: '9900112233' },
    update: {},
    create: {
      mobile: '9900112233',
      fullName: 'Ravi Shankar',
      email: 'ravi.shankar@example.com',
      state: 'Tamil Nadu',
      city: 'Coimbatore',
      address: 'RS Puram, Coimbatore, TN 641002',
      gender: 'Male',
      dob: '1983-02-14',
      monthlyIncome: 95000,
      aadhaarEncrypted: 'enc-aadhaar-ravi',
      aadhaarMasked: 'XXXX-XXXX-4405',
      kycStatus: 'APPROVED',
      passwordHash: customerPasswordHash,
      domainId: domains['mudramantra.in'],
    },
  });
  await prisma.loanApplication.upsert({
    where: { applicationNumber: 'LA-2026-000018' },
    update: {},
    create: {
      applicationNumber: 'LA-2026-000018',
      customerId: ravi.id,
      loanType: 'Business Loan',
      requestedAmount: 1200000,
      interestRate: 14.0,
      tenureMonths: 48,
      estimatedEmi: 32900,
      status: 'SUBMITTED',
      paymentStatus: 'NOT_REQUIRED',
      submittedAt: new Date('2026-09-14'),
      domainId: domains['mudramantra.in'],
    },
  });

  // --- CUSTOMER 19: Meena Kumari (Rajasthan, Salary Loan, REJECTED) ---
  const meena = await prisma.customer.upsert({
    where: { mobile: '9901234567' },
    update: {},
    create: {
      mobile: '9901234567',
      fullName: 'Meena Kumari',
      email: 'meena.kumari@example.com',
      state: 'Rajasthan',
      city: 'Jodhpur',
      address: 'Shastri Nagar, Jodhpur, Rajasthan 342003',
      gender: 'Female',
      dob: '1990-11-08',
      monthlyIncome: 22000,
      aadhaarEncrypted: 'enc-aadhaar-meena',
      aadhaarMasked: 'XXXX-XXXX-5506',
      passwordHash: customerPasswordHash,
      domainId: domains['loanapprove.com'],
    },
  });
  await prisma.loanApplication.upsert({
    where: { applicationNumber: 'LA-2026-000019' },
    update: {},
    create: {
      applicationNumber: 'LA-2026-000019',
      customerId: meena.id,
      loanType: 'Salary Loan',
      requestedAmount: 60000,
      tenureMonths: 12,
      estimatedEmi: 5350,
      status: 'REJECTED',
      rejectionReason: 'Applicant does not have a formal salary slip or employment proof.',
      submittedAt: new Date('2026-09-06'),
      domainId: domains['loanapprove.com'],
    },
  });

  // --- CUSTOMER 20: Arjun Mehta (Maharashtra, Business Loan, UNDER_REVIEW) ---
  const arjun = await prisma.customer.upsert({
    where: { mobile: '9912345678' },
    update: {},
    create: {
      mobile: '9912345678',
      fullName: 'Arjun Mehta',
      email: 'arjun.mehta@example.com',
      state: 'Maharashtra',
      city: 'Nashik',
      address: 'Gangapur Road, Nashik, Maharashtra 422013',
      gender: 'Male',
      dob: '1987-06-12',
      monthlyIncome: 85000,
      aadhaarEncrypted: 'enc-aadhaar-arjun',
      aadhaarMasked: 'XXXX-XXXX-6607',
      kycStatus: 'APPROVED',
      passwordHash: customerPasswordHash,
      domainId: domains['upwindscapital.in'],
    },
  });
  await prisma.loanApplication.upsert({
    where: { applicationNumber: 'LA-2026-000020' },
    update: {},
    create: {
      applicationNumber: 'LA-2026-000020',
      customerId: arjun.id,
      loanType: 'Business Loan',
      requestedAmount: 800000,
      interestRate: 13.0,
      tenureMonths: 36,
      estimatedEmi: 26900,
      status: 'UNDER_REVIEW',
      paymentStatus: 'NOT_REQUIRED',
      submittedAt: new Date('2026-09-15'),
      domainId: domains['upwindscapital.in'],
    },
  });

  // --- CUSTOMER 21: Lakshmi Narayanan (Telangana, Personal Loan, APPROVED + Disbursed) ---
  const lakshmi = await prisma.customer.upsert({
    where: { mobile: '9923456789' },
    update: {},
    create: {
      mobile: '9923456789',
      fullName: 'Lakshmi Narayanan',
      email: 'lakshmi.n@example.com',
      state: 'Telangana',
      city: 'Hyderabad',
      address: 'Jubilee Hills, Hyderabad, TS 500033',
      gender: 'Female',
      dob: '1985-09-01',
      monthlyIncome: 140000,
      aadhaarEncrypted: 'enc-aadhaar-lakshmi',
      aadhaarMasked: 'XXXX-XXXX-7708',
      kycStatus: 'APPROVED',
      passwordHash: customerPasswordHash,
      bankName: 'HDFC Bank',
      bankAccountNumber: '50100234567891',
      bankIfsc: 'HDFC0001234',
      bankBranch: 'Jubilee Hills',
      bankAccountType: 'SAVINGS',
      domainId: domains['loanapprove.com'],
    },
  });
  const lakshmiLoan = await prisma.loanApplication.upsert({
    where: { applicationNumber: 'LA-2026-000021' },
    update: {},
    create: {
      applicationNumber: 'LA-2026-000021',
      customerId: lakshmi.id,
      loanType: 'Personal Loan',
      requestedAmount: 500000,
      approvedAmount: 500000,
      interestRate: 11.5,
      tenureMonths: 24,
      estimatedEmi: 23500,
      finalEmi: 23500,
      processingFeeAmount: 5000,
      totalPayable: 564000,
      status: 'APPROVED',
      paymentStatus: 'PAID',
      submittedAt: new Date('2026-09-01'),
      domainId: domains['loanapprove.com'],
    },
  });
  const existingDisbLakshmi = await prisma.disbursement.findFirst({ where: { loanId: lakshmiLoan.id } });
  if (!existingDisbLakshmi) {
    await prisma.disbursement.create({
      data: {
        loanId: lakshmiLoan.id,
        customerId: lakshmi.id,
        amount: 500000,
        method: 'BANK_TRANSFER',
        referenceId: 'NEFT-20260908-5566',
        status: 'COMPLETED',
        notes: 'NEFT to HDFC savings account',
        createdByAdminId: admin.id,
      },
    });
  }

  // --- CUSTOMER 22: Rajesh Nayakuchi (Andhra Pradesh, Personal Loan, DOCUMENTS_REQUIRED) ---
  const rajesh = await prisma.customer.upsert({
    where: { mobile: '9876543204' },
    update: {},
    create: {
      mobile: '9876543204',
      fullName: 'Rajesh Nayakuchi',
      email: 'rajesh.n@example.com',
      state: 'Andhra Pradesh',
      city: 'Vijayawada',
      address: '4th Line, Governorpet, Vijayawada',
      monthlyIncome: 30000,
      aadhaarEncrypted: 'enc-aadhaar-rajesh',
      aadhaarMasked: 'XXXX-XXXX-4504',
      kycStatus: 'PENDING',
      passwordHash: customerPasswordHash,
      domainId: domains['cinmmudra.me'],
    },
  });
  await prisma.loanApplication.upsert({
    where: { applicationNumber: '665744' },
    update: {},
    create: {
      applicationNumber: '665744',
      customerId: rajesh.id,
      loanType: 'Personal Loan',
      requestedAmount: 50000,
      tenureMonths: 12,
      estimatedEmi: 4450,
      status: 'DOCUMENTS_REQUIRED',
      paymentStatus: 'NOT_REQUIRED',
      submittedAt: new Date('2026-09-09'),
      domainId: domains['cinmmudra.me'],
    },
  });

  // --- CUSTOMER 23: Sanjay Kulkarni (Maharashtra, Salary Loan, APPROVED) ---
  const sanjay = await prisma.customer.upsert({
    where: { mobile: '9934567890' },
    update: {},
    create: {
      mobile: '9934567890',
      fullName: 'Sanjay Kulkarni',
      email: 'sanjay.kulkarni@example.com',
      state: 'Maharashtra',
      city: 'Aurangabad',
      address: 'CIDCO, Aurangabad, Maharashtra 431003',
      gender: 'Male',
      dob: '1982-03-19',
      monthlyIncome: 60000,
      aadhaarEncrypted: 'enc-aadhaar-sanjay',
      aadhaarMasked: 'XXXX-XXXX-8809',
      kycStatus: 'APPROVED',
      passwordHash: customerPasswordHash,
      domainId: domains['loanapprove.com'],
    },
  });
  await prisma.loanApplication.upsert({
    where: { applicationNumber: 'LA-2026-000023' },
    update: {},
    create: {
      applicationNumber: 'LA-2026-000023',
      customerId: sanjay.id,
      loanType: 'Salary Loan',
      requestedAmount: 200000,
      approvedAmount: 200000,
      interestRate: 11.0,
      tenureMonths: 24,
      estimatedEmi: 9300,
      finalEmi: 9300,
      processingFeeAmount: 2000,
      status: 'APPROVED',
      paymentStatus: 'PAID',
      submittedAt: new Date('2026-09-16'),
      domainId: domains['loanapprove.com'],
    },
  });

  // --- CUSTOMER 24: Farhan Sheikh (West Bengal, Business Loan, SUBMITTED) ---
  const farhan = await prisma.customer.upsert({
    where: { mobile: '9945678901' },
    update: {},
    create: {
      mobile: '9945678901',
      fullName: 'Farhan Sheikh',
      email: 'farhan.sheikh@example.com',
      state: 'West Bengal',
      city: 'Kolkata',
      address: 'Park Street, Kolkata, WB 700016',
      gender: 'Male',
      dob: '1989-12-01',
      monthlyIncome: 55000,
      aadhaarEncrypted: 'enc-aadhaar-farhan',
      aadhaarMasked: 'XXXX-XXXX-9910',
      passwordHash: customerPasswordHash,
      domainId: domains['mudramantra.in'],
    },
  });
  await prisma.loanApplication.upsert({
    where: { applicationNumber: 'LA-2026-000024' },
    update: {},
    create: {
      applicationNumber: 'LA-2026-000024',
      customerId: farhan.id,
      loanType: 'Business Loan',
      requestedAmount: 450000,
      interestRate: 14.5,
      tenureMonths: 30,
      estimatedEmi: 17600,
      status: 'SUBMITTED',
      paymentStatus: 'NOT_REQUIRED',
      submittedAt: new Date('2026-09-17'),
      domainId: domains['mudramantra.in'],
    },
  });

  // --- CUSTOMER 25: Divya Menon (Kerala, Personal Loan, UNDER_REVIEW) ---
  const divya = await prisma.customer.upsert({
    where: { mobile: '9956789012' },
    update: {},
    create: {
      mobile: '9956789012',
      fullName: 'Divya Menon',
      email: 'divya.menon@example.com',
      state: 'Kerala',
      city: 'Thiruvananthapuram',
      address: 'Kowdiar, Thiruvananthapuram, Kerala 695003',
      fatherName: 'Suresh Menon',
      gender: 'Female',
      dob: '1993-07-04',
      monthlyIncome: 48000,
      aadhaarEncrypted: 'enc-aadhaar-divya',
      aadhaarMasked: 'XXXX-XXXX-1011',
      kycStatus: 'UNDER_REVIEW',
      passwordHash: customerPasswordHash,
      domainId: domains['loanapprove.com'],
    },
  });
  await prisma.loanApplication.upsert({
    where: { applicationNumber: 'LA-2026-000025' },
    update: {},
    create: {
      applicationNumber: 'LA-2026-000025',
      customerId: divya.id,
      loanType: 'Personal Loan',
      requestedAmount: 180000,
      interestRate: 12.0,
      tenureMonths: 24,
      estimatedEmi: 8500,
      status: 'UNDER_REVIEW',
      paymentStatus: 'NOT_REQUIRED',
      submittedAt: new Date('2026-09-18'),
      domainId: domains['loanapprove.com'],
    },
  });

  // --- CUSTOMER 26: Harpreet Singh (Punjab, Business Loan, SUBMITTED) ---
  const harpreet = await prisma.customer.upsert({
    where: { mobile: '9967890123' },
    update: {},
    create: {
      mobile: '9967890123',
      fullName: 'Harpreet Singh',
      email: 'harpreet.singh@example.com',
      state: 'Punjab',
      city: 'Amritsar',
      address: 'Golden Temple Road, Amritsar, Punjab 143001',
      gender: 'Male',
      dob: '1986-01-16',
      monthlyIncome: 72000,
      aadhaarEncrypted: 'enc-aadhaar-harpreet',
      aadhaarMasked: 'XXXX-XXXX-2112',
      kycStatus: 'APPROVED',
      passwordHash: customerPasswordHash,
      domainId: domains['loanapprove.com'],
    },
  });
  await prisma.loanApplication.upsert({
    where: { applicationNumber: 'LA-2026-000026' },
    update: {},
    create: {
      applicationNumber: 'LA-2026-000026',
      customerId: harpreet.id,
      loanType: 'Business Loan',
      requestedAmount: 900000,
      interestRate: 13.5,
      tenureMonths: 48,
      estimatedEmi: 25700,
      status: 'SUBMITTED',
      paymentStatus: 'NOT_REQUIRED',
      submittedAt: new Date('2026-09-19'),
      domainId: domains['loanapprove.com'],
    },
  });

  // Seed notifications
  const existingNotifs = await prisma.notification.count();
  if (existingNotifs === 0) {
    await prisma.notification.createMany({
      data: [
        {
          recipientType: 'CUSTOMER',
          customerId: ajay.id,
          title: 'Loan Approved!',
          message: 'Congratulations Ajay, your Business Loan of ₹1,00,000 has been approved.',
          eventType: 'LOAN_APPROVAL',
          isRead: false,
        },
        {
          recipientType: 'CUSTOMER',
          customerId: ajay.id,
          title: 'Payment Verified',
          message: 'Your processing fee payment of ₹1,250 has been verified successfully.',
          eventType: 'PAYMENT_VERIFIED',
          isRead: true,
        },
        {
          recipientType: 'ADMIN',
          title: 'New Applications Pending Review',
          message: '5 new loan applications require administrative review.',
          eventType: 'ACTION_REQUIRED',
          isRead: false,
        },
      ],
    });
  }

  // Support Ticket
  const existingTicket = await prisma.supportTicket.findFirst({ where: { customerId: ajay.id } });
  if (!existingTicket) {
    await prisma.supportTicket.create({
      data: {
        customerId: ajay.id,
        subject: 'Inquiry regarding EMI deduction date',
        message: 'Can I change my preferred EMI deduction date from 6th to 10th?',
        status: 'RESOLVED',
        adminReply: 'Hello Ajay, your EMI cycle is scheduled for the 6th as per sanction terms.',
        resolvedAt: new Date(),
      },
    });
  }

    console.log('✅ Demo customers seeded successfully!');
  } else {
    console.log('🔒 Production mode: Skipping demo customers, loans, payments, and financial records.');
  }

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
