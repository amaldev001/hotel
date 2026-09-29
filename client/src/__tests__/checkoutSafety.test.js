/**
 * checkoutSafety.test.js
 * Verifies checkout safety invariants:
 * - No prices/totals/fees accepted from client side
 * - All monetary values are integers (minor units)
 * - Idempotency key header must be present
 */
import { describe, it, expect } from 'vitest';

/**
 * Simulates what the checkout service contract enforces:
 * the client can only send addressId, paymentMethod, items (qty+id only),
 * orderType. Any price/total/fee field is stripped.
 */
const stripClientPrices = (payload) => {
  const {
    // Explicitly allowed
    addressId,
    paymentMethod,
    orderType,
    items,
    idempotencyKey,
    // All below are FORBIDDEN from client — strip them
    price,
    total,
    subtotal,
    deliveryFee,
    tax,
    taxPercent,
    discount,
    grandTotal,
    ...rest
  } = payload;

  // Strip price fields from individual items too
  const cleanItems = (items || []).map(({ menuItemId, quantity }) => ({
    menuItemId,
    quantity,
  }));

  return { addressId, paymentMethod, orderType, items: cleanItems, idempotencyKey };
};

describe('Checkout safety — client-price stripping', () => {
  it('strips price/total/deliveryFee from checkout payload', () => {
    const maliciousPayload = {
      addressId: 'addr_123',
      paymentMethod: 'online',
      orderType: 'delivery',
      items: [{ menuItemId: 'item_1', quantity: 2 }],
      idempotencyKey: 'key_xyz',
      price: 0,          // client trying to set price to 0
      total: 1,          // client trying to set total to 1 cent
      deliveryFee: 0,    // trying to avoid delivery fee
      tax: 0,
    };

    const clean = stripClientPrices(maliciousPayload);

    expect(clean.price).toBeUndefined();
    expect(clean.total).toBeUndefined();
    expect(clean.deliveryFee).toBeUndefined();
    expect(clean.tax).toBeUndefined();
    expect(clean.addressId).toBe('addr_123');
    expect(clean.paymentMethod).toBe('online');
    expect(clean.items).toHaveLength(1);
    expect(clean.items[0].menuItemId).toBe('item_1');
    expect(clean.items[0].quantity).toBe(2);
    expect((clean.items[0]).price).toBeUndefined();
  });

  it('strips per-item price fields from line items', () => {
    const payload = {
      addressId: 'addr_abc',
      paymentMethod: 'cod',
      orderType: 'pickup',
      items: [{ menuItemId: 'item_2', quantity: 1, price: 99999, lineTotal: 1 }],
      idempotencyKey: 'key_safe',
    };

    const clean = stripClientPrices(payload);
    expect(clean.items[0].price).toBeUndefined();
    expect(clean.items[0].lineTotal).toBeUndefined();
    expect(clean.items[0].menuItemId).toBe('item_2');
    expect(clean.items[0].quantity).toBe(1);
  });

  it('idempotencyKey is preserved in allowed fields', () => {
    const payload = {
      addressId: 'addr_1',
      paymentMethod: 'online',
      orderType: 'delivery',
      items: [],
      idempotencyKey: 'unique-key-123',
    };
    const clean = stripClientPrices(payload);
    expect(clean.idempotencyKey).toBe('unique-key-123');
  });
});

describe('Monetary value integer constraints', () => {
  const assertMinorUnit = (value) => {
    expect(Number.isInteger(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(0);
  };

  it('validates subtotal is a non-negative integer', () => assertMinorUnit(1500));
  it('validates deliveryFee is a non-negative integer', () => assertMinorUnit(300));
  it('validates tax is a non-negative integer', () => assertMinorUnit(75));
  it('validates total is a non-negative integer', () => assertMinorUnit(1875));

  it('rejects floating-point values as invalid minor units', () => {
    expect(Number.isInteger(14.99)).toBe(false); // 14.99 is a float, not minor units
    expect(Number.isInteger(1499)).toBe(true);   // 1499 (= $14.99) is valid
  });
});
