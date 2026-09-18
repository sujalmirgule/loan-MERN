import path from 'path';
import crypto from 'crypto';
import { prisma } from './db';
import { storageProvider } from '../providers/storage';
import { AppError } from '../middleware/errorHandler';
import { auditService } from './auditService';
import { DocumentType } from '../validators/documentValidators';

export const documentService = {
  /**
   * Lists all current KYC documents and pending document requests for a customer.
   */
  async listCustomerDocuments(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        fullName: true,
        kycStatus: true,
        status: true,
      },
    });

    if (!customer) {
      throw new AppError(404, 'Customer not found');
    }

    // Retrieve active versions of uploaded documents
    const documents = await prisma.loanDocument.findMany({
      where: {
        customerId,
        isCurrentVersion: true,
      },
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        documentType: true,
        fileName: true,
        originalFileName: true,
        fileSize: true,
        mimeType: true,
        status: true,
        version: true,
        rejectionReason: true,
        reviewedAt: true,
        uploadedAt: true,
      },
    });

    // Retrieve any pending additional document requests from admin
    const pendingRequests = await prisma.documentRequest.findMany({
      where: {
        customerId,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        documentType: true,
        title: true,
        description: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      customer: {
        id: customer.id,
        fullName: customer.fullName,
        kycStatus: customer.kycStatus,
      },
      documents,
      pendingRequests,
    };
  },

  /**
   * Uploads a new document for a customer.
   */
  async uploadDocument(
    customerId: string,
    documentType: DocumentType,
    file: Express.Multer.File,
    loanId?: string,
    ipAddress?: string
  ) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer || customer.isDeleted) {
      throw new AppError(404, 'Customer not found');
    }

    // Check existing documents of this type for versioning
    const existingDoc = await prisma.loanDocument.findFirst({
      where: {
        customerId,
        documentType,
        isCurrentVersion: true,
      },
      orderBy: { version: 'desc' },
    });

    const nextVersion = existingDoc ? existingDoc.version + 1 : 1;

    // Generate safe storage key
    const fileExt = path.extname(file.originalname).toLowerCase() || '.bin';
    const uniqueFileId = crypto.randomUUID();
    const storageKey = `documents/${customerId}/${documentType}/${uniqueFileId}-v${nextVersion}${fileExt}`;

    // Store file safely
    const stored = await storageProvider.saveFile(
      storageKey,
      file.buffer,
      file.mimetype
    );

    // If an existing active version exists, archive it (preserve history)
    if (existingDoc) {
      await prisma.loanDocument.update({
        where: { id: existingDoc.id },
        data: { isCurrentVersion: false },
      });
    }

    // Create the new document record
    const document = await prisma.loanDocument.create({
      data: {
        customerId,
        loanId: loanId || null,
        documentType,
        fileName: path.basename(file.originalname),
        originalFileName: file.originalname,
        storageKey,
        filePath: stored.filePath,
        fileUrl: `/api/customer/documents/${uniqueFileId}/file`, // safe logical URL
        mimeType: file.mimetype,
        fileSize: file.size,
        status: 'PENDING',
        version: nextVersion,
        isCurrentVersion: true,
      },
    });

    // Check if there was an open DocumentRequest for this type and fulfill it
    await prisma.documentRequest.updateMany({
      where: {
        customerId,
        documentType,
        status: 'PENDING',
      },
      data: { status: 'FULFILLED' },
    });

    // Automatically transition customer KYC status to UNDER_REVIEW if currently PENDING or REUPLOAD_REQUIRED
    if (customer.kycStatus === 'PENDING' || customer.kycStatus === 'REUPLOAD_REQUIRED') {
      await prisma.customer.update({
        where: { id: customerId },
        data: { kycStatus: 'UNDER_REVIEW' },
      });
    }

    // Audit log entry
    await auditService.record({
      actorType: 'CUSTOMER',
      actorId: customer.id,
      actorName: customer.fullName,
      action: existingDoc ? 'DOCUMENT_REUPLOADED' : 'DOCUMENT_UPLOADED',
      entity: 'LoanDocument',
      entityId: document.id,
      newValue: {
        documentType: document.documentType,
        version: document.version,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        status: document.status,
      },
      ipAddress,
    });

    return {
      id: document.id,
      documentType: document.documentType,
      fileName: document.fileName,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
      status: document.status,
      version: document.version,
      uploadedAt: document.uploadedAt,
    };
  },

  /**
   * Re-uploads a document for a specific existing document record.
   */
  async reuploadDocument(
    customerId: string,
    documentId: string,
    file: Express.Multer.File,
    ipAddress?: string
  ) {
    const existingDoc = await prisma.loanDocument.findUnique({
      where: { id: documentId },
    });

    if (!existingDoc) {
      throw new AppError(404, 'Document record not found');
    }

    // Strict IDOR check
    if (existingDoc.customerId !== customerId) {
      throw new AppError(403, 'Unauthorized: You do not own this document');
    }

    return this.uploadDocument(
      customerId,
      existingDoc.documentType as DocumentType,
      file,
      existingDoc.loanId || undefined,
      ipAddress
    );
  },

  /**
   * Retrieves document metadata with strict customer ownership check.
   */
  async getDocumentMetadata(documentId: string, customerId: string) {
    const document = await prisma.loanDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new AppError(404, 'Document not found');
    }

    if (document.customerId !== customerId) {
      throw new AppError(403, 'Unauthorized access to document');
    }

    return {
      id: document.id,
      documentType: document.documentType,
      fileName: document.fileName,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
      status: document.status,
      version: document.version,
      rejectionReason: document.rejectionReason,
      reviewedAt: document.reviewedAt,
      uploadedAt: document.uploadedAt,
    };
  },

  /**
   * Streams file content for authenticated download/viewing with strict authorization.
   */
  async getDocumentStream(
    documentId: string,
    requester: { id: string; role: 'CUSTOMER' | 'ADMIN'; fullName?: string },
    ipAddress?: string
  ) {
    const document = await prisma.loanDocument.findUnique({
      where: { id: documentId },
      include: { customer: true },
    });

    if (!document) {
      throw new AppError(404, 'Document not found');
    }

    // IDOR protection: if CUSTOMER, enforce ownership
    if (requester.role === 'CUSTOMER' && document.customerId !== requester.id) {
      throw new AppError(403, 'Forbidden: You do not have permission to access this document');
    }

    const stream = await storageProvider.getFileStream(document.storageKey);

    // Audit log if viewed by Admin
    if (requester.role === 'ADMIN') {
      await auditService.record({
        actorType: 'ADMIN',
        actorId: requester.id,
        actorName: requester.fullName || 'Admin',
        action: 'DOCUMENT_VIEWED',
        entity: 'LoanDocument',
        entityId: document.id,
        newValue: {
          customerId: document.customerId,
          documentType: document.documentType,
          version: document.version,
        },
        ipAddress,
      });
    }

    return {
      stream,
      mimeType: document.mimeType,
      fileName: document.fileName,
      fileSize: document.fileSize,
    };
  },
};
