import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notificationService';
import { AppError } from '../middleware/errorHandler';

export class NotificationController {
  /**
   * Customer: Get notifications.
   */
  async getCustomerNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Unauthorized');
      const data = await notificationService.getCustomerNotifications(req.user.id);
      res.status(200).json({ success: true, data: data.notifications, unreadCount: data.unreadCount });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Customer: Mark single notification read.
   */
  async markCustomerNotificationRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Unauthorized');
      const data = await notificationService.markAsRead(req.user.id, req.params.id as string);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Customer: Mark all notifications read.
   */
  async markAllCustomerNotificationsRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Unauthorized');
      await notificationService.markAllAsRead(req.user.id);
      res.status(200).json({ success: true, message: 'All notifications marked as read.' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Get notification action center.
   */
  async getAdminNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await notificationService.getAdminNotifications();
      res.status(200).json({ success: true, data: data.notifications, unreadCount: data.unreadCount, summary: data.summary });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Mark admin notification as read.
   */
  async markAdminNotificationRead(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await notificationService.markAdminNotificationRead(req.params.id as string);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const notificationController = new NotificationController();
