import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string({
    required_error: 'Name is required',
    invalid_type_error: 'Name must be a string',
  }).trim().min(1, 'Name cannot be empty').max(100, 'Name cannot exceed 100 characters'),
  
  email: z.string({
    required_error: 'Email is required',
    invalid_type_error: 'Email must be a string',
  }).trim().toLowerCase().email('Invalid email address format'),
  
  phone: z.string({
    required_error: 'Phone number is required',
    invalid_type_error: 'Phone number must be a string',
  }).trim().min(7, 'Phone number must be at least 7 digits').max(15, 'Phone number cannot exceed 15 digits'),
  
  password: z.string({
    required_error: 'Password is required',
    invalid_type_error: 'Password must be a string',
  }).min(10, 'Password must be at least 10 characters long').max(128, 'Password cannot exceed 128 characters'),
});

export const loginSchema = z.object({
  email: z.string({
    required_error: 'Email is required',
    invalid_type_error: 'Email must be a string',
  }).trim().toLowerCase().email('Invalid email address format'),
  
  password: z.string({
    required_error: 'Password is required',
    invalid_type_error: 'Password must be a string',
  }).min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string({
    required_error: 'Current password is required',
    invalid_type_error: 'Current password must be a string',
  }).min(1, 'Current password is required'),
  
  newPassword: z.string({
    required_error: 'New password is required',
    invalid_type_error: 'New password must be a string',
  }).min(10, 'New password must be at least 10 characters long').max(128, 'New password cannot exceed 128 characters'),
});
