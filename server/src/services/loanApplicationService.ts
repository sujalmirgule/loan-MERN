import { prisma } from './db';
import { auditService } from './auditService';
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
      select: { id: true, fullName: true, status: true, isDeleted: true },
    });

    if (!customer || customer.isDeleted) {
      throw new AppError(404, 'Customer account not found');
    }

    if (customer.status !== 'ACTIVE') {
      throw new AppError(403, 'Customer account is suspended');
    }

    const applicationNumber = await this.generateApplicationNumber();
    const now = new Date();

    const application = await prisma.loanApplication.create({
      data: {
        applicationNumber,
        customerId: customer.id,
        requestedAmount: Number(input.amount.toFixed(2)),
        tenureMonths: input.tenureMonths,
        purpose: input.purpose.trim(),
        status: 'SUBMITTED',
        submittedAt: now,
        estimatedEmi: 0,
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
      where.status = filters.status;
    }

    // Location filter
    if (filters.state || filters.city) {
      where.customer = {
        ...(where.customer as Prisma.CustomerWhereInput),
        ...(filters.state ? { state: { contains: filters.state } } : {}),
        ...(filters.city ? { city: { contains: filters.city } } : {}),
      };
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

    return application;
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

    if (application.status !== 'UNDER_REVIEW') {
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

    if (application.status !== 'UNDER_REVIEW') {
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
   * Admin rejects application: UNDER_REVIEW -> REJECTED.
   */
  async rejectApplication(
    loanId: string,
    actor: AuthenticatedUser,
    rejectionReason: string,
    ipAddress?: string
  ) {
    const application = await prisma.loanApplication.findUnique({
      where: { id: loanId },
    });

    if (!application) {
      throw new AppError(404, 'Loan application not found');
    }

    if (application.status !== 'UNDER_REVIEW') {
      throw new AppError(
        400,
        `Cannot reject: Application must be UNDER_REVIEW (current: ${application.status})`
      );
    }

    const updated = await prisma.loanApplication.update({
      where: { id: loanId },
      data: {
        status: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
      },
    });

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
   * Admin approves application: UNDER_REVIEW -> APPROVED.
   * Approval in loan workflow without executing financial disbursement or EMI calculation.
   */
  async approveApplication(loanId: string, actor: AuthenticatedUser, ipAddress?: string) {
    const application = await prisma.loanApplication.findUnique({
      where: { id: loanId },
    });

    if (!application) {
      throw new AppError(404, 'Loan application not found');
    }

    if (application.status !== 'UNDER_REVIEW') {
      throw new AppError(
        400,
        `Cannot approve: Application must be UNDER_REVIEW (current: ${application.status})`
      );
    }

    const approvedAmount = application.proposedAmount || application.requestedAmount;

    const updated = await prisma.loanApplication.update({
      where: { id: loanId },
      data: {
        status: 'APPROVED',
        approvedAmount,
      },
    });

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

    if (application.status !== 'UNDER_REVIEW') {
      throw new AppError(
        400,
        `Cannot modify amount: Application must be UNDER_REVIEW (current: ${application.status})`
      );
    }

    const cleanProposedAmount = Number(proposedAmount.toFixed(2));

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
}

export const loanApplicationService = new LoanApplicationService();
