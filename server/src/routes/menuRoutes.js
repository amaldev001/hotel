import express from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getItems,
  createItem,
  updateItem,
  toggleItemAvailability,
  deleteItem,
} from '../controllers/menuController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import validate from '../middleware/validate.js';
import {
  categorySchema,
  menuItemSchema,
  menuItemUpdateSchema,
  toggleAvailabilitySchema,
  menuItemIdParamsSchema,
} from '../validators/menuValidator.js';

const router = express.Router();

router.use(protect, restrictTo('restaurant'));

// Categories
router.get('/categories', getCategories);
router.post('/categories', validate({ body: categorySchema }), createCategory);
router.put('/categories/:id', validate({ params: menuItemIdParamsSchema, body: categorySchema.partial() }), updateCategory);
router.delete('/categories/:id', validate({ params: menuItemIdParamsSchema }), deleteCategory);

// Menu Items
router.get('/items', getItems);
router.post('/items', validate({ body: menuItemSchema }), createItem);
router.put('/items/:id', validate({ params: menuItemIdParamsSchema, body: menuItemUpdateSchema }), updateItem);
router.patch('/items/:id/availability', validate({ params: menuItemIdParamsSchema, body: toggleAvailabilitySchema }), toggleItemAvailability);
router.delete('/items/:id', validate({ params: menuItemIdParamsSchema }), deleteItem);

export default router;
