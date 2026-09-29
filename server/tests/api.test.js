import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Address from '../src/models/Address.js';

describe('API Foundation & Endpoint Integration Tests', () => {
  beforeAll(async () => {
    // Connect to test MongoDB database
    const testDbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/food_ordering_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(testDbUri);
    }
  });

  afterAll(async () => {
    // Clean test database and disconnect
    if (mongoose.connection.readyState !== 0) {
      await User.deleteMany({});
      await Address.deleteMany({});
      await mongoose.disconnect();
    }
  });

  describe('GET /api/config', () => {
    test('returns only public non-sensitive configuration', async () => {
      const res = await request(app).get('/api/config');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('currency');
      expect(res.body.data).toHaveProperty('timezone');
      expect(res.body.data).toHaveProperty('taxPercent');
      expect(res.body.data).not.toHaveProperty('jwtSecret');
      expect(res.body.data).not.toHaveProperty('stripeSecretKey');
    });
  });

  describe('GET /api/health', () => {
    test('checks database connection status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.database.connected).toBe(true);
    });
  });

  describe('Zod Input Validation & Type Safety', () => {
    test('rejects non-string object payloads like {"email": {"$gt": ""}} with 400 INVALID_INPUT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Origin', 'http://localhost:5173')
        .send({
          email: { $gt: '' },
          password: 'password123',
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_INPUT');
    });
  });

  describe('Auth & Profile Endpoints Flow', () => {
    const testUserData = {
      name: 'Test Customer',
      email: 'customer@example.com',
      phone: '+1234567890',
      password: 'SecurePassword123!',
    };
    let authCookie = '';

    test('POST /api/auth/register registers customer and returns httpOnly cookie', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Origin', 'http://localhost:5173')
        .send(testUserData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testUserData.email.toLowerCase());
      expect(res.body.data.role).toBe('customer'); // Role is customer only
      expect(res.body.data).not.toHaveProperty('passwordHash');

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('auth_token=');
      authCookie = cookies[0];
    });

    test('POST /api/auth/register prevents duplicate email registration (409 EMAIL_ALREADY_REGISTERED)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Origin', 'http://localhost:5173')
        .send(testUserData);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
    });

    test('POST /api/auth/login authenticates user and returns cookie', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Origin', 'http://localhost:5173')
        .send({
          email: testUserData.email,
          password: testUserData.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.headers['set-cookie']).toBeDefined();
    });

    test('GET /api/auth/me returns current user profile when cookie present', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [authCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testUserData.email.toLowerCase());
    });

    test('GET /api/profile returns user profile', async () => {
      const res = await request(app)
        .get('/api/profile')
        .set('Cookie', [authCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(testUserData.name);
    });

    test('Address CRUD enforces max 5 addresses per customer constraint', async () => {
      // Create 5 addresses
      for (let i = 1; i <= 5; i++) {
        const addressRes = await request(app)
          .post('/api/profile/addresses')
          .set('Origin', 'http://localhost:5173')
          .set('Cookie', [authCookie])
          .send({
            label: `Address ${i}`,
            name: `Recipient ${i}`,
            phone: '+1234567890',
            addressLine1: `${i} Main St`,
            city: 'Metropolis',
            state: 'NY',
            postalCode: '10001',
          });
        expect(addressRes.status).toBe(201);
      }

      // Attempting 6th address should fail with MAX_ADDRESSES_REACHED (400)
      const sixthRes = await request(app)
        .post('/api/profile/addresses')
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', [authCookie])
        .send({
          label: 'Address 6',
          name: 'Recipient 6',
          phone: '+1234567890',
          addressLine1: '6 Main St',
          city: 'Metropolis',
          state: 'NY',
          postalCode: '10001',
        });

      expect(sixthRes.status).toBe(400);
      expect(sixthRes.body.error.code).toBe('MAX_ADDRESSES_REACHED');
    });

    test('POST /api/auth/logout clears auth cookie', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', [authCookie]);

      expect(res.status).toBe(200);
      expect(res.headers['set-cookie'][0]).toContain('auth_token=;');
    });
  });
});
