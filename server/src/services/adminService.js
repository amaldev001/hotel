import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import AuditLog from '../models/AuditLog.js';
import NotificationService from './notificationService.js';
import { getPaymentProvider } from '../providers/paymentProvider.js';
import { AppError } from '../utils/AppError.js';

export class AdminService {
  /**
   * List users with search, role filter, active status filter, and pagination
   */
  static async getUsers({ q, role, isActive, page = 1, limit = 20 }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (role) query.role = role;
    if (isActive !== undefined && isActive !== '') {
      query.isActive = isActive === 'true' || isActive === true;
    }

    if (q && typeof q === 'string' && q.trim()) {
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query).select('-passwordHash').sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      User.countDocuments(query),
    ]);

    return {
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Activate / Deactivate user status
   */
  static async toggleUserStatus({ targetUserId, isActive, adminUser }) {
    if (targetUserId.toString() === adminUser._id.toString()) {
      throw new AppError('Cannot deactivate your own admin account', 400, 'CANNOT_DEACTIVATE_SELF');
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (!isActive && user.role === 'admin') {
      const activeAdminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (activeAdminCount <= 1) {
        throw new AppError('Cannot deactivate the last active admin account', 400, 'LAST_ADMIN_PROTECTION');
      }
    }

    user.isActive = isActive;
    await user.save();

    // If deactivating a restaurant owner, suspend their restaurant
    if (!isActive && user.role === 'restaurant') {
      await Restaurant.updateMany({ ownerId: user._id }, { status: 'SUSPENDED' });
    }

    // Audit Log
    await AuditLog.create({
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      actorId: adminUser._id,
      actorRole: 'admin',
      targetModel: 'User',
      targetId: user._id,
      metadata: { targetRole: user.role, isActive },
    });

    return {
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };
  }

  /**
   * Process Refund for REFUND_PENDING orders via payment gateway
   */
  static async triggerRefund({ orderId, adminUser, reason }) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    if (order.paymentStatus === 'REFUNDED') {
      return {
        success: true,
        alreadyRefunded: true,
        orderId: order._id,
        paymentStatus: order.paymentStatus,
      };
    }

    if (order.paymentStatus !== 'REFUND_PENDING' && order.paymentStatus !== 'COMPLETED') {
      throw new AppError('Order is not in a refundable payment status', 400, 'NOT_REFUNDABLE');
    }

    const payment = await Payment.findOne({ orderId: order._id, status: 'COMPLETED' });

    let refundResult = { refundId: `ref_direct_${Date.now()}`, status: 'REFUNDED' };

    if (payment && payment.providerPaymentId) {
      const provider = getPaymentProvider();
      refundResult = await provider.issueRefund({
        providerPaymentId: payment.providerPaymentId,
        amount: order.pricing.total,
        currency: env.CURRENCY,
        reason: reason || 'Admin initiated refund',
      });

      payment.status = 'REFUNDED';
      payment.refundId = refundResult.refundId;
      await payment.save();
    }

    order.paymentStatus = 'REFUNDED';
    await order.save();

    // Audit Log
    await AuditLog.create({
      action: 'ADMIN_REFUND_PROCESSED',
      actorId: adminUser._id,
      actorRole: 'admin',
      targetModel: 'Order',
      targetId: order._id,
      metadata: { refundId: refundResult.refundId, amount: order.pricing.total, reason },
    });

    // Notify Customer
    await NotificationService.notifyOrderEvent({
      order,
      eventType: 'REFUND_COMPLETED',
      title: 'Refund Processed',
      customerMessage: `Your refund of ${order.pricing.total} minor units for order #${order._id} has been processed successfully.`,
    });

    return {
      success: true,
      orderId: order._id,
      paymentStatus: order.paymentStatus,
      refundId: refundResult.refundId,
    };
  }

  /**
   * Admin Dashboard Metrics - Executed in parallel with Promise.all
   */
  static async getDashboardMetrics() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      ordersByStatusRaw,
      todaysOrdersCount,
      revenueResult,
      activeRestaurantsCount,
      customersCount,
    ] = await Promise.all([
      // 1. Orders by status
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      // 2. Today's orders count
      Order.countDocuments({ createdAt: { $gte: startOfToday } }),
      // 3. Revenue from paid orders in minor units
      Order.aggregate([
        { $match: { paymentStatus: 'COMPLETED' } },
        { $group: { _id: null, totalRevenue: { $sum: '$pricing.total' } } },
      ]),
      // 4. Active restaurants count
      Restaurant.countDocuments({ status: 'ACTIVE' }),
      // 5. Customer count
      User.countDocuments({ role: 'customer', isActive: true }),
    ]);

    const ordersByStatus = ordersByStatusRaw.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    return {
      ordersByStatus,
      todaysOrdersCount,
      totalRevenue,
      activeRestaurantsCount,
      customersCount,
    };
  }

  /**
   * List all admin orders with filters & pagination
   */
  static async getAllOrders({ status, restaurantId, customerId, startDate, endDate, page = 1, limit = 20 }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (status) query.status = status;
    if (restaurantId) query.restaurantId = restaurantId;
    if (customerId) query.customerId = customerId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [orders, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Order.countDocuments(query),
    ]);

    return {
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }
}

export default AdminService;
