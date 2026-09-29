import { z } from 'zod';

export const restaurantQuerySchema = z.object({
  q: z.string().optional(),
  cuisine: z.string().optional(),
  postalCode: z.string().optional(),
  openNow: z.string().optional(),
  vegOnly: z.string().optional(),
  sort: z.enum(['name', 'deliveryFee', 'minOrderAmount', 'createdAt']).optional().default('name'),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const menuQuerySchema = z.object({
  q: z.string().optional(),
  diet: z.enum(['veg', 'non_veg']).optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
});

export const itemSearchQuerySchema = z.object({
  q: z.string().optional(),
  diet: z.enum(['veg', 'non_veg']).optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  sort: z.enum(['price_asc', 'price_desc', 'name', 'prepTime']).optional().default('name'),
  page: z.string().optional(),
  limit: z.string().optional(),
});
