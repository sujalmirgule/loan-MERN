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

  /**
   * Admin: Mark all admin notifications read.
   */
  async markAllAdminNotificationsRead(req: Request, res: Response, next: NextFunction) {
    try {
      await notificationService.markAllAdminNotificationsRead();
      res.status(200).json({ success: true, message: 'All admin notifications marked as read.' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Delete single notification.
   */
  async deleteAdminNotification(req: Request, res: Response, next: NextFunction) {
    try {
      await notificationService.deleteAdminNotification(req.params.id as string);
      res.status(200).json({ success: true, message: 'Notification deleted successfully.' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Bulk delete notifications.
   */
  async bulkDeleteAdminNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new AppError(400, 'ids array is required');
      }
      const count = await notificationService.bulkDeleteAdminNotifications(ids);
      res.status(200).json({ success: true, message: `Successfully deleted ${count} notification(s).`, count });
    } catch (err) {
      next(err);
    }
  }
}

export const notificationController = new NotificationController();

