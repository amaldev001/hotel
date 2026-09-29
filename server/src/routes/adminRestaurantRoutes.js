import express from 'express';
import {
  createRestaurant,
  getAdminRestaurants,
  getAdminRestaurantById,
  updateRestaurantAdmin,
  toggleRestaurantStatus,
} from '../controllers/adminRestaurantController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import validate from '../middleware/validate.js';
import {
  createRestaurantAdminSchema,
  updateRestaurantOwnerSchema,
  toggleStatusSchema,
  restaurantIdParamsSchema,
} from '../validators/restaurantValidator.js';

const router = express.Router();

router.use(protect, restrictTo('admin'));

router.get('/', getAdminRestaurants);
router.post('/', validate({ body: createRestaurantAdminSchema }), createRestaurant);
router.get('/:id', validate({ params: restaurantIdParamsSchema }), getAdminRestaurantById);
router.put('/:id', validate({ params: restaurantIdParamsSchema, body: updateRestaurantOwnerSchema }), updateRestaurantAdmin);
router.patch('/:id/status', validate({ params: restaurantIdParamsSchema, body: toggleStatusSchema }), toggleRestaurantStatus);

export default router;
