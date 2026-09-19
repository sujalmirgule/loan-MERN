import { prisma } from './db';
import { AppError } from '../middleware/errorHandler';

export class AdminCustomerService {
  /**
   * Lists customers with server-side filters, search, and pagination.
   */
  async listCustomers(filters: {
    search?: string;
    kycStatus?: string;
    state?: string;
    city?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      isDeleted: false,
    };

    if (filters.kycStatus && filters.kycStatus !== 'ALL') {
      where.kycStatus = filters.kycStatus;
    }

    if (filters.state && filters.state.trim().length > 0) {
      where.state = filters.state.trim();
    }

    if (filters.city && filters.city.trim().length > 0) {
      where.city = filters.city.trim();
    }

    if (filters.search && filters.search.trim().length > 0) {
      const term = filters.search.trim();
      where.OR = [
        { fullName: { contains: term } },
        { mobile: { contains: term } },
        { email: { contains: term } },
      ];
    }

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
            select: { id: true, applicationNumber: true, status: true, paymentStatus: true, requestedAmount: true, approvedAmount: true },
          },
          payments: {
            take: 1,
            orderBy: { paymentDate: 'desc' },
            select: { status: true, amount: true, transactionRef: true },
          },
        },
      }),
    ]);

    const formatted = customers.map((c) => {
      const latestLoan = c.loans[0] || null;
      const latestPayment = c.payments[0] || null;

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

    return {
      customer: {
        id: customer.id,
        fullName: customer.fullName,
        mobile: customer.mobile,
        email: customer.email,
        address: customer.address,
        state: customer.state,
        city: customer.city,
        monthlyIncome: customer.monthlyIncome,
        aadhaarMasked: customer.aadhaarMasked,
        kycStatus: customer.kycStatus,
        status: customer.status,
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
}

export const adminCustomerService = new AdminCustomerService();
