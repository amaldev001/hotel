import Restaurant from '../models/Restaurant.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { parsePagination, formatPaginatedResponse } from '../utils/paginationHelpers.js';
import { createRestaurantWithOwner } from '../services/restaurantService.js';

/**
 * @desc    Admin provision new restaurant + owner user
 * @route   POST /api/admin/restaurants
 * @access  Private (Admin)
 */
export const createRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await createRestaurantWithOwner(req.body);
  res.status(201).json({
    success: true,
    data: restaurant,
  });
});

/**
 * @desc    Admin list all restaurants (paginated)
 * @route   GET /api/admin/restaurants
 * @access  Private (Admin)
 */
export const getAdminRestaurants = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  const [restaurants, total] = await Promise.all([
    Restaurant.find()
      .populate('ownerId', 'name email phone status')
      .populate('cuisineCategories', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Restaurant.countDocuments(),
  ]);

  res.status(200).json(formatPaginatedResponse(restaurants, total, page, limit));
});

/**
 * @desc    Admin get restaurant by ID
 * @route   GET /api/admin/restaurants/:id
 * @access  Private (Admin)
 */
export const getAdminRestaurantById = asyncHandler(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id)
    .populate('ownerId', 'name email phone status')
    .populate('cuisineCategories', 'name');

  if (!restaurant) {
    return next(new AppError('Restaurant not found', 404, 'NOT_FOUND'));
  }

  res.status(200).json({
    success: true,
    data: restaurant,
  });
});

/**
 * @desc    Admin update restaurant
 * @route   PUT /api/admin/restaurants/:id
 * @access  Private (Admin)
 */
export const updateRestaurantAdmin = asyncHandler(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) {
    return next(new AppError('Restaurant not found', 404, 'NOT_FOUND'));
  }

  Object.assign(restaurant, req.body);
  await restaurant.save();

  res.status(200).json({
    success: true,
    data: restaurant,
  });
});

/**
 * @desc    Admin toggle restaurant ACTIVE <-> SUSPENDED status
 * @route   PATCH /api/admin/restaurants/:id/status
 * @access  Private (Admin)
 */
export const toggleRestaurantStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) {
    return next(new AppError('Restaurant not found', 404, 'NOT_FOUND'));
  }

  restaurant.status = status;
  await restaurant.save();

  res.status(200).json({
    success: true,
    data: restaurant,
  });
});
