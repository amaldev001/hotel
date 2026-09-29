import env from '../config/env.js';
import AppError from '../utils/AppError.js';

/**
 * Origin check middleware for state-changing HTTP requests (POST, PUT, PATCH, DELETE).
 * Provides CSRF defense-in-depth for httpOnly cookies.
 */
export const originCheck = (req, res, next) => {
  if (env.NODE_ENV === 'test') {
    return next();
  }

  const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  if (stateChangingMethods.includes(req.method)) {
    const origin = req.headers.origin;

    const isAllowed =
      origin === env.FRONTEND_ORIGIN ||
      (env.NODE_ENV === 'development' && /^http:\/\/localhost:(3000|3001|5173)$/.test(origin));

    if (!origin || !isAllowed) {
      return next(new AppError('Invalid or missing Origin header', 403, 'FORBIDDEN'));
    }
  }

  next();
};

export default originCheck;
