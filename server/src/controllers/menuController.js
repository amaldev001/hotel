import asyncHandler from '../utils/asyncHandler.js';
import {
  getOwnerCategories,
  createOwnerCategory,
  updateOwnerCategory,
  deleteOwnerCategory,
  getOwnerItems,
  createOwnerItem,
  updateOwnerItem,
  toggleOwnerItemAvailability,
  deleteOwnerItem,
} from '../services/menuService.js';

// CATEGORY CONTROLLERS
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await getOwnerCategories(req.user._id);
  res.status(200).json({ success: true, data: categories });
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = await createOwnerCategory(req.user._id, req.body);
  res.status(201).json({ success: true, data: category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await updateOwnerCategory(req.user._id, req.params.id, req.body);
  res.status(200).json({ success: true, data: category });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  await deleteOwnerCategory(req.user._id, req.params.id);
  res.status(200).json({ success: true, data: { message: 'Category deleted successfully' } });
});

// ITEM CONTROLLERS
export const getItems = asyncHandler(async (req, res) => {
  const items = await getOwnerItems(req.user._id);
  res.status(200).json({ success: true, data: items });
});

export const createItem = asyncHandler(async (req, res) => {
  const item = await createOwnerItem(req.user._id, req.body);
  res.status(201).json({ success: true, data: item });
});

export const updateItem = asyncHandler(async (req, res) => {
  const item = await updateOwnerItem(req.user._id, req.params.id, req.body);
  res.status(200).json({ success: true, data: item });
});

export const toggleItemAvailability = asyncHandler(async (req, res) => {
  const item = await toggleOwnerItemAvailability(req.user._id, req.params.id, req.body.isAvailable);
  res.status(200).json({ success: true, data: item });
});

export const deleteItem = asyncHandler(async (req, res) => {
  await deleteOwnerItem(req.user._id, req.params.id);
  res.status(200).json({ success: true, data: { message: 'Menu item deleted successfully' } });
});
