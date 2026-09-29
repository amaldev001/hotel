/**
 * cartMismatch.test.js
 * Tests cart restaurant mismatch logic:
 * - Adding items from Restaurant A then trying to add from Restaurant B triggers an error
 * - Cart can only belong to one restaurant at a time
 * - Error message is surfaced (not silently ignored)
 */
import { describe, it, expect } from 'vitest';

// Simulates the cart store / reducer logic
const createCartState = () => ({ restaurantId: null, items: [] });

const addItemToCart = (cart, { restaurantId, menuItemId, name, price, quantity = 1 }) => {
  // Cart is empty or same restaurant — allow
  if (!cart.restaurantId || cart.restaurantId === restaurantId) {
    return {
      success: true,
      cart: {
        restaurantId,
        items: [
          ...cart.items.filter((i) => i.menuItemId !== menuItemId),
          { menuItemId, name, price, quantity },
        ],
      },
      error: null,
    };
  }

  // Different restaurant — reject with CART_RESTAURANT_MISMATCH
  return {
    success: false,
    cart,
    error: {
      code: 'CART_RESTAURANT_MISMATCH',
      message:
        'Your cart already has items from another restaurant. Clear your cart to add items from this restaurant.',
    },
  };
};

describe('Cart restaurant mismatch logic', () => {
  it('allows adding first item to an empty cart', () => {
    const cart = createCartState();
    const result = addItemToCart(cart, {
      restaurantId: 'rest_A',
      menuItemId: 'item_1',
      name: 'Burger',
      price: 1200,
    });
    expect(result.success).toBe(true);
    expect(result.cart.restaurantId).toBe('rest_A');
    expect(result.cart.items).toHaveLength(1);
    expect(result.error).toBeNull();
  });

  it('allows adding another item from the same restaurant', () => {
    const cart = { restaurantId: 'rest_A', items: [{ menuItemId: 'item_1', name: 'Burger', price: 1200, quantity: 1 }] };
    const result = addItemToCart(cart, {
      restaurantId: 'rest_A',
      menuItemId: 'item_2',
      name: 'Fries',
      price: 500,
    });
    expect(result.success).toBe(true);
    expect(result.cart.items).toHaveLength(2);
  });

  it('rejects adding item from a different restaurant with CART_RESTAURANT_MISMATCH', () => {
    const cart = { restaurantId: 'rest_A', items: [{ menuItemId: 'item_1', name: 'Burger', price: 1200, quantity: 1 }] };
    const result = addItemToCart(cart, {
      restaurantId: 'rest_B',   // different restaurant!
      menuItemId: 'item_99',
      name: 'Pizza',
      price: 1500,
    });
    expect(result.success).toBe(false);
    expect(result.error).not.toBeNull();
    expect(result.error.code).toBe('CART_RESTAURANT_MISMATCH');
    expect(result.error.message).toContain('another restaurant');
  });

  it('does not mutate original cart on mismatch error', () => {
    const cart = { restaurantId: 'rest_A', items: [{ menuItemId: 'item_1', name: 'Burger', price: 1200, quantity: 1 }] };
    const result = addItemToCart(cart, { restaurantId: 'rest_B', menuItemId: 'item_5', name: 'Wrap', price: 900 });

    // Original cart unchanged
    expect(result.cart.restaurantId).toBe('rest_A');
    expect(result.cart.items).toHaveLength(1);
    expect(result.cart.items[0].menuItemId).toBe('item_1');
  });

  it('provides a user-visible error message (never empty) on mismatch', () => {
    const cart = { restaurantId: 'rest_X', items: [{ menuItemId: 'x1', name: 'Taco', price: 800, quantity: 1 }] };
    const result = addItemToCart(cart, { restaurantId: 'rest_Y', menuItemId: 'y1', name: 'Sushi', price: 2000 });

    expect(result.error.message).toBeTruthy();
    expect(result.error.message.length).toBeGreaterThan(10);
  });
});
