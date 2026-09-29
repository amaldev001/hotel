import AdminService from '../services/adminService.js';
import OrderService from '../services/orderService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { userStatusSchema, refundSchema, cancelOrderSchema } from '../validators/orderValidator.js';

export const getUsers = asyncHandler(async (req, res) => {
  const { q, role, isActive, page, limit } = req.query;
  const result = await AdminService.getUsers({ q, role, isActive, page, limit });

  res.status(200).json({
    success: true,
    data: result.users,
    pagination: result.pagination,
  });
});

export const toggleUserStatus = asyncHandler(async (req, res) => {
  const validated = userStatusSchema.parse(req.body);
  const result = await AdminService.toggleUserStatus({
    targetUserId: req.params.id,
    isActive: validated.isActive,
    adminUser: req.user,
  });

  res.status(200).json({
    success: true,
    message: `User status updated to ${result.isActive ? 'active' : 'inactive'}`,
    data: result,
  });
});

export const getAllOrders = asyncHandler(async (req, res) => {
  const { status, restaurantId, customerId, startDate, endDate, page, limit } = req.query;
  const result = await AdminService.getAllOrders({
    status,
    restaurantId,
    customerId,
    startDate,
    endDate,
    page,
    limit,
  });

  res.status(200).json({
    success: true,
    data: result.orders,
    pagination: result.pagination,
  });
});

export const cancelOrderAdmin = asyncHandler(async (req, res) => {
  const validated = cancelOrderSchema.parse(req.body);
  const cancelledOrder = await OrderService.transitionOrderStatus({
    orderId: req.params.id,
    newStatus: 'CANCELLED',
    user: req.user,
    reason: validated.reason,
  });

  res.status(200).json({
    success: true,
    message: 'Order cancelled by admin',
    data: cancelledOrder,
  });
});

export const triggerRefund = asyncHandler(async (req, res) => {
  const validated = refundSchema.parse(req.body || {});
  const result = await AdminService.triggerRefund({
    orderId: req.params.id,
    adminUser: req.user,
    reason: validated.reason,
  });

  res.status(200).json({
    success: true,
    message: 'Refund processed successfully',
    data: result,
  });
});

export const getDashboardMetrics = asyncHandler(async (req, res) => {
  const metrics = await AdminService.getDashboardMetrics();

  res.status(200).json({
    success: true,
    data: metrics,
  });
});
