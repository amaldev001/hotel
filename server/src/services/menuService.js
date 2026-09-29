import MenuCategory from '../models/MenuCategory.js';
import MenuItem from '../models/MenuItem.js';
import Restaurant from '../models/Restaurant.js';
import AppError from '../utils/AppError.js';
import defaultStorageProvider from '../providers/storageProvider.js';

/**
 * Helper to retrieve owner's restaurant ID.
 */
const getOwnerRestaurantId = async (ownerUserId) => {
  const restaurant = await Restaurant.findOne({ ownerId: ownerUserId });
  if (!restaurant) {
    throw new AppError('Assigned restaurant profile not found', 404, 'NOT_FOUND');
  }
  return restaurant._id;
};

// CATEGORY SERVICES
export const getOwnerCategories = async (ownerUserId) => {
  const restaurantId = await getOwnerRestaurantId(ownerUserId);
  return MenuCategory.find({ restaurantId }).sort({ sortOrder: 1, createdAt: 1 });
};

export const createOwnerCategory = async (ownerUserId, data) => {
  const restaurantId = await getOwnerRestaurantId(ownerUserId);
  return MenuCategory.create({ ...data, restaurantId });
};

export const updateOwnerCategory = async (ownerUserId, categoryId, data) => {
  const restaurantId = await getOwnerRestaurantId(ownerUserId);
  const category = await MenuCategory.findOne({ _id: categoryId, restaurantId });
  if (!category) {
    throw new AppError('Category not found or does not belong to your restaurant', 403, 'FORBIDDEN');
  }
  Object.assign(category, data);
  await category.save();
  return category;
};

export const deleteOwnerCategory = async (ownerUserId, categoryId) => {
  const restaurantId = await getOwnerRestaurantId(ownerUserId);
  const category = await MenuCategory.findOneAndDelete({ _id: categoryId, restaurantId });
  if (!category) {
    throw new AppError('Category not found or does not belong to your restaurant', 403, 'FORBIDDEN');
  }
  return category;
};

// MENU ITEM SERVICES
export const getOwnerItems = async (ownerUserId) => {
  const restaurantId = await getOwnerRestaurantId(ownerUserId);
  return MenuItem.find({ restaurantId, isDeleted: false })
    .populate('categoryId', 'name')
    .sort({ createdAt: -1 });
};

export const createOwnerItem = async (ownerUserId, data) => {
  const restaurantId = await getOwnerRestaurantId(ownerUserId);

  // Validate category belongs to this restaurant
  const category = await MenuCategory.findOne({ _id: data.categoryId, restaurantId });
  if (!category) {
    throw new AppError('Category not found or does not belong to your restaurant', 400, 'INVALID_INPUT');
  }

  return MenuItem.create({ ...data, restaurantId });
};

export const updateOwnerItem = async (ownerUserId, itemId, data) => {
  const restaurantId = await getOwnerRestaurantId(ownerUserId);
  const item = await MenuItem.findOne({ _id: itemId, restaurantId, isDeleted: false });
  if (!item) {
    throw new AppError('Menu item not found or does not belong to your restaurant', 403, 'FORBIDDEN');
  }

  if (data.categoryId) {
    const category = await MenuCategory.findOne({ _id: data.categoryId, restaurantId });
    if (!category) {
      throw new AppError('Category not found or does not belong to your restaurant', 400, 'INVALID_INPUT');
    }
  }

  // Delete old file if image updated
  if (data.image !== undefined && item.image && data.image !== item.image) {
    await defaultStorageProvider.deleteFile(item.image);
  }

  Object.assign(item, data);
  await item.save();
  return item;
};

export const toggleOwnerItemAvailability = async (ownerUserId, itemId, isAvailable) => {
  const restaurantId = await getOwnerRestaurantId(ownerUserId);
  const item = await MenuItem.findOne({ _id: itemId, restaurantId, isDeleted: false });
  if (!item) {
    throw new AppError('Menu item not found or does not belong to your restaurant', 403, 'FORBIDDEN');
  }
  item.isAvailable = isAvailable;
  await item.save();
  return item;
};

export const deleteOwnerItem = async (ownerUserId, itemId) => {
  const restaurantId = await getOwnerRestaurantId(ownerUserId);
  const item = await MenuItem.findOne({ _id: itemId, restaurantId, isDeleted: false });
  if (!item) {
    throw new AppError('Menu item not found or does not belong to your restaurant', 403, 'FORBIDDEN');
  }
  item.isDeleted = true;
  await item.save();
  return item;
};
