import NotificationService from '../services/notificationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getUserNotifications = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await NotificationService.getUserNotifications({
    userId: req.user._id,
    page,
    limit,
  });

  res.status(200).json({
    success: true,
    data: result.notifications,
    unreadCount: result.unreadCount,
    pagination: result.pagination,
  });
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const result = await NotificationService.getUnreadCount(req.user._id);

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const markAsRead = asyncHandler(async (req, res) => {
  const updated = await NotificationService.markAsRead(req.params.id, req.user._id);

  res.status(200).json({
    success: true,
    message: 'Notification marked as read',
    data: updated,
  });
});
