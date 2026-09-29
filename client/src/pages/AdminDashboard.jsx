import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useConfig } from '../context/ConfigContext';
import { formatMoney } from '../utils/moneyFormatter';
import Skeleton from '../components/common/Skeleton';
import ErrorState from '../components/common/ErrorState';
import { Shield, ShoppingBag, DollarSign, Store, Users, Activity } from 'lucide-react';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { config } = useConfig();

  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMetrics = () => {
    setLoading(true);
    setError(null);
    api
      .get('/admin/dashboard')
      .then((res) => {
        setMetrics(res.data.data);
      })
      .catch((err) => {
        setError(err.response?.data?.error?.message || 'Failed to fetch admin metrics');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        <Skeleton className="h-32" count={1} />
        <Skeleton className="h-64" count={1} />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchMetrics} />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Shield className="w-6 h-6" />
            <h1 className="text-2xl sm:text-3xl font-extrabold">System Admin Dashboard</h1>
          </div>
          <p className="text-xs sm:text-sm text-purple-200 mt-1">
            Platform Overview & Operations Management
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate('/admin/users')}
            className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur-md min-h-touch"
          >
            Users
          </button>
          <button
            onClick={() => navigate('/admin/restaurants')}
            className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur-md min-h-touch"
          >
            Restaurants
          </button>
          <button
            onClick={() => navigate('/admin/orders')}
            className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur-md min-h-touch"
          >
            Orders
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#191715] p-6 rounded-2xl border border-[#2a2724] shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-900/30 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#787065]">Total Paid Revenue</p>
            <p className="text-2xl font-extrabold text-[#f5ede6]">
              {formatMoney(metrics.totalRevenue, config.currency)}
            </p>
          </div>
        </div>

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
          <div className="w-12 h-12 rounded-2xl bg-indigo-900/30 text-indigo-400 flex items-center justify-center flex-shrink-0">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#787065]">Active Restaurants</p>
            <p className="text-2xl font-extrabold text-[#f5ede6]">
              {metrics.activeRestaurantsCount}
            </p>
          </div>
        </div>

        <div className="bg-[#191715] p-6 rounded-2xl border border-[#2a2724] shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-900/30 text-purple-400 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#787065]">Active Customers</p>
            <p className="text-2xl font-extrabold text-[#f5ede6]">
              {metrics.customersCount}
            </p>
          </div>
        </div>
      </div>

      {/* Orders by Status Table */}
      <div className="bg-[#191715] p-6 rounded-2xl border border-[#2a2724] shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-[#f5ede6] flex items-center space-x-2">
          <Activity className="w-5 h-5 text-purple-500" />
          <span>Orders Breakdown by Status</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(metrics.ordersByStatus || {}).map(([st, count]) => (
            <div
              key={st}
              className="p-4 rounded-xl border border-[#2a2724] bg-[#0e0d0c] space-y-1"
            >
              <p className="text-xs font-bold text-[#787065] uppercase">{st.replace(/_/g, ' ')}</p>
              <p className="text-xl font-extrabold text-[#f5ede6]">{count}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
