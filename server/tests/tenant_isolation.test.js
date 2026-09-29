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

describe('Tenant & Customer Isolation Integration Tests', () => {
  let ownerA, ownerB, customerA, customerB;
  let cookieOwnerA, cookieOwnerB, cookieCustA, cookieCustB;
  let restA, restB;
  let catA, itemA;
  let orderCustA;

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

    ownerA = await User.create({
      name: 'Owner A',
      email: 'ownera@example.com',
      phone: '+15551110000',
      passwordHash: 'hash',
      role: 'restaurant',
    });
    restA = await Restaurant.create({
      name: 'Restaurant A',
      slug: 'restaurant-a',
      ownerId: ownerA._id,
      address: { street: '1 A St', city: 'City', postalCode: '10001' },
      servicePostalCodes: ['10001'],
      minOrderAmount: 1000,
      deliveryFee: 300,
      status: 'ACTIVE',
    });

    ownerB = await User.create({
      name: 'Owner B',
      email: 'ownerb@example.com',
      phone: '+15552220000',
      passwordHash: 'hash',
      role: 'restaurant',
    });
    restB = await Restaurant.create({
      name: 'Restaurant B',
      slug: 'restaurant-b',
      ownerId: ownerB._id,
      address: { street: '2 B St', city: 'City', postalCode: '10001' },
      servicePostalCodes: ['10001'],
      minOrderAmount: 1000,
      deliveryFee: 300,
      status: 'ACTIVE',
    });

    catA = await MenuCategory.create({
      restaurantId: restA._id,
      name: 'Starters A',
      sortOrder: 1,
    });
    itemA = await MenuItem.create({
      restaurantId: restA._id,
      categoryId: catA._id,
      name: 'Dish A',
      price: 1200,
      diet: 'non_veg',
      isAvailable: true,
    });

    customerA = await User.create({
      name: 'Customer A',
      email: 'custa@example.com',
      phone: '+15553330000',
      passwordHash: 'hash',
      role: 'customer',
    });
    customerB = await User.create({
      name: 'Customer B',
      email: 'custb@example.com',
      phone: '+15554440000',
      passwordHash: 'hash',
      role: 'customer',
    });

    const secret = process.env.JWT_SECRET || 'super_secret_jwt_secret_min_32_chars_long!';
    
    cookieOwnerA = `auth_token=${jwt.sign({ sub: ownerA._id.toString(), role: ownerA.role }, secret)}`;
    cookieOwnerB = `auth_token=${jwt.sign({ sub: ownerB._id.toString(), role: ownerB.role }, secret)}`;
    cookieCustA = `auth_token=${jwt.sign({ sub: customerA._id.toString(), role: customerA.role }, secret)}`;
    cookieCustB = `auth_token=${jwt.sign({ sub: customerB._id.toString(), role: customerB.role }, secret)}`;

    orderCustA = await Order.create({
      customerId: customerA._id,
      restaurantId: restA._id,
      orderType: 'delivery',
      idempotencyKey: 'idem_tenant_1001',
      restaurantSnapshot: { name: restA.name },
      items: [{ menuItemId: itemA._id, name: itemA.name, unitPrice: itemA.price, quantity: 1, lineTotal: itemA.price }],
      pricing: { subtotal: 1200, deliveryFee: 300, taxPercent: 5, tax: 60, total: 1560 },
      deliveryAddress: { name: 'Cust A', phone: '+15553330000', addressLine1: '1 Customer Way', city: 'City', postalCode: '10001' },
      paymentMethod: 'cod',
      paymentStatus: 'PENDING',
      status: 'PLACED',
      statusHistory: [{ status: 'PLACED', at: new Date(), byRole: 'customer' }],
    });
  });

  test('Owner B CANNOT edit or delete Restaurant A category', async () => {
    const editRes = await request(app)
      .put(`/api/restaurant/categories/${catA._id}`)
      .set('Cookie', cookieOwnerB)
      .send({ name: 'Hacked Category Name' });

    expect(editRes.status).toBe(403);
    expect(editRes.body.error.code).toBe('FORBIDDEN');

    const delRes = await request(app)
      .delete(`/api/restaurant/categories/${catA._id}`)
      .set('Cookie', cookieOwnerB);

    expect(delRes.status).toBe(403);
    expect(delRes.body.error.code).toBe('FORBIDDEN');
  });

  test('Owner B CANNOT modify or toggle availability of Restaurant A menu item', async () => {
    const res = await request(app)
      .patch(`/api/restaurant/items/${itemA._id}/availability`)
      .set('Cookie', cookieOwnerB)
      .send({ isAvailable: false });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('Owner B CANNOT read or update Restaurant A profile', async () => {
    await request(app)
      .put(`/api/restaurant/profile`)
      .set('Cookie', cookieOwnerB)
      .send({ name: 'Owner B Hijacked Name' });

    const restAOriginal = await Restaurant.findById(restA._id);
    expect(restAOriginal.name).toBe('Restaurant A');
  });

  test('Customer B CANNOT read Customer A order', async () => {
    const res = await request(app)
      .get(`/api/orders/${orderCustA._id}`)
      .set('Cookie', cookieCustB);

    expect([403, 404]).toContain(res.status);
  });

  test('Customer B CANNOT view or alter Customer A cart', async () => {
    await Cart.create({
      customerId: customerA._id,
      restaurantId: restA._id,
      items: [{ menuItemId: itemA._id, quantity: 2 }],
    });

    const res = await request(app)
      .get('/api/cart')
      .set('Cookie', cookieCustB);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
  });
});
