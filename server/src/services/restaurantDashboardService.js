import Restaurant from '../models/Restaurant.js';
import Order from '../models/Order.js';
import { AppError } from '../utils/AppError.js';

export class RestaurantDashboardService {
  static async getDashboardMetrics(ownerId) {
    const restaurant = await Restaurant.findOne({ ownerId });
    if (!restaurant) {
      throw new AppError('Restaurant not found for user', 404, 'RESTAURANT_NOT_FOUND');
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      ordersByStatusRaw,
      todaysOrdersCount,
      revenueResult,
      incomingQueue,
    ] = await Promise.all([
      // 1. Orders count by status for this restaurant
      Order.aggregate([
        { $match: { restaurantId: restaurant._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // 2. Today's orders for this restaurant
      Order.countDocuments({
        restaurantId: restaurant._id,
        createdAt: { $gte: startOfToday },
      }),
      // 3. Revenue from paid orders for this restaurant (minor units)
      Order.aggregate([
        { $match: { restaurantId: restaurant._id, paymentStatus: 'COMPLETED' } },
        { $group: { _id: null, totalRevenue: { $sum: '$pricing.total' } } },
      ]),
      // 4. Active incoming orders queue
      Order.find({
        restaurantId: restaurant._id,
        status: { $in: ['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] },
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    const ordersByStatus = ordersByStatusRaw.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    return {
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        status: restaurant.status,
        isAcceptingOrders: restaurant.isAcceptingOrders,
      },
      metrics: {
        ordersByStatus,
        todaysOrdersCount,
        totalRevenue,
      },
      incomingQueue,
    };
  }
}

export default RestaurantDashboardService;
