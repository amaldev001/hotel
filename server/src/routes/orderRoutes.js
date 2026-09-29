import express from 'express';
import { checkout, getCustomerOrders, getOrderById, updateOrderStatus, cancelOrder } from '../controllers/orderController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Customer Checkout
router.post('/checkout', requireAuth, requireRole('customer'), checkout);

// Order Listing & Details
router.get('/orders', requireAuth, getCustomerOrders);
router.get('/orders/:id', requireAuth, getOrderById);

// Order Status Advancement & Cancellation
router.patch('/orders/:id/status', requireAuth, updateOrderStatus);
router.post('/orders/:id/cancel', requireAuth, cancelOrder);

export default router;
