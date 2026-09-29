import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Protect middleware:
 * 1. Extracts JWT from httpOnly cookie 'auth_token' (or Authorization Bearer header fallback if set).
 * 2. Verifies JWT signature using pinned algorithm HS256.
 * 3. Loads user from database and checks status === 'ACTIVE'.
 * 4. Enforces mustChangePassword lockout (blocking all routes except change-password, logout, me).
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token = req.cookies?.auth_token;

  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Authentication required. Please log in.', 401, 'UNAUTHORIZED'));
  }

  // Verify JWT using pinned algorithm HS256
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });

  // Load user from database
  const user = await User.findById(decoded.sub);
  if (!user) {
    return next(new AppError('The user belonging to this token no longer exists.', 401, 'UNAUTHORIZED'));
  }

  // Check if account is suspended / deactivated
  if (user.status !== 'ACTIVE') {
    return next(new AppError('Your account has been suspended.', 403, 'ACCOUNT_SUSPENDED'));
  }

  req.user = user;

  // Enforce mustChangePassword lockout [D2]
  if (user.mustChangePassword) {
    const allowedPaths = [
      '/api/auth/change-password',
      '/api/auth/logout',
      '/api/auth/me',
    ];
    // Check if current route is allowed
    const currentPath = req.originalUrl || req.path;
    const isAllowed = allowedPaths.some((allowed) => currentPath.startsWith(allowed));

    if (!isAllowed) {
      return next(new AppError('You must change your password before accessing other features.', 403, 'MUST_CHANGE_PASSWORD'));
    }
  }

  next();
});

/**
 * Restrict middleware to enforce role-based access control.
 * @param  {...string} roles - e.g. 'customer', 'restaurant', 'admin'
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403, 'FORBIDDEN'));
    }
    next();
  };
};

export const requireAuth = protect;
export const requireRole = restrictTo;

