import { z } from 'zod';
import mongoose from 'mongoose';

export const objectIdSchema = z.string({
  required_error: 'ID is required',
  invalid_type_error: 'ID must be a string',
}).refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid ObjectId format',
});

export const paginationSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});
