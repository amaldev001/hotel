import Restaurant from '../models/Restaurant.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { updateRestaurantByOwner } from '../services/restaurantService.js';

/**
 * @desc    Get assigned restaurant profile for logged-in restaurant owner
 * @route   GET /api/restaurant/profile
 * @access  Private (Restaurant Owner)
 */
export const getOwnerRestaurant = asyncHandler(async (req, res, next) => {
  const restaurant = await Restaurant.findOne({ ownerId: req.user._id }).populate('cuisineCategories', 'name');
  if (!restaurant) {
    return next(new AppError('No restaurant profile associated with this account', 404, 'NOT_FOUND'));
  }

  res.status(200).json({
    success: true,
    data: restaurant,
  });
});

/**
 * @desc    Update assigned restaurant profile for logged-in restaurant owner
 * @route   PUT /api/restaurant/profile
 * @access  Private (Restaurant Owner)
 */
export const updateOwnerRestaurant = asyncHandler(async (req, res) => {
  const updatedRestaurant = await updateRestaurantByOwner(req.user._id, req.body);
  res.status(200).json({
    success: true,
    data: updatedRestaurant,
  });
});
