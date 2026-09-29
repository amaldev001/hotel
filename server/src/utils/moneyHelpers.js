import env from '../config/env.js';

/**
 * Validates that a value is a non-negative integer (minor units).
 * @param {any} val 
 * @returns {boolean}
 */
export const isNonNegativeInteger = (val) => {
  return Number.isInteger(val) && val >= 0;
};

/**
 * Calculates tax integer in minor units using Math.floor(subtotal * taxPercent / 100).
 * Per D9 / AI-CODING-RULES.
 * @param {number} subtotal - Minor units integer
 * @param {number} [taxPercent] - Tax percent (defaults to env TAX_PERCENT)
 * @returns {number} Tax in minor units integer
 */
export const calculateTax = (subtotal, taxPercent = env.TAX_PERCENT) => {
  if (!isNonNegativeInteger(subtotal)) {
    throw new Error('Subtotal must be a non-negative integer');
  }
  return Math.floor((subtotal * taxPercent) / 100);
};

/**
 * Calculates order total integer in minor units.
 * total = subtotal + deliveryFee + tax
 * @param {number} subtotal 
 * @param {number} deliveryFee 
 * @param {number} tax 
 * @returns {number}
 */
export const calculateTotal = (subtotal, deliveryFee, tax) => {
  return subtotal + deliveryFee + tax;
};
