import env from '../config/env.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * @desc    Get public non-sensitive configuration settings
 * @route   GET /api/config
 * @access  Public
 */
export const getConfig = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      currency: env.CURRENCY,
      timezone: env.APP_TIMEZONE,
      taxPercent: env.TAX_PERCENT,
      appName: env.APP_NAME,
    },
  });
});
