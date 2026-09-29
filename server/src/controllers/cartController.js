import asyncHandler from '../utils/asyncHandler.js';
import {
  getUserCart,
  addItemToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearUserCart,
  calculateCheckoutQuote,
} from '../services/cartService.js';

export const getCart = asyncHandler(async (req, res) => {
  const cart = await getUserCart(req.user._id);
  res.status(200).json({
    success: true,
    data: cart,
  });
});

export const addToCart = asyncHandler(async (req, res) => {
  const { menuItemId, quantity } = req.body;
  const cart = await addItemToCart(req.user._id, menuItemId, quantity);
  res.status(200).json({
    success: true,
    data: cart,
  });
});

export const updateCartItem = asyncHandler(async (req, res) => {
  const cart = await updateCartItemQuantity(req.user._id, req.params.id, req.body.quantity);
  res.status(200).json({
    success: true,
    data: cart,
  });
});

export const removeFromCart = asyncHandler(async (req, res) => {
  const cart = await removeCartItem(req.user._id, req.params.id);
  res.status(200).json({
    success: true,
    data: cart,
  });
});

export const clearCart = asyncHandler(async (req, res) => {
  const cart = await clearUserCart(req.user._id);
  res.status(200).json({
    success: true,
    data: cart,
  });
});

export const getQuote = asyncHandler(async (req, res) => {
  const quote = await calculateCheckoutQuote(req.user._id, req.body);
  res.status(200).json({
    success: true,
    data: quote,
  });
});
