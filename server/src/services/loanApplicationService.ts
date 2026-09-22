import crypto from 'crypto';
import { prisma } from './db';
import { auditService } from './auditService';
import { pdfService } from './pdfService';
import { emailService } from './emailService';
import { whatsappService } from './whatsappService';
import { storageProvider } from '../providers/storage';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedUser } from '../middleware/authMiddleware';
import {
  CreateLoanApplicationInput,
  AdminFilterInput,
  RequestDocumentsInput,
} from '../validators/loanApplicationValidators';
import { Prisma } from '@prisma/client';

export class LoanApplicationService {
  /**
   * Generates a unique sequential human-readable application number.
   * Format: LA-YYYY-XXXXXX (e.g. LA-2026-000001)
   */
  async generateApplicationNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const count = await prisma.loanApplication.count();
    let sequence = count + 1;
    let applicationNumber = `LA-${currentYear}-${String(sequence).padStart(6, '0')}`;

    // Concurrency guarantee: check and increment if collision occurs
    while (await prisma.loanApplication.findUnique({ where: { applicationNumber } })) {
      sequence += 1;
      applicationNumber = `LA-${currentYear}-${String(sequence).padStart(6, '0')}`;
    }

    return applicationNumber;
  }

  /**
   * Creates and submits a new loan application on behalf of the authenticated customer.
   */
  async createApplication(
    customerId: string,
    input: CreateLoanApplicationInput,
    actor: AuthenticatedUser,
    ipAddress?: string
  ) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, fullName: true, status: true, isDeleted: true, domainId: true, kycStatus: true },
    });

    if (!customer || customer.isDeleted) {
      throw new AppError(404, 'Customer account not found');
    }

    if (customer.status !== 'ACTIVE') {
      throw new AppError(403, 'Customer account is suspended');
    }

    // Enforce "KYC Required Before Loan Application"
    if (customer.kycStatus !== 'APPROVED' && customer.kycStatus !== 'VERIFIED') {
      throw new AppError(
        403,
        'KYC approval is required before applying for a loan.',
        'KYC_REQUIRED'
      );
    }

    // Enforce "One Mobile = One Customer = One Active Loan Application"
    const activeExistingApplication = await prisma.loanApplication.findFirst({
      where: {
        customerId: customer.id,
        status: {
          in: [
            'SUBMITTED',
            'PENDING',
            'UNDER_REVIEW',
            'APPROVED',
            'OFFER_PENDING_CUSTOMER',
            'OFFER_ACCEPTED',
            'ACTIVE',
            'DOCUMENTS_REQUIRED',
            'ON_HOLD',
          ],
        },
      },
    });

    if (activeExistingApplication) {
      throw new AppError(
        409,
        `You already have an active loan application (#${activeExistingApplication.applicationNumber}) currently in progress. Only one active loan application is permitted at a time.`,
        'ACTIVE_APPLICATION_EXISTS'
      );
    }

    // Check if an existing DRAFT application exists (e.g. created as placeholder by KYC fee payment)
    const draftApplication = await prisma.loanApplication.findFirst({
      where: {
        customerId: customer.id,
        status: 'DRAFT',
      },
    });

    const now = new Date();
    let application;

    if (draftApplication) {
      application = await prisma.loanApplication.update({
        where: { id: draftApplication.id },
        data: {
          requestedAmount: Number(input.amount.toFixed(2)),
          tenureMonths: input.tenureMonths,
          purpose: input.purpose.trim(),
          status: 'SUBMITTED',
          submittedAt: now,
          ...(customer.domainId ? { domainId: customer.domainId } : {}),
        },
        select: {
          id: true,
          applicationNumber: true,
          customerId: true,
          requestedAmount: true,
          proposedAmount: true,
          approvedAmount: true,
          acceptedAmount: true,
          tenureMonths: true,
          purpose: true,
          status: true,
          submittedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } else {
      const applicationNumber = await this.generateApplicationNumber();
      application = await prisma.loanApplication.create({
        data: {
          applicationNumber,
          customerId: customer.id,
          requestedAmount: Number(input.amount.toFixed(2)),
          tenureMonths: input.tenureMonths,
          purpose: input.purpose.trim(),
          status: 'SUBMITTED',
          submittedAt: now,
          estimatedEmi: 0,
          // Propagate the customer's domain origin to the loan application
          ...(customer.domainId ? { domainId: customer.domainId } : {}),
        },
        select: {
          id: true,
          applicationNumber: true,
          customerId: true,
          requestedAmount: true,
          proposedAmount: true,
          approvedAmount: true,
          acceptedAmount: true,
          tenureMonths: true,
          purpose: true,
          status: true,
          submittedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    // Record audit events
    await auditService.record({
      actorType: 'CUSTOMER',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'APPLICATION_CREATED',
      entity: 'LoanApplication',
      entityId: application.id,
      newValue: {
        applicationNumber: application.applicationNumber,
        requestedAmount: application.requestedAmount,
        tenureMonths: application.tenureMonths,
        purpose: application.purpose,
      },
      ipAddress,
    });

    await auditService.record({
      actorType: 'CUSTOMER',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'APPLICATION_SUBMITTED',
      entity: 'LoanApplication',
      entityId: application.id,
      newValue: {
        status: 'SUBMITTED',
        submittedAt: now.toISOString(),
      },
      ipAddress,
    });

    return application;
  }

  /**
   * Retrieves all applications belonging to the authenticated customer.
   */
  async getCustomerApplications(customerId: string) {
    const applications = await prisma.loanApplication.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        applicationNumber: true,
        requestedAmount: true,
        proposedAmount: true,
        approvedAmount: true,
        acceptedAmount: true,
        tenureMonths: true,
        purpose: true,
        status: true,
        submittedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return applications;
  }

  /**
   * Retrieves a single loan application for customer with strict IDOR protection.
   */
  async getCustomerApplicationById(customerId: string, loanId: string) {
    const application = await prisma.loanApplication.findUnique({
      where: { id: loanId },
      include: {
        documentRequests: {
          select: {
            id: true,
            documentType: true,
            title: true,
            description: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!application) {
      throw new AppError(404, 'Loan application not found');
    }

    // Strict IDOR Check
    if (application.customerId !== customerId) {
      throw new AppError(403, 'Access denied: You do not have permission to view this loan application');
    }

    return {
      id: application.id,
      applicationNumber: application.applicationNumber,
      requestedAmount: application.requestedAmount,
      proposedAmount: application.proposedAmount,
      approvedAmount: application.approvedAmount,
      acceptedAmount: application.acceptedAmount,
      tenureMonths: application.tenureMonths,
      purpose: application.purpose,
      status: application.status,
      rejectionReason: application.status === 'REJECTED' ? application.rejectionReason : null,
      holdReason: application.status === 'ON_HOLD' ? application.holdReason : null,
      docRequestReason: application.status === 'DOCUMENTS_REQUIRED' ? application.docRequestReason : null,
      modifiedOfferAccepted: application.modifiedOfferAccepted,
      submittedAt: application.submittedAt,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      documentRequests: application.documentRequests,
    };
  }

  /**
   * Customer accepts admin-proposed offer amount.
   */
  async acceptOffer(
    customerId: string,
    loanId: string,
    actor: AuthenticatedUser,
    ipAddress?: string
  ) {
    const application = await prisma.loanApplication.findUnique({
      where: { id: loanId },
    });

    if (!application) {
      throw new AppError(404, 'Loan application not found');
    }

    // IDOR Check
    if (application.customerId !== customerId) {
      throw new AppError(403, 'Access denied: You do not have permission to modify this loan application');
    }

    if (application.status !== 'OFFER_PENDING_CUSTOMER') {
      throw new AppError(
        400,
        `Cannot accept offer: Application status is currently ${application.status}`
      );
    }

    if (!application.proposedAmount || application.proposedAmount <= 0) {
      throw new AppError(400, 'Invalid offer: No valid proposed amount found on application');
    }

    const previousValue = {
      status: application.status,
      proposedAmount: application.proposedAmount,
      acceptedAmount: application.acceptedAmount,
    };

    const updated = await prisma.loanApplication.update({
      where: { id: loanId },
      data: {
        status: 'OFFER_ACCEPTED',
        acceptedAmount: application.proposedAmount,
        approvedAmount: application.proposedAmount,
        modifiedOfferAccepted: true,
      },
      select: {
        id: true,
        applicationNumber: true,
        requestedAmount: true,
        proposedAmount: true,
        approvedAmount: true,
        acceptedAmount: true,
        status: true,
        modifiedOfferAccepted: true,
        updatedAt: true,
      },
    });

    await auditService.record({
      actorType: 'CUSTOMER',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'OFFER_ACCEPTED',
      entity: 'LoanApplication',
      entityId: application.id,
      previousValue,
      newValue: {
        status: updated.status,
        acceptedAmount: updated.acceptedAmount,
      },
      ipAddress,
    });

    return updated;
  }

  /**
   * Customer rejects admin-proposed offer amount.
   */
  async rejectOffer(
    customerId: string,
    loanId: string,
    actor: AuthenticatedUser,
    ipAddress?: string
  ) {
    const application = await prisma.loanApplication.findUnique({
      where: { id: loanId },
    });

    if (!application) {
      throw new AppError(404, 'Loan application not found');
    }

    // IDOR Check
    if (application.customerId !== customerId) {
      throw new AppError(403, 'Access denied: You do not have permission to modify this loan application');
    }

    if (application.status !== 'OFFER_PENDING_CUSTOMER') {
      throw new AppError(
        400,
        `Cannot reject offer: Application status is currently ${application.status}`
      );
    }

    const previousValue = {
      status: application.status,
      proposedAmount: application.proposedAmount,
    };

    const updated = await prisma.loanApplication.update({
      where: { id: loanId },
      data: {
        status: 'OFFER_REJECTED',
        modifiedOfferAccepted: false,
      },
      select: {
        id: true,
        applicationNumber: true,
        requestedAmount: true,
        proposedAmount: true,
        status: true,
        modifiedOfferAccepted: true,
        updatedAt: true,
      },
    });

    await auditService.record({
      actorType: 'CUSTOMER',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'OFFER_REJECTED',
      entity: 'LoanApplication',
      entityId: application.id,
      previousValue,
      newValue: {
        status: updated.status,
      },
      ipAddress,
    });

    return updated;
  }

  /**
   * Retrieves paginated applications with server-side filters and search for admins.
   */
  async getAdminApplications(filters: AdminFilterInput) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const where: Prisma.LoanApplicationWhereInput = {};

    // Status filter
    if (filters.status) {
      if ((filters.status as string) === 'PENDING') {
        where.status = {
          in: ['SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_REQUIRED', 'ON_HOLD', 'OFFER_PENDING_CUSTOMER'],
        };
      } else {
        where.status = filters.status as string;
      }
    }

    // State filter (primary location filter)
    if (filters.state && filters.state.trim() && filters.state !== 'ALL') {
      where.customer = {
        ...(where.customer as Prisma.CustomerWhereInput),
        state: { equals: filters.state.trim() },
      };
    } else if (filters.city && filters.city.trim() && filters.city !== 'ALL') {
      where.customer = {
        ...(where.customer as Prisma.CustomerWhereInput),
        city: { contains: filters.city.trim() },
      };
    }

    // Loan Type filter
    if (filters.loanType && filters.loanType.trim() && filters.loanType !== 'ALL') {
      where.loanType = { contains: filters.loanType.trim() };
    }

    // Search filter (applicationNumber, customer name, mobile, email)
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.trim();
      where.OR = [
        { applicationNumber: { contains: searchTerm } },
        { customer: { fullName: { contains: searchTerm } } },
        { customer: { mobile: { contains: searchTerm } } },
        { customer: { email: { contains: searchTerm } } },
      ];
    }

    // Date filters
    if (filters.dateFilter) {
      const now = new Date();
      if (filters.dateFilter === 'TODAY') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        where.createdAt = { gte: startOfDay };
      } else if (filters.dateFilter === 'YESTERDAY') {
        const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        where.createdAt = { gte: startOfYesterday, lt: endOfYesterday };
      } else if (filters.dateFilter === 'LAST_7_DAYS') {
        const past7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        where.createdAt = { gte: past7Days };
      } else if (filters.dateFilter === 'LAST_30_DAYS') {
        const past30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        where.createdAt = { gte: past30Days };
      } else if (filters.dateFilter === 'CUSTOM') {
        const dateCondition: Prisma.DateTimeFilter = {};
        if (filters.startDate) {
          dateCondition.gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          const endDateObj = new Date(filters.endDate);
          endDateObj.setHours(23, 59, 59, 999);
          dateCondition.lte = endDateObj;
        }
        if (Object.keys(dateCondition).length > 0) {
          where.createdAt = dateCondition;
        }
      }
    }

    const [total, applications] = await Promise.all([
      prisma.loanApplication.count({ where }),
      prisma.loanApplication.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              mobile: true,
              email: true,
              state: true,
              city: true,
              kycStatus: true,
            },
          },
        },
      }),
    ]);

    return {
      data: applications.map((app) => ({
        id: app.id,
        applicationNumber: app.applicationNumber,
        customerId: app.customerId,
        customerName: app.customer.fullName,
        mobile: app.customer.mobile,
        email: app.customer.email,
        state: app.customer.state,
        city: app.customer.city,
        kycStatus: app.customer.kycStatus,
        requestedAmount: app.requestedAmount,
        proposedAmount: app.proposedAmount,
        approvedAmount: app.approvedAmount,
        acceptedAmount: app.acceptedAmount,
        tenureMonths: app.tenureMonths,
        purpose: app.purpose,
        loanType: app.loanType || 'Personal Loan',
        status: app.status,
        submittedAt: app.submittedAt,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  /**
   * Retrieves complete loan application details for admin review.
   */
  async getAdminApplicationById(loanId: string) {
    const application = await prisma.loanApplication.findUnique({
      where: { id: loanId },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            mobile: true,
            email: true,
            address: true,
            state: true,
            city: true,
            monthlyIncome: true,
            aadhaarMasked: true,
            kycStatus: true,
            status: true,
            createdAt: true,
          },
        },
        documents: {
          where: { isCurrentVersion: true },
          select: {
            id: true,
            documentType: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            status: true,
            uploadedAt: true,
          },
        },
        documentRequests: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            documentType: true,
            title: true,
            description: true,
            status: true,
            requestedBy: true,
            createdAt: true,
          },
        },
      },
    });

    if (!application) {
      throw new AppError(404, 'Loan application not found');
    }

    // Query application payments and customer-level KYC payments
    const [allPayments, charges, invoices] = await Promise.all([
      prisma.payment.findMany({
        where: {
          OR: [
            { loanId: application.id },
            { customerId: application.customerId },
          ],
        },
        orderBy: { paymentDate: 'desc' },
      }),
      prisma.charge.findMany({
        where: {
          OR: [
            { loanId: application.id },
            { customerId: application.customerId },
          ],
        },
      }),
      prisma.invoice.findMany({
        where: { customerId: application.customerId },
        orderBy: { issuedAt: 'desc' },
      }),
    ]);

    const chargeMap = new Map(charges.map((c) => [c.id, c]));
    const invoiceMap = new Map<string, any>();
    for (const inv of invoices) {
      if (inv.chargeId) invoiceMap.set(inv.chargeId, inv);
      if (inv.paymentId) invoiceMap.set(inv.paymentId, inv);
    }

    const applicationPayments: any[] = [];
    const customerPayments: any[] = [];

    const formattedPayments = allPayments.map((p) => {
      const associatedCharge = p.chargeId ? chargeMap.get(p.chargeId) : null;
      const associatedInvoice =
        (p.chargeId ? invoiceMap.get(p.chargeId) : null) ||
        invoiceMap.get(p.id);

      const chargeType =
        associatedCharge?.name ||
        p.notes ||
        (p.paymentType === 'KYC_VERIFICATION'
          ? 'KYC Verification Charge'
          : p.paymentType === 'PROCESSING_FEE'
          ? 'Processing Fee'
          : p.paymentType);

      const formatted = {
        id: p.id,
        loanId: p.loanId,
        customerId: p.customerId,
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        paymentType: p.paymentType,
        chargeType,
        transactionRef: p.transactionRef,
        utr: p.transactionRef, // exact UTR
        receiptNumber: p.receiptNumber,
        status: p.status,
        submittedAt: p.submittedAt || p.paymentDate,
        paymentDate: p.paymentDate,
        verifiedAt: p.verifiedAt,
        verifiedBy: p.verifiedBy,
        rejectionReason: p.rejectionReason,
        notes: p.notes,
        invoiceId: associatedInvoice?.id || null,
        invoiceNumber: associatedInvoice?.invoiceNumber || null,
        invoiceUrl: associatedInvoice
          ? `/api/customer/invoices/${associatedInvoice.id}/pdf`
          : null,
      };

      if (
        p.paymentType === 'KYC_VERIFICATION' ||
        chargeType.toLowerCase().includes('kyc') ||
        p.loanId !== application.id
      ) {
        customerPayments.push(formatted);
      } else {
        applicationPayments.push(formatted);
      }

      return formatted;
    });

    return {
      ...application,
      payments: formattedPayments,
      applicationPayments,
      customerPayments,
      invoices,
    };
  }

  /**
   * Admin starts review on an application: SUBMITTED -> UNDER_REVIEW.
   */
  async startReview(loanId: string, actor: AuthenticatedUser, ipAddress?: string) {
    const application = await prisma.loanApplication.findUnique({
      where: { id: loanId },
    });

    if (!application) {
      throw new AppError(404, 'Loan application not found');
    }

    const allowedStatuses = ['SUBMITTED', 'DOCUMENTS_REQUIRED', 'ON_HOLD'];
    if (!allowedStatuses.includes(application.status)) {
      throw new AppError(
        400,
        `Cannot transition to UNDER_REVIEW from status ${application.status}`
      );
    }

    const previousValue = {
      status: application.status,
      reviewedBy: application.reviewedBy,
      reviewedAt: application.reviewedAt,
    };

    const now = new Date();
    const updated = await prisma.loanApplication.update({
      where: { id: loanId },
      data: {
        status: 'UNDER_REVIEW',
        reviewedBy: actor.fullName,
        reviewedAt: now,
      },
    });

    await auditService.record({
      actorType: 'ADMIN',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'APPLICATION_REVIEW_STARTED',
      entity: 'LoanApplication',
      entityId: application.id,
      previousValue,
      newValue: {
        status: updated.status,
        reviewedBy: updated.reviewedBy,
        reviewedAt: now.toISOString(),
      },
      ipAddress,
    });

    return updated;
  }

  /**
   * Admin requests additional documents: UNDER_REVIEW -> DOCUMENTS_REQUIRED.
   * Directly reuses Phase 3 DocumentRequest system linked to loanId.
   */
  async requestDocuments(
    loanId: string,
    actor: AuthenticatedUser,
    input: RequestDocumentsInput,
    ipAddress?: string
  ) {
    const application = await prisma.loanApplication.findUnique({
      where: { id: loanId },
    });

    if (!application) {
      throw new AppError(404, 'Loan application not found');
    }

    if (application.status === 'SUBMITTED') {
      await this.startReview(loanId, actor, ipAddress);
      application.status = 'UNDER_REVIEW';
    } else if (application.status !== 'UNDER_REVIEW') {
      throw new AppError(
        400,
        `Cannot request documents: Application must be UNDER_REVIEW (current: ${application.status})`
      );
    }

    const docReason = input.description ? `${input.title}: ${input.description}` : input.title;

    // Create DocumentRequest linked to loanId and customerId
    const documentRequest = await prisma.documentRequest.create({
      data: {
        customerId: application.customerId,
        loanId: application.id,
        documentType: input.documentType,
        title: input.title,
        description: input.description,
        status: 'PENDING',
        requestedBy: actor.fullName,
      },
    });

    const updated = await prisma.loanApplication.update({
      where: { id: loanId },
      data: {
        status: 'DOCUMENTS_REQUIRED',
        docRequestReason: docReason,
      },
    });

    await auditService.record({
      actorType: 'ADMIN',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'DOCUMENTS_REQUESTED',
      entity: 'LoanApplication',
      entityId: application.id,
      previousValue: { status: application.status },
      newValue: {
        status: updated.status,
        documentRequestId: documentRequest.id,
        documentType: input.documentType,
        title: input.title,
      },
      ipAddress,
    });

    return {
      application: updated,
      documentRequest,
    };
  }

  /**
   * Admin puts application on hold: UNDER_REVIEW -> ON_HOLD.
   */
  async putOnHold(
    loanId: string,
    actor: AuthenticatedUser,
    holdReason: string,
    ipAddress?: string
  ) {
    const application = await prisma.loanApplication.findUnique({
      where: { id: loanId },
    });

    if (!application) {
      throw new AppError(404, 'Loan application not found');
    }

    if (application.status === 'SUBMITTED') {
      await this.startReview(loanId, actor, ipAddress);
      application.status = 'UNDER_REVIEW';
    } else if (application.status !== 'UNDER_REVIEW') {
      throw new AppError(
        400,
        `Cannot put on hold: Application must be UNDER_REVIEW (current: ${application.status})`
      );
    }

    const updated = await prisma.loanApplication.update({
      where: { id: loanId },
      data: {
        status: 'ON_HOLD',
        holdReason: holdReason.trim(),
      },
    });

    await auditService.record({
      actorType: 'ADMIN',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'APPLICATION_ON_HOLD',
      entity: 'LoanApplication',
      entityId: application.id,
      previousValue: { status: application.status },
      newValue: {
        status: updated.status,
        holdReason: updated.holdReason,
      },
      ipAddress,
    });

    return updated;
  }

  /**
   * Admin rejects application: PENDING/UNDER_REVIEW -> REJECTED.
   */
  async rejectApplication(
    loanId: string,
    actor: AuthenticatedUser,
    rejectionReason: string,
    ipAddress?: string
  ) {
    const application = await prisma.loanApplication.findUnique({
      where: { id: loanId },
      include: { customer: true },
    });

    if (!application) {
      throw new AppError(404, 'Loan application not found');
    }

    const validStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_REQUIRED', 'ON_HOLD', 'NEW'];
    if (!validStatuses.includes(application.status)) {
      throw new AppError(
        400,
        `Cannot reject: Application status is already ${application.status}`
      );
    }

    const updated = await prisma.loanApplication.update({
      where: { id: loanId },
      data: {
        status: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
        reviewedBy: actor.id,
        reviewedAt: new Date(),
      },
    });

    // Create customer notification
    try {
      await prisma.notification.create({
        data: {
          recipientType: 'CUSTOMER',
          customerId: application.customerId,
          title: 'Loan Application Status Update',
          message: `Dear ${application.customer?.fullName || 'Customer'}, your loan application #${application.applicationNumber} was declined. Reason: ${rejectionReason.trim()}`,
          eventType: 'LOAN_STATUS',
        },
      });

      const commSettings = await prisma.communicationSettings.findUnique({ where: { id: 'default' } });
      const branding = await prisma.brandingSettings.findUnique({ where: { id: 'default' } });
      const companyName = branding?.companyName || 'Your Financial Services';

      if (commSettings?.autoEmailOnLoanRejected) {
        try {
          await emailService.sendSingleEmail(
            {
              customerId: application.customerId,
              loanId: application.id,
              subject: `Update on Loan Application — ${application.applicationNumber}`,
              message: `Dear ${application.customer?.fullName || 'Customer'},\n\nWe regret to inform you that your loan application #${application.applicationNumber} could not be approved at this time.\n\nReason: ${rejectionReason.trim()}\n\nWarm regards,\n${companyName}`,
              templateName: 'LOAN_REJECTED',
            },
            actor,
            ipAddress
          );
        } catch {
          // Ignore email send failure
        }
      }

      if (commSettings?.autoWhatsAppOnLoanRejected) {
        try {
          await whatsappService.sendMessage({
            customerId: application.customerId,
            loanId: application.id,
            message: `Hello ${application.customer?.fullName || 'Customer'}, your loan application #${application.applicationNumber} has been updated to Declined. Reason: ${rejectionReason.trim()}.\n\nRegards,\n${companyName}`,
            templateName: 'LOAN_REJECTED',
            actor,
            ipAddress,
          });
        } catch {
          // Ignore whatsapp send failure
        }
      }
    } catch {
      // Non-critical notification failure ignored
    }

    await auditService.record({
      actorType: 'ADMIN',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'APPLICATION_REJECTED',
      entity: 'LoanApplication',
      entityId: application.id,
      previousValue: { status: application.status },
      newValue: {
        status: updated.status,
        rejectionReason: updated.rejectionReason,
      },
      ipAddress,
    });

    return updated;
  }

  /**
   * Admin approves application: PENDING/UNDER_REVIEW -> APPROVED with full financial parameters.
   */
  async approveApplication(
    loanId: string,
    actor: AuthenticatedUser,
    input: {
      approvedAmount?: number;
      interestRate?: number;
      tenureMonths?: number;
      finalEmi?: number;
      processingFeeAmount?: number;
      insuranceAmount?: number;
      disbursementDate?: string | Date;
      remarks?: string;
    } = {},
    ipAddress?: string
  ) {
    const application = await prisma.loanApplication.findUnique({
      where: { id: loanId },
      include: { customer: true },
    });

    if (!application) {
      throw new AppError(404, 'Loan application not found');
    }

    const validStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_REQUIRED', 'ON_HOLD', 'NEW'];
    if (!validStatuses.includes(application.status)) {
      throw new AppError(
        400,
        `Cannot approve: Application status is already ${application.status}`
      );
    }

    // One Approved Loan Rule Enforcement: Customer can have only one active approved loan
    const existingActiveApproved = await prisma.loanApplication.findFirst({
      where: {
        customerId: application.customerId,
        status: 'APPROVED',
        id: { not: loanId },
      },
    });

    if (existingActiveApproved) {
      throw new AppError(
        400,
        `Customer already has an active approved loan (${existingActiveApproved.applicationNumber}) on file. Policy permits only one active approved loan per customer.`,
        'ACTIVE_LOAN_EXISTS'
      );
    }

    // KYC Gate: Customer must have completed and verified KYC before loan approval
    const customerKyc = application.customer?.kycStatus;
    if (customerKyc !== 'APPROVED' && customerKyc !== 'VERIFIED') {
      throw new AppError(
        400,
        `Cannot approve loan: Customer KYC is not verified (current KYC status: ${customerKyc || 'PENDING'}). Customer must complete KYC verification before loan approval.`
      );
    }

    const approvedAmount = Number(input.approvedAmount || application.proposedAmount || application.requestedAmount);
    const paymentConfig = await prisma.paymentConfig.findUnique({ where: { id: 'default' } });
    const defaultRate = paymentConfig?.defaultInterestRate ?? 12.0;
    const interestRate = Number(input.interestRate ?? application.interestRate ?? defaultRate);
    const tenureMonths = Number(input.tenureMonths ?? application.tenureMonths ?? 12);
    const defaultProcFee = paymentConfig?.processingFeeAmount ?? 0;
    const processingFeeAmount = Number(input.processingFeeAmount ?? application.processingFeeAmount ?? defaultProcFee);
    const insuranceAmount = Number(input.insuranceAmount ?? application.insuranceAmount ?? 0);

    let finalEmi = input.finalEmi;
    if (!finalEmi || finalEmi <= 0) {
      const r = (interestRate / 100) / 12;
      const n = tenureMonths;
      finalEmi = r > 0 ? Math.round((approvedAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)) : Math.round(approvedAmount / n);
    }
    const totalPayable = finalEmi * tenureMonths;
    const accountNumber = application.accountNumber || `LN${Date.now()}`;
    const disbursementDate = input.disbursementDate ? new Date(input.disbursementDate) : new Date();

    const updated = await prisma.loanApplication.update({
      where: { id: loanId },
      data: {
        status: 'APPROVED',
        approvedAmount,
        interestRate,
        tenureMonths,
        finalEmi,
        processingFeeAmount,
        insuranceAmount,
        totalPayable,
        remainingBalance: totalPayable,
        accountNumber,
        approvalNumber: accountNumber,
        disbursementDate,
        reviewedBy: actor.id,
        reviewedAt: new Date(),
      },
    });

    // 1. Create or update VerificationToken for dynamic Approval Letter
    const cleanNum = application.applicationNumber.replace(/[^a-zA-Z0-9]/g, '');
    const verifyToken = `LA-VERIFY-${cleanNum}`;
    try {
      await prisma.verificationToken.upsert({
        where: { token: verifyToken },
        update: {
          customerName: application.customer?.fullName || 'Valued Customer',
          applicationNumber: application.applicationNumber,
          loanAccountNumber: accountNumber,
          approvalDate: new Date(),
          status: 'VERIFIED',
        },
        create: {
          token: verifyToken,
          documentType: 'LOAN_APPROVAL_LETTER',
          entityId: application.id,
          customerName: application.customer?.fullName || 'Valued Customer',
          applicationNumber: application.applicationNumber,
          loanAccountNumber: accountNumber,
          approvalDate: new Date(),
          status: 'VERIFIED',
        },
      });
    } catch {
      // Ignore token creation failure if schema differs
    }

    // 2. Create Customer Notification
    try {
      await prisma.notification.create({
        data: {
          recipientType: 'CUSTOMER',
          customerId: application.customerId,
          title: 'Loan Application Approved',
          message: `Congratulations ${application.customer?.fullName || 'Customer'}! Your loan application #${application.applicationNumber} has been approved for ₹${approvedAmount.toLocaleString('en-IN')}. Monthly EMI: ₹${finalEmi.toLocaleString('en-IN')}.`,
          eventType: 'LOAN_STATUS',
        },
      });
    } catch {
      // Non-critical notification failure ignored
    }

    // 3. Generate EMI Schedule if none exist
    try {
      const existingSchedule = await prisma.eMISchedule.findFirst({ where: { loanId } });
      if (!existingSchedule) {
        const monthlyPrincipal = approvedAmount / tenureMonths;
        const monthlyInterest = (totalPayable - approvedAmount) / tenureMonths;
        for (let i = 1; i <= tenureMonths; i++) {
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + i);
          await prisma.eMISchedule.create({
            data: {
              loanId,
              customerId: application.customerId,
              installmentNumber: i,
              dueDate,
              principalAmount: Math.round(monthlyPrincipal),
              interestAmount: Math.round(monthlyInterest),
              totalAmount: finalEmi,
              paidAmount: 0,
              status: i === 1 ? 'DUE' : 'UPCOMING',
            },
          });
        }
      }
    } catch {
      // Non-critical EMI schedule failure ignored
    }

    // 4. Generate Loan Agreement if none exists
    try {
      const existingAgreement = await prisma.loanAgreement.findUnique({
        where: { loanId },
      });
      if (!existingAgreement) {
        // Fetch branding for dynamic company name in agreement
        const agreementBranding = await prisma.brandingSettings.findUnique({ where: { id: 'default' } });
        const agreementCompany = agreementBranding?.companyName || 'Your Financial Services';
        const agreementHtml = `
          <div class="agreement-document font-sans text-slate-800 p-4">
            <h2 class="text-xl font-bold mb-3">LOAN SANCTION & BORROWER AGREEMENT</h2>
            <p class="text-sm mb-2">Executed on <strong>${new Date().toLocaleDateString('en-IN')}</strong> between <strong>${agreementCompany}</strong> and <strong>${application.customer?.fullName}</strong>.</p>
            <div class="grid grid-cols-2 gap-2 my-4 p-3 bg-slate-50 border rounded text-xs">
              <div><strong>Application No:</strong> ${application.applicationNumber}</div>
              <div><strong>Sanctioned Amount:</strong> ₹${approvedAmount.toLocaleString('en-IN')}</div>
              <div><strong>Tenure:</strong> ${tenureMonths} Months</div>
              <div><strong>Monthly EMI:</strong> ₹${finalEmi.toLocaleString('en-IN')}</div>
              <div><strong>Interest Rate:</strong> ${interestRate}%</div>
            </div>
          </div>
        `;
        await prisma.loanAgreement.create({
          data: {
            loanId,
            customerId: application.customerId,
            agreementVersion: 'v1.0',
            agreementContentHtml: agreementHtml,
            acceptanceStatus: 'PENDING',
          },
        });
      }
    } catch {
      // Non-critical loan agreement creation failure ignored
    }

    // 5. Generate and Persist Approval Letter PDF automatically
    let approvalDoc = null;
    let approvalPdfBuffer: Buffer | null = null;
    try {
      const branding = await prisma.brandingSettings.findUnique({ where: { id: 'default' } });
      
      approvalPdfBuffer = await pdfService.generateApprovalLetterPdf({
        customerName: application.customer?.fullName || 'Customer',
        customerPhone: application.customer?.mobile,
        customerEmail: application.customer?.email,
        customerAddress: application.customer?.address ? `${application.customer.address}, ${application.customer.city || ''}, ${application.customer.state || ''}` : undefined,
        applicationNumber: application.applicationNumber,
        loanAccountNumber: accountNumber,
        approvalNumber: accountNumber,
        loanType: application.loanType || 'Personal Loan',
        approvedAmount,
        interestRate,
        tenureMonths,
        monthlyEmi: finalEmi,
        processingFee: processingFeeAmount,
        approvalDate: new Date(),
        disbursementDate,
        panMasked: application.customer?.panMasked || undefined,
        aadhaarMasked: application.customer?.aadhaarMasked || undefined,
        accountHolderName: application.customer?.fullName,
        accountNumberMasked: application.customer?.bankAccountNumber ? `XXXXXX${application.customer.bankAccountNumber.slice(-4)}` : undefined,
        bankIfsc: application.customer?.bankIfsc || undefined,
        bankName: application.customer?.bankName || undefined,
        kycVerificationId: `KYC-VERIFIED-${cleanNum}`,
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
        verificationUrl: `https://loanapprove.com/verify/document/${application.applicationNumber}`,
      });

      const uniqueFileId = crypto.randomUUID();
      const storageKey = `documents/${application.customerId}/APPROVAL_LETTER/${application.id}-v1.pdf`;
      const storageResult = await storageProvider.saveFile(
        storageKey,
        approvalPdfBuffer,
        'application/pdf'
      );

      // Check existing document
      const existingDoc = await prisma.loanDocument.findFirst({
        where: {
          loanId: application.id,
          documentType: 'APPROVAL_LETTER',
          isCurrentVersion: true,
        },
      });

      if (existingDoc) {
        approvalDoc = await prisma.loanDocument.update({
          where: { id: existingDoc.id },
          data: {
            storageKey: storageResult.storageKey,
            filePath: storageResult.filePath,
            fileSize: storageResult.fileSize,
            status: 'APPROVED',
            reviewedBy: actor.fullName,
            reviewedAt: new Date(),
          },
        });
      } else {
        approvalDoc = await prisma.loanDocument.create({
          data: {
            id: uniqueFileId,
            customerId: application.customerId,
            loanId: application.id,
            documentType: 'APPROVAL_LETTER',
            fileName: `Approval_Letter_${accountNumber}.pdf`,
            originalFileName: `Approval_Letter_${accountNumber}.pdf`,
            storageKey: storageResult.storageKey,
            filePath: storageResult.filePath,
            fileUrl: `/api/customer/documents/${uniqueFileId}/file`,
            mimeType: 'application/pdf',
            fileSize: storageResult.fileSize,
            status: 'APPROVED',
            version: 1,
            isCurrentVersion: true,
            reviewedBy: actor.fullName,
            reviewedAt: new Date(),
          },
        });
      }

      // Secondary notification for Approval Letter availability
      await prisma.notification.create({
        data: {
          recipientType: 'CUSTOMER',
          customerId: application.customerId,
          title: 'Approval Letter Available',
          message: `Your official Loan Sanction & Approval Letter (${accountNumber}) is ready for download in your Document Center.`,
          eventType: 'APPROVAL_LETTER_AVAILABLE',
        },
      });
    } catch (docErr) {
      console.error('[ApprovalLetter] Failed to persist approval letter document:', docErr);
    }

    // 6. Automated Email & WhatsApp communication
    try {
      const commSettings = await prisma.communicationSettings.findUnique({ where: { id: 'default' } });
      const branding = await prisma.brandingSettings.findUnique({ where: { id: 'default' } });
      const companyName = branding?.companyName || 'Your Financial Services';

      if (commSettings?.autoEmailOnLoanApproved) {
        try {
          await emailService.sendSingleEmail(
            {
              customerId: application.customerId,
              loanId: application.id,
              subject: `Loan Application Approved — ${application.applicationNumber}`,
              message: `Dear ${application.customer?.fullName || 'Customer'},\n\nCongratulations! Your loan application #${application.applicationNumber} has been officially approved for ₹${approvedAmount.toLocaleString('en-IN')}.\n\nMonthly EMI: ₹${finalEmi.toLocaleString('en-IN')}\nTenure: ${tenureMonths} Months\nApproval Number: ${accountNumber}\n\nPlease find your official Loan Approval Letter attached.\n\nWarm regards,\n${companyName}`,
              templateName: 'LOAN_APPROVED',
              attachments: approvalPdfBuffer
                ? [{ filename: `Approval_Letter_${accountNumber}.pdf`, content: approvalPdfBuffer }]
                : undefined,
            },
            actor,
            ipAddress
          );
        } catch {
          // Ignore email send failure
        }
      }

      if (commSettings?.autoWhatsAppOnLoanApproved) {
        try {
          await whatsappService.sendMessage({
            customerId: application.customerId,
            loanId: application.id,
            message: `Hello ${application.customer?.fullName || 'Customer'}, congratulations! Your loan #${application.applicationNumber} for ₹${approvedAmount.toLocaleString('en-IN')} is APPROVED. Monthly EMI: ₹${finalEmi.toLocaleString('en-IN')}. Please log in to download your official approval letter.\n\nRegards,\n${companyName}`,
            templateName: 'LOAN_APPROVED',
            actor,
            ipAddress,
          });
        } catch {
          // Ignore whatsapp send failure
        }
      }
    } catch {
      // Non-critical communication error ignored
    }

    // 7. Record Audit Log
    await auditService.record({
      actorType: 'ADMIN',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'APPLICATION_APPROVED',
      entity: 'LoanApplication',
      entityId: application.id,
      previousValue: { status: application.status },
      newValue: {
        status: updated.status,
        approvedAmount: updated.approvedAmount,
        interestRate,
        tenureMonths,
        finalEmi,
        approvalNumber: accountNumber,
        approvalDocumentId: approvalDoc?.id,
        remarks: input.remarks,
      },
      ipAddress,
    });

    return updated;
  }

  /**
   * Admin proposes modified loan amount: UNDER_REVIEW -> OFFER_PENDING_CUSTOMER.
   * Preserves customer's original requestedAmount and sets proposedAmount.
   */
  async modifyAmount(
    loanId: string,
    actor: AuthenticatedUser,
    proposedAmount: number,
    ipAddress?: string
  ) {
    const application = await prisma.loanApplication.findUnique({
      where: { id: loanId },
    });

    if (!application) {
      throw new AppError(404, 'Loan application not found');
    }

    if (application.status === 'SUBMITTED') {
      await this.startReview(loanId, actor, ipAddress);
      application.status = 'UNDER_REVIEW';
    } else if (application.status !== 'UNDER_REVIEW') {
      throw new AppError(
        400,
        `Cannot modify amount: Application must be UNDER_REVIEW (current: ${application.status})`
      );
    }

    const num = Number(proposedAmount);
    const cleanProposedAmount = Number(num.toFixed(2));

    const updated = await prisma.loanApplication.update({
      where: { id: loanId },
      data: {
        status: 'OFFER_PENDING_CUSTOMER',
        proposedAmount: cleanProposedAmount,
        modifiedOfferAccepted: null,
      },
    });

    await auditService.record({
      actorType: 'ADMIN',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'LOAN_AMOUNT_MODIFIED',
      entity: 'LoanApplication',
      entityId: application.id,
      previousValue: {
        status: application.status,
        requestedAmount: application.requestedAmount,
        proposedAmount: application.proposedAmount,
      },
      newValue: {
        status: updated.status,
        proposedAmount: cleanProposedAmount,
      },
      ipAddress,
    });

    return updated;
  }

  /**
   * Check if a customer is eligible to submit a new loan application.
   */
  async checkEligibility(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, mobile: true, kycStatus: true, status: true },
    });
    if (!customer) throw new AppError(404, 'Customer not found');

    const activeApplication = await prisma.loanApplication.findFirst({
      where: {
        customerId,
        status: {
          in: [
            'DRAFT',
            'SUBMITTED',
            'PENDING',
            'UNDER_REVIEW',
            'APPROVED',
            'OFFER_PENDING_CUSTOMER',
            'OFFER_ACCEPTED',
            'ACTIVE',
            'DOCUMENTS_REQUIRED',
            'ON_HOLD',
          ],
        },
      },
      select: {
        id: true,
        applicationNumber: true,
        status: true,
        requestedAmount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const isKycApproved = customer.kycStatus === 'APPROVED' || customer.kycStatus === 'VERIFIED';

    return {
      canApply: !activeApplication && customer.status === 'ACTIVE' && isKycApproved,
      activeApplication: activeApplication || null,
      kycStatus: customer.kycStatus,
      accountStatus: customer.status,
    };
  }
}

export const loanApplicationService = new LoanApplicationService();
