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
import { Shield, DollarSign, XCircle, RefreshCw } from 'lucide-react';

export const AdminOrders = () => {
  const { config } = useConfig();
  const { showToast } = useToast();

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cancel Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = (page = 1) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    params.set('page', page.toString());
    params.set('limit', '15');

    api
      .get(`/admin/orders?${params.toString()}`)
      .then((res) => {
        setOrders(res.data.data || []);
        setPagination(res.data.pagination || { page: 1, totalPages: 1 });
      })
      .catch((err) => {
        setError(err.response?.data?.error?.message || 'Failed to fetch admin orders');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleTriggerRefund = async (orderId) => {
    try {
      await api.post(`/admin/orders/${orderId}/refund`, {
        reason: 'Admin initiated gateway refund',
      });
      showToast('Gateway refund triggered successfully', 'success');
      fetchOrders(pagination.page);
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Refund processing failed', 'error');
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      showToast('Cancellation reason is required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/admin/orders/${selectedOrderId}/cancel`, {
        reason: cancelReason,
      });
      showToast('Order cancelled by admin', 'info');
      setCancelModalOpen(false);
      fetchOrders(pagination.page);
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to cancel order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#f5ede6] flex items-center space-x-2">
          <Shield className="w-6 h-6 text-purple-500" />
          <span>Platform Global Orders Management</span>
        </h1>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
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
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      {loading ? (
        <Skeleton className="h-32" count={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchOrders} />
      ) : orders.length === 0 ? (
        <EmptyState title="No orders found" message="No platform orders match the criteria." />
      ) : (
        <div className="space-y-4">
          {orders.map((ord) => (
            <div
              key={ord._id}
              className="bg-[#191715] p-6 rounded-2xl border border-[#2a2724] shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3 border-slate-100 dark:border-slate-700">
                <div>
                  <div className="flex items-center space-x-3">
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">
                      #{ord._id}
                    </span>
                    <StatusBadge status={ord.status} />
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-950/40 text-purple-300">
                      Payment: {ord.paymentStatus}
                    </span>
                  </div>
                  <p className="text-xs text-[#787065] mt-1">
                    Restaurant: <span className="font-bold text-[#a89f91]">{ord.restaurantSnapshot?.name}</span> &bull; {formatDate(ord.createdAt, config.timezone)}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Gateway Refund Button for REFUND_PENDING orders */}
                  {ord.paymentStatus === 'REFUND_PENDING' && (
                    <button
                      onClick={() => handleTriggerRefund(ord._id)}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm flex items-center space-x-1 min-h-touch"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Trigger Gateway Refund</span>
                    </button>
                  )}

                  {/* Administrative Cancellation */}
                  {!['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(ord.status) && (
                    <button
                      onClick={() => {
                        setSelectedOrderId(ord._id);
                        setCancelReason('');
                        setCancelModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm min-h-touch"
                    >
                      Admin Cancel
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center text-sm font-extrabold">
                <span>Total Amount</span>
                <span>{formatMoney(ord.pricing.total, config.currency)}</span>
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

      {/* Admin Cancel Modal */}
      <Modal isOpen={cancelModalOpen} onClose={() => setCancelModalOpen(false)} title="Admin Cancel Order">
        <form onSubmit={handleCancelSubmit} className="space-y-4">
          <p className="text-sm text-[#a89f91]">
            Provide a mandatory reason for administrative cancellation.
          </p>

          <FormField label="Cancellation Reason" id="admin-cancel-reason" required>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Administrative order revocation"
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCancelModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#2a2724] bg-[#191715] text-[#f5ede6] text-sm hover:bg-[#24211e] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-sm"
            >
              {submitting ? 'Cancelling...' : 'Confirm Admin Cancel'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminOrders;
