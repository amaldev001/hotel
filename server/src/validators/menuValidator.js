import { z } from 'zod';
import { objectIdSchema } from './commonValidator.js';

export const categorySchema = z.object({
  name: z.string({
    required_error: 'Category name is required',
  }).trim().min(1, 'Category name cannot be empty').max(100),

  description: z.string().trim().max(300).optional().default(''),
  sortOrder: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const menuItemSchema = z.object({
  name: z.string({
    required_error: 'Menu item name is required',
  }).trim().min(1, 'Item name cannot be empty').max(100),

  description: z.string().trim().max(500).optional().default(''),

  categoryId: objectIdSchema,

  price: z.number({
    required_error: 'Price is required',
  }).int('Price must be an integer in minor currency units').min(1, 'Price must be at least 1 minor unit').max(1000000, 'Price exceeds maximum allowed bound'),

  image: z.string().nullable().optional(),

  diet: z.enum(['veg', 'non_veg'], {
    required_error: 'Diet must be veg or non_veg',
  }),

  isAvailable: z.boolean().optional().default(true),

  preparationTime: z.number().int('Preparation time must be integer minutes').min(1, 'Min 1 minute').max(180, 'Max 180 minutes').optional().default(15),
});

export const menuItemUpdateSchema = menuItemSchema.partial();

export const toggleAvailabilitySchema = z.object({
  isAvailable: z.boolean({
    required_error: 'isAvailable boolean is required',
  }),
});

export const menuItemIdParamsSchema = z.object({
  id: objectIdSchema,
});
