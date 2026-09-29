import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { useConfig } from '../context/ConfigContext';
import { formatMoney } from '../utils/moneyFormatter';
import { formatDate } from '../utils/dateFormatter';
import Skeleton from '../components/common/Skeleton';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import StatusBadge from '../components/common/StatusBadge';
import Pagination from '../components/common/Pagination';
import { Clock, ShoppingBag, ArrowRight } from 'lucide-react';

export const OrdersPage = () => {
  const navigate = useNavigate();
  const { config } = useConfig();
  const [searchParams, setSearchParams] = useSearchParams();

  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (status) params.set('status', status);
    params.set('page', page.toString());
    params.set('limit', '10');

    api
      .get(`/orders?${params.toString()}`)
      .then((res) => {
        setOrders(res.data.data || []);
        setPagination(res.data.pagination || { page: 1, totalPages: 1 });
      })
      .catch((err) => {
        setError(err.response?.data?.error?.message || 'Failed to fetch order history');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders();
  }, [status, page]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#f5ede6] flex items-center space-x-3">
          <ShoppingBag className="w-7 h-7 text-brand-500" />
          <span>My Orders</span>
        </h1>

        {/* Status Filter */}
        <select
          value={status}
          onChange={(e) => {
            const params = new URLSearchParams(searchParams);
            if (e.target.value) params.set('status', e.target.value);
            else params.delete('status');
            params.set('page', '1');
            setSearchParams(params);
          }}
          className="rounded-xl border border-[#2a2724] bg-[#191715] text-sm px-3 py-2 text-[#f5ede6]"
        >
          <option value="">All Statuses</option>
          <option value="PAYMENT_PENDING">Payment Pending</option>
          <option value="PLACED">Placed</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PREPARING">Preparing</option>
          <option value="READY">Ready</option>
          <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
          <option value="DELIVERED">Delivered</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <Skeleton className="h-32" count={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchOrders} />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No orders found"
          message="You haven't placed any orders yet."
          actionLabel="Browse Restaurants"
          onAction={() => navigate('/restaurants')}
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order._id}
              onClick={() => navigate(`/orders/${order._id}`)}
              className="cursor-pointer bg-[#191715] p-5 rounded-2xl border border-[#2a2724] shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <h3 className="text-base font-bold text-[#f5ede6]">
                    {order.restaurantSnapshot?.name || 'Restaurant'}
                  </h3>
                  <StatusBadge status={order.status} />
                </div>

                <p className="text-xs text-[#787065]">
                  Order #{order._id} &bull; {formatDate(order.createdAt, config.timezone)}
                </p>

                <p className="text-xs text-[#a89f91] line-clamp-1 font-medium">
                  {order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                </p>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-[#2a2724]">
                <p className="text-base font-extrabold text-[#f5ede6]">
                  {formatMoney(order.pricing.total, config.currency)}
                </p>
                <span className="inline-flex items-center space-x-1 text-xs font-semibold text-brand-400 hover:underline">
                  <span>Track Status</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(p) => {
              const params = new URLSearchParams(searchParams);
              params.set('page', p.toString());
              setSearchParams(params);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
