import express from 'express';
import {
  getRestaurants,
  getRestaurantById,
  getRestaurantMenu,
  searchItems,
} from '../controllers/publicCatalogController.js';
import validate from '../middleware/validate.js';
import { restaurantQuerySchema, menuQuerySchema, itemSearchQuerySchema } from '../validators/searchValidator.js';
import { restaurantIdParamsSchema } from '../validators/restaurantValidator.js';

const router = express.Router();

// GET /api/restaurants
router.get('/', validate({ query: restaurantQuerySchema }), getRestaurants);

// GET /api/restaurants/:id
router.get('/:id', validate({ params: restaurantIdParamsSchema }), getRestaurantById);

// GET /api/restaurants/:id/menu
router.get('/:id/menu', validate({ params: restaurantIdParamsSchema, query: menuQuerySchema }), getRestaurantMenu);

export default router;
