import { Request, Response, NextFunction } from 'express';
import { prisma } from '../services/db';
import { emailService } from '../services/emailService';
import { whatsappService } from '../services/whatsappService';
import { AppError } from '../middleware/errorHandler';

export class CommunicationController {
  /**
   * GET /api/admin/communication/customers
   * Retrieves customer and loan records with status filtering and communication metrics.
   */
  async listCommunicationCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const skip = (page - 1) * limit;

      const search = (req.query.search as string)?.trim();
      const status = (req.query.status as string)?.trim().toUpperCase() || 'ALL';

      const andConditions: any[] = [{ isDeleted: false }];

      if (search) {
        andConditions.push({
          OR: [
            { fullName: { contains: search } },
            { email: { contains: search } },
            { mobile: { contains: search } },
            { loans: { some: { applicationNumber: { contains: search } } } },
            { loans: { some: { accountNumber: { contains: search } } } },
          ],
        });
      }

      if (status !== 'ALL') {
        if (status === 'PENDING') {
          andConditions.push({
            OR: [
              { kycStatus: { in: ['PENDING', 'UNDER_REVIEW'] } },
              {
                loans: {
                  some: {
                    status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_REQUIRED', 'ON_HOLD', 'NEW'] },
                  },
                },
              },
            ],
          });
        } else if (status === 'KYC_PENDING') {
          andConditions.push({
            kycStatus: { in: ['PENDING', 'UNDER_REVIEW', 'REUPLOAD_REQUIRED'] },
          });
        } else if (status === 'UNDER_REVIEW') {
          andConditions.push({
            OR: [
              { kycStatus: 'UNDER_REVIEW' },
              { loans: { some: { status: 'UNDER_REVIEW' } } },
            ],
          });
        } else if (status === 'APPROVED') {
          andConditions.push({
            loans: { some: { status: 'APPROVED' } },
          });
        } else if (status === 'REJECTED') {
          andConditions.push({
            OR: [
              { kycStatus: 'REJECTED' },
              { loans: { some: { status: 'REJECTED' } } },
            ],
          });
        } else if (status === 'PAYMENT_PENDING') {
          andConditions.push({
            loans: {
              some: {
                paymentStatus: { in: ['PAYMENT_REQUIRED', 'UNDER_VERIFICATION'] },
              },
            },
          });
        } else if (status === 'PAYMENT_VERIFIED') {
          andConditions.push({
            loans: { some: { paymentStatus: 'PAID' } },
          });
        } else if (status === 'ACTIVE') {
          andConditions.push({
            OR: [
              { status: 'ACTIVE' },
              { loans: { some: { status: 'DISBURSED' } } },
            ],
          });
        }
      }

      const where = andConditions.length > 0 ? { AND: andConditions } : {};

      const [total, customers, statusCounts] = await Promise.all([
        prisma.customer.count({ where }),
        prisma.customer.findMany({
          where,
          skip,
          take: limit,
          orderBy: { updatedAt: 'desc' },
          include: {
            loans: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            supportTickets: {
              where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            _count: {
              select: {
                supportTickets: true,
                emailMessages: true,
                whatsappMessages: true,
              },
            },
          },
        }),
        Promise.all([
          prisma.customer.count({ where: { isDeleted: false } }),
          prisma.customer.count({
            where: {
              isDeleted: false,
              OR: [
                { kycStatus: { in: ['PENDING', 'UNDER_REVIEW'] } },
                { loans: { some: { status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_REQUIRED', 'ON_HOLD', 'NEW'] } } } },
              ],
            },
          }),
          prisma.customer.count({
            where: {
              isDeleted: false,
              kycStatus: { in: ['PENDING', 'UNDER_REVIEW', 'REUPLOAD_REQUIRED'] },
            },
          }),
          prisma.customer.count({
            where: {
              isDeleted: false,
              loans: { some: { paymentStatus: { in: ['PAYMENT_REQUIRED', 'UNDER_VERIFICATION'] } } },
            },
          }),
          prisma.customer.count({
            where: {
              isDeleted: false,
              loans: { some: { status: 'APPROVED' } },
            },
          }),
          prisma.customer.count({
            where: {
              isDeleted: false,
              OR: [
                { kycStatus: 'REJECTED' },
                { loans: { some: { status: 'REJECTED' } } },
              ],
            },
          }),
        ]),
      ]);

      const [allCount, pendingCount, kycPendingCount, paymentPendingCount, approvedCount, rejectedCount] = statusCounts;

      const formatted = customers.map((c) => {
        const loan = c.loans && c.loans.length > 0 ? c.loans[0] : null;
        const ticket = c.supportTickets && c.supportTickets.length > 0 ? c.supportTickets[0] : null;

        return {
          customerId: c.id,
          customerName: c.fullName,
          email: c.email,
          mobile: c.mobile,
          state: c.state || '—',
          city: c.city || '—',
          applicationId: loan?.applicationNumber || '—',
          loanId: loan?.accountNumber || loan?.applicationNumber || '—',
          loanApplicationId: loan?.id || null,
          loanStatus: loan?.status || 'NO_APPLICATION',
          kycStatus: c.kycStatus || 'PENDING',
          paymentStatus: loan?.paymentStatus || 'NOT_REQUIRED',
          lastUpdated: loan?.updatedAt || c.updatedAt,
          ticketId: ticket?.id || null,
          openTicketsCount: c._count.supportTickets,
          emailMessagesCount: c._count.emailMessages,
          whatsappMessagesCount: c._count.whatsappMessages,
        };
      });

      res.json({
        success: true,
        data: formatted,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        counts: {
          all: allCount,
          pending: pendingCount,
          kycPending: kycPendingCount,
          paymentPending: paymentPendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/communication/templates
   */
  getTemplates(req: Request, res: Response) {
    const templates = emailService.getTemplates();
    res.json({
      success: true,
      data: templates,
    });
  }

  /**
   * POST /api/admin/communication/email
   * POST /api/admin/communication/email/bulk
   * Dispatches personalized customer email with variable resolution.
   */
  async sendCustomerEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { customerIds, applicationIds, filter, subject, message, templateName, ticketId, forceMock } = req.body;
      const actor = req.user || { id: 'admin-system', fullName: 'System Admin' };
      const ipAddress = req.ip || req.socket.remoteAddress;

      if (applicationIds && Array.isArray(applicationIds) && applicationIds.length > 0) {
        const result = await emailService.sendBulkApplicationEmails({
          applicationIds,
          subject: subject?.trim(),
          message: message?.trim(),
          templateName: templateName?.trim(),
          actor: actor as any,
          ipAddress,
        });
        return res.json({
          success: result.sentCount > 0 || (result.total > 0 && result.failedCount === 0),
          message: `Email campaign completed: ${result.sentCount} sent, ${result.failedCount} failed.`,
          data: result,
        });
      }

      if ((!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) && !filter) {
        throw new AppError(400, 'Either customer IDs, application IDs, or a valid filter definition must be provided.');
      }

      if (!subject || typeof subject !== 'string' || !subject.trim()) {
        throw new AppError(400, 'Email subject is required.');
      }

      if (!message || typeof message !== 'string' || !message.trim()) {
        throw new AppError(400, 'Email message body is required.');
      }

      const result = await emailService.sendBulkEmails(
        {
          customerIds,
          filter,
          subject: subject.trim(),
          message: message.trim(),
          templateName: templateName?.trim(),
          ticketId: ticketId?.trim(),
          forceMock: Boolean(forceMock),
        },
        actor as any,
        ipAddress
      );

      res.json({
        success: result.sentCount > 0 || (result.total > 0 && result.failedCount === 0),
        message:
          result.failedCount === 0
            ? `Successfully dispatched email to ${result.sentCount} customer(s).`
            : `Email dispatch completed: ${result.sentCount} sent, ${result.failedCount} failed.`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/communication/email/bulk-applications
   */
  async sendBulkApplicationEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { applicationIds, subject, message, templateName } = req.body;
      if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
        throw new AppError(400, 'Please select at least one loan application.');
      }
      const actor = req.user || { id: 'admin-system', fullName: 'System Admin' };
      const result = await emailService.sendBulkApplicationEmails({
        applicationIds,
        subject: subject?.trim(),
        message: message?.trim(),
        templateName: templateName?.trim(),
        actor: actor as any,
        ipAddress: req.ip,
      });

      res.json({
        success: result.sentCount > 0 || (result.total > 0 && result.failedCount === 0),
        message: `Email campaign completed: ${result.sentCount} sent, ${result.failedCount} failed.`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/communication/email/invoice
   * Sends verified charge invoice PDF attachment to customer.
   */
  async sendInvoiceEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { chargeId } = req.body;
      if (!chargeId) {
        throw new AppError(400, 'Charge ID is required.');
      }
      const actor = req.user || { id: 'admin-system', fullName: 'System Admin' };
      const result = await emailService.sendInvoiceEmail(chargeId, actor as any, req.ip);
      res.json({
        success: result.status === 'SENT',
        message: result.status === 'SENT' ? 'Invoice email dispatched successfully.' : `Failed: ${result.error}`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/communication/email/approval-letter
   * Sends loan sanction/approval letter PDF attachment to customer.
   */
  async sendApprovalLetterEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { loanId } = req.body;
      if (!loanId) {
        throw new AppError(400, 'Loan ID is required.');
      }
      const actor = req.user || { id: 'admin-system', fullName: 'System Admin' };
      const result = await emailService.sendApprovalLetterEmail(loanId, actor as any, req.ip);
      res.json({
        success: result.status === 'SENT',
        message: result.status === 'SENT' ? 'Approval letter email dispatched successfully.' : `Failed: ${result.error}`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/communication/whatsapp
   * Sends single WhatsApp message to customer.
   */
  async sendWhatsAppMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { customerId, message, templateName } = req.body;
      if (!customerId) {
        throw new AppError(400, 'Customer ID is required.');
      }
      const actor = req.user || { id: 'admin-system', fullName: 'System Admin' };
      const result = await whatsappService.sendMessage({
        customerId,
        message,
        templateName,
        actor: actor as any,
        ipAddress: req.ip,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/communication/whatsapp/bulk
   * Sends bulk WhatsApp messages to filtered customers or loan applications.
   */
  async sendBulkWhatsApp(req: Request, res: Response, next: NextFunction) {
    try {
      const { customerIds, applicationIds, filter, message, templateName } = req.body;
      const actor = req.user || { id: 'admin-system', fullName: 'System Admin' };

      if (applicationIds && Array.isArray(applicationIds) && applicationIds.length > 0) {
        const result = await whatsappService.sendBulkApplicationMessages({
          applicationIds,
          message: typeof message === 'string' ? message.trim() : undefined,
          templateName,
          actor: actor as any,
          ipAddress: req.ip,
        });
        return res.json({
          success: result.sentCount > 0 || (result.total > 0 && result.failedCount === 0),
          message: `WhatsApp campaign completed: ${result.sentCount} sent, ${result.failedCount} failed.`,
          data: result,
        });
      }

      if ((!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) && !filter) {
        throw new AppError(400, 'Either customer IDs, application IDs, or a filter must be provided.');
      }
      if (!message || typeof message !== 'string' || !message.trim()) {
        throw new AppError(400, 'Message body is required.');
      }

      const result = await whatsappService.sendBulkMessages({
        customerIds,
        filter,
        message: message.trim(),
        templateName,
        actor: actor as any,
        ipAddress: req.ip,
      });

      res.json({
        success: result.sentCount > 0 || (result.total > 0 && result.failedCount === 0),
        message: `Dispatched WhatsApp messages: ${result.sentCount} sent, ${result.failedCount} failed.`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/communication/whatsapp/bulk-applications
   * Sends bulk WhatsApp messages to selected loan applications.
   */
  async sendBulkApplicationWhatsApp(req: Request, res: Response, next: NextFunction) {
    try {
      const { applicationIds, message, templateName } = req.body;
      if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
        throw new AppError(400, 'Please select at least one loan application.');
      }
      const actor = req.user || { id: 'admin-system', fullName: 'System Admin' };
      const result = await whatsappService.sendBulkApplicationMessages({
        applicationIds,
        message: typeof message === 'string' ? message.trim() : undefined,
        templateName,
        actor: actor as any,
        ipAddress: req.ip,
      });

      res.json({
        success: result.sentCount > 0 || (result.total > 0 && result.failedCount === 0),
        message: `WhatsApp campaign completed: ${result.sentCount} sent, ${result.failedCount} failed.`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }


  /**
   * GET /api/admin/communication/history
   * Retrieves unified or channel-filtered communication history.
   */
  async getCommunicationHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, Number(req.query?.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query?.limit) || 20));
      const channel = (req.query?.channel as string)?.toUpperCase();
      const status = req.query?.status as string;
      const search = req.query?.search as string;

      if (channel === 'WHATSAPP') {
        const where: any = {};
        if (status && status !== 'ALL') where.status = status;
        if (search && search.trim()) {
          where.OR = [
            { phone: { contains: search.trim() } },
            { message: { contains: search.trim() } },
          ];
        }

        const [total, items] = await Promise.all([
          prisma.whatsAppMessage.count({ where }),
          prisma.whatsAppMessage.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
              customer: { select: { id: true, fullName: true, mobile: true, email: true } },
              loan: { select: { applicationNumber: true, accountNumber: true } },
            },
          }),
        ]);

        return res.json({
          success: true,
          channel: 'WHATSAPP',
          data: items.map((m) => ({
            id: m.id,
            channel: 'WHATSAPP',
            customerId: m.customerId,
            customerName: m.customer?.fullName || 'Customer',
            recipient: m.phone,
            applicationNumber: m.loan?.applicationNumber || '—',
            subject: 'WhatsApp Notification',
            message: m.message,
            templateName: m.templateName,
            status: m.status,
            providerMessageId: m.providerMessageId,
            sentAt: m.sentAt,
            failedAt: m.failedAt,
            failureReason: m.failureReason,
            createdAt: m.createdAt,
          })),
          pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
      }

      // Default: Email or unified
      const history = await emailService.getHistory({
        page,
        limit,
        status,
        search,
      });

      res.json({
        success: true,
        channel: 'EMAIL',
        ...history,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/communication/history/customer/:customerId
   */
  async getCustomerHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const customerId = String(req.params?.customerId || '');
      const page = Math.max(1, Number(req.query?.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query?.limit) || 50));

      const [emailHistory, waHistory] = await Promise.all([
        emailService.getHistory({ customerId, page, limit }),
        prisma.whatsAppMessage.findMany({
          where: { customerId },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),
      ]);

      res.json({
        success: true,
        emails: emailHistory.data,
        whatsapp: waHistory,
        pagination: emailHistory.pagination,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const communicationController = new CommunicationController();
