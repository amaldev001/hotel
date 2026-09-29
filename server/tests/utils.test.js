import { AppError } from '../src/utils/AppError.js';
import { calculateTax, calculateTotal, isNonNegativeInteger } from '../src/utils/moneyHelpers.js';
import { parsePagination, formatPaginatedResponse } from '../src/utils/paginationHelpers.js';
import { escapeRegex } from '../src/utils/regexHelpers.js';
import { parseTimeToMinutes } from '../src/utils/timeHelpers.js';

describe('Utility Helpers Tests', () => {
  test('AppError sets properties correctly', () => {
    const err = new AppError('Invalid input provided', 400, 'INVALID_INPUT', { field: 'email' });
    expect(err.message).toBe('Invalid input provided');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('INVALID_INPUT');
    expect(err.details).toEqual({ field: 'email' });
    expect(err.isOperational).toBe(true);
  });

  test('moneyHelpers enforces non-negative integer math and tax formula', () => {
    expect(isNonNegativeInteger(100)).toBe(true);
    expect(isNonNegativeInteger(100.5)).toBe(false);
    expect(isNonNegativeInteger(-10)).toBe(false);

    // subtotal = 1000 minor units ($10.00), taxPercent = 5% => tax = floor(1000 * 5 / 100) = 50
    const tax = calculateTax(1000, 5);
    expect(tax).toBe(50);

    const total = calculateTotal(1000, 200, 50); // subtotal=1000, fee=200, tax=50 => 1250
    expect(total).toBe(1250);
  });

  test('paginationHelpers defaults and caps page/limit', () => {
    const defaultParsed = parsePagination({});
    expect(defaultParsed).toEqual({ page: 1, limit: 20, skip: 0 });

    const customParsed = parsePagination({ page: '2', limit: '50' });
    expect(customParsed).toEqual({ page: 2, limit: 50, skip: 50 });

    const cappedParsed = parsePagination({ page: '1', limit: '500' });
    expect(cappedParsed.limit).toBe(100);

    const envelope = formatPaginatedResponse(['a', 'b'], 50, 1, 20);
    expect(envelope).toEqual({
      success: true,
      data: ['a', 'b'],
      pagination: {
        page: 1,
        limit: 20,
        total: 50,
        totalPages: 3,
      },
    });
  });

  test('regexHelpers escapes special regex characters', () => {
    const unsafe = 'test.*+?^${}()|[]\\string';
    const safe = escapeRegex(unsafe);
    expect(safe).toBe('test\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\string');
  });

  test('timeHelpers parses HH:mm time to minutes', () => {
    expect(parseTimeToMinutes('09:30')).toBe(570);
    expect(parseTimeToMinutes('00:00')).toBe(0);
    expect(parseTimeToMinutes('23:59')).toBe(1439);
  });
});
