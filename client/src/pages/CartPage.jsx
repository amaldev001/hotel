import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useConfig } from '../context/ConfigContext';
import { useToast } from '../components/common/Toast';
import { formatMoney } from '../utils/moneyFormatter';
import Skeleton from '../components/common/Skeleton';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, AlertTriangle } from 'lucide-react';

export const CartPage = () => {
  const navigate = useNavigate();
  const { config } = useConfig();
  const { showToast } = useToast();

  const [cart, setCart] = useState(null);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  const fetchCartAndQuote = async () => {
    setLoading(true);
    setError(null);
    try {
      const cartRes = await api.get('/cart');
      setCart(cartRes.data.data);

      if (cartRes.data.data && cartRes.data.data.items?.length > 0) {
        const quoteRes = await api.post('/checkout/quote', {
          orderType: 'delivery',
        });
        setQuote(quoteRes.data.data);
      } else {
        setQuote(null);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCartAndQuote();
  }, []);

  const handleUpdateQuantity = async (menuItemId, newQty) => {
    setUpdating(true);
    try {
      if (newQty <= 0) {
        await api.delete(`/cart/items/${menuItemId}`);
        showToast('Item removed from cart', 'info');
      } else {
        await api.put(`/cart/items/${menuItemId}`, { quantity: newQty });
      }
      await fetchCartAndQuote();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to update quantity', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleClearCart = async () => {
    setUpdating(true);
    try {
      await api.delete('/cart');
      showToast('Cart cleared', 'info');
      await fetchCartAndQuote();
    } catch (err) {
      showToast('Failed to clear cart', 'error');
    } finally {
      setUpdating(false);
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
    return <ErrorState message={error} onRetry={fetchCartAndQuote} />;
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        message="Browse top local restaurants and add delicious items to your cart."
        actionLabel="Browse Restaurants"
        onAction={() => navigate('/restaurants')}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#f5ede6] flex items-center space-x-3">
          <ShoppingBag className="w-7 h-7 text-brand-500" />
          <span>Your Shopping Cart</span>
        </h1>
        <button
          onClick={handleClearCart}
          disabled={updating}
          className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center space-x-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Cart</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#191715] rounded-2xl border border-[#2a2724] shadow-sm overflow-hidden divide-y divide-[#2a2724]">
            {cart.items.map((item) => (
              <div key={item.menuItemId._id || item.menuItemId} className="p-4 sm:p-5 flex items-center justify-between space-x-4">
                <div className="flex-1 space-y-1">
                  <h3 className="text-base font-bold text-[#f5ede6]">
                    {item.menuItemId.name || item.name}
                  </h3>
                  <p className="text-sm font-semibold text-[#a89f91]">
                    {formatMoney(item.menuItemId.price || item.unitPrice, config.currency)}
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center space-x-3 bg-[#0e0d0c] p-1.5 rounded-xl border border-[#2a2724]">
                  <button
                    onClick={() => handleUpdateQuantity(item.menuItemId._id || item.menuItemId, item.quantity - 1)}
                    disabled={updating}
                    className="w-8 h-8 rounded-lg bg-[#191715] text-[#a89f91] flex items-center justify-center hover:bg-[#24211e] hover:text-[#f5ede6] min-h-touch min-w-touch"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-extrabold text-[#f5ede6] w-6 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleUpdateQuantity(item.menuItemId._id || item.menuItemId, item.quantity + 1)}
                    disabled={updating || item.quantity >= 20}
                    className="w-8 h-8 rounded-lg bg-[#191715] text-[#a89f91] flex items-center justify-center hover:bg-[#24211e] hover:text-[#f5ede6] min-h-touch min-w-touch"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-right">
                  <p className="text-base font-extrabold text-[#f5ede6]">
                    {formatMoney((item.menuItemId.price || item.unitPrice) * item.quantity, config.currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Quote & Checkout Summary */}
        {quote && (
          <div className="bg-[#191715] p-6 rounded-2xl border border-[#2a2724] shadow-sm space-y-6 h-fit">
            <h2 className="text-lg font-bold text-[#f5ede6] border-b pb-3 border-[#2a2724]">
              Bill Details
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-[#a89f91]">
                <span>Item Subtotal</span>
                <span>{formatMoney(quote.pricing.subtotal, config.currency)}</span>
              </div>
              <div className="flex justify-between text-[#a89f91]">
                <span>Delivery Fee</span>
                <span>{formatMoney(quote.pricing.deliveryFee, config.currency)}</span>
              </div>
              <div className="flex justify-between text-[#a89f91]">
                <span>Taxes &amp; Charges ({quote.pricing.taxPercent}%)</span>
                <span>{formatMoney(quote.pricing.tax, config.currency)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-[#f5ede6] pt-3 border-t border-[#2a2724]">
                <span>To Pay</span>
                <span>{formatMoney(quote.pricing.total, config.currency)}</span>
              </div>
            </div>

            {/* Warnings or Block Reason */}
            {!quote.canPlaceOrder && quote.blockReason && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/40 flex items-center space-x-2 text-amber-300 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{quote.blockReason}</span>
              </div>
            )}

            <button
              onClick={() => navigate('/checkout')}
              disabled={!quote.canPlaceOrder}
              className="w-full py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm transition-colors shadow-md disabled:opacity-50 min-h-touch flex items-center justify-center space-x-2"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
