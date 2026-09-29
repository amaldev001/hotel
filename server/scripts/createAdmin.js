import mongoose from 'mongoose';
import argon2 from 'argon2';
import dotenv from 'dotenv';
import env from '../src/config/env.js';
import User from '../src/models/User.js';

dotenv.config();

const createAdmin = async () => {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, ADMIN_PASSWORD } = process.env;

  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PHONE || !ADMIN_PASSWORD) {
    console.error('❌ Missing required environment variables for create-admin: ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, ADMIN_PASSWORD');
    process.exit(1);
  }

  if (ADMIN_PASSWORD.length < 10 || ADMIN_PASSWORD.length > 128) {
    console.error('❌ ADMIN_PASSWORD must be between 10 and 128 characters long.');
    process.exit(1);
  }

  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if an admin user already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('ℹ️ An admin account already exists. No action taken.');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Check if email is already taken
    const existingEmail = await User.findOne({ email: ADMIN_EMAIL.toLowerCase().trim() });
    if (existingEmail) {
      console.error(`❌ User with email "${ADMIN_EMAIL}" already exists.`);
      await mongoose.disconnect();
      process.exit(1);
    }

    // Hash password with Argon2id
    const passwordHash = await argon2.hash(ADMIN_PASSWORD, { type: argon2.argon2id });

    // Create admin user
    const admin = await User.create({
      name: ADMIN_NAME.trim(),
      email: ADMIN_EMAIL.toLowerCase().trim(),
      phone: ADMIN_PHONE.trim(),
      passwordHash,
      role: 'admin',
      status: 'ACTIVE',
      mustChangePassword: false,
    });

    console.log(`🎉 Admin user successfully created: ${admin.email}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

createAdmin();
