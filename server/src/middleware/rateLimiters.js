import rateLimit from 'express-rate-limit';

const createCustomHandler = (message = 'Too many requests, please try again later.') => {
  return (req, res /*, next, options */) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message,
      },
    });
  };
};

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createCustomHandler('Global rate limit exceeded. Please try again later.'),
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createCustomHandler('Too many login attempts. Please try again after 15 minutes.'),
});

export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createCustomHandler('Too many registration attempts. Please try again after 15 minutes.'),
});
