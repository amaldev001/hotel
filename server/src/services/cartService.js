import Cart from '../models/Cart.js';
import MenuItem from '../models/MenuItem.js';
import Restaurant from '../models/Restaurant.js';
import Address from '../models/Address.js';
import AppError from '../utils/AppError.js';
import env from '../config/env.js';
import { calculateTax } from '../utils/moneyHelpers.js';
import { isRestaurantOpenNow } from './searchService.js';

/**
 * Retrieve populated user cart.
 */
export const getUserCart = async (customerId) => {
  const cart = await Cart.findOne({ customerId })
    .populate('restaurantId', 'name status acceptingOrders deliveryFee minOrderAmount servicePostalCodes operatingHours')
    .populate('items.menuItemId', 'name price image diet isAvailable isDeleted preparationTime');

  if (!cart) {
    return {
      items: [],
      restaurant: null,
    };
  }

  return cart;
};

/**
 * Add item to customer cart enforcing single-restaurant, max 30 lines, qty 1-20.
 */
export const addItemToCart = async (customerId, menuItemId, quantity) => {
  const menuItem = await MenuItem.findOne({ _id: menuItemId, isDeleted: false });
  if (!menuItem) {
    throw new AppError('Menu item not found', 404, 'ITEM_NOT_FOUND');
  }

  if (!menuItem.isAvailable) {
    throw new AppError('Menu item is currently unavailable', 409, 'ITEM_UNAVAILABLE');
  }

  const restaurant = await Restaurant.findById(menuItem.restaurantId);
  if (!restaurant || restaurant.status !== 'ACTIVE') {
    throw new AppError('Restaurant is currently inactive', 409, 'RESTAURANT_NOT_ELIGIBLE');
  }

  let cart = await Cart.findOne({ customerId });

  if (cart) {
    // Single-restaurant check per D6 / CUS-006
    if (cart.restaurantId.toString() !== menuItem.restaurantId.toString()) {
      throw new AppError('Cart contains items from a different restaurant. Clear cart before adding items from another restaurant.', 409, 'CART_RESTAURANT_MISMATCH');
    }

    const existingIndex = cart.items.findIndex((item) => item.menuItemId.toString() === menuItemId);

    if (existingIndex > -1) {
      const newQty = cart.items[existingIndex].quantity + quantity;
      if (newQty > 20) {
        throw new AppError('Item quantity cannot exceed 20 per line item', 400, 'CART_LIMIT_EXCEEDED');
      }
      cart.items[existingIndex].quantity = newQty;
    } else {
      if (cart.items.length >= 30) {
        throw new AppError('Cart cannot exceed 30 line items', 400, 'CART_LIMIT_EXCEEDED');
      }
      cart.items.push({ menuItemId, quantity });
    }
  } else {
    cart = new Cart({
      customerId,
      restaurantId: menuItem.restaurantId,
      items: [{ menuItemId, quantity }],
    });
  }

  await cart.save();
  return getUserCart(customerId);
};

/**
 * Update quantity of a single line item in cart.
 */
export const updateCartItemQuantity = async (customerId, menuItemId, quantity) => {
  const cart = await Cart.findOne({ customerId });
  if (!cart) {
    throw new AppError('Cart not found', 404, 'NOT_FOUND');
  }

  const itemIndex = cart.items.findIndex((item) => item.menuItemId.toString() === menuItemId);
  if (itemIndex === -1) {
    throw new AppError('Item not found in cart', 404, 'NOT_FOUND');
  }

  cart.items[itemIndex].quantity = quantity;
  await cart.save();

  return getUserCart(customerId);
};

/**
 * Remove line item from cart.
 */
export const removeCartItem = async (customerId, menuItemId) => {
  const cart = await Cart.findOne({ customerId });
  if (!cart) {
    throw new AppError('Cart not found', 404, 'NOT_FOUND');
  }

  cart.items = cart.items.filter((item) => item.menuItemId.toString() !== menuItemId);

  if (cart.items.length === 0) {
    await Cart.findOneAndDelete({ customerId });
    return { items: [], restaurant: null };
  }

  await cart.save();
  return getUserCart(customerId);
};

/**
 * Clear customer cart.
 */
export const clearUserCart = async (customerId) => {
  await Cart.findOneAndDelete({ customerId });
  return { items: [], restaurant: null };
};

/**
 * Compute checkout quote with full breakdown, per-line warnings, and ordering block rules.
 */
export const calculateCheckoutQuote = async (customerId, payload) => {
  const { orderType, addressId, postalCode: rawPostalCode } = payload;

  const cart = await Cart.findOne({ customerId });
  if (!cart || cart.items.length === 0) {
    throw new AppError('Cart is empty', 400, 'INVALID_INPUT');
  }

  const restaurant = await Restaurant.findById(cart.restaurantId);
  if (!restaurant || restaurant.status !== 'ACTIVE') {
    throw new AppError('Restaurant is no longer active', 409, 'RESTAURANT_NOT_ELIGIBLE');
  }

  let canPlaceOrder = true;
  let blockReason = null;
  const warnings = [];

  // Check restaurant open status & accepting orders
  const isOpen = isRestaurantOpenNow(restaurant);
  if (!isOpen) {
    canPlaceOrder = false;
    blockReason = 'RESTAURANT_CLOSED';
    warnings.push('Restaurant is currently closed or not accepting orders.');
  }

  // Check service postal code for delivery orders
  let effectivePostalCode = rawPostalCode;
  if (orderType === 'delivery' && !effectivePostalCode && addressId) {
    const address = await Address.findOne({ _id: addressId, customerId });
    if (address) {
      effectivePostalCode = address.postalCode;
    }
  }

  if (orderType === 'delivery') {
    if (!effectivePostalCode) {
      canPlaceOrder = false;
      blockReason = 'DELIVERY_ADDRESS_REQUIRED';
      warnings.push('Delivery address or postal code is required for delivery orders.');
    } else {
      const isEligiblePostalCode = (restaurant.servicePostalCodes || []).includes(effectivePostalCode.trim());
      if (!isEligiblePostalCode) {
        canPlaceOrder = false;
        blockReason = 'OUT_OF_SERVICE_AREA';
        warnings.push(`Postal code ${effectivePostalCode} is outside the restaurant's delivery service area.`);
      }
    }
  }

  // Re-verify line items server-side against MenuItem documents (NEVER trust client prices!)
  let subtotal = 0;
  const lines = [];

  for (const item of cart.items) {
    const menuItem = await MenuItem.findOne({ _id: item.menuItemId, isDeleted: false });

    let itemUnavailable = false;
    let priceChanged = false;

    if (!menuItem || !menuItem.isAvailable) {
      itemUnavailable = true;
      canPlaceOrder = false;
      if (!blockReason) blockReason = 'ITEM_UNAVAILABLE';
      warnings.push(`Item "${menuItem ? menuItem.name : 'Unknown'}" is unavailable.`);
    }

    const unitPrice = menuItem ? menuItem.price : 0;
    const lineTotal = unitPrice * item.quantity;
    subtotal += lineTotal;

    lines.push({
      menuItemId: item.menuItemId,
      name: menuItem ? menuItem.name : 'Unavailable Item',
      unitPrice,
      quantity: item.quantity,
      lineTotal,
      warnings: {
        unavailable: itemUnavailable,
        priceChanged,
      },
    });
  }

  // Check min order amount
  if (subtotal < restaurant.minOrderAmount) {
    canPlaceOrder = false;
    if (!blockReason) blockReason = 'MIN_ORDER_NOT_MET';
    warnings.push(`Subtotal (${subtotal}) is below restaurant minimum order amount (${restaurant.minOrderAmount}).`);
  }

  const deliveryFee = orderType === 'delivery' ? restaurant.deliveryFee : 0;
  const taxPercent = env.TAX_PERCENT;
  const tax = calculateTax(subtotal, taxPercent);
  const total = subtotal + deliveryFee + tax;

  return {
    canPlaceOrder,
    blockReason,
    warnings,
    restaurant: {
      _id: restaurant._id,
      name: restaurant.name,
      deliveryFee: restaurant.deliveryFee,
      minOrderAmount: restaurant.minOrderAmount,
    },
    orderType,
    effectivePostalCode: effectivePostalCode || null,
    lines,
    pricing: {
      subtotal,
      deliveryFee,
      taxPercent,
      tax,
      total,
    },
  };
};

export const CartService = {
  getUserCart,
  addItemToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart: clearUserCart,
  clearUserCart,
  calculateQuote: calculateCheckoutQuote,
  calculateCheckoutQuote,
};

export default CartService;
