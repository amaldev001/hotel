import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { formatDate } from '../utils/dateFormatter';
import Skeleton from '../components/common/Skeleton';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import Pagination from '../components/common/Pagination';
import { Bell, Check, ArrowRight } from 'lucide-react';

export const NotificationsPage = () => {
  const navigate = useNavigate();
  const { config } = useConfig();
  const { refreshNotifications } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotifications = (page = 1) => {
    setLoading(true);
    setError(null);

    api
      .get(`/notifications?page=${page}&limit=15`)
      .then((res) => {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unreadCount || 0);
        setPagination(res.data.pagination || { page: 1, totalPages: 1 });
      })
      .catch((err) => {
        setError(err.response?.data?.error?.message || 'Failed to fetch notifications');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      refreshNotifications();
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#f5ede6] flex items-center space-x-3">
          <Bell className="w-7 h-7 text-brand-500" />
          <span>Notifications</span>
        </h1>
        {unreadCount > 0 && (
          <span className="px-3 py-1 rounded-full bg-brand-900/30 text-brand-300 text-xs font-bold">
            {unreadCount} unread
          </span>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-20" count={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchNotifications} />
      ) : notifications.length === 0 ? (
        <EmptyState title="No notifications" message="You have no notifications at this time." />
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => (
            <div
              key={item._id}
              className={`p-4 rounded-2xl border transition-all flex items-start justify-between space-x-4 ${
                !item.isRead
                  ? 'bg-brand-950/20 border-brand-900/40'
                  : 'bg-[#191715] border-[#2a2724]'
              }`}
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-[#f5ede6]">{item.title}</h3>
                  {!item.isRead && (
                    <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-[#a89f91]">{item.message}</p>
                <p className="text-[11px] text-[#787065]">{formatDate(item.createdAt, config.timezone)}</p>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                {item.referenceId && (
                  <button
                    onClick={() => {
                      if (!item.isRead) handleMarkAsRead(item._id);
                      navigate(`/orders/${item.referenceId}`);
                    }}
                    className="p-2 rounded-lg text-brand-400 hover:bg-brand-950/40 min-h-touch min-w-touch flex items-center justify-center"
                    title="View Order"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                {!item.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(item._id)}
                    className="p-2 rounded-lg text-[#787065] hover:text-emerald-400 hover:bg-emerald-950/40 min-h-touch min-w-touch flex items-center justify-center"
                    title="Mark as Read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(p) => fetchNotifications(p)}
          />
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
