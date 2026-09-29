import OrderService from '../services/orderService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { checkoutSchema, updateOrderStatusSchema, cancelOrderSchema } from '../validators/orderValidator.js';

export const checkout = asyncHandler(async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
  const validated = checkoutSchema.parse(req.body);

  const result = await OrderService.checkout({
    customerId: req.user._id,
    idempotencyKey,
    ...validated,
  });

  const statusCode = result.isExisting ? 200 : 201;

  res.status(statusCode).json({
    success: true,
    data: {
      order: result.order,
      isExisting: result.isExisting,
      paymentSession: result.paymentSession,
    },
  });
});

export const getCustomerOrders = asyncHandler(async (req, res) => {
  const { status, page, limit } = req.query;
  const result = await OrderService.getCustomerOrders({
    customerId: req.user._id,
    status,
    page,
    limit,
  });

  res.status(200).json({
    success: true,
    data: result.orders,
    pagination: result.pagination,
  });
});

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await OrderService.getOrderById({
    orderId: req.params.id,
    user: req.user,
  });

  res.status(200).json({
    success: true,
    data: order,
  });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const validated = updateOrderStatusSchema.parse(req.body);

  const updatedOrder = await OrderService.transitionOrderStatus({
    orderId: req.params.id,
    newStatus: validated.status,
    user: req.user,
    reason: validated.reason,
  });

  res.status(200).json({
    success: true,
    message: `Order status updated to ${updatedOrder.status}`,
    data: updatedOrder,
  });
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const validated = cancelOrderSchema.parse(req.body);

  const cancelledOrder = await OrderService.transitionOrderStatus({
    orderId: req.params.id,
    newStatus: 'CANCELLED',
    user: req.user,
    reason: validated.reason,
  });

  res.status(200).json({
    success: true,
    message: 'Order cancelled successfully',
    data: cancelledOrder,
  });
});

export const getRestaurantOrders = asyncHandler(async (req, res) => {
  const { status, startDate, endDate, page, limit } = req.query;
  const result = await OrderService.getRestaurantOrders({
    ownerId: req.user._id,
    status,
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
