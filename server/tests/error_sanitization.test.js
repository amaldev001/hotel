import request from 'supertest';
import app from '../src/app.js';
import { connectTestDb, disconnectTestDb } from './setupDb.js';

describe('Production Error Sanitization Integration Tests', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    process.env.NODE_ENV = originalEnv;
    await disconnectTestDb();
  });

  test('Error response in production mode excludes stack traces and database driver details', async () => {
    process.env.NODE_ENV = 'production';

    // Call route with invalid ID to trigger Mongoose CastError
    const res = await request(app)
      .get('/api/restaurants/invalid_object_id_string')
      .set('Origin', 'http://localhost:5173');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty('code');
    expect(res.body.error).toHaveProperty('message');
    
    // Must NOT contain stack or raw Mongoose driver internal messages
    expect(res.body.error).not.toHaveProperty('stack');
    expect(res.body.error.message).not.toContain('Cast to ObjectId failed');
    expect(res.body.error.message).not.toContain('mongoose');
  });
});
