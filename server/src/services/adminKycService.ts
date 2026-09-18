import { prisma } from './db';
import { AppError } from '../middleware/errorHandler';
import { auditService } from './auditService';
import { DocumentType } from '../validators/documentValidators';

export const adminKycService = {
  /**
   * Lists customers with their KYC progress, document statistics, and search/filter capabilities.
   */
  async listKycCustomers(filters: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      isDeleted: false,
    };

    if (filters.status && filters.status !== 'ALL') {
      where.kycStatus = filters.status;
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
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          mobile: true,
          email: true,
          state: true,
          city: true,
          status: true,
          kycStatus: true,
          createdAt: true,
          updatedAt: true,
          documents: {
            where: { isCurrentVersion: true },
            select: {
              id: true,
              documentType: true,
              status: true,
            },
          },
        },
      }),
    ]);

    const formatted = customers.map((c) => {
      const totalDocs = c.documents.length;
      const approvedDocs = c.documents.filter((d) => d.status === 'APPROVED').length;
      const pendingDocs = c.documents.filter((d) => d.status === 'PENDING' || d.status === 'UNDER_REVIEW').length;
      const reuploadRequiredDocs = c.documents.filter((d) => d.status === 'REUPLOAD_REQUIRED').length;
      const rejectedDocs = c.documents.filter((d) => d.status === 'REJECTED').length;

      return {
        id: c.id,
        fullName: c.fullName,
        mobile: c.mobile,
        email: c.email,
        state: c.state,
        city: c.city,
        accountStatus: c.status,
        kycStatus: c.kycStatus,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        docStats: {
          total: totalDocs,
          approved: approvedDocs,
          pending: pendingDocs,
          reuploadRequired: reuploadRequiredDocs,
          rejected: rejectedDocs,
        },
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
  },

  /**
   * Retrieves comprehensive KYC detail for an individual customer.
   */
  async getCustomerKycDetails(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        documents: {
          orderBy: [{ documentType: 'asc' }, { version: 'desc' }],
        },
        documentRequests: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer || customer.isDeleted) {
      throw new AppError(404, 'Customer record not found');
    }

    // Separate active versions from historical archived versions
    const activeDocuments = customer.documents.filter((d) => d.isCurrentVersion);
    const documentHistory = customer.documents.filter((d) => !d.isCurrentVersion);

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
        accountStatus: customer.status,
        kycStatus: customer.kycStatus,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      },
      documents: activeDocuments.map((d) => ({
        id: d.id,
        documentType: d.documentType,
        fileName: d.fileName,
        fileSize: d.fileSize,
        mimeType: d.mimeType,
        status: d.status,
        version: d.version,
        rejectionReason: d.rejectionReason,
        reviewedBy: d.reviewedBy,
        reviewedAt: d.reviewedAt,
        uploadedAt: d.uploadedAt,
      })),
      documentHistory: documentHistory.map((d) => ({
        id: d.id,
        documentType: d.documentType,
        fileName: d.fileName,
        fileSize: d.fileSize,
        mimeType: d.mimeType,
        status: d.status,
        version: d.version,
        rejectionReason: d.rejectionReason,
        reviewedBy: d.reviewedBy,
        reviewedAt: d.reviewedAt,
        uploadedAt: d.uploadedAt,
      })),
      pendingRequests: customer.documentRequests.map((r) => ({
        id: r.id,
        documentType: r.documentType,
        title: r.title,
        description: r.description,
        status: r.status,
        requestedBy: r.requestedBy,
        createdAt: r.createdAt,
      })),
    };
  },

  /**
   * Reviews a specific customer document (Approve, Reject, or Request Re-upload).
   */
  async reviewDocument(
    admin: { id: string; fullName: string },
    documentId: string,
    action: 'APPROVE' | 'REJECT' | 'REQUEST_REUPLOAD',
    reason?: string,
    ipAddress?: string
  ) {
    const document = await prisma.loanDocument.findUnique({
      where: { id: documentId },
      include: { customer: true },
    });

    if (!document) {
      throw new AppError(404, 'Document not found');
    }

    let newStatus: string;
    let auditAction: string;

    if (action === 'APPROVE') {
      newStatus = 'APPROVED';
      auditAction = 'DOCUMENT_APPROVED';
    } else if (action === 'REJECT') {
      newStatus = 'REJECTED';
      auditAction = 'DOCUMENT_REJECTED';
    } else {
      newStatus = 'REUPLOAD_REQUIRED';
      auditAction = 'DOCUMENT_REUPLOAD_REQUESTED';
    }

    const updatedDocument = await prisma.loanDocument.update({
      where: { id: documentId },
      data: {
        status: newStatus,
        rejectionReason: reason || null,
        reviewedBy: admin.fullName,
        reviewedAt: new Date(),
      },
    });

    // Record audit event
    await auditService.record({
      actorType: 'ADMIN',
      actorId: admin.id,
      actorName: admin.fullName,
      action: auditAction,
      entity: 'LoanDocument',
      entityId: document.id,
      previousValue: {
        status: document.status,
        rejectionReason: document.rejectionReason,
      },
      newValue: {
        status: newStatus,
        rejectionReason: reason || null,
        reviewedBy: admin.fullName,
      },
      ipAddress,
    });

    // Re-evaluate customer's overall KYC status
    await this.evaluateCustomerKycStatus(document.customerId, admin, ipAddress);

    return {
      id: updatedDocument.id,
      documentType: updatedDocument.documentType,
      status: updatedDocument.status,
      rejectionReason: updatedDocument.rejectionReason,
      reviewedBy: updatedDocument.reviewedBy,
      reviewedAt: updatedDocument.reviewedAt,
    };
  },

  /**
   * Re-evaluates customer overall KYC status based on current active document statuses.
   */
  async evaluateCustomerKycStatus(
    customerId: string,
    admin?: { id: string; fullName: string },
    ipAddress?: string
  ) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        documents: {
          where: { isCurrentVersion: true },
        },
      },
    });

    if (!customer) return;

    const docs = customer.documents;
    const requiredTypes = ['AADHAAR_FRONT', 'AADHAAR_BACK', 'PAN'];

    let targetKycStatus = customer.kycStatus;

    if (docs.some((d) => d.status === 'REUPLOAD_REQUIRED')) {
      targetKycStatus = 'REUPLOAD_REQUIRED';
    } else if (docs.some((d) => d.status === 'REJECTED')) {
      targetKycStatus = 'REJECTED';
    } else {
      // Check if all primary required KYC documents are present and approved
      const allRequiredApproved = requiredTypes.every((type) => {
        const found = docs.find((d) => d.documentType === type);
        return found && found.status === 'APPROVED';
      });

      if (allRequiredApproved) {
        targetKycStatus = 'APPROVED';
      } else if (docs.length > 0) {
        targetKycStatus = 'UNDER_REVIEW';
      }
    }

    if (targetKycStatus !== customer.kycStatus) {
      await prisma.customer.update({
        where: { id: customerId },
        data: { kycStatus: targetKycStatus },
      });

      if (targetKycStatus === 'APPROVED' || targetKycStatus === 'REJECTED') {
        await auditService.record({
          actorType: 'ADMIN',
          actorId: admin?.id,
          actorName: admin?.fullName || 'System Admin',
          action: targetKycStatus === 'APPROVED' ? 'KYC_APPROVED' : 'KYC_REJECTED',
          entity: 'Customer',
          entityId: customer.id,
          previousValue: { kycStatus: customer.kycStatus },
          newValue: { kycStatus: targetKycStatus },
          ipAddress,
        });
      }
    }
  },

  /**
   * Requests an additional document from the customer.
   */
  async requestAdditionalDocument(
    admin: { id: string; fullName: string },
    customerId: string,
    data: { documentType: DocumentType; title: string; description?: string },
    ipAddress?: string
  ) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer || customer.isDeleted) {
      throw new AppError(404, 'Customer record not found');
    }

    const request = await prisma.documentRequest.create({
      data: {
        customerId,
        documentType: data.documentType,
        title: data.title,
        description: data.description || null,
        status: 'PENDING',
        requestedBy: admin.fullName,
      },
    });

    // Mark customer KYC status as REUPLOAD_REQUIRED so customer sees action needed
    if (customer.kycStatus !== 'REUPLOAD_REQUIRED') {
      await prisma.customer.update({
        where: { id: customerId },
        data: { kycStatus: 'REUPLOAD_REQUIRED' },
      });
    }

    await auditService.record({
      actorType: 'ADMIN',
      actorId: admin.id,
      actorName: admin.fullName,
      action: 'ADDITIONAL_DOCUMENT_REQUESTED',
      entity: 'DocumentRequest',
      entityId: request.id,
      newValue: {
        customerId,
        documentType: data.documentType,
        title: data.title,
        requestedBy: admin.fullName,
      },
      ipAddress,
    });

    return request;
  },

  /**
   * Explicitly sets customer KYC status with an admin audit record.
   */
  async overrideKycStatus(
    admin: { id: string; fullName: string },
    customerId: string,
    status: string,
    reason?: string,
    ipAddress?: string
  ) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer || customer.isDeleted) {
      throw new AppError(404, 'Customer record not found');
    }

    await prisma.customer.update({
      where: { id: customerId },
      data: { kycStatus: status },
    });

    await auditService.record({
      actorType: 'ADMIN',
      actorId: admin.id,
      actorName: admin.fullName,
      action: status === 'APPROVED' ? 'KYC_APPROVED' : 'KYC_REJECTED',
      entity: 'Customer',
      entityId: customer.id,
      previousValue: { kycStatus: customer.kycStatus },
      newValue: { kycStatus: status, reason },
      ipAddress,
    });

    return {
      customerId: customer.id,
      kycStatus: status,
    };
  },
};
