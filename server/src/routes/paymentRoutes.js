import express from 'express';
import { handlePaymentWebhook } from '../controllers/paymentController.js';

const router = express.Router();

// Webhook endpoint (unauthenticated public gateway hook with raw body signature check)
router.post('/webhook', handlePaymentWebhook);

export default router;
