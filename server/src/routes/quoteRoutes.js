import express from 'express';
import { getQuote } from '../controllers/cartController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import validate from '../middleware/validate.js';
import { checkoutQuoteSchema } from '../validators/cartValidator.js';

const router = express.Router();

router.post('/quote', protect, restrictTo('customer'), validate({ body: checkoutQuoteSchema }), getQuote);

export default router;
