import { z } from 'zod';

export const checkoutSchema = z.object({
  orderType: z.enum(['delivery', 'pickup'], {
    required_error: 'orderType must be either delivery or pickup',
  }),
  deliveryAddressId: z.string().optional(),
  paymentMethod: z.enum(['online', 'cod', 'pay_at_pickup'], {
    required_error: 'paymentMethod must be online, cod, or pay_at_pickup',
  }),
  note: z.string().max(200, 'Note must not exceed 200 characters').optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(
    [
      'PAYMENT_PENDING',
      'PLACED',
      'CONFIRMED',
      'PREPARING',
      'READY',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'COMPLETED',
      'REJECTED',
      'CANCELLED',
      'EXPIRED',
    ],
    { required_error: 'status is required' }
  ),
  reason: z.string().max(300, 'Reason must not exceed 300 characters').optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required').max(300, 'Reason must not exceed 300 characters'),
});

export const refundSchema = z.object({
  reason: z.string().max(300, 'Reason must not exceed 300 characters').optional(),
});

export const userStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive must be a boolean' }),
});
