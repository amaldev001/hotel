import express from 'express';
import {
  getUsers,
  toggleUserStatus,
  getAllOrders,
  cancelOrderAdmin,
  triggerRefund,
  getDashboardMetrics,
} from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('admin'));

// Admin Dashboard Metrics
router.get('/dashboard', getDashboardMetrics);

// Users Management
router.get('/users', getUsers);
router.patch('/users/:id/status', toggleUserStatus);

// Orders Management & Refund Trigger
router.get('/orders', getAllOrders);
router.post('/orders/:id/cancel', cancelOrderAdmin);
router.post('/orders/:id/refund', triggerRefund);

export default router;
