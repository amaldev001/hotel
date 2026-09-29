import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useConfig } from '../context/ConfigContext';
import { useToast } from '../components/common/Toast';
import { formatMoney } from '../utils/moneyFormatter';
import { formatDate } from '../utils/dateFormatter';
import Skeleton from '../components/common/Skeleton';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import StatusBadge from '../components/common/StatusBadge';
import Pagination from '../components/common/Pagination';
import Modal from '../components/common/Modal';
import FormField from '../components/common/FormField';
import { Store, Filter, CheckCircle, XCircle, ChevronRight, User } from 'lucide-react';

export const RestaurantOrders = () => {
  const { config } = useConfig();
  const { showToast } = useToast();

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = (page = 1) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    params.set('page', page.toString());
    params.set('limit', '15');

    api
      .get(`/restaurant/orders?${params.toString()}`)
      .then((res) => {
        setOrders(res.data.data || []);
        setPagination(res.data.pagination || { page: 1, totalPages: 1 });
      })
      .catch((err) => {
        setError(err.response?.data?.error?.message || 'Failed to fetch restaurant orders');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleUpdateStatus = async (orderId, newStatus, reason = '') => {
    try {
      await api.patch(`/orders/${orderId}/status`, {
        status: newStatus,
        reason,
      });
      showToast(`Order status updated to ${newStatus}`, 'success');
      fetchOrders(pagination.page);
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to update order status', 'error');
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      showToast('Reason is required to reject an order', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await handleUpdateStatus(selectedOrderId, 'REJECTED', rejectReason);
      setRejectModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const renderActionButtons = (order) => {
    const { status, orderType, _id } = order;

    switch (status) {
      case 'PLACED':
        return (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleUpdateStatus(_id, 'CONFIRMED')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs min-h-touch"
            >
              Confirm
            </button>
            <button
              onClick={() => {
                setSelectedOrderId(_id);
                setRejectReason('');
                setRejectModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs min-h-touch"
            >
              Reject
            </button>
          </div>
        );

      case 'CONFIRMED':
        return (
          <button
            onClick={() => handleUpdateStatus(_id, 'PREPARING')}
            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs min-h-touch"
          >
            Start Preparing
          </button>
        );

      case 'PREPARING':
        return (
          <button
            onClick={() => handleUpdateStatus(_id, 'READY')}
            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs min-h-touch"
          >
            Mark Ready
          </button>
        );

      case 'READY':
        if (orderType === 'delivery') {
          return (
            <button
              onClick={() => handleUpdateStatus(_id, 'OUT_FOR_DELIVERY')}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs min-h-touch"
            >
              Out for Delivery
            </button>
          );
        } else {
          return (
            <button
              onClick={() => handleUpdateStatus(_id, 'COMPLETED')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs min-h-touch"
            >
              Complete Order
            </button>
          );
        }

      case 'OUT_FOR_DELIVERY':
        return (
          <button
            onClick={() => handleUpdateStatus(_id, 'DELIVERED')}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs min-h-touch"
          >
            Mark Delivered
          </button>
        );

      case 'DELIVERED':
        return (
          <button
            onClick={() => handleUpdateStatus(_id, 'COMPLETED')}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs min-h-touch"
          >
            Complete Order
          </button>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#f5ede6] flex items-center space-x-2">
          <Store className="w-6 h-6 text-brand-500" />
          <span>Fulfillment Order Management</span>
        </h1>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-[#2a2724] bg-[#191715] text-sm px-3 py-2 text-[#f5ede6]"
        >
          <option value="">All Statuses</option>
          <option value="PLACED">Placed</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PREPARING">Preparing</option>
          <option value="READY">Ready</option>
          <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
          <option value="DELIVERED">Delivered</option>
          <option value="COMPLETED">Completed</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {loading ? (
        <Skeleton className="h-32" count={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchOrders} />
      ) : orders.length === 0 ? (
        <EmptyState title="No orders found" message="No orders match the selected filter." />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-[#191715] p-6 rounded-2xl border border-[#2a2724] shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3 border-slate-100 dark:border-slate-700">
                <div>
                  <div className="flex items-center space-x-3">
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">
                      Order #{order._id}
                    </span>
                    <StatusBadge status={order.status} />
                    <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {order.orderType}
                    </span>
                  </div>
                  <p className="text-xs text-[#787065] mt-1">
                    Placed at {formatDate(order.createdAt, config.timezone)} &bull; Pay Method: {order.paymentMethod.toUpperCase()}
                  </p>
                </div>

                {/* State Machine Allowed Action Buttons */}
                <div>{renderActionButtons(order)}</div>
              </div>

              {/* Customer Info (Privacy-masked for completed/terminal orders) */}
              {order.deliveryAddress && (
                <div className="p-3 rounded-xl bg-[#0e0d0c] border border-[#2a2724] text-xs text-[#a89f91] space-y-1">
                  <p className="font-bold text-[#f5ede6] flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-[#787065]" />
                    <span>Customer: {order.deliveryAddress.name}</span>
                  </p>
                  <p>Phone: {order.deliveryAddress.phone}</p>
                  <p>
                    Address: {order.deliveryAddress.addressLine1}, {order.deliveryAddress.city} ({order.deliveryAddress.postalCode})
                  </p>
                </div>
              )}

              {/* Items Summary */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-[#787065] uppercase tracking-wider">Line Items</p>
                <div className="divide-y divide-[#2a2724] text-xs">
                  {order.items.map((i, idx) => (
                    <div key={idx} className="py-1.5 flex justify-between">
                      <span>
                        {i.quantity}x {i.name}
                      </span>
                      <span className="font-bold">{formatMoney(i.lineTotal, config.currency)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-[#2a2724] text-sm font-extrabold text-[#f5ede6]">
                <span>Total Amount</span>
                <span>{formatMoney(order.pricing.total, config.currency)}</span>
              </div>
            </div>
          ))}

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(p) => fetchOrders(p)}
          />
        </div>
      )}

      {/* Reject Reason Modal */}
      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Reject Order">
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <p className="text-sm text-[#a89f91]">
            Please provide a reason for rejecting this order (sent to customer).
          </p>

          <FormField label="Rejection Reason" id="reject-reason" required>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Out of stock ingredients or busy kitchen"
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRejectModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#2a2724] bg-[#191715] text-[#f5ede6] text-sm font-medium hover:bg-[#24211e] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-sm"
            >
              {submitting ? 'Rejecting...' : 'Confirm Reject'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RestaurantOrders;
