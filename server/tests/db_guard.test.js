import { validateDbNameIsTest } from './setupDb.js';

describe('Database Safety Lock', () => {
  test('refuses database connections where name does not end in _test', () => {
    expect(() => {
      validateDbNameIsTest('mongodb://localhost:27017/food_ordering_production');
    }).toThrow('[DB SAFETY LOCK] Refusing database connection');

    expect(() => {
      validateDbNameIsTest('mongodb://localhost:27017/my_app_db');
    }).toThrow('[DB SAFETY LOCK] Refusing database connection');
  });

  test('accepts database connections where name ends in _test', () => {
    expect(validateDbNameIsTest('mongodb://localhost:27017/food_ordering_test')).toBe(true);
    expect(validateDbNameIsTest('mongodb://localhost:27017/integration_test')).toBe(true);
  });
});
