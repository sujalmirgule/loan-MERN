import { Request, Response, NextFunction } from 'express';
import { supportService } from '../services/supportService';
import { createSupportTicketSchema, replySupportTicketSchema } from '../validators/phase5Validators';
import { AppError } from '../middleware/errorHandler';

export class SupportController {
  /**
   * Customer: Create a support ticket.
   */
  async createTicket(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Unauthorized');
      const input = createSupportTicketSchema.parse(req.body);
      const data = await supportService.createTicket(req.user.id, input, req.user, req.ip);
      res.status(201).json({
        success: true,
        message: 'Support ticket submitted successfully. Our team will review your inquiry.',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Customer: List their support tickets.
   */
  async getCustomerTickets(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Unauthorized');
      const data = await supportService.getCustomerTickets(req.user.id);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: List all tickets.
   */
  async listAllTickets(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, page, limit } = req.query;
      const data = await supportService.listAllTickets({
        status: status as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.status(200).json({ success: true, data: data.tickets, pagination: data.pagination });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Reply to a ticket.
   */
  async replyTicket(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Unauthorized');
      const input = replySupportTicketSchema.parse(req.body);
      const data = await supportService.replyTicket(req.params.id as string, input, req.user, req.ip);
      res.status(200).json({
        success: true,
        message: 'Ticket reply posted and customer notified.',
        data,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const supportController = new SupportController();
