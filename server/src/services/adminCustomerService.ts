import { prisma } from './db';
import { AppError } from '../middleware/errorHandler';
import { auditService } from './auditService';
import { pdfService } from './pdfService';

export class AdminCustomerService {
  /**
   * Builds combined AND where conditions for customer listing & CSV export.
   */
  private buildCustomerFilterWhere(filters: {
    search?: string;
    kycStatus?: string;
    status?: string;
    state?: string;
    city?: string;
    fromDate?: string;
    toDate?: string;
    domainId?: string;
  }) {
    const andConditions: any[] = [{ isDeleted: false }];

    if (filters.kycStatus && filters.kycStatus !== 'ALL') {
      andConditions.push({ kycStatus: filters.kycStatus });
    }

    if (filters.status && filters.status !== 'ALL') {
      const s = filters.status.toUpperCase();
      if (s === 'PENDING' || s === 'PENDING_APPROVAL') {
        andConditions.push({
          OR: [
            { kycStatus: { in: ['PENDING', 'UNDER_REVIEW'] } },
            { loans: { some: { status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_REQUIRED', 'ON_HOLD'] } } } },
          ],
        });
      } else if (s === 'UNDER_REVIEW') {
        andConditions.push({
          OR: [
            { kycStatus: 'UNDER_REVIEW' },
            { loans: { some: { status: 'UNDER_REVIEW' } } },
          ],
        });
      } else if (s === 'APPROVED') {
        andConditions.push({
          OR: [
            { kycStatus: { in: ['APPROVED', 'VERIFIED'] } },
            { loans: { some: { status: 'APPROVED' } } },
          ],
        });
      } else if (s === 'REJECTED') {
        andConditions.push({
          OR: [
            { kycStatus: 'REJECTED' },
            { loans: { some: { status: 'REJECTED' } } },
          ],
        });
      } else if (s === 'DISBURSED') {
        andConditions.push({ loans: { some: { status: 'DISBURSED' } } });
      } else if (s === 'DEACTIVATED') {
        andConditions.push({
          OR: [
            { status: 'DEACTIVATED' },
            { isActive: false },
          ],
        });
      } else if (s === 'ACTIVE') {
        andConditions.push({
          status: 'ACTIVE',
          isActive: true,
        });
      }
    }

    if (filters.state && filters.state.trim().length > 0 && filters.state !== 'ALL') {
      andConditions.push({ state: { equals: filters.state.trim() } });
    }

    if (filters.city && filters.city.trim().length > 0) {
      andConditions.push({ city: { equals: filters.city.trim() } });
    }

    if (filters.fromDate || filters.toDate) {
      const dateCond: Record<string, Date> = {};
      if (filters.fromDate) {
        const fromD = new Date(filters.fromDate);
        fromD.setHours(0, 0, 0, 0);
        dateCond.gte = fromD;
      }
      if (filters.toDate) {
        const toD = new Date(filters.toDate);
        toD.setHours(23, 59, 59, 999);
        dateCond.lte = toD;
      }
      andConditions.push({ createdAt: dateCond });
    }

    if (filters.search && filters.search.trim().length > 0) {
      const term = filters.search.trim();
      andConditions.push({
        OR: [
          { fullName: { contains: term } },
          { mobile: { contains: term } },
          { email: { contains: term } },
        ],
      });
    }

    if (filters.domainId && filters.domainId.trim().length > 0 && filters.domainId !== 'ALL') {
      andConditions.push({ domainId: filters.domainId.trim() });
    }

    return { AND: andConditions };
  }

  /**
   * Lists customers with server-side date filters, state filter, status filter, search, and pagination.
   */
  async listCustomers(filters: {
    search?: string;
    kycStatus?: string;
    status?: string;
    state?: string;
    city?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
    domainId?: string;
  }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
    const skip = (page - 1) * limit;

    const where = this.buildCustomerFilterWhere(filters);

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          loans: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              applicationNumber: true,
              loanType: true,
              status: true,
              paymentStatus: true,
              requestedAmount: true,
              approvedAmount: true,
              submittedAt: true,
              createdAt: true,
            },
          },
          payments: {
            take: 1,
            orderBy: { paymentDate: 'desc' },
            select: { status: true, amount: true, transactionRef: true, receiptNumber: true, paymentDate: true },
          },
          whatsappMessages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { status: true, sentAt: true, failedAt: true },
          },
        },
      }),
    ]);

    const formatted = customers.map((c) => {
      const latestLoan = c.loans[0] || null;
      const latestPayment = c.payments[0] || null;
      const latestWa = c.whatsappMessages[0] || null;

      const isPending =
        c.kycStatus === 'PENDING' ||
        c.kycStatus === 'UNDER_REVIEW' ||
        (latestLoan && ['SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_REQUIRED', 'ON_HOLD'].includes(latestLoan.status));

      const pendingSince = isPending ? (latestLoan?.submittedAt || latestLoan?.createdAt || c.createdAt) : null;

      return {
        id: c.id,
        fullName: c.fullName,
        mobile: c.mobile,
        email: c.email,
        address: c.address,
        state: c.state,
        city: c.city,
        monthlyIncome: c.monthlyIncome,
        kycStatus: c.kycStatus,
        accountStatus: c.status,
        loanStatus: latestLoan ? latestLoan.status : 'NONE',
        paymentStatus: latestPayment ? latestPayment.status : latestLoan?.paymentStatus || 'NONE',
        latestLoan: latestLoan
          ? {
              id: latestLoan.id,
              applicationNumber: latestLoan.applicationNumber,
              loanType: latestLoan.loanType || 'Personal Loan',
              requestedAmount: latestLoan.requestedAmount,
              approvedAmount: latestLoan.approvedAmount,
              status: latestLoan.status,
              submittedAt: latestLoan.submittedAt || latestLoan.createdAt,
            }
          : null,
        latestPayment: latestPayment
          ? {
              status: latestPayment.status,
              amount: latestPayment.amount,
              transactionRef: latestPayment.transactionRef,
              receiptNumber: latestPayment.receiptNumber,
              paymentDate: latestPayment.paymentDate,
            }
          : null,
        whatsappStatus: latestWa ? latestWa.status : 'NOT_SENT',
        latestWhatsApp: latestWa,
        pendingSince,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });

    return {
      customers: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves all customer records matching a filter without pagination limits
   * specifically used for 'Select All Matching / Select All Pending' bulk messaging.
   * Strictly excludes deactivated or soft-deleted customer accounts.
   */
  async getMatchingCustomers(filters: {
    search?: string;
    kycStatus?: string;
    status?: string;
    state?: string;
    city?: string;
    fromDate?: string;
    toDate?: string;
    domainId?: string;
  }) {
    const where = this.buildCustomerFilterWhere(filters);
    const andWhere = Array.isArray(where.AND) ? [...where.AND] : [];
    andWhere.push({ isDeleted: false, isActive: true, status: { not: 'DEACTIVATED' } });

    const customers = await prisma.customer.findMany({
      where: { AND: andWhere },
      select: {
        id: true,
        fullName: true,
        mobile: true,
        email: true,
        status: true,
        kycStatus: true,
        state: true,
        city: true,
        loans: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            applicationNumber: true,
            status: true,
            requestedAmount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return customers.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      mobile: c.mobile,
      email: c.email,
      status: c.status,
      kycStatus: c.kycStatus,
      state: c.state,
      city: c.city,
      latestLoan: c.loans[0] || null,
    }));
  }

  /**
   * Returns distinct list of states from database, merged with standard Indian states.
   */
  async getDistinctStates() {
    const distinct = await prisma.customer.findMany({
      where: { isDeleted: false },
      select: { state: true },
      distinct: ['state'],
    });

    const dbStates = distinct
      .map((c) => c.state?.trim())
      .filter((s): s is string => Boolean(s && s.length > 0));

    const standardStates = [
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
      'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
      'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
      'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
      'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
      'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Chandigarh'
    ];

    const unique = Array.from(new Set([...dbStates, ...standardStates])).sort();
    return unique;
  }

  /**
   * Generates CSV string for filtered dataset.
   */
  async exportFilteredCustomersCsv(filters: {
    search?: string;
    kycStatus?: string;
    status?: string;
    state?: string;
    city?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const where = this.buildCustomerFilterWhere(filters);

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000,
      include: {
        loans: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { id: true, applicationNumber: true, loanType: true, status: true, requestedAmount: true, submittedAt: true, createdAt: true },
        },
      },
    });

    const headers = [
      'Customer ID',
      'Customer Name',
      'Mobile',
      'Email',
      'State',
      'City',
      'Loan Type',
      'Requested Amount',
      'Application Status',
      'Registration Date',
      'Application Date',
      'Last Updated',
      'Application/Loan ID',
    ];

    const escapeCsv = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = customers.map((c) => {
      const loan = c.loans[0] || null;
      return [
        escapeCsv(c.id),
        escapeCsv(c.fullName),
        escapeCsv(c.mobile),
        escapeCsv(c.email),
        escapeCsv(c.state),
        escapeCsv(c.city),
        escapeCsv(loan?.loanType || 'N/A'),
        loan ? loan.requestedAmount : 0,
        escapeCsv(loan?.status || c.status),
        escapeCsv(c.createdAt.toISOString()),
        escapeCsv(loan?.submittedAt ? loan.submittedAt.toISOString() : (loan ? loan.createdAt.toISOString() : 'N/A')),
        escapeCsv(c.updatedAt.toISOString()),
        escapeCsv(loan?.applicationNumber || 'N/A'),
      ].join(',');
    });

    return headers.join(',') + '\n' + rows.join('\n');
  }

  /**
   * Generates Invoice PDF for a customer.
   */
  async getCustomerInvoicePdf(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        loans: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          take: 1,
        },
      },
    });

    if (!customer || customer.isDeleted) {
      throw new AppError(404, 'Customer record not found');
    }

    const latestLoan = customer.loans[0] || null;
    const latestPayment = customer.payments[0] || null;
    const branding = await prisma.brandingSettings.findUnique({ where: { id: 'default' } });

    const invNum = latestPayment?.receiptNumber || `INV-${customer.mobile.slice(-6)}-${Date.now().toString().slice(-4)}`;
    const amount = latestPayment?.amount || latestLoan?.processingFeeAmount || 1250;
    const paymentStatus = latestPayment ? latestPayment.status : 'PENDING';
    const payDate = latestPayment?.paymentDate || new Date();

    const pdfBuffer = await pdfService.generateInvoicePdf({
      invoiceNumber: invNum,
      invoiceDate: payDate,
      customerName: customer.fullName,
      customerMobile: customer.mobile,
      customerEmail: customer.email,
      customerAddress: `${customer.address}, ${customer.city}, ${customer.state}`,
      applicationNumber: latestLoan?.applicationNumber || `LA-${customer.id.slice(0, 8).toUpperCase()}`,
      loanAccountNumber: latestLoan?.accountNumber || latestLoan?.applicationNumber,
      chargeType: 'Processing & Verification Fee',
      chargeDescription: 'Loan underwriting, identity verification and compliance processing charge',
      amount,
      taxAmount: Math.round(amount * 0.18),
      totalAmount: Math.round(amount * 1.18),
      paymentDate: payDate,
      paymentStatus,
      transactionRef: latestPayment?.transactionRef || 'PENDING_TRANSACTION',
      companyName: branding?.companyName,
      companyAddress: branding?.address,
      companyEmail: branding?.email,
      companyPhone: branding?.phone,
      logoUrl: branding?.logoUrl,
      watermarkLogoUrl: branding?.watermarkLogoUrl,
      invoiceWatermarkEnabled: branding?.invoiceWatermarkEnabled,
      watermarkOpacity: branding?.watermarkOpacity,
      watermarkSize: branding?.watermarkSize,
      watermarkPosition: branding?.watermarkPosition,
      generatedDate: new Date(),
    });

    return {
      filename: `Invoice_${invNum}.pdf`,
      buffer: pdfBuffer,
    };
  }

  /**
   * Generates Approval Letter PDF for a customer.
   */
  async getCustomerApprovalLetterPdf(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        loans: {
          where: {
            status: { in: ['APPROVED', 'ACTIVE', 'DISBURSED'] },
          },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!customer || customer.isDeleted) {
      throw new AppError(404, 'Customer record not found');
    }

    const loan = customer.loans[0];
    if (!loan) {
      throw new AppError(400, 'Customer does not have an approved loan application.');
    }

    const branding = await prisma.brandingSettings.findUnique({ where: { id: 'default' } });

    const approvalNo = loan.approvalNumber || loan.accountNumber || loan.applicationNumber;

    const pdfBuffer = await pdfService.generateApprovalLetterPdf({
      customerName: customer.fullName,
      customerPhone: customer.mobile,
      customerEmail: customer.email,
      customerAddress: customer.address ? `${customer.address}, ${customer.city || ''}, ${customer.state || ''}` : undefined,
      applicationNumber: loan.applicationNumber,
      loanAccountNumber: loan.accountNumber || loan.applicationNumber,
      approvalNumber: approvalNo,
      loanType: loan.loanType || 'Personal Loan',
      approvedAmount: loan.approvedAmount || loan.requestedAmount,
      interestRate: loan.interestRate || 12.0,
      tenureMonths: loan.tenureMonths,
      monthlyEmi: loan.finalEmi || loan.estimatedEmi || 0,
      processingFee: loan.processingFeeAmount || 1250,
      approvalDate: loan.updatedAt,
      panMasked: customer.panMasked || undefined,
      aadhaarMasked: customer.aadhaarMasked || undefined,
      accountHolderName: customer.fullName,
      accountNumberMasked: customer.bankAccountNumber ? `XXXXXX${customer.bankAccountNumber.slice(-4)}` : undefined,
      bankIfsc: customer.bankIfsc || undefined,
      bankName: customer.bankName || undefined,
      kycVerificationId: `MUDFNC/437/907/687`,
      companyName: branding?.companyName,
      companyLegalName: branding?.companyLegalName,
      companyEmail: branding?.email,
      companyPhone: branding?.phone,
      companyAddress: branding?.address,
      companyWebsite: branding?.website,
      authorizedSignatoryName: branding?.authorizedSignatoryName,
      authorizedSignatoryDesignation: branding?.authorizedSignatoryDesignation,
      logoUrl: branding?.logoUrl,
      secondaryLogoUrl: branding?.secondaryLogoUrl,
      approvalLetterHeaderUrl: branding?.approvalLetterHeaderUrl,
      watermarkLogoUrl: branding?.watermarkLogoUrl,
      documentWatermarkEnabled: branding?.documentWatermarkEnabled,
      watermarkOpacity: branding?.watermarkOpacity,
      watermarkSize: branding?.watermarkSize,
      watermarkPosition: branding?.watermarkPosition,
      verificationUrl: `https://loanapprove.com/verify/document/${loan.applicationNumber}`,
    });

    return {
      filename: `Approval_Letter_${loan.applicationNumber}.pdf`,
      buffer: pdfBuffer,
    };
  }

  /**
   * Retrieves complete Customer 360 profile including KYC documents, loans, payments, disbursements,
   * support tickets, and chronological audit history.
   */
  async getCustomer360(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        documents: {
          where: { isCurrentVersion: true },
          orderBy: { uploadedAt: 'desc' },
        },
        loans: {
          orderBy: { createdAt: 'desc' },
          include: {
            agreement: true,
            disbursements: true,
            payments: true,
          },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
        disbursements: {
          orderBy: { disbursedAt: 'desc' },
        },
        supportTickets: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer || customer.isDeleted) {
      throw new AppError(404, 'Customer account not found');
    }

    // Collect all related entity IDs to build complete chronological timeline
    const loanIds = customer.loans.map((l) => l.id);
    const docIds = customer.documents.map((d) => d.id);
    const paymentIds = customer.payments.map((p) => p.id);
    const disbursementIds = customer.disbursements.map((d) => d.id);

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { entity: 'Customer', entityId: customer.id },
          { entity: 'LoanApplication', entityId: { in: loanIds } },
          { entity: 'LoanDocument', entityId: { in: docIds } },
          { entity: 'Payment', entityId: { in: paymentIds } },
          { entity: 'Disbursement', entityId: { in: disbursementIds } },
        ],
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    const latestLoan = customer.loans[0] || null;
    const isPending =
      customer.kycStatus === 'PENDING' ||
      customer.kycStatus === 'UNDER_REVIEW' ||
      (latestLoan && ['SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_REQUIRED', 'ON_HOLD'].includes(latestLoan.status));
    const pendingSince = isPending ? (latestLoan?.submittedAt || latestLoan?.createdAt || customer.createdAt) : null;

    return {
      customer: {
        id: customer.id,
        fullName: customer.fullName,
        fatherName: customer.fatherName,
        gender: customer.gender,
        dob: customer.dob,
        mobile: customer.mobile,
        email: customer.email,
        address: customer.address,
        state: customer.state,
        city: customer.city,
        pincode: customer.pincode,
        monthlyIncome: customer.monthlyIncome,
        aadhaarMasked: customer.aadhaarMasked,
        panMasked: customer.panMasked,
        bankName: customer.bankName,
        bankAccountNumber: customer.bankAccountNumber,
        bankIfsc: customer.bankIfsc,
        bankBranch: customer.bankBranch,
        bankAccountType: customer.bankAccountType,
        kycStatus: customer.kycStatus,
        status: customer.status,
        pendingSince,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      },
      documents: customer.documents.map((d) => ({
        id: d.id,
        documentType: d.documentType,
        fileName: d.fileName,
        fileUrl: d.fileUrl,
        fileSize: d.fileSize,
        mimeType: d.mimeType,
        status: d.status,
        rejectionReason: d.rejectionReason,
        version: d.version,
        uploadedAt: d.uploadedAt,
      })),
      loans: customer.loans.map((l) => ({
        id: l.id,
        applicationNumber: l.applicationNumber,
        requestedAmount: l.requestedAmount,
        proposedAmount: l.proposedAmount,
        approvedAmount: l.approvedAmount,
        acceptedAmount: l.acceptedAmount,
        tenureMonths: l.tenureMonths,
        estimatedEmi: l.finalEmi || l.estimatedEmi,
        purpose: l.purpose,
        status: l.status,
        paymentStatus: l.paymentStatus,
        rejectionReason: l.rejectionReason,
        holdReason: l.holdReason,
        submittedAt: l.submittedAt,
        agreement: l.agreement
          ? {
              status: l.agreement.acceptanceStatus,
              acceptedAt: l.agreement.acceptedAt,
            }
          : null,
      })),
      payments: customer.payments.map((p) => ({
        id: p.id,
        loanId: p.loanId,
        amount: p.amount,
        utr: p.transactionRef,
        receiptNumber: p.receiptNumber,
        paymentMethod: p.paymentMethod,
        status: p.status,
        rejectionReason: p.rejectionReason,
        submittedAt: p.paymentDate,
        verifiedAt: p.verifiedAt,
        verifiedBy: p.verifiedBy,
      })),
      disbursements: customer.disbursements.map((d) => ({
        id: d.id,
        loanId: d.loanId,
        amount: d.amount,
        method: d.method,
        referenceId: d.referenceId,
        status: d.status,
        notes: d.notes,
        disbursedAt: d.disbursedAt,
      })),
      supportTickets: customer.supportTickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        message: t.message,
        status: t.status,
        adminReply: t.adminReply,
        createdAt: t.createdAt,
      })),
      timeline: auditLogs.map((a) => ({
        id: a.id,
        action: a.action,
        actorType: a.actorType,
        actorName: a.actorName,
        entity: a.entity,
        entityId: a.entityId,
        timestamp: a.timestamp,
        ipAddress: a.ipAddress,
        details: a.newValue ? JSON.parse(a.newValue) : null,
      })),
    };
  }
  /**
   * Manually creates a new customer profile and associated loan application from the admin console.
   */
  async manualCreateCustomer(data: {
    fullName: string;
    fatherName?: string;
    mobile: string;
    email: string;
    gender?: string;
    dob?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    aadhaar?: string;
    pan?: string;
    bankName?: string;
    accountHolder?: string;
    accountNumber?: string;
    ifsc?: string;
    branch?: string;
    accountType?: string;
    loanType?: string;
    requestedAmount: number;
    approvedAmount?: number;
    interestRate?: number;
    tenureMonths: number;
    estimatedEmi?: number;
    status?: string;
  }, adminUser?: { id?: string; email?: string }) {
    const existing = await prisma.customer.findUnique({
      where: { mobile: data.mobile },
    });

    if (existing) {
      throw new AppError(400, `A customer with mobile number ${data.mobile} already exists.`);
    }

    const aadhaarMasked = data.aadhaar ? `XXXX XXXX ${data.aadhaar.replace(/\D/g, '').slice(-4)}` : 'XXXX XXXX 0000';
    const panMasked = data.pan ? `XXXXX${data.pan.replace(/\s+/g, '').toUpperCase().slice(-4)}` : undefined;

    const customer = await prisma.customer.create({
      data: {
        fullName: data.fullName,
        fatherName: data.fatherName,
        mobile: data.mobile,
        email: data.email,
        gender: data.gender || 'Male',
        dob: data.dob || undefined,
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        pincode: data.pincode || '',
        aadhaarMasked,
        aadhaarEncrypted: data.aadhaar ? Buffer.from(data.aadhaar).toString('base64') : 'N/A',
        panMasked,
        panEncrypted: data.pan ? Buffer.from(data.pan).toString('base64') : undefined,
        bankName: data.bankName,
        bankAccountNumber: data.accountNumber,
        bankIfsc: data.ifsc,
        bankBranch: data.branch,
        bankAccountType: data.accountType || 'SAVINGS',
        monthlyIncome: 45000,
        kycStatus: ['APPROVED', 'ACTIVE', 'DISBURSED'].includes(data.status || '') ? 'VERIFIED' : 'SUBMITTED',
        status: 'ACTIVE',
      },
    });

    // Create loan application
    const appNum = `LN${Date.now().toString()}`;
    const accNum = `ACC${Math.floor(10000000 + Math.random() * 90000000)}`;
    const loanStatus = data.status || 'SUBMITTED';
    const approvedAmt = ['APPROVED', 'ACTIVE', 'DISBURSED'].includes(loanStatus) ? (data.approvedAmount || data.requestedAmount) : null;
    const emi = data.estimatedEmi || Math.round(data.requestedAmount / (data.tenureMonths || 12));
    const totalPayable = emi * (data.tenureMonths || 12);

    const loan = await prisma.loanApplication.create({
      data: {
        customerId: customer.id,
        applicationNumber: appNum,
        accountNumber: accNum,
        loanType: data.loanType || 'Personal Loan',
        purpose: data.loanType || 'Personal Loan',
        requestedAmount: data.requestedAmount,
        approvedAmount: approvedAmt,
        proposedAmount: approvedAmt,
        acceptedAmount: approvedAmt,
        tenureMonths: data.tenureMonths,
        interestRate: data.interestRate || 12.0,
        estimatedEmi: emi,
        finalEmi: emi,
        totalPayable,
        remainingBalance: approvedAmt || data.requestedAmount,
        status: loanStatus,
        paymentStatus: ['APPROVED', 'ACTIVE', 'DISBURSED'].includes(loanStatus) ? 'PAID' : 'PENDING',
        submittedAt: new Date(),
        reviewedAt: ['APPROVED', 'ACTIVE', 'DISBURSED'].includes(loanStatus) ? new Date() : undefined,
        reviewedBy: ['APPROVED', 'ACTIVE', 'DISBURSED'].includes(loanStatus) ? (adminUser?.email || 'admin') : undefined,
        disbursementDate: loanStatus === 'DISBURSED' ? new Date() : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'MANUAL_CUSTOMER_CREATION',
        actorType: 'ADMIN',
        actorId: adminUser?.id || 'admin',
        actorName: adminUser?.email || 'Admin',
        entity: 'Customer',
        entityId: customer.id,
        newValue: JSON.stringify({ customerId: customer.id, loanId: loan.id, applicationNumber: appNum }),
      },
    });

    return { customer, loan };
  }

  /**
   * Deactivate/soft-delete a customer account.
   * Disables login while preserving all financial, KYC, payment, and loan records.
   */
  async deactivateCustomer(
    customerId: string,
    reason?: string,
    actor?: { id: string; fullName: string; email: string },
    ipAddress?: string
  ) {
    const existing = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!existing || existing.isDeleted) {
      throw new AppError(404, 'Customer record not found');
    }

    const previousValue = {
      status: existing.status,
      isActive: existing.isActive,
      deletedAt: existing.deletedAt,
    };

    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: {
        status: 'DEACTIVATED',
        isActive: false,
        deletedAt: new Date(),
      },
    });

    await auditService.record({
      actorType: 'ADMIN',
      actorId: actor?.id,
      actorName: actor?.fullName || actor?.email || 'System Admin',
      action: 'CUSTOMER_ACCOUNT_DEACTIVATED',
      entity: 'Customer',
      entityId: customerId,
      previousValue,
      newValue: {
        status: 'DEACTIVATED',
        isActive: false,
        reason: reason || 'Administrative Deactivation',
      },
      ipAddress,
    });

    return updated;
  }

  /**
   * Reactivate a previously deactivated customer account.
   * Restores login access while maintaining all historical records intact.
   */
  async reactivateCustomer(
    customerId: string,
    actor?: { id: string; fullName: string; email: string },
    ipAddress?: string
  ) {
    const existing = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!existing || existing.isDeleted) {
      throw new AppError(404, 'Customer record not found');
    }

    const previousValue = {
      status: existing.status,
      isActive: existing.isActive,
      deletedAt: existing.deletedAt,
    };

    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: {
        status: 'ACTIVE',
        isActive: true,
        deletedAt: null,
      },
    });

    await auditService.record({
      actorType: 'ADMIN',
      actorId: actor?.id,
      actorName: actor?.fullName || actor?.email || 'System Admin',
      action: 'CUSTOMER_ACCOUNT_REACTIVATED',
      entity: 'Customer',
      entityId: customerId,
      previousValue,
      newValue: {
        status: 'ACTIVE',
        isActive: true,
      },
      ipAddress,
    });

    return updated;
  }
}

export const adminCustomerService = new AdminCustomerService();

