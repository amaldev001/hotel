import request from 'supertest';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Restaurant from '../src/models/Restaurant.js';
import MenuCategory from '../src/models/MenuCategory.js';
import MenuItem from '../src/models/MenuItem.js';
import Cart from '../src/models/Cart.js';

describe('Catalog, Menu, Search, Upload & Cart Backend Tests', () => {
  let adminCookie = '';
  let ownerACookie = '';
  let ownerBCookie = '';
  let customerCookie = '';

  let restaurantAId = '';
  let restaurantBId = '';
  let categoryAId = '';
  let itemAId = '';
  let itemBId = '';

  beforeAll(async () => {
    const testDbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/food_ordering_catalog_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(testDbUri);
    }

    await User.deleteMany({});
    await Restaurant.deleteMany({});
    await MenuCategory.deleteMany({});
    await MenuItem.deleteMany({});
    await Cart.deleteMany({});

    const argon2 = (await import('argon2')).default;
    const adminHash = await argon2.hash('AdminPassword123!', { type: argon2.argon2id });

    // 1. Create Admin User
    await User.create({
      name: 'Admin User',
      email: 'admin@platform.com',
      phone: '+1000000000',
      passwordHash: adminHash,
      role: 'admin',
      status: 'ACTIVE',
    });

    const adminRes = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({ email: 'admin@platform.com', password: 'AdminPassword123!' });

    adminCookie = adminRes.headers['set-cookie'][0].split(';')[0];

    // 2. Register Customer
    const custReg = await request(app)
      .post('/api/auth/register')
      .set('Origin', 'http://localhost:5173')
      .send({
        name: 'Test Customer',
        email: 'customer@test.com',
        phone: '+1222333444',
        password: 'Password123!',
      });
    customerCookie = custReg.headers['set-cookie'][0].split(';')[0];
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await User.deleteMany({});
      await Restaurant.deleteMany({});
      await MenuCategory.deleteMany({});
      await MenuItem.deleteMany({});
      await Cart.deleteMany({});
      await mongoose.disconnect();
    }
  });

  describe('Admin Restaurant Creation & Owner Provisioning', () => {
    test('Admin provisions Restaurant A and owner A account with temporary password', async () => {
      const res = await request(app)
        .post('/api/admin/restaurants')
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', [adminCookie])
        .send({
          name: 'Pizzeria Bella',
          description: 'Authentic Italian Pizzas',
          ownerName: 'Mario Rossi',
          ownerEmail: 'mario@pizzeria.com',
          ownerPhone: '+1999888777',
          temporaryPassword: 'TempPassword123!',
          deliveryFee: 300, // $3.00 in minor units
          minOrderAmount: 1500, // $15.00 in minor units
          servicePostalCodes: ['10001', '10002'],
          operatingHours: {
            monday: { open: '00:00', close: '23:59', isOpen: true },
            tuesday: { open: '00:00', close: '23:59', isOpen: true },
            wednesday: { open: '00:00', close: '23:59', isOpen: true },
            thursday: { open: '00:00', close: '23:59', isOpen: true },
            friday: { open: '00:00', close: '23:59', isOpen: true },
            saturday: { open: '00:00', close: '23:59', isOpen: true },
            sunday: { open: '00:00', close: '23:59', isOpen: true },
          },
        });

      if (res.status !== 201) {
        console.error('CREATE RESTAURANT FAILED:', res.status, res.body);
      }

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Pizzeria Bella');
      expect(res.body.data).not.toHaveProperty('temporaryPassword');
      restaurantAId = res.body.data._id;

      // Verify owner user was created with mustChangePassword: true
      const ownerUser = await User.findOne({ email: 'mario@pizzeria.com' });
      expect(ownerUser).toBeDefined();
      expect(ownerUser.mustChangePassword).toBe(true);
      expect(ownerUser.role).toBe('restaurant');

      // Owner A logs in
      const ownerLogin = await request(app)
        .post('/api/auth/login')
        .set('Origin', 'http://localhost:5173')
        .send({ email: 'mario@pizzeria.com', password: 'TempPassword123!' });

      expect(ownerLogin.status).toBe(200);
      ownerACookie = ownerLogin.headers['set-cookie'][0].split(';')[0];
    });

    test('Owner A changes temporary password and clears mustChangePassword lockout', async () => {
      // Trying to access categories before change-password returns MUST_CHANGE_PASSWORD (403)
      const blockedRes = await request(app)
        .get('/api/restaurant/categories')
        .set('Cookie', [ownerACookie]);

      expect(blockedRes.status).toBe(403);
      expect(blockedRes.body.error.code).toBe('MUST_CHANGE_PASSWORD');

      // Change password
      const changeRes = await request(app)
        .post('/api/auth/change-password')
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', [ownerACookie])
        .send({
          currentPassword: 'TempPassword123!',
          newPassword: 'NewOwnerPassword123!',
        });

      expect(changeRes.status).toBe(200);

      // Now category access is granted
      const allowedRes = await request(app)
        .get('/api/restaurant/categories')
        .set('Cookie', [ownerACookie]);

      expect(allowedRes.status).toBe(200);
    });

    test('Admin provisions Restaurant B and Owner B', async () => {
      const res = await request(app)
        .post('/api/admin/restaurants')
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', [adminCookie])
        .send({
          name: 'Burger Haven',
          description: 'Juicy Gourmet Burgers',
          ownerName: 'Bob Burger',
          ownerEmail: 'bob@burgerhaven.com',
          ownerPhone: '+1888777666',
          temporaryPassword: 'TempPassword123!',
          deliveryFee: 400,
          minOrderAmount: 1000,
          servicePostalCodes: ['10001', '10003'],
        });

      expect(res.status).toBe(201);
      restaurantBId = res.body.data._id;

      // Owner B changes password
      const ownerBUser = await User.findOne({ email: 'bob@burgerhaven.com' });
      const argon2 = (await import('argon2')).default;
      ownerBUser.passwordHash = await argon2.hash('BobPassword123!', { type: argon2.argon2id });
      ownerBUser.mustChangePassword = false;
      await ownerBUser.save();

      const ownerBLogin = await request(app)
        .post('/api/auth/login')
        .set('Origin', 'http://localhost:5173')
        .send({ email: 'bob@burgerhaven.com', password: 'BobPassword123!' });

      ownerBCookie = ownerBLogin.headers['set-cookie'][0].split(';')[0];
    });
  });

  describe('Menu Scoping & Ownership Enforcement', () => {
    test('Owner A creates a category for Restaurant A', async () => {
      const res = await request(app)
        .post('/api/restaurant/categories')
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', [ownerACookie])
        .send({
          name: 'Pizzas',
          description: 'Wood-fired pizzas',
        });

      expect(res.status).toBe(201);
      categoryAId = res.body.data._id;
    });

    test('Owner A creates Menu Item A for Restaurant A', async () => {
      const res = await request(app)
        .post('/api/restaurant/items')
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', [ownerACookie])
        .send({
          name: 'Margherita Pizza',
          description: 'Classic cheese and tomato',
          categoryId: categoryAId,
          price: 1200, // $12.00
          diet: 'veg',
          isAvailable: true,
          preparationTime: 20,
        });

      expect(res.status).toBe(201);
      itemAId = res.body.data._id;
    });

    test('Owner B CANNOT modify or delete Restaurant A category (returns 403 FORBIDDEN)', async () => {
      const res = await request(app)
        .put(`/api/restaurant/categories/${categoryAId}`)
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', [ownerBCookie])
        .send({ name: 'Hacked Category' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('Owner B CANNOT modify or toggle availability of Restaurant A menu item (returns 403 FORBIDDEN)', async () => {
      const res = await request(app)
        .patch(`/api/restaurant/items/${itemAId}/availability`)
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', [ownerBCookie])
        .send({ isAvailable: false });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('Owner A quickly toggles item availability via PATCH', async () => {
      const res = await request(app)
        .patch(`/api/restaurant/items/${itemAId}/availability`)
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', [ownerACookie])
        .send({ isAvailable: true });

      expect(res.status).toBe(200);
      expect(res.body.data.isAvailable).toBe(true);
    });
  });

  describe('File Upload Security (PNG/JPEG vs SVG/Size)', () => {
    test('POST /api/uploads/image accepts valid PNG image buffer', async () => {
      // 8-byte PNG header buffer
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]);

      const res = await request(app)
        .post('/api/uploads/image')
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', [ownerACookie])
        .attach('image', pngBuffer, 'test.png');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.url).toMatch(/^\/uploads\//);
    });

    test('POST /api/uploads/image rejects SVG files with 400 INVALID_FILE_TYPE', async () => {
      const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

      const res = await request(app)
        .post('/api/uploads/image')
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', [ownerACookie])
        .attach('image', svgBuffer, 'vector.svg');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
    });
  });

  describe('Public Discovery & Search', () => {
    test('GET /api/restaurants returns active restaurants with public fields only (omits owner email/phone)', async () => {
      const res = await request(app).get('/api/restaurants');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      const restA = res.body.data.find((r) => r._id === restaurantAId);
      expect(restA).toBeDefined();
      expect(restA).not.toHaveProperty('ownerId');
      expect(restA).not.toHaveProperty('contact');
    });

    test('GET /api/restaurants/:id returns 404 if restaurant is SUSPENDED', async () => {
      // Admin suspends Restaurant B
      await request(app)
        .patch(`/api/admin/restaurants/${restaurantBId}/status`)
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', [adminCookie])
        .send({ status: 'SUSPENDED' });

      const res = await request(app).get(`/api/restaurants/${restaurantBId}`);
      expect(res.status).toBe(404);

      // Reactivate Restaurant B
      await request(app)
        .patch(`/api/admin/restaurants/${restaurantBId}/status`)
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', [adminCookie])
        .send({ status: 'ACTIVE' });
    });

    test('GET /api/restaurants/:id/menu groups items under categories', async () => {
      const res = await request(app).get(`/api/restaurants/${restaurantAId}/menu`);
      expect(res.status).toBe(200);
      expect(res.body.data.categories).toBeDefined();
      const pizzaCat = res.body.data.categories.find((c) => c._id === categoryAId);
      expect(pizzaCat).toBeDefined();
      expect(pizzaCat.items.length).toBe(1);
      expect(pizzaCat.items[0].name).toBe('Margherita Pizza');
    });
  });

  describe('Cart & Quote Engine', () => {
    test('Customer adds item from Restaurant A to cart', async () => {
      const res = await request(app)
        .post('/api/cart/items')
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', [customerCookie])
        .send({
          menuItemId: itemAId,
          quantity: 2,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBe(1);
    });

    test('Customer attempting to add item from Restaurant B triggers 409 CART_RESTAURANT_MISMATCH', async () => {
      // Create category & item for Restaurant B
      const catB = await MenuCategory.create({ restaurantId: restaurantBId, name: 'Burgers' });
      const itemB = await MenuItem.create({
        restaurantId: restaurantBId,
        categoryId: catB._id,
        name: 'Cheeseburger',
        price: 1000,
        diet: 'non_veg',
      });
      itemBId = itemB._id.toString();

      const res = await request(app)
        .post('/api/cart/items')
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', [customerCookie])
        .send({
          menuItemId: itemBId,
          quantity: 1,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CART_RESTAURANT_MISMATCH');
    });

    test('POST /api/checkout/quote calculates breakdown and blocks when subtotal < minOrderAmount', async () => {
      // Cart currently has 2 x Margherita Pizza (2 * 1200 = 2400 minor units = $24.00)
      // Restaurant A minOrderAmount = 1500 minor units ($15.00)
      // Delivery fee = 300 minor units ($3.00), Tax = 5% => floor(2400 * 5 / 100) = 120
      // Total = 2400 + 300 + 120 = 2820

      const res = await request(app)
        .post('/api/checkout/quote')
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', [customerCookie])
        .send({
          orderType: 'delivery',
          postalCode: '10001',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.canPlaceOrder).toBe(true);
      expect(res.body.data.pricing.subtotal).toBe(2400);
      expect(res.body.data.pricing.deliveryFee).toBe(300);
      expect(res.body.data.pricing.tax).toBe(120);
      expect(res.body.data.pricing.total).toBe(2820);

      // Now set item quantity to 1 (subtotal = 1200 < minOrderAmount 1500)
      await request(app)
        .patch(`/api/cart/items/${itemAId}`)
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', [customerCookie])
        .send({ quantity: 1 });

      const blockedRes = await request(app)
        .post('/api/checkout/quote')
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', [customerCookie])
        .send({
          orderType: 'delivery',
          postalCode: '10001',
        });

      expect(blockedRes.status).toBe(200);
      expect(blockedRes.body.data.canPlaceOrder).toBe(false);
      expect(blockedRes.body.data.blockReason).toBe('MIN_ORDER_NOT_MET');
    });

    test('POST /api/checkout/quote blocks ordering when postal code is outside service area', async () => {
      // Set qty back to 2
      await request(app)
        .patch(`/api/cart/items/${itemAId}`)
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', [customerCookie])
        .send({ quantity: 2 });

      const res = await request(app)
        .post('/api/checkout/quote')
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', [customerCookie])
        .send({
          orderType: 'delivery',
          postalCode: '99999', // Not in ['10001', '10002']
        });

      expect(res.status).toBe(200);
      expect(res.body.data.canPlaceOrder).toBe(false);
      expect(res.body.data.blockReason).toBe('OUT_OF_SERVICE_AREA');
    });
  });
});
