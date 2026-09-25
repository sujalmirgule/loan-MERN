import { prisma } from './db';
import { AppError } from '../middleware/errorHandler';

export class NotificationService {
  /**
   * Customer: Retrieves in-app notifications.
   */
  async getCustomerNotifications(customerId: string) {
    const notifications = await prisma.notification.findMany({
      where: {
        recipientType: 'CUSTOMER',
        customerId,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        recipientType: 'CUSTOMER',
        customerId,
        isRead: false,
      },
    });

    return {
      notifications,
      unreadCount,
    };
  }

  /**
   * Customer: Mark single notification as read.
   */
  async markAsRead(customerId: string, notificationId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new AppError(404, 'Notification not found');
    }

    if (notification.customerId !== customerId) {
      throw new AppError(403, 'Access denied');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  /**
   * Customer: Mark all notifications as read.
   */
  async markAllAsRead(customerId: string) {
    return prisma.notification.updateMany({
      where: {
        recipientType: 'CUSTOMER',
        customerId,
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  /**
   * Admin: Retrieves administrative notifications and urgent action items.
   */
  async getAdminNotifications() {
    const [notifications, unreadCount, pendingKyc, pendingPayments, openTickets] = await Promise.all([
      prisma.notification.findMany({
        where: { recipientType: 'ADMIN' },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.notification.count({
        where: { recipientType: 'ADMIN', isRead: false },
      }),
      prisma.customer.count({
        where: { isDeleted: false, kycStatus: { in: ['PENDING', 'UNDER_REVIEW'] } },
      }),
      prisma.payment.count({
        where: { status: 'UNDER_VERIFICATION' },
      }),
      prisma.supportTicket.count({
        where: { status: 'OPEN' },
      }),
    ]);

    return {
      notifications,
      unreadCount,
      summary: {
        pendingKyc,
        pendingPayments,
        openTickets,
      },
    };
  }

  /**
   * Admin: Mark admin notification as read.
   */
  async markAdminNotificationRead(notificationId: string) {
    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  /**
   * Admin: Mark all admin notifications read.
   */
  async markAllAdminNotificationsRead() {
    return prisma.notification.updateMany({
      where: { recipientType: 'ADMIN', isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * Admin: Delete single notification.
   */
  async deleteAdminNotification(notificationId: string) {
    return prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  /**
   * Admin: Bulk delete notifications.
   */
  async bulkDeleteAdminNotifications(ids: string[]) {
    const result = await prisma.notification.deleteMany({
      where: { id: { in: ids }, recipientType: 'ADMIN' },
    });
    return result.count;
  }
}

export const notificationService = new NotificationService();

