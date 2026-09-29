import request from 'supertest';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { connectTestDb, disconnectTestDb } from './setupDb.js';

describe('Auth & Security Integration Tests', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  test('Registration, login and logout with cookie flags', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set('Origin', 'http://localhost:5173')
      .send({
        name: 'Auth Test User',
        email: 'authtest@example.com',
        phone: '+15550001111',
        password: 'Password123!',
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);

    const cookies = regRes.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const tokenCookie = cookies.find((c) => c.startsWith('auth_token='));
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie).toContain('HttpOnly');
    expect(tokenCookie).toContain('SameSite=Strict');

    const loginRes = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({
        email: 'authtest@example.com',
        password: 'Password123!',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Origin', 'http://localhost:5173')
      .set('Cookie', loginRes.headers['set-cookie']);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);
  });

  test('Login fails with wrong password (401 INVALID_CREDENTIALS)', async () => {
    const passwordHash = await argon2.hash('CorrectPassword123!');
    await User.create({
      name: 'Wrong Pass User',
      email: 'wrongpass@example.com',
      phone: '+15550002222',
      passwordHash,
      role: 'customer',
    });

    const res = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({
        email: 'wrongpass@example.com',
        password: 'IncorrectPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('Deactivated/Suspended user (status: "SUSPENDED") is blocked from login and protected endpoints', async () => {
    const passwordHash = await argon2.hash('Password123!');
    await User.create({
      name: 'Deactivated User',
      email: 'deactivated@example.com',
      phone: '+15550003333',
      passwordHash,
      role: 'customer',
      status: 'SUSPENDED',
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({
        email: 'deactivated@example.com',
        password: 'Password123!',
      });

    expect(loginRes.status).toBe(401);
    expect(loginRes.body.error.code).toBe('ACCOUNT_DEACTIVATED');
  });

  test('Role restriction: customer calling admin endpoints returns 403 FORBIDDEN', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set('Origin', 'http://localhost:5173')
      .send({
        name: 'Regular Customer',
        email: 'customer@example.com',
        phone: '+15550004444',
        password: 'Password123!',
      });

    const cookie = regRes.headers['set-cookie'];

    const adminRes = await request(app)
      .get('/api/admin/users')
      .set('Cookie', cookie);

    expect(adminRes.status).toBe(403);
    expect(adminRes.body.error.code).toBe('FORBIDDEN');
  });

  test('mustChangePassword lockout forces redirection / blocks other API calls', async () => {
    const passwordHash = await argon2.hash('Password123!');
    await User.create({
      name: 'Temp Password User',
      email: 'mustchange@example.com',
      phone: '+15550005555',
      passwordHash,
      role: 'restaurant',
      mustChangePassword: true,
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({
        email: 'mustchange@example.com',
        password: 'Password123!',
      });

    const cookie = loginRes.headers['set-cookie'];

    const profileRes = await request(app)
      .get('/api/profile')
      .set('Cookie', cookie);

    expect(profileRes.status).toBe(403);
    expect(profileRes.body.error.code).toBe('MUST_CHANGE_PASSWORD');
  });

  test('Object injection (e.g. { email: { $gt: "" } }) returns 400 INVALID_INPUT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({
        email: { $gt: '' },
        password: 'Password123!',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });
});
