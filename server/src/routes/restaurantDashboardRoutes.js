import express from 'express';
import { getDashboardMetrics } from '../controllers/restaurantDashboardController.js';
import { getRestaurantOrders } from '../controllers/orderController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('restaurant'));

router.get('/dashboard', getDashboardMetrics);
router.get('/orders', getRestaurantOrders);

export default router;
