import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Restaurant from '../src/models/Restaurant.js';
import MenuCategory from '../src/models/MenuCategory.js';
import MenuItem from '../src/models/MenuItem.js';
import Order from '../src/models/Order.js';
import { connectTestDb, disconnectTestDb } from './setupDb.js';

describe('Order State Machine & Authorization Integration Tests', () => {
  let customer, owner, otherOwner, cookieCust, cookieOwner, cookieOtherOwner;
  let rest, cat, item;

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
    await Order.deleteMany({});

    owner = await User.create({ name: 'State Owner', email: 'owner@example.com', phone: '+15551111111', passwordHash: 'hash', role: 'restaurant' });
    otherOwner = await User.create({ name: 'Other Owner', email: 'otherowner@example.com', phone: '+15552222222', passwordHash: 'hash', role: 'restaurant' });
    customer = await User.create({ name: 'State Customer', email: 'cust@example.com', phone: '+15553333333', passwordHash: 'hash', role: 'customer' });

    rest = await Restaurant.create({
      name: 'State Bistro',
      slug: 'state-bistro',
      ownerId: owner._id,
      address: { street: '100 Main St', city: 'Metropolis', postalCode: '90210' },
      servicePostalCodes: ['90210'],
      minOrderAmount: 1000,
      deliveryFee: 300,
      status: 'ACTIVE',
    });

    cat = await MenuCategory.create({ restaurantId: rest._id, name: 'Mains', sortOrder: 1 });
    item = await MenuItem.create({ restaurantId: rest._id, categoryId: cat._id, name: 'Burger', price: 1000, diet: 'non_veg', isAvailable: true });

    const secret = process.env.JWT_SECRET || 'super_secret_jwt_secret_min_32_chars_long!';
    cookieOwner = `auth_token=${jwt.sign({ sub: owner._id.toString(), role: owner.role }, secret)}`;
    cookieOtherOwner = `auth_token=${jwt.sign({ sub: otherOwner._id.toString(), role: otherOwner.role }, secret)}`;
    cookieCust = `auth_token=${jwt.sign({ sub: customer._id.toString(), role: customer.role }, secret)}`;
  });

  test('Delivery order full valid transition path (PLACED -> CONFIRMED -> PREPARING -> READY -> OUT_FOR_DELIVERY -> DELIVERED)', async () => {
    const order = await Order.create({
      customerId: customer._id,
      restaurantId: rest._id,
      orderType: 'delivery',
      idempotencyKey: 'idem_state_1',
      restaurantSnapshot: { name: rest.name },
      items: [{ menuItemId: item._id, name: item.name, unitPrice: item.price, quantity: 1, lineTotal: 1000 }],
      pricing: { subtotal: 1000, deliveryFee: 300, taxPercent: 5, tax: 50, total: 1350 },
      deliveryAddress: { name: 'Cust', phone: '+15553333333', addressLine1: '101 Main St', city: 'Metropolis', postalCode: '90210' },
      paymentMethod: 'cod',
      paymentStatus: 'PENDING',
      status: 'PLACED',
      statusHistory: [{ status: 'PLACED', at: new Date(), byRole: 'customer' }],
    });

    const res1 = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set('Cookie', cookieOwner)
      .send({ status: 'CONFIRMED' });
    expect(res1.status).toBe(200);

    const res2 = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set('Cookie', cookieOwner)
      .send({ status: 'PREPARING' });
    expect(res2.status).toBe(200);

    const res3 = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set('Cookie', cookieOwner)
      .send({ status: 'READY' });
    expect(res3.status).toBe(200);

    const res4 = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set('Cookie', cookieOwner)
      .send({ status: 'OUT_FOR_DELIVERY' });
    expect(res4.status).toBe(200);

    const res5 = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set('Cookie', cookieOwner)
      .send({ status: 'DELIVERED' });
    expect(res5.status).toBe(200);
    expect(res5.body.data.status).toBe('DELIVERED');
  });

  test('Pickup order valid transition path (PLACED -> CONFIRMED -> PREPARING -> READY -> COMPLETED)', async () => {
    const order = await Order.create({
      customerId: customer._id,
      restaurantId: rest._id,
      orderType: 'pickup',
      idempotencyKey: 'idem_state_2',
      restaurantSnapshot: { name: rest.name },
      items: [{ menuItemId: item._id, name: item.name, unitPrice: item.price, quantity: 1, lineTotal: 1000 }],
      pricing: { subtotal: 1000, deliveryFee: 0, taxPercent: 5, tax: 50, total: 1050 },
      paymentMethod: 'pay_at_pickup',
      paymentStatus: 'PENDING',
      status: 'PLACED',
      statusHistory: [{ status: 'PLACED', at: new Date(), byRole: 'customer' }],
    });

    await request(app).patch(`/api/orders/${order._id}/status`).set('Cookie', cookieOwner).send({ status: 'CONFIRMED' });
    await request(app).patch(`/api/orders/${order._id}/status`).set('Cookie', cookieOwner).send({ status: 'PREPARING' });
    await request(app).patch(`/api/orders/${order._id}/status`).set('Cookie', cookieOwner).send({ status: 'READY' });
    
    const res = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set('Cookie', cookieOwner)
      .send({ status: 'COMPLETED' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('COMPLETED');
  });

  test('Invalid transition (e.g. PLACED -> DELIVERED) returns 409 INVALID_STATUS_TRANSITION', async () => {
    const order = await Order.create({
      customerId: customer._id,
      restaurantId: rest._id,
      orderType: 'delivery',
      idempotencyKey: 'idem_state_3',
      restaurantSnapshot: { name: rest.name },
      items: [{ menuItemId: item._id, name: item.name, unitPrice: item.price, quantity: 1, lineTotal: 1000 }],
      pricing: { subtotal: 1000, deliveryFee: 300, taxPercent: 5, tax: 50, total: 1350 },
      deliveryAddress: { name: 'Cust', phone: '+15553333333', addressLine1: '101 Main St', city: 'Metropolis', postalCode: '90210' },
      paymentMethod: 'cod',
      paymentStatus: 'PENDING',
      status: 'PLACED',
      statusHistory: [{ status: 'PLACED', at: new Date(), byRole: 'customer' }],
    });

    const res = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set('Cookie', cookieOwner)
      .send({ status: 'DELIVERED' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  test('Wrong actor attempting status transition gets 403 FORBIDDEN', async () => {
    const order = await Order.create({
      customerId: customer._id,
      restaurantId: rest._id,
      orderType: 'delivery',
      idempotencyKey: 'idem_state_4',
      restaurantSnapshot: { name: rest.name },
      items: [{ menuItemId: item._id, name: item.name, unitPrice: item.price, quantity: 1, lineTotal: 1000 }],
      pricing: { subtotal: 1000, deliveryFee: 300, taxPercent: 5, tax: 50, total: 1350 },
      deliveryAddress: { name: 'Cust', phone: '+15553333333', addressLine1: '101 Main St', city: 'Metropolis', postalCode: '90210' },
      paymentMethod: 'cod',
      paymentStatus: 'PENDING',
      status: 'PLACED',
      statusHistory: [{ status: 'PLACED', at: new Date(), byRole: 'customer' }],
    });

    const res = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set('Cookie', cookieOtherOwner)
      .send({ status: 'CONFIRMED' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('Customer CANNOT cancel order after it has been accepted (status = CONFIRMED)', async () => {
    const order = await Order.create({
      customerId: customer._id,
      restaurantId: rest._id,
      orderType: 'delivery',
      idempotencyKey: 'idem_state_5',
      restaurantSnapshot: { name: rest.name },
      items: [{ menuItemId: item._id, name: item.name, unitPrice: item.price, quantity: 1, lineTotal: 1000 }],
      pricing: { subtotal: 1000, deliveryFee: 300, taxPercent: 5, tax: 50, total: 1350 },
      deliveryAddress: { name: 'Cust', phone: '+15553333333', addressLine1: '101 Main St', city: 'Metropolis', postalCode: '90210' },
      paymentMethod: 'cod',
      paymentStatus: 'PENDING',
      status: 'CONFIRMED',
      statusHistory: [
        { status: 'PLACED', at: new Date(), byRole: 'customer' },
        { status: 'CONFIRMED', at: new Date(), byRole: 'restaurant' },
      ],
    });

    const res = await request(app)
      .post(`/api/orders/${order._id}/cancel`)
      .set('Cookie', cookieCust)
      .send({ reason: 'Changed my mind' });

    expect([403, 409]).toContain(res.status);
  });

  test('Cancellation requires non-empty reason string', async () => {
    const order = await Order.create({
      customerId: customer._id,
      restaurantId: rest._id,
      orderType: 'delivery',
      idempotencyKey: 'idem_state_6',
      restaurantSnapshot: { name: rest.name },
      items: [{ menuItemId: item._id, name: item.name, unitPrice: item.price, quantity: 1, lineTotal: 1000 }],
      pricing: { subtotal: 1000, deliveryFee: 300, taxPercent: 5, tax: 50, total: 1350 },
      deliveryAddress: { name: 'Cust', phone: '+15553333333', addressLine1: '101 Main St', city: 'Metropolis', postalCode: '90210' },
      paymentMethod: 'cod',
      paymentStatus: 'PENDING',
      status: 'PLACED',
      statusHistory: [{ status: 'PLACED', at: new Date(), byRole: 'customer' }],
    });

    const res = await request(app)
      .post(`/api/orders/${order._id}/cancel`)
      .set('Cookie', cookieCust)
      .send({ reason: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });
});
