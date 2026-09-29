import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Restaurant from '../src/models/Restaurant.js';
import MenuCategory from '../src/models/MenuCategory.js';
import MenuItem from '../src/models/MenuItem.js';
import Cart from '../src/models/Cart.js';
import Order from '../src/models/Order.js';
import Address from '../src/models/Address.js';
import { connectTestDb, disconnectTestDb } from './setupDb.js';

describe('Checkout Idempotency & Concurrency Tests', () => {
  let customer, cookieCust;
  let rest, cat, item, address;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Restaurant.deleteMany({});
    await MenuCategory.deleteMany({});
    await MenuItem.deleteMany({});
    await Cart.deleteMany({});
    await Order.deleteMany({});
    await Address.deleteMany({});

    rest = await Restaurant.create({
      name: 'Idempotency Bistro',
      slug: 'idempotency-bistro',
      ownerId: new mongoose.Types.ObjectId(),
      address: { street: '100 Main St', city: 'Metropolis', postalCode: '90210' },
      servicePostalCodes: ['90210'],
      minOrderAmount: 1000,
      deliveryFee: 300,
      status: 'ACTIVE',
      acceptingOrders: true,
      operatingHours: {
        monday: { open: '00:00', close: '23:59', closed: false },
        tuesday: { open: '00:00', close: '23:59', closed: false },
        wednesday: { open: '00:00', close: '23:59', closed: false },
        thursday: { open: '00:00', close: '23:59', closed: false },
        friday: { open: '00:00', close: '23:59', closed: false },
        saturday: { open: '00:00', close: '23:59', closed: false },
        sunday: { open: '00:00', close: '23:59', closed: false },
      },
    });

    cat = await MenuCategory.create({ restaurantId: rest._id, name: 'Mains', sortOrder: 1 });
    item = await MenuItem.create({ restaurantId: rest._id, categoryId: cat._id, name: 'Pasta', price: 2000, diet: 'non_veg', isAvailable: true });

    customer = await User.create({ name: 'Checkout Tester', email: 'checkout@example.com', phone: '+15558880000', passwordHash: 'hash', role: 'customer' });
    address = await Address.create({
      customerId: customer._id,
      label: 'Home',
      name: 'Checkout Tester',
      phone: '+15558880000',
      addressLine1: '101 Main St',
      city: 'Metropolis',
      state: 'NY',
      postalCode: '90210',
    });

    const secret = process.env.JWT_SECRET || 'super_secret_jwt_secret_min_32_chars_long!';
    cookieCust = `auth_token=${jwt.sign({ sub: customer._id.toString(), role: customer.role }, secret)}`;

    await Cart.create({
      customerId: customer._id,
      restaurantId: rest._id,
      items: [{ menuItemId: item._id, quantity: 1 }],
    });
  });

  test('Submitting identical Idempotency-Key twice returns exact same order without creating second DB record', async () => {
    const key = `idem_key_seq_${Date.now()}`;

    const res1 = await request(app)
      .post('/api/checkout')
      .set('Cookie', cookieCust)
      .set('Idempotency-Key', key)
      .send({
        deliveryAddressId: address._id,
        orderType: 'delivery',
        paymentMethod: 'cod',
      });

    expect(res1.status).toBe(201);
    expect(res1.body.success).toBe(true);
    const orderId1 = res1.body.data.order._id;

    const res2 = await request(app)
      .post('/api/checkout')
      .set('Cookie', cookieCust)
      .set('Idempotency-Key', key)
      .send({
        deliveryAddressId: address._id,
        orderType: 'delivery',
        paymentMethod: 'cod',
      });

    expect(res2.status).toBe(200);
    expect(res2.body.data.order._id).toBe(orderId1);

    const orderCount = await Order.countDocuments({});
    expect(orderCount).toBe(1);
  });

  test('10 concurrent checkouts with identical Idempotency-Key produce exactly 1 order in DB', async () => {
    const key = `idem_key_concurrent_${Date.now()}`;

    const requests = Array.from({ length: 10 }).map(() =>
      request(app)
        .post('/api/checkout')
        .set('Cookie', cookieCust)
        .set('Idempotency-Key', key)
        .send({
          deliveryAddressId: address._id,
          orderType: 'delivery',
          paymentMethod: 'cod',
        })
    );

    const responses = await Promise.all(requests);

    responses.forEach((res) => {
      expect([200, 201, 409]).toContain(res.status);
    });

    const totalOrders = await Order.countDocuments({});
    expect(totalOrders).toBe(1);
  });
});
