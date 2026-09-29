import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Restaurant from '../src/models/Restaurant.js';
import MenuItem from '../src/models/MenuItem.js';
import MenuCategory from '../src/models/MenuCategory.js';
import Cart from '../src/models/Cart.js';
import Address from '../src/models/Address.js';
import Order from '../src/models/Order.js';
import Payment from '../src/models/Payment.js';
import { runExpiryJob } from '../src/services/expiryJob.js';
import { OrderService } from '../src/services/orderService.js';
import { AdminService } from '../src/services/adminService.js';

describe('Orders, Payments & Admin API Integration Tests', () => {
  jest.setTimeout(30000);
  let customerUser, restaurantUser, adminUser;
  let restaurant, menuCategory, menuItem, customerAddress;

  beforeAll(async () => {
    const testDbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/food_ordering_orders_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(testDbUri);
    }

    await User.deleteMany({});
    await Restaurant.deleteMany({});
    await MenuCategory.deleteMany({});
    await MenuItem.deleteMany({});
    await Address.deleteMany({});
    await Cart.deleteMany({});
    await Order.deleteMany({});
    await Payment.deleteMany({});

    // 1. Create Customer
    customerUser = await User.create({
      name: 'Test Customer',
      email: `customer_${Date.now()}@example.com`,
      phone: `98765${Math.floor(10000 + Math.random() * 90000)}`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuuu',
      role: 'customer',
      isActive: true,
    });

    // 2. Create Restaurant Owner & Restaurant
    restaurantUser = await User.create({
      name: 'Test Owner',
      email: `owner_${Date.now()}@example.com`,
      phone: `98764${Math.floor(10000 + Math.random() * 90000)}`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuuu',
      role: 'restaurant',
      isActive: true,
    });

    restaurant = await Restaurant.create({
      name: 'Test Gourmet Kitchen',
      description: 'Fine dining delivery',
      ownerId: restaurantUser._id,
      cuisineTypes: ['Italian'],
      status: 'ACTIVE',
      isAcceptingOrders: true,
      servicePostalCodes: ['10001', '10002'],
      deliveryFee: 500,
      minOrderAmount: 1000,
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

    menuCategory = await MenuCategory.create({
      restaurantId: restaurant._id,
      name: 'Pizzas',
      displayOrder: 1,
    });

    menuItem = await MenuItem.create({
      restaurantId: restaurant._id,
      categoryId: menuCategory._id,
      name: 'Margherita Pizza',
      description: 'Classic cheese and tomato',
      price: 1500,
      diet: 'veg',
      isAvailable: true,
    });

    // 3. Create Admin
    adminUser = await User.create({
      name: 'System Admin',
      email: `admin_${Date.now()}@example.com`,
      phone: `98763${Math.floor(10000 + Math.random() * 90000)}`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuuu',
      role: 'admin',
      isActive: true,
    });

    // 4. Create Address for Customer
    customerAddress = await Address.create({
      customerId: customerUser._id,
      name: 'Home',
      phone: '9876543210',
      addressLine1: '123 Main St',
      city: 'Metropolis',
      state: 'NY',
      postalCode: '10001',
      isDefault: true,
    });
  }, 30000);

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await User.deleteMany({});
      await Restaurant.deleteMany({});
      await MenuCategory.deleteMany({});
      await MenuItem.deleteMany({});
      await Address.deleteMany({});
      await Cart.deleteMany({});
      await Order.deleteMany({});
      await Payment.deleteMany({});
      await mongoose.disconnect();
    }
  }, 30000);

  test('1. Idempotency-Key checkout double-submit returns identical order', async () => {
    // Populate Cart
    await Cart.create({
      customerId: customerUser._id,
      restaurantId: restaurant._id,
      items: [{ menuItemId: menuItem._id, quantity: 2 }],
    });

    const idempotencyKey = `key_${Date.now()}_abc`;

    // First checkout attempt via service
    const checkout1 = await OrderService.checkout({
      customerId: customerUser._id,
      idempotencyKey,
      orderType: 'delivery',
      deliveryAddressId: customerAddress._id.toString(),
      paymentMethod: 'online',
    });

    expect(checkout1.isExisting).toBe(false);
    expect(checkout1.order).toBeDefined();

    // Re-populate cart (or attempt double-submit with same key)
    const checkout2 = await OrderService.checkout({
      customerId: customerUser._id,
      idempotencyKey,
      orderType: 'delivery',
      deliveryAddressId: customerAddress._id.toString(),
      paymentMethod: 'online',
    });

    expect(checkout2.isExisting).toBe(true);
    expect(checkout2.order._id.toString()).toBe(checkout1.order._id.toString());
  });

  test('2. Webhook replay handles duplicate events idempotently', async () => {
    const providerOrderId = `pi_webhook_${Date.now()}`;
    const testOrder = await Order.create({
      customerId: customerUser._id,
      restaurantId: restaurant._id,
      orderType: 'delivery',
      idempotencyKey: `idempotent_hook_${Date.now()}`,
      restaurantSnapshot: { name: restaurant.name },
      items: [{ menuItemId: menuItem._id, name: menuItem.name, unitPrice: 1500, quantity: 1, lineTotal: 1500 }],
      pricing: { subtotal: 1500, deliveryFee: 500, taxPercent: 5, tax: 100, total: 2100 },
      paymentMethod: 'online',
      paymentStatus: 'PENDING',
      status: 'PAYMENT_PENDING',
      statusHistory: [{ status: 'PAYMENT_PENDING', at: new Date(), byRole: 'customer' }],
    });

    await Payment.create({
      orderId: testOrder._id,
      customerId: customerUser._id,
      provider: 'stripe',
      providerOrderId,
      amount: 2100,
      currency: 'USD',
      status: 'PENDING',
    });

    const rawPayload = JSON.stringify({
      id: `evt_test_${Date.now()}`,
      type: 'payment_intent.succeeded',
      providerOrderId,
      providerPaymentId: `pay_test_${Date.now()}`,
      amount: 2100,
      currency: 'USD',
      status: 'COMPLETED',
    });

    const res1 = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'valid_test_sig')
      .send(rawPayload);

    expect(res1.status).toBe(200);

    // Duplicate webhook replay
    const res2 = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'valid_test_sig')
      .send(rawPayload);

    expect(res2.status).toBe(200);
    expect(res2.body.data.duplicate).toBe(true);
  });

  test('3. Order Status State Machine Illegal Transition throws 409', async () => {
    const order = await Order.create({
      customerId: customerUser._id,
      restaurantId: restaurant._id,
      orderType: 'delivery',
      idempotencyKey: `idempotent_${Date.now()}`,
      restaurantSnapshot: { name: restaurant.name },
      items: [{ menuItemId: menuItem._id, name: menuItem.name, unitPrice: 1500, quantity: 1, lineTotal: 1500 }],
      pricing: { subtotal: 1500, deliveryFee: 500, taxPercent: 5, tax: 100, total: 2100 },
      paymentMethod: 'cod',
      paymentStatus: 'PENDING',
      status: 'PLACED',
      statusHistory: [{ status: 'PLACED', at: new Date(), byRole: 'customer' }],
    });

    await expect(
      OrderService.transitionOrderStatus({
        orderId: order._id,
        newStatus: 'DELIVERED',
        user: adminUser,
      })
    ).rejects.toThrow(/Cannot transition order/);
  });

  test('4. 15-minute background order expiry job', async () => {
    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);
    const expiredOrder = await Order.create({
      customerId: customerUser._id,
      restaurantId: restaurant._id,
      orderType: 'delivery',
      idempotencyKey: `idempotent_expired_${Date.now()}`,
      restaurantSnapshot: { name: restaurant.name },
      items: [{ menuItemId: menuItem._id, name: menuItem.name, unitPrice: 1500, quantity: 1, lineTotal: 1500 }],
      pricing: { subtotal: 1500, deliveryFee: 500, taxPercent: 5, tax: 100, total: 2100 },
      paymentMethod: 'online',
      paymentStatus: 'PENDING',
      status: 'PAYMENT_PENDING',
      createdAt: twentyMinsAgo,
      updatedAt: twentyMinsAgo,
    });

    const result = await runExpiryJob();
    expect(result.expiredCount).toBeGreaterThanOrEqual(1);

    const refreshedOrder = await Order.findById(expiredOrder._id);
    expect(refreshedOrder.status).toBe('EXPIRED');
    expect(refreshedOrder.paymentStatus).toBe('FAILED');
  });

  test('5. Admin User Status Toggle & Gateway Refund Processing', async () => {
    // Admin toggles user status
    const toggleRes = await AdminService.toggleUserStatus({
      targetUserId: customerUser._id,
      isActive: false,
      adminUser,
    });
    expect(toggleRes.isActive).toBe(false);

    // Create a REFUND_PENDING order
    const refundableOrder = await Order.create({
      customerId: customerUser._id,
      restaurantId: restaurant._id,
      orderType: 'delivery',
      idempotencyKey: `idempotent_refund_${Date.now()}`,
      restaurantSnapshot: { name: restaurant.name },
      items: [{ menuItemId: menuItem._id, name: menuItem.name, unitPrice: 1500, quantity: 1, lineTotal: 1500 }],
      pricing: { subtotal: 1500, deliveryFee: 500, taxPercent: 5, tax: 100, total: 2100 },
      paymentMethod: 'online',
      paymentStatus: 'REFUND_PENDING',
      status: 'CANCELLED',
      statusHistory: [{ status: 'CANCELLED', at: new Date(), byRole: 'admin', reason: 'Admin cancelled' }],
    });

    const refundRes = await AdminService.triggerRefund({
      orderId: refundableOrder._id,
      adminUser,
      reason: 'Test refund',
    });

    expect(refundRes.success).toBe(true);
    expect(refundRes.paymentStatus).toBe('REFUNDED');
  });
});
