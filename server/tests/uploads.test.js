import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Restaurant from '../src/models/Restaurant.js';
import { connectTestDb, disconnectTestDb } from './setupDb.js';

describe('File Upload Security Integration Tests', () => {
  let owner, cookieOwner;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Restaurant.deleteMany({});

    owner = await User.create({ name: 'Upload Owner', email: 'upowner@example.com', phone: '+15550007777', passwordHash: 'hash', role: 'restaurant' });

    const secret = process.env.JWT_SECRET || 'super_secret_jwt_secret_min_32_chars_long!';
    cookieOwner = `auth_token=${jwt.sign({ sub: owner._id.toString(), role: owner.role }, secret)}`;
  });

  test('Valid PNG buffer with correct magic bytes is accepted (201 Created)', async () => {
    // 16-byte PNG buffer matching 8-byte signature + IHDR chunk
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52
    ]);

    const res = await request(app)
      .post('/api/uploads/image')
      .set('Cookie', cookieOwner)
      .attach('image', pngBuffer, 'test_image.png');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.url).toMatch(/^\/uploads\/.+\.png$/);
  });

  test('SVG files are strictly rejected with 400 INVALID_FILE_TYPE', async () => {
    const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

    const res = await request(app)
      .post('/api/uploads/image')
      .set('Cookie', cookieOwner)
      .attach('image', svgBuffer, 'vector.svg');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  test('Fake file extension (executable payload renamed to .png) rejected via magic byte inspection', async () => {
    const fakeBuffer = Buffer.from('<?php echo "shell"; ?>');

    const res = await request(app)
      .post('/api/uploads/image')
      .set('Cookie', cookieOwner)
      .attach('image', fakeBuffer, 'malicious.png');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  test('Oversized file exceeding 2MB is rejected', async () => {
    const oversizedBuffer = Buffer.alloc(2.1 * 1024 * 1024, 0x89);
    oversizedBuffer[0] = 0x89;
    oversizedBuffer[1] = 0x50;
    oversizedBuffer[2] = 0x4e;
    oversizedBuffer[3] = 0x47;
    oversizedBuffer[4] = 0x0d;
    oversizedBuffer[5] = 0x0a;
    oversizedBuffer[6] = 0x1a;
    oversizedBuffer[7] = 0x0a;

    const res = await request(app)
      .post('/api/uploads/image')
      .set('Cookie', cookieOwner)
      .attach('image', oversizedBuffer, 'huge.png');

    expect(res.status).toBe(400);
    expect(['FILE_TOO_LARGE', 'LIMIT_FILE_SIZE']).toContain(res.body.error.code);
  });
});
