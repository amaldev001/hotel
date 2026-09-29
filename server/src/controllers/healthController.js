import { checkDBHealth } from '../config/db.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * @desc    Health check endpoint for database status
 * @route   GET /api/health
 * @access  Public
 */
export const getHealth = asyncHandler(async (req, res) => {
  const dbStatus = checkDBHealth();

  if (!dbStatus.connected) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_DISCONNECTED',
        message: 'Database is disconnected',
        details: dbStatus,
      },
    });
  }

  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    },
  });
});
