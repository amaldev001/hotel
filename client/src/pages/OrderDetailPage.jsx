import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useConfig } from '../context/ConfigContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { formatMoney } from '../utils/moneyFormatter';
import { formatDate } from '../utils/dateFormatter';
import Skeleton from '../components/common/Skeleton';
import ErrorState from '../components/common/ErrorState';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import FormField from '../components/common/FormField';
import { Clock, MapPin, CheckCircle2, AlertTriangle, XCircle, ArrowLeft } from 'lucide-react';

const ACTIVE_STATUSES = ['PAYMENT_PENDING', 'PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'];

export const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { config } = useConfig();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cancel Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchOrder = () => {
    api
      .get(`/orders/${id}`)
      .then((res) => {
        setOrder(res.data.data);
      })
      .catch((err) => {
        setError(err.response?.data?.error?.message || 'Failed to fetch order details');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  // 15-second Polling ONLY when active & tab is visible (D15 requirement)
  useEffect(() => {
    if (!order || !ACTIVE_STATUSES.includes(order.status)) return;

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchOrder();
      }
    }, 15000);

    return () => clearInterval(intervalId);
  }, [order?.status]);

  const handleCancelOrder = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      showToast('Please provide a reason for cancellation', 'error');
      return;
    }

    setCancelling(true);
    try {
      await api.post(`/orders/${id}/cancel`, {
        reason: cancelReason,
      });
      showToast('Order cancelled successfully', 'info');
      setCancelModalOpen(false);
      fetchOrder();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to cancel order', 'error');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-6">
        <Skeleton className="h-64" count={1} />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchOrder} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <button
        onClick={() => navigate('/orders')}
        className="inline-flex items-center space-x-2 text-sm font-semibold text-[#a89f91] hover:text-[#f5ede6] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Orders</span>
      </button>

      {/* Header */}
      <div className="bg-[#191715] p-6 rounded-2xl border border-[#2a2724] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#f5ede6]">
              {order.restaurantSnapshot?.name || 'Restaurant Order'}
            </h1>
            <p className="text-xs text-[#787065] mt-1">
              Order #{order._id} &bull; Placed on {formatDate(order.createdAt, config.timezone)}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <StatusBadge status={order.status} />
            {user?.role === 'customer' && order.status === 'PLACED' && (
              <button
                onClick={() => setCancelModalOpen(true)}
                className="px-3 py-1.5 rounded-xl border border-rose-800/50 text-rose-400 hover:bg-rose-950/40 text-xs font-semibold"
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="bg-[#191715] p-6 rounded-2xl border border-[#2a2724] shadow-sm space-y-4">
        <h2 className="text-base font-bold text-[#f5ede6] flex items-center space-x-2">
          <Clock className="w-5 h-5 text-brand-500" />
          <span>Status Timeline</span>
        </h2>

        <div className="space-y-4 relative pl-6 border-l-2 border-[#2a2724]">
          {order.statusHistory?.map((step, idx) => (
            <div key={idx} className="relative space-y-1">
              <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-brand-500 border-2 border-[#191715]" />
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#f5ede6] uppercase tracking-wider">
                  {step.status.replace(/_/g, ' ')}
                </span>
                <span className="text-[#787065]">{formatDate(step.at, config.timezone)}</span>
              </div>
              <p className="text-xs text-[#a89f91]">
                Updated by {step.byRole}
                {step.reason ? ` &bull; Reason: ${step.reason}` : ''}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Order Details & Pricing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-[#191715] p-6 rounded-2xl border border-[#2a2724] shadow-sm space-y-4">
          <h2 className="text-base font-bold text-[#f5ede6] border-b pb-3 border-[#2a2724]">
            Items Ordered
          </h2>

          <div className="divide-y divide-[#2a2724]">
            {order.items?.map((item, idx) => (
              <div key={idx} className="py-3 flex justify-between items-center text-sm">
                <div>
                  <p className="font-bold text-[#f5ede6]">{item.name}</p>
                  <p className="text-xs text-[#787065]">Qty: {item.quantity}</p>
                </div>
                <p className="font-extrabold text-[#f5ede6]">
                  {formatMoney(item.lineTotal, config.currency)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#191715] p-6 rounded-2xl border border-[#2a2724] shadow-sm space-y-4 h-fit">
          <h2 className="text-base font-bold text-[#f5ede6] border-b pb-3 border-[#2a2724]">
            Payment Breakdown
          </h2>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-[#a89f91]">
              <span>Subtotal</span>
              <span>{formatMoney(order.pricing.subtotal, config.currency)}</span>
            </div>
            <div className="flex justify-between text-[#a89f91]">
              <span>Delivery Fee</span>
              <span>{formatMoney(order.pricing.deliveryFee, config.currency)}</span>
            </div>
            <div className="flex justify-between text-[#a89f91]">
              <span>Tax ({order.pricing.taxPercent}%)</span>
              <span>{formatMoney(order.pricing.tax, config.currency)}</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-[#f5ede6] pt-2 border-t border-[#2a2724]">
              <span>Total</span>
              <span>{formatMoney(order.pricing.total, config.currency)}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#2a2724] text-xs text-[#787065] space-y-1">
            <p>
              <span className="font-bold">Payment Method:</span> {order.paymentMethod.toUpperCase()}
            </p>
            <p>
              <span className="font-bold">Payment Status:</span> {order.paymentStatus}
            </p>
          </div>
        </div>
      </div>

      {/* Cancel Order Modal */}
      <Modal isOpen={cancelModalOpen} onClose={() => setCancelModalOpen(false)} title="Cancel Order">
        <form onSubmit={handleCancelOrder} className="space-y-4">
          <p className="text-sm text-[#a89f91]">
            Are you sure you want to cancel this order?
          </p>

          <FormField label="Reason for Cancellation" id="cancel-reason" required>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Please describe why you are cancelling..."
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCancelModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#2a2724] bg-[#191715] text-[#f5ede6] text-sm font-medium hover:bg-[#24211e] transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={cancelling}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-sm"
            >
              {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default OrderDetailPage;
