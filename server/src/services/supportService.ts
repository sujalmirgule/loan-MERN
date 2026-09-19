import { prisma } from './db';
import { auditService } from './auditService';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedUser } from '../middleware/authMiddleware';
import { CreateSupportTicketInput, ReplySupportTicketInput } from '../validators/phase5Validators';

export class SupportService {
  /**
   * Customer submits a support request ticket.
   */
  async createTicket(customerId: string, input: CreateSupportTicketInput, actor: AuthenticatedUser, ipAddress?: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer || customer.isDeleted) {
      throw new AppError(404, 'Customer account not found');
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        customerId,
        subject: `[${input.category}] ${input.subject.trim()}`,
        message: input.message.trim(),
        status: 'OPEN',
      },
    });

    await auditService.record({
      actorType: 'CUSTOMER',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'SUPPORT_TICKET_CREATED',
      entity: 'SupportTicket',
      entityId: ticket.id,
      newValue: { subject: ticket.subject },
      ipAddress,
    });

    await prisma.notification.create({
      data: {
        recipientType: 'ADMIN',
        title: 'New Customer Support Request',
        message: `Customer ${actor.fullName} submitted a support inquiry: "${input.subject.trim()}".`,
        eventType: 'SUPPORT_TICKET',
      },
    });

    return ticket;
  }

  /**
   * Customer retrieves all their support tickets.
   */
  async getCustomerTickets(customerId: string) {
    return prisma.supportTicket.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Admin lists all support tickets with optional status filter.
   */
  async listAllTickets(filters: { status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }

    const [total, tickets] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, fullName: true, mobile: true, email: true } },
        },
      }),
    ]);

    return {
      tickets: tickets.map((t) => ({
        id: t.id,
        customerId: t.customerId,
        customerName: t.customer.fullName,
        mobile: t.customer.mobile,
        email: t.customer.email,
        subject: t.subject,
        message: t.message,
        status: t.status,
        adminReply: t.adminReply,
        createdAt: t.createdAt,
        resolvedAt: t.resolvedAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Admin replies to a support ticket and updates status.
   */
  async replyTicket(ticketId: string, input: ReplySupportTicketInput, actor: AuthenticatedUser, ipAddress?: string) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { customer: true },
    });

    if (!ticket) {
      throw new AppError(404, 'Support ticket not found');
    }

    const now = new Date();
    const resolvedAt = input.status === 'RESOLVED' ? now : null;

    const updated = await prisma.$transaction(async (tx) => {
      const t = await tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          adminReply: input.adminReply.trim(),
          status: input.status,
          resolvedAt,
        },
      });

      await tx.notification.create({
        data: {
          recipientType: 'CUSTOMER',
          customerId: ticket.customerId,
          title: 'Update on Support Request',
          message: `Support team replied to "${ticket.subject}": ${input.adminReply.trim().slice(0, 100)}...`,
          eventType: 'SUPPORT_TICKET_REPLIED',
        },
      });

      return t;
    });

    await auditService.record({
      actorType: 'ADMIN',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'SUPPORT_TICKET_REPLIED',
      entity: 'SupportTicket',
      entityId: ticket.id,
      newValue: { status: input.status, replyLength: input.adminReply.length },
      ipAddress,
    });

    return updated;
  }
}

export const supportService = new SupportService();
