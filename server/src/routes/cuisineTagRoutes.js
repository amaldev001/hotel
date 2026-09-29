import express from 'express';
import { getCuisineTags, createCuisineTag, updateCuisineTag } from '../controllers/cuisineTagController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getCuisineTags);
router.post('/', protect, restrictTo('admin'), createCuisineTag);
router.put('/:id', protect, restrictTo('admin'), updateCuisineTag);

export default router;
