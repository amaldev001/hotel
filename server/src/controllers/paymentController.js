import OrderService from '../services/orderService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const handlePaymentWebhook = asyncHandler(async (req, res) => {
  const signatureHeader =
    req.headers['stripe-signature'] ||
    req.headers['x-signature'] ||
    req.headers['x-razorpay-signature'] ||
    req.headers['signature'];

  // req.rawBody is captured by raw body middleware in app.js
  const rawBody = req.rawBody || req.body;

  const result = await OrderService.handlePaymentWebhook({
    rawBody,
    signatureHeader,
  });

  res.status(200).json({
    received: true,
    data: result,
  });
});
