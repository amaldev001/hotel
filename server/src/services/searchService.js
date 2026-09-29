import Restaurant from '../models/Restaurant.js';
import MenuCategory from '../models/MenuCategory.js';
import MenuItem from '../models/MenuItem.js';
import CuisineTag from '../models/CuisineTag.js';
import AppError from '../utils/AppError.js';
import { escapeRegex } from '../utils/regexHelpers.js';
import { getDayOfWeekInAppTimezone, nowInAppTimezone, parseTimeToMinutes } from '../utils/timeHelpers.js';
import { parsePagination, formatPaginatedResponse } from '../utils/paginationHelpers.js';
import { sanitizePublicRestaurant } from './restaurantService.js';

/**
 * Calculates whether a restaurant is open RIGHT NOW in APP_TIMEZONE.
 * @param {object} restaurant 
 * @returns {boolean}
 */
export const isRestaurantOpenNow = (restaurant) => {
  if (!restaurant || restaurant.status !== 'ACTIVE' || !restaurant.acceptingOrders) {
    return false;
  }

  const hours = restaurant.operatingHours;
  if (!hours) return false;

  const currentDay = getDayOfWeekInAppTimezone();
  const daySchedule = hours[currentDay];

  if (!daySchedule || !daySchedule.isOpen) {
    return false;
  }

  const now = nowInAppTimezone();
  const currentMinutes = now.hour * 60 + now.minute;
  const openMinutes = parseTimeToMinutes(daySchedule.open);
  const closeMinutes = parseTimeToMinutes(daySchedule.close);

  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
};

/**
 * Search & filter active restaurants.
 */
export const searchRestaurants = async (query = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const { q, cuisine, postalCode, openNow, vegOnly, sort } = query;

  const filter = { status: 'ACTIVE' };

  if (q) {
    const escaped = escapeRegex(q);
    filter.$or = [
      { name: new RegExp(escaped, 'i') },
      { description: new RegExp(escaped, 'i') },
    ];
  }

  if (postalCode) {
    filter.servicePostalCodes = postalCode;
  }

  if (cuisine) {
    // If cuisine is a name string, find its ObjectId
    const cuisineDoc = await CuisineTag.findOne({ name: new RegExp(`^${escapeRegex(cuisine)}$`, 'i') });
    if (cuisineDoc) {
      filter.cuisineCategories = cuisineDoc._id;
    } else if (cuisine.match(/^[0-9a-fA-F]{24}$/)) {
      filter.cuisineCategories = cuisine;
    }
  }

  let sortOption = { name: 1 };
  if (sort === 'deliveryFee') sortOption = { deliveryFee: 1 };
  if (sort === 'minOrderAmount') sortOption = { minOrderAmount: 1 };
  if (sort === 'createdAt') sortOption = { createdAt: -1 };

  const allActive = await Restaurant.find(filter)
    .populate('cuisineCategories', 'name')
    .sort(sortOption);

  let processed = allActive.map((rest) => {
    const isOpen = isRestaurantOpenNow(rest);
    return sanitizePublicRestaurant(rest, isOpen);
  });

  if (openNow === 'true' || openNow === true) {
    processed = processed.filter((rest) => rest.openNow);
  }

  // If vegOnly filter, check if restaurant has veg items
  if (vegOnly === 'true' || vegOnly === true) {
    const vegRestaurantIds = await MenuItem.distinct('restaurantId', { diet: 'veg', isDeleted: false, isAvailable: true });
    const vegIdSet = new Set(vegRestaurantIds.map((id) => id.toString()));
    processed = processed.filter((rest) => vegIdSet.has(rest._id.toString()));
  }

  const total = processed.length;
  const paginatedData = processed.slice(skip, skip + limit);

  return formatPaginatedResponse(paginatedData, total, page, limit);
};

/**
 * Public restaurant details by ID.
 * Returns 404 if missing or SUSPENDED.
 */
export const getPublicRestaurantDetail = async (id) => {
  const restaurant = await Restaurant.findOne({ _id: id, status: 'ACTIVE' }).populate('cuisineCategories', 'name');
  if (!restaurant) {
    throw new AppError('Restaurant not found', 404, 'NOT_FOUND');
  }

  const openNow = isRestaurantOpenNow(restaurant);
  return sanitizePublicRestaurant(restaurant, openNow);
};

/**
 * Get restaurant menu grouped by category with item filters.
 */
export const getPublicRestaurantMenu = async (restaurantId, query = {}) => {
  const restaurant = await Restaurant.findOne({ _id: restaurantId, status: 'ACTIVE' }).populate('cuisineCategories', 'name');
  if (!restaurant) {
    throw new AppError('Restaurant not found', 404, 'NOT_FOUND');
  }

  const { q, diet, minPrice, maxPrice } = query;

  const itemFilter = {
    restaurantId,
    isDeleted: false,
    isAvailable: true,
  };

  if (q) {
    itemFilter.name = new RegExp(escapeRegex(q), 'i');
  }

  if (diet) {
    itemFilter.diet = diet;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    itemFilter.price = {};
    if (minPrice !== undefined) itemFilter.price.$gte = parseInt(minPrice, 10);
    if (maxPrice !== undefined) itemFilter.price.$lte = parseInt(maxPrice, 10);
  }

  const categories = await MenuCategory.find({ restaurantId, isActive: true }).sort({ sortOrder: 1, createdAt: 1 });
  const items = await MenuItem.find(itemFilter).sort({ createdAt: 1 });

  // Group items under category
  const groupedCategories = categories.map((cat) => {
    const categoryObj = cat.toObject();
    categoryObj.items = items.filter((item) => item.categoryId.toString() === cat._id.toString());
    return categoryObj;
  });

  const openNow = isRestaurantOpenNow(restaurant);

  return {
    restaurant: sanitizePublicRestaurant(restaurant, openNow),
    categories: groupedCategories,
  };
};

/**
 * Search items across open active restaurants.
 */
export const searchItemsAcrossOpenRestaurants = async (query = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const { q, diet, minPrice, maxPrice, sort } = query;

  // Find all active restaurants and filter open ones
  const activeRestaurants = await Restaurant.find({ status: 'ACTIVE', acceptingOrders: true });
  const openRestaurantIds = activeRestaurants
    .filter((rest) => isRestaurantOpenNow(rest))
    .map((rest) => rest._id);

  if (openRestaurantIds.length === 0) {
    return formatPaginatedResponse([], 0, page, limit);
  }

  const itemFilter = {
    restaurantId: { $in: openRestaurantIds },
    isDeleted: false,
    isAvailable: true,
  };

  if (q) {
    itemFilter.name = new RegExp(escapeRegex(q), 'i');
  }

  if (diet) {
    itemFilter.diet = diet;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    itemFilter.price = {};
    if (minPrice !== undefined) itemFilter.price.$gte = parseInt(minPrice, 10);
    if (maxPrice !== undefined) itemFilter.price.$lte = parseInt(maxPrice, 10);
  }

  let sortOption = { name: 1 };
  if (sort === 'price_asc') sortOption = { price: 1 };
  if (sort === 'price_desc') sortOption = { price: -1 };
  if (sort === 'prepTime') sortOption = { preparationTime: 1 };

  const [items, total] = await Promise.all([
    MenuItem.find(itemFilter)
      .populate('restaurantId', 'name deliveryFee minOrderAmount')
      .sort(sortOption)
      .skip(skip)
      .limit(limit),
    MenuItem.countDocuments(itemFilter),
  ]);

  return formatPaginatedResponse(items, total, page, limit);
};
