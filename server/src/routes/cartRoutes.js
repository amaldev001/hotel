import express from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getQuote,
} from '../controllers/cartController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import validate from '../middleware/validate.js';
import { addToCartSchema, updateCartItemSchema, checkoutQuoteSchema } from '../validators/cartValidator.js';
import { menuItemIdParamsSchema } from '../validators/menuValidator.js';

const router = express.Router();

router.use(protect, restrictTo('customer'));

// Cart Endpoints (/api/cart)
router.get('/', getCart);
router.post('/items', validate({ body: addToCartSchema }), addToCart);
router.patch('/items/:id', validate({ params: menuItemIdParamsSchema, body: updateCartItemSchema }), updateCartItem);
router.delete('/items/:id', validate({ params: menuItemIdParamsSchema }), removeFromCart);
router.delete('/', clearCart);

export default router;
