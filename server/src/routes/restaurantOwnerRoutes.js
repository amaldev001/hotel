import express from 'express';
import { getOwnerRestaurant, updateOwnerRestaurant } from '../controllers/restaurantOwnerController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import validate from '../middleware/validate.js';
import { updateRestaurantOwnerSchema } from '../validators/restaurantValidator.js';

const router = express.Router();

router.use(protect, restrictTo('restaurant'));

router.get('/profile', getOwnerRestaurant);
router.put('/profile', validate({ body: updateRestaurantOwnerSchema }), updateOwnerRestaurant);

export default router;
