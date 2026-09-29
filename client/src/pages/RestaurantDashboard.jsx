import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useConfig } from '../context/ConfigContext';
import { formatMoney } from '../utils/moneyFormatter';
import { formatDate } from '../utils/dateFormatter';
import Skeleton from '../components/common/Skeleton';
import ErrorState from '../components/common/ErrorState';
import StatusBadge from '../components/common/StatusBadge';
import { Store, DollarSign, ShoppingBag, Clock, ArrowRight, BellRing } from 'lucide-react';

export const RestaurantDashboard = () => {
  const navigate = useNavigate();
  const { config } = useConfig();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = () => {
    setLoading(true);
    setError(null);
    api
      .get('/restaurant/dashboard')
      .then((res) => {
        setData(res.data.data);
      })
      .catch((err) => {
        setError(err.response?.data?.error?.message || 'Failed to load restaurant dashboard');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        <Skeleton className="h-40" count={1} />
        <Skeleton className="h-64" count={1} />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchDashboard} />;
  }

  const { restaurant, metrics, incomingQueue } = data;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Store className="w-6 h-6" />
            <h1 className="text-2xl sm:text-3xl font-extrabold">{restaurant.name}</h1>
          </div>
          <p className="text-xs sm:text-sm text-amber-100 mt-1">
            Owner Portal &bull; Status: <span className="font-bold">{restaurant.status}</span> &bull; Accepting Orders:{' '}
            <span className="font-bold">{restaurant.isAcceptingOrders ? 'YES' : 'NO'}</span>
          </p>
        </div>

        <button
          onClick={() => navigate('/restaurant/orders')}
          className="px-5 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-sm hover:bg-amber-50 transition-colors shadow-md min-h-touch"
        >
          Manage All Orders
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-[#191715] p-6 rounded-2xl border border-[#2a2724] shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-900/30 text-brand-400 flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#787065]">Today's Orders</p>
            <p className="text-2xl font-extrabold text-[#f5ede6]">
              {metrics.todaysOrdersCount}
            </p>
          </div>
        </div>

        <div className="bg-[#191715] p-6 rounded-2xl border border-[#2a2724] shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-900/30 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#787065]">Total Revenue</p>
            <p className="text-2xl font-extrabold text-[#f5ede6]">
              {formatMoney(metrics.totalRevenue, config.currency)}
            </p>
          </div>
        </div>

        <div className="bg-[#191715] p-6 rounded-2xl border border-[#2a2724] shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-900/30 text-indigo-400 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#787065]">Active Queue</p>
            <p className="text-2xl font-extrabold text-[#f5ede6]">
              {incomingQueue.length}
            </p>
          </div>
        </div>
      </div>

      {/* Live Incoming Order Queue (Sound-free visual highlight) */}
      <div className="bg-[#191715] p-6 rounded-2xl border border-[#2a2724] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#f5ede6] flex items-center space-x-2">
            <BellRing className="w-5 h-5 text-amber-500 animate-pulse" />
            <span>Live Incoming Orders Queue</span>
          </h2>
          <span className="text-xs text-[#787065]">Auto-refreshing</span>
        </div>

        {incomingQueue.length === 0 ? (
          <p className="text-xs text-[#787065] py-6 text-center">No active incoming orders right now.</p>
        ) : (
          <div className="space-y-3">
            {incomingQueue.map((order) => (
              <div
                key={order._id}
                onClick={() => navigate('/restaurant/orders')}
                className="cursor-pointer p-4 rounded-xl border border-amber-900/50 bg-amber-950/20 hover:bg-amber-950/30 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-[#f5ede6]">#{order._id}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-xs text-[#a89f91] font-medium">
                    {order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                  </p>
                  <p className="text-[11px] text-[#787065]">
                    Placed at {formatDate(order.createdAt, config.timezone)} &bull; {order.orderType.toUpperCase()}
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-sm font-extrabold text-[#f5ede6]">
                    {formatMoney(order.pricing.total, config.currency)}
                  </span>
                  <button className="px-3 py-1.5 rounded-lg bg-brand-500 text-white text-xs font-bold flex items-center space-x-1">
                    <span>Manage</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantDashboard;
