import { z } from 'zod';
import { objectIdSchema } from './commonValidator.js';

export const updateProfileSchema = z.object({
  name: z.string({
    invalid_type_error: 'Name must be a string',
  }).trim().min(1, 'Name cannot be empty').max(100, 'Name cannot exceed 100 characters').optional(),

  phone: z.string({
    invalid_type_error: 'Phone number must be a string',
  }).trim().min(7, 'Phone number must be at least 7 digits').max(15, 'Phone number cannot exceed 15 digits').optional(),
});

export const addressSchema = z.object({
  label: z.string({
    invalid_type_error: 'Label must be a string',
  }).trim().min(1, 'Label cannot be empty').max(50, 'Label cannot exceed 50 characters').default('Home'),

  name: z.string({
    required_error: 'Recipient name is required',
    invalid_type_error: 'Recipient name must be a string',
  }).trim().min(1, 'Recipient name cannot be empty').max(100, 'Recipient name cannot exceed 100 characters'),

  phone: z.string({
    required_error: 'Phone number is required',
    invalid_type_error: 'Phone number must be a string',
  }).trim().regex(/^[+]*[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,14}$/, 'Invalid phone number format'),

  addressLine1: z.string({
    required_error: 'Address line 1 is required',
    invalid_type_error: 'Address line 1 must be a string',
  }).trim().min(1, 'Address line 1 cannot be empty').max(200, 'Address line 1 cannot exceed 200 characters'),

  addressLine2: z.string({
    invalid_type_error: 'Address line 2 must be a string',
  }).trim().max(200, 'Address line 2 cannot exceed 200 characters').optional().default(''),

  city: z.string({
    required_error: 'City is required',
    invalid_type_error: 'City must be a string',
  }).trim().min(1, 'City cannot be empty').max(100, 'City cannot exceed 100 characters'),

  state: z.string({
    required_error: 'State is required',
    invalid_type_error: 'State must be a string',
  }).trim().min(1, 'State cannot be empty').max(100, 'State cannot exceed 100 characters'),

  postalCode: z.string({
    required_error: 'Postal code is required',
    invalid_type_error: 'Postal code must be a string',
  }).trim().regex(/^[A-Za-z0-9\s-]{3,10}$/, 'Invalid postal code format'),

  landmark: z.string({
    invalid_type_error: 'Landmark must be a string',
  }).trim().max(100, 'Landmark cannot exceed 100 characters').optional().default(''),
});

export const addressIdParamsSchema = z.object({
  id: objectIdSchema,
});
