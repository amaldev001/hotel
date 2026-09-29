import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';
import { AppError } from '../utils/AppError.js';

export class NotificationService {
  /**
   * Create a notification record for a single user
   */
  static async createNotification({ userId, type, title, message, referenceType = 'order', referenceId }) {
    if (!userId) return null;
    return await Notification.create({
      userId,
      type,
      title,
      message,
      referenceType,
      referenceId,
    });
  }

  /**
   * Notify customer and restaurant owner for order event
   */
  static async notifyOrderEvent({ order, eventType, title, customerMessage, restaurantMessage, adminMessage }) {
    try {
      const promises = [];

      // 1. Notify Customer
      if (order.customerId && customerMessage) {
        promises.push(
          this.createNotification({
            userId: order.customerId,
            type: eventType,
            title: title || `Order Update: ${order.status}`,
            message: customerMessage,
            referenceId: order._id,
          })
        );
      }

      // 2. Notify Restaurant Owner
      if (order.restaurantId && restaurantMessage) {
        const restaurant = await Restaurant.findById(order.restaurantId).select('ownerId');
        if (restaurant && restaurant.ownerId) {
          promises.push(
            this.createNotification({
              userId: restaurant.ownerId,
              type: eventType,
              title: title || `Order Update: ${order.status}`,
              message: restaurantMessage,
              referenceId: order._id,
            })
          );
        }
      }

      // 3. Notify Admins if needed (e.g. for refund or cancellation)
      if (adminMessage) {
        const adminUsers = await User.find({ role: 'admin', isActive: true }).select('_id');
        adminUsers.forEach((admin) => {
          promises.push(
            this.createNotification({
              userId: admin._id,
              type: eventType,
              title: title || `System Alert: ${eventType}`,
              message: adminMessage,
              referenceId: order._id,
            })
          );
        });
      }

      await Promise.all(promises);
    } catch (err) {
      console.error('Failed to dispatch notifications:', err.message);
    }
  }

  /**
   * Get user notifications with pagination
   */
  static async getUserNotifications({ userId, page = 1, limit = 20 }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments({ userId }),
      Notification.countDocuments({ userId, isRead: false }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Get unread count
   */
  static async getUnreadCount(userId) {
    const unreadCount = await Notification.countDocuments({ userId, isRead: false });
    return { unreadCount };
  }

  /**
   * Mark notification as read (ownership enforced)
   */
  static async markAsRead(notificationId, userId) {
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      throw new AppError('Notification not found', 404, 'NOT_FOUND');
    }

    if (notification.userId.toString() !== userId.toString()) {
      throw new AppError('Forbidden access to notification', 403, 'FORBIDDEN');
    }

    notification.isRead = true;
    await notification.save();
    return notification;
  }
}

export default NotificationService;
