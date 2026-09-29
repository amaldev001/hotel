import { z } from 'zod';
import { objectIdSchema } from './commonValidator.js';

const timeStringSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:MM 24-hour format');

const dayScheduleSchema = z.object({
  open: timeStringSchema.default('09:00'),
  close: timeStringSchema.default('22:00'),
  isOpen: z.boolean().default(true),
});

export const operatingHoursSchema = z.object({
  monday: dayScheduleSchema.optional(),
  tuesday: dayScheduleSchema.optional(),
  wednesday: dayScheduleSchema.optional(),
  thursday: dayScheduleSchema.optional(),
  friday: dayScheduleSchema.optional(),
  saturday: dayScheduleSchema.optional(),
  sunday: dayScheduleSchema.optional(),
});

export const createRestaurantAdminSchema = z.object({
  name: z.string({
    required_error: 'Restaurant name is required',
  }).trim().min(1, 'Name cannot be empty').max(100, 'Name cannot exceed 100 characters'),

  description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional().default(''),

  ownerName: z.string({
    required_error: 'Owner display name is required',
  }).trim().min(1, 'Owner name cannot be empty').max(100),

  ownerEmail: z.string({
    required_error: 'Owner email is required',
  }).trim().toLowerCase().email('Invalid owner email address'),

  ownerPhone: z.string({
    required_error: 'Owner phone is required',
  }).trim().min(7, 'Phone number must be at least 7 digits').max(15),

  temporaryPassword: z.string({
    required_error: 'Temporary password is required as input for owner account',
  }).min(10, 'Temporary password must be at least 10 characters long').max(128, 'Temporary password cannot exceed 128 characters'),

  deliveryFee: z.number({
    required_error: 'Delivery fee is required',
  }).int('Delivery fee must be an integer minor unit').min(0, 'Delivery fee cannot be negative'),

  minOrderAmount: z.number({
    required_error: 'Minimum order amount is required',
  }).int('Minimum order amount must be an integer minor unit').min(0, 'Minimum order amount cannot be negative'),

  servicePostalCodes: z.array(z.string().trim().min(1)).optional().default([]),

  cuisineCategories: z.array(objectIdSchema).optional().default([]),

  address: z.object({
    addressLine1: z.string().optional().default(''),
    addressLine2: z.string().optional().default(''),
    city: z.string().optional().default(''),
    state: z.string().optional().default(''),
    postalCode: z.string().optional().default(''),
  }).optional().default({}),

  contact: z.object({
    phone: z.string().optional().default(''),
    email: z.string().optional().default(''),
  }).optional().default({}),

  operatingHours: operatingHoursSchema.optional(),
});

export const updateRestaurantOwnerSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  logo: z.string().nullable().optional(),
  banner: z.string().nullable().optional(),
  cuisineCategories: z.array(objectIdSchema).optional(),
  contact: z.object({
    phone: z.string().optional(),
    email: z.string().optional(),
  }).optional(),
  address: z.object({
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
  }).optional(),
  servicePostalCodes: z.array(z.string().trim().min(1)).optional(),
  deliveryFee: z.number().int().min(0).optional(),
  minOrderAmount: z.number().int().min(0).optional(),
  acceptingOrders: z.boolean().optional(),
  operatingHours: operatingHoursSchema.optional(),
});

export const toggleStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED'], {
    required_error: 'Status must be ACTIVE or SUSPENDED',
  }),
});

export const restaurantIdParamsSchema = z.object({
  id: objectIdSchema,
});
