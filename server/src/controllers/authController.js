import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

// Pre-computed dummy argon2 hash for constant-time check on unknown emails
const DUMMY_HASH = '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$W2N5Z+1P3J/0y111111111111111111111111111111';

/**
 * Helper to sign JWT and set httpOnly cookie
 */
const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign(
    { sub: user._id.toString(), role: user.role },
    env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '24h' }
  );

  const cookieOptions = {
    httpOnly: true,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
  };

  res.cookie('auth_token', token, cookieOptions);

  res.status(statusCode).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
};

/**
 * @desc    Customer self-registration
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = asyncHandler(async (req, res, next) => {
  const { name, email, phone, password } = req.body;

  // Check duplicate email
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('An account with this email address already exists.', 409, 'EMAIL_ALREADY_REGISTERED'));
  }

  // Hash password using Argon2id
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  // Create user (role is FORCED to customer per D2)
  const user = await User.create({
    name,
    email,
    phone,
    passwordHash,
    role: 'customer',
    status: 'ACTIVE',
    mustChangePassword: false,
  });

  sendTokenResponse(user, 201, res);
});

/**
 * @desc    Login user & issue JWT httpOnly cookie
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Find user and explicitly select passwordHash
  const user = await User.findOne({ email }).select('+passwordHash');

  let isMatch = false;
  if (!user) {
    // Constant-time execution path for unknown emails
    try {
      await argon2.verify(DUMMY_HASH, password);
    } catch (_err) {
      // ignore error
    }
    return next(new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS'));
  }

  isMatch = await argon2.verify(user.passwordHash, password);
  if (!isMatch) {
    return next(new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS'));
  }

  // Check account status
  if (user.status !== 'ACTIVE') {
    return next(new AppError('Your account has been deactivated or suspended.', 401, 'ACCOUNT_DEACTIVATED'));
  }

  sendTokenResponse(user, 200, res);
});

/**
 * @desc    Logout user & clear cookie
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = asyncHandler(async (req, res) => {
  res.cookie('auth_token', '', {
    httpOnly: true,
    expires: new Date(0),
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
  });

  res.status(200).json({
    success: true,
    data: { message: 'Logged out successfully' },
  });
});

/**
 * @desc    Get currently logged in user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = req.user;

  res.status(200).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
});

/**
 * @desc    Change password for authenticated user
 * @route   POST /api/auth/change-password
 * @access  Private
 */
export const changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+passwordHash');

  const isMatch = await argon2.verify(user.passwordHash, currentPassword);
  if (!isMatch) {
    return next(new AppError('Current password is incorrect.', 401, 'INVALID_CREDENTIALS'));
  }

  // Hash new password using Argon2id
  user.passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
  user.mustChangePassword = false;
  await user.save();

  res.status(200).json({
    success: true,
    data: { message: 'Password updated successfully' },
  });
});
