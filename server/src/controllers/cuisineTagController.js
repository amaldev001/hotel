import CuisineTag from '../models/CuisineTag.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getCuisineTags = asyncHandler(async (req, res) => {
  const tags = await CuisineTag.find({ isActive: true }).sort({ name: 1 });
  res.status(200).json({ success: true, data: tags });
});

export const createCuisineTag = asyncHandler(async (req, res, next) => {
  const { name } = req.body;
  const existing = await CuisineTag.findOne({ name: name.trim() });
  if (existing) {
    return next(new AppError('Cuisine tag already exists', 409, 'IDEMPOTENCY_CONFLICT'));
  }

  const tag = await CuisineTag.create({ name: name.trim(), isActive: true });
  res.status(201).json({ success: true, data: tag });
});

export const updateCuisineTag = asyncHandler(async (req, res, next) => {
  const tag = await CuisineTag.findById(req.params.id);
  if (!tag) {
    return next(new AppError('Cuisine tag not found', 404, 'NOT_FOUND'));
  }

  Object.assign(tag, req.body);
  await tag.save();
  res.status(200).json({ success: true, data: tag });
});
