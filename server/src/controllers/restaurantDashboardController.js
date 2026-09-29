import RestaurantDashboardService from '../services/restaurantDashboardService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getDashboardMetrics = asyncHandler(async (req, res) => {
  const data = await RestaurantDashboardService.getDashboardMetrics(req.user._id);

  res.status(200).json({
    success: true,
    data,
  });
});
