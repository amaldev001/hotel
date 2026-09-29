import crypto from 'crypto';
import AppError from '../utils/AppError.js';

/**
 * Global Error Handling Middleware
 */
export const errorHandler = (err, req, res, _next) => {
  const requestId = req.requestId || crypto.randomUUID();
  let error = err;

  // Handle Mongoose / Zod Validation Error
  if (err.name === 'ValidationError' || err.name === 'ZodError') {
    const details = {};
    if (err.errors) {
      Object.keys(err.errors).forEach((key) => {
        details[key] = err.errors[key].message;
      });
    }
    if (err.issues) {
      err.issues.forEach((issue) => {
        details[issue.path.join('.')] = issue.message;
      });
    }
    error = new AppError('Validation failed', 400, 'INVALID_INPUT', details);
  }

  // Handle Mongoose CastError (e.g., invalid ObjectId)
  if (err.name === 'CastError') {
    error = new AppError(`Invalid ${err.path}: ${err.value}`, 400, 'INVALID_INPUT');
  }

  // Handle MongoDB Duplicate Key Error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const code = field === 'email' ? 'EMAIL_ALREADY_REGISTERED' : 'IDEMPOTENCY_CONFLICT';
    error = new AppError(`Duplicate value for ${field}`, 409, code);
  }

  // Handle JWT Errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid authentication token', 401, 'UNAUTHORIZED');
  }
  if (err.name === 'TokenExpiredError') {
    error = new AppError('Authentication token expired', 401, 'UNAUTHORIZED');
  }

  // Fallback for unhandled operational or non-operational errors
  const statusCode = error.statusCode || 500;
  const errorCode = error.code || 'INTERNAL_ERROR';
  const message = statusCode === 500 ? 'An internal server error occurred' : error.message;

  // Log actual internal error on server without leaking sensitive info
  if (statusCode === 500) {
    console.error(`[ERROR] RequestId: ${requestId}`, err);
  }

  const response = {
    success: false,
    error: {
      code: errorCode,
      message,
      ...(error.details ? { details: error.details } : {}),
      requestId,
    },
  };

  res.status(statusCode).json(response);
};

export default errorHandler;
