import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Restaurant from '../src/models/Restaurant.js';
import MenuCategory from '../src/models/MenuCategory.js';
import MenuItem from '../src/models/MenuItem.js';
import Order from '../src/models/Order.js';
import { runExpiryJob } from '../src/services/expiryJob.js';
import { connectTestDb, disconnectTestDb } from './setupDb.js';

describe('Payment Gateway & Webhook Integration Tests', () => {
  let customer, admin, cookieAdmin;
  let rest, cat, item;
  let pendingOrder;

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

    rest = await Restaurant.create({
      name: 'Payment Bistro',
      slug: 'payment-bistro',
      ownerId: new mongoose.Types.ObjectId(),
      address: { street: '100 Main St', city: 'Metropolis', postalCode: '90210' },
      servicePostalCodes: ['90210'],
      minOrderAmount: 1000,
      deliveryFee: 300,
      status: 'ACTIVE',
    });

    cat = await MenuCategory.create({ restaurantId: rest._id, name: 'Mains', sortOrder: 1 });
    item = await MenuItem.create({ restaurantId: rest._id, categoryId: cat._id, name: 'Pizza', price: 1500, diet: 'non_veg', isAvailable: true });

    customer = await User.create({ name: 'Payment Customer', email: 'paycust@example.com', phone: '+15557770000', passwordHash: 'hash', role: 'customer' });
    admin = await User.create({ name: 'Platform Admin', email: 'admin@example.com', phone: '+15550009999', passwordHash: 'hash', role: 'admin' });

    const secret = process.env.JWT_SECRET || 'super_secret_jwt_secret_min_32_chars_long!';
    cookieAdmin = `auth_token=${jwt.sign({ sub: admin._id.toString(), role: admin.role }, secret)}`;

    pendingOrder = await Order.create({
      customerId: customer._id,
      restaurantId: rest._id,
      orderType: 'delivery',
      idempotencyKey: 'idem_pay_1001',
      restaurantSnapshot: { name: rest.name },
      items: [{ menuItemId: item._id, name: item.name, unitPrice: item.price, quantity: 1, lineTotal: item.price }],
      pricing: { subtotal: 1500, deliveryFee: 300, taxPercent: 5, tax: 75, total: 1875 },
      deliveryAddress: { name: 'Pay Cust', phone: '+15557770000', addressLine1: '101 Main St', city: 'Metropolis', postalCode: '90210' },
      paymentMethod: 'online',
      paymentStatus: 'PENDING',
      status: 'PAYMENT_PENDING',
      statusHistory: [{ status: 'PAYMENT_PENDING', at: new Date(), byRole: 'customer' }],
    });
  });

  test('Webhook with bad signature returns 400 and modifies nothing', async () => {
    const payload = JSON.stringify({
      id: 'evt_invalid_1',
      type: 'checkout.session.completed',
      data: { object: { id: pendingOrder._id.toString(), amount_total: 1875, currency: 'usd' } },
    });

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', 't=123456,v1=invalid_signature_hash')
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(res.status).toBe(400);

    const checkOrder = await Order.findById(pendingOrder._id);
    expect(checkOrder.paymentStatus).toBe('PENDING');
  });

  test('Valid payment webhook updates order to COMPLETED paymentStatus and PLACED status', async () => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret_key';

    const payloadObj = {
      id: 'evt_valid_100',
      type: 'checkout.session.completed',
      data: { object: { id: pendingOrder._id.toString(), amount_total: 1875, currency: 'usd' } },
    };
    const payloadStr = JSON.stringify(payloadObj);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(`${timestamp}.${payloadStr}`)
      .digest('hex');

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', `t=${timestamp},v1=${signature}`)
      .set('Content-Type', 'application/json')
      .send(payloadStr);

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);

    const updatedOrder = await Order.findById(pendingOrder._id);
    expect(['COMPLETED', 'PAID']).toContain(updatedOrder.paymentStatus);
    expect(updatedOrder.status).toBe('PLACED');
  });

  test('Replayed webhook with identical eventId does not execute duplicate processing', async () => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret_key';

    const payloadObj = {
      id: 'evt_replay_200',
      type: 'checkout.session.completed',
      data: { object: { id: pendingOrder._id.toString(), amount_total: 1875, currency: 'usd' } },
    };
    const payloadStr = JSON.stringify(payloadObj);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(`${timestamp}.${payloadStr}`)
      .digest('hex');

    await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', `t=${timestamp},v1=${signature}`)
      .set('Content-Type', 'application/json')
      .send(payloadStr);

    const replayRes = await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', `t=${timestamp},v1=${signature}`)
      .set('Content-Type', 'application/json')
      .send(payloadStr);

    expect(replayRes.status).toBe(200);
    expect(replayRes.body.received).toBe(true);
  });

  test('Webhook with amount mismatch is rejected (paymentStatus set to FAILED)', async () => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret_key';

    const payloadObj = {
      id: 'evt_mismatch_300',
      type: 'checkout.session.completed',
      data: { object: { id: pendingOrder._id.toString(), amount_total: 500, currency: 'usd' } },
    };
    const payloadStr = JSON.stringify(payloadObj);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(`${timestamp}.${payloadStr}`)
      .digest('hex');

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', `t=${timestamp},v1=${signature}`)
      .set('Content-Type', 'application/json')
      .send(payloadStr);

    expect(res.status).toBe(200);
    const updatedOrder = await Order.findById(pendingOrder._id);
    expect(updatedOrder.paymentStatus).toBe('FAILED');
  });

  test('Unpaid order older than 15 minutes expires via background expiry job', async () => {
    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);

    // Create a separate order already backdated (Mongoose 8 blocks $set:{createdAt} in updateOne)
    const staleOrder = await Order.create({
      customerId: customer._id,
      restaurantId: rest._id,
      orderType: 'delivery',
      idempotencyKey: 'idem_expiry_stale_9999',
      restaurantSnapshot: { name: rest.name },
      items: [{ menuItemId: item._id, name: item.name, unitPrice: item.price, quantity: 1, lineTotal: item.price }],
      pricing: { subtotal: 1500, deliveryFee: 300, taxPercent: 5, tax: 75, total: 1875 },
      deliveryAddress: { name: 'Pay Cust', phone: '+15557770000', addressLine1: '101 Main St', city: 'Metropolis', postalCode: '90210' },
      paymentMethod: 'online',
      paymentStatus: 'PENDING',
      status: 'PAYMENT_PENDING',
      statusHistory: [{ status: 'PAYMENT_PENDING', at: twentyMinsAgo, byRole: 'customer' }],
      createdAt: twentyMinsAgo,
      updatedAt: twentyMinsAgo,
    });

    const jobResult = await runExpiryJob();
    expect(jobResult.expiredCount).toBe(1);

    const updatedOrder = await Order.findById(staleOrder._id);
    expect(updatedOrder.status).toBe('EXPIRED');
    expect(updatedOrder.paymentStatus).toBe('FAILED');
  });

  test('Cancelling a paid order sets paymentStatus to REFUND_PENDING, and refund trigger is idempotent', async () => {
    await Order.updateOne({ _id: pendingOrder._id }, { $set: { paymentStatus: 'COMPLETED', status: 'PLACED' } });

    const cancelRes = await request(app)
      .post(`/api/orders/${pendingOrder._id}/cancel`)
      .set('Cookie', cookieAdmin)
      .send({ reason: 'Admin cancelled order' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');
    expect(cancelRes.body.data.paymentStatus).toBe('REFUND_PENDING');

    const refundRes1 = await request(app)
      .post(`/api/admin/orders/${pendingOrder._id}/refund`)
      .set('Cookie', cookieAdmin);

    expect(refundRes1.status).toBe(200);
    expect(refundRes1.body.data.paymentStatus).toBe('REFUNDED');

    const refundRes2 = await request(app)
      .post(`/api/admin/orders/${pendingOrder._id}/refund`)
      .set('Cookie', cookieAdmin);

    expect(refundRes2.status).toBe(200);
    expect(refundRes2.body.data.paymentStatus).toBe('REFUNDED');
  });
});
