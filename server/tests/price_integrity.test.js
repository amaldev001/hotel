import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Restaurant from '../src/models/Restaurant.js';
import MenuCategory from '../src/models/MenuCategory.js';
import MenuItem from '../src/models/MenuItem.js';
import Cart from '../src/models/Cart.js';
import Address from '../src/models/Address.js';
import { connectTestDb, disconnectTestDb } from './setupDb.js';

describe('Price Integrity & Cart Validation Integration Tests', () => {
  let customer, cookieCust;
  let rest, cat, item;
  let validAddress, outOfAreaAddress;

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
    await Address.deleteMany({});

    rest = await Restaurant.create({
      name: 'Gourmet Bistro',
      slug: 'gourmet-bistro',
      ownerId: new mongoose.Types.ObjectId(),
      address: { street: '100 Main St', city: 'Metropolis', postalCode: '90210' },
      servicePostalCodes: ['90210', '90211'],
      minOrderAmount: 1500,
      deliveryFee: 400,
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
    item = await MenuItem.create({ restaurantId: rest._id, categoryId: cat._id, name: 'Steak', price: 2000, diet: 'non_veg', isAvailable: true });

    customer = await User.create({ name: 'Price Tester', email: 'pricetester@example.com', phone: '+15559990000', passwordHash: 'hash', role: 'customer' });
    
    validAddress = await Address.create({
      customerId: customer._id,
      label: 'Home',
      name: 'Price Tester',
      phone: '+15559990000',
      addressLine1: '101 Main St',
      city: 'Metropolis',
      state: 'NY',
      postalCode: '90210',
    });
    outOfAreaAddress = await Address.create({
      customerId: customer._id,
      label: 'Work',
      name: 'Price Tester',
      phone: '+15559990000',
      addressLine1: '999 Far Away',
      city: 'Metropolis',
      state: 'NY',
      postalCode: '99999',
    });

    const secret = process.env.JWT_SECRET || 'super_secret_jwt_secret_min_32_chars_long!';
    cookieCust = `auth_token=${jwt.sign({ sub: customer._id.toString(), role: customer.role }, secret)}`;
  });

  test('Client-sent prices/totals in quote/checkout are completely ignored in favor of DB calculations', async () => {
    await request(app)
      .post('/api/cart/items')
      .set('Cookie', cookieCust)
      .send({ menuItemId: item._id, quantity: 1 });

    const res = await request(app)
      .post('/api/checkout/quote')
      .set('Cookie', cookieCust)
      .send({
        addressId: validAddress._id,
        orderType: 'delivery',
        fakePrice: 100,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.pricing.subtotal).toBe(2000);
    expect(res.body.data.pricing.deliveryFee).toBe(400);
    expect(res.body.data.pricing.tax).toBe(100);
    expect(res.body.data.pricing.total).toBe(2500);
  });

  test('Changing item price in DB after adding to cart updates the server quote', async () => {
    await request(app)
      .post('/api/cart/items')
      .set('Cookie', cookieCust)
      .send({ menuItemId: item._id, quantity: 1 });

    const res1 = await request(app)
      .post('/api/checkout/quote')
      .set('Cookie', cookieCust)
      .send({ addressId: validAddress._id, orderType: 'delivery' });

    expect(res1.body.data.pricing.subtotal).toBe(2000);

    item.price = 2500;
    await item.save();

    const res2 = await request(app)
      .post('/api/checkout/quote')
      .set('Cookie', cookieCust)
      .send({ addressId: validAddress._id, orderType: 'delivery' });

    expect(res2.body.data.pricing.subtotal).toBe(2500);
  });

  test('Unavailable item rejects ordering capability (canPlaceOrder: false)', async () => {
    await request(app)
      .post('/api/cart/items')
      .set('Cookie', cookieCust)
      .send({ menuItemId: item._id, quantity: 1 });

    item.isAvailable = false;
    await item.save();

    const res = await request(app)
      .post('/api/checkout/quote')
      .set('Cookie', cookieCust)
      .send({ addressId: validAddress._id, orderType: 'delivery' });

    expect(res.body.data.canPlaceOrder).toBe(false);
    expect(res.body.data.blockReason).toBe('ITEM_UNAVAILABLE');
  });

  test('Subtotal below minimum order amount rejects ordering capability', async () => {
    const cheapItem = await MenuItem.create({ restaurantId: rest._id, categoryId: cat._id, name: 'Soda', price: 500, diet: 'veg', isAvailable: true });

    await request(app)
      .post('/api/cart/items')
      .set('Cookie', cookieCust)
      .send({ menuItemId: cheapItem._id, quantity: 1 });

    const res = await request(app)
      .post('/api/checkout/quote')
      .set('Cookie', cookieCust)
      .send({ addressId: validAddress._id, orderType: 'delivery' });

    expect(res.body.data.canPlaceOrder).toBe(false);
    expect(res.body.data.blockReason).toBe('MIN_ORDER_NOT_MET');
  });

  test('Out-of-area delivery address rejects ordering capability', async () => {
    await request(app)
      .post('/api/cart/items')
      .set('Cookie', cookieCust)
      .send({ menuItemId: item._id, quantity: 1 });

    const res = await request(app)
      .post('/api/checkout/quote')
      .set('Cookie', cookieCust)
      .send({ addressId: outOfAreaAddress._id, orderType: 'delivery' });

    expect(res.body.data.canPlaceOrder).toBe(false);
    expect(res.body.data.blockReason).toBe('OUT_OF_SERVICE_AREA');
  });

  test('Closed restaurant rejects ordering capability', async () => {
    rest.acceptingOrders = false;
    await rest.save();

    await request(app)
      .post('/api/cart/items')
      .set('Cookie', cookieCust)
      .send({ menuItemId: item._id, quantity: 1 });

    const res = await request(app)
      .post('/api/checkout/quote')
      .set('Cookie', cookieCust)
      .send({ addressId: validAddress._id, orderType: 'delivery' });

    expect(res.body.data.canPlaceOrder).toBe(false);
    expect(res.body.data.blockReason).toBe('RESTAURANT_CLOSED');
  });
});
