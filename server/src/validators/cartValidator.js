import { z } from 'zod';
import { objectIdSchema } from './commonValidator.js';

export const addToCartSchema = z.object({
  menuItemId: objectIdSchema,
  quantity: z.number({
    required_error: 'Quantity is required',
  }).int('Quantity must be an integer').min(1, 'Quantity must be at least 1').max(20, 'Quantity cannot exceed 20'),
});

export const updateCartItemSchema = z.object({
  quantity: z.number({
    required_error: 'Quantity is required',
  }).int('Quantity must be an integer').min(1, 'Quantity must be at least 1').max(20, 'Quantity cannot exceed 20'),
});

export const checkoutQuoteSchema = z.object({
  orderType: z.enum(['delivery', 'pickup'], {
    required_error: 'Order type must be delivery or pickup',
  }),
  addressId: objectIdSchema.optional(),
  postalCode: z.string().trim().optional(),
});
