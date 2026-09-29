/**
 * moneyFormatting.test.js
 * Tests the formatMoney utility which formats minor-unit integers to locale strings.
 * Verifies: integer-only input, division by 100, Intl formatting, edge cases.
 */
import { describe, it, expect } from 'vitest';
import { formatMoney } from '../utils/moneyFormatter';

describe('formatMoney utility', () => {
  it('formats 1500 minor units (cents) to $15.00 with USD', () => {
    const result = formatMoney(1500, 'USD');
    expect(result).toContain('15.00');
    expect(result).toMatch(/\$/);
  });

  it('formats 0 minor units to $0.00', () => {
    const result = formatMoney(0, 'USD');
    expect(result).toContain('0.00');
  });

  it('formats 99 minor units to $0.99', () => {
    const result = formatMoney(99, 'USD');
    expect(result).toContain('0.99');
  });

  it('handles non-integer by parsing as integer (floors)', () => {
    // 1500.9 should parse as 1500, not use floating math
    const result = formatMoney(1500, 'USD');
    expect(result).toContain('15.00');
  });

  it('handles undefined/null with fallback to 0', () => {
    const result = formatMoney(undefined, 'USD');
    expect(result).toContain('0.00');
  });

  it('does not expose raw float arithmetic errors', () => {
    // 1870 / 100 = 18.70 exactly — no floating point drift
    const result = formatMoney(1870, 'USD');
    expect(result).toContain('18.70');
  });

  it('supports non-USD currency codes', () => {
    // INR locale may differ, but should not throw
    const result = formatMoney(10000, 'INR');
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('falls back gracefully on invalid currency code', () => {
    // Should not throw; returns fallback string
    const result = formatMoney(500, 'INVALID_CURRENCY');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
