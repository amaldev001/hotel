import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useConfig } from '../context/ConfigContext';
import { useToast } from '../components/common/Toast';
import { formatMoney } from '../utils/moneyFormatter';
import Skeleton from '../components/common/Skeleton';
import ErrorState from '../components/common/ErrorState';
import Modal from '../components/common/Modal';
import FormField from '../components/common/FormField';
import { MapPin, CreditCard, Truck, Store, AlertTriangle, Plus, CheckCircle2 } from 'lucide-react';

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const { config } = useConfig();
  const { showToast } = useToast();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [orderType, setOrderType] = useState('delivery'); // delivery | pickup
  const [paymentMethod, setPaymentMethod] = useState('online'); // online | cod | pay_at_pickup
  const [note, setNote] = useState('');

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Address Modal State
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [newAddress, setNewAddress] = useState({
    name: 'Home',
    phone: '',
    addressLine1: '',
    city: '',
    state: '',
    postalCode: '',
  });

  // Idempotency Key generated ONCE per checkout page lifecycle attempt
  const idempotencyKeyRef = useRef(`checkout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

  const fetchAddressesAndQuote = async () => {
    setLoading(true);
    setError(null);
    try {
      const addrRes = await api.get('/profile/addresses');
      const addrList = addrRes.data.data || [];
      setAddresses(addrList);

      const defaultAddr = addrList.find((a) => a.isDefault) || addrList[0];
      if (defaultAddr) setSelectedAddressId(defaultAddr._id);

      const quoteRes = await api.post('/checkout/quote', {
        orderType,
        deliveryAddressId: defaultAddr?._id,
      });
      setQuote(quoteRes.data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to initialize checkout');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddressesAndQuote();
  }, [orderType]);

  const handleAddressChange = async (addrId) => {
    setSelectedAddressId(addrId);
    try {
      const quoteRes = await api.post('/checkout/quote', {
        orderType,
        deliveryAddressId: addrId,
      });
      setQuote(quoteRes.data.data);
    } catch (err) {
      showToast('Failed to calculate quote for selected address', 'error');
    }
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/profile/addresses', newAddress);
      showToast('Address added successfully', 'success');
      setAddressModalOpen(false);
      await fetchAddressesAndQuote();
      if (res.data.data?._id) {
        setSelectedAddressId(res.data.data._id);
      }
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to save address', 'error');
    }
  };

  const handlePlaceOrder = async () => {
    if (orderType === 'delivery' && !selectedAddressId) {
      showToast('Please select a delivery address', 'error');
      return;
    }

    if (submitting) return; // Double-click safety check
    setSubmitting(true);

    try {
      const res = await api.post(
        '/checkout',
        {
          orderType,
          deliveryAddressId: orderType === 'delivery' ? selectedAddressId : undefined,
          paymentMethod,
          note,
        },
        {
          headers: {
            'Idempotency-Key': idempotencyKeyRef.current,
          },
        }
      );

      const { order, paymentSession } = res.data.data;
      showToast('Order placed successfully!', 'success');

      if (paymentMethod === 'online' && paymentSession) {
        // Redirect to payment status polling or checkout session
        navigate(`/orders/${order._id}?payment=pending`);
      } else {
        navigate(`/orders/${order._id}`);
      }
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Checkout failed', 'error');
      setSubmitting(false);
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
    return <ErrorState message={error} onRetry={fetchAddressesAndQuote} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-[#f5ede6]">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Delivery & Payment Options */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Type Toggle */}
          <div className="bg-[#191715] p-6 rounded-2xl border border-[#2a2724] shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#f5ede6] flex items-center space-x-2">
              <Truck className="w-5 h-5 text-brand-500" />
              <span>Fulfillment Option</span>
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setOrderType('delivery');
                  if (paymentMethod === 'pay_at_pickup') setPaymentMethod('online');
                }}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-2 min-h-touch font-semibold text-sm transition-all ${
                  orderType === 'delivery'
                    ? 'border-brand-500 bg-brand-950/30 text-brand-300'
                    : 'border-[#2a2724] text-[#a89f91] hover:border-[#3a3530]'
                }`}
              >
                <Truck className="w-6 h-6" />
                <span>Delivery</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOrderType('pickup');
                  if (paymentMethod === 'cod') setPaymentMethod('pay_at_pickup');
                }}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-2 min-h-touch font-semibold text-sm transition-all ${
                  orderType === 'pickup'
                    ? 'border-brand-500 bg-brand-950/30 text-brand-300'
                    : 'border-[#2a2724] text-[#a89f91] hover:border-[#3a3530]'
                }`}
              >
                <Store className="w-6 h-6" />
                <span>Pay at Pickup</span>
              </button>
            </div>
          </div>

          {/* Delivery Address Section (Only for Delivery) */}
          {orderType === 'delivery' && (
            <div className="bg-[#191715] p-6 rounded-2xl border border-[#2a2724] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#f5ede6] flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-brand-500" />
                  <span>Delivery Address</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setAddressModalOpen(true)}
                  className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Address</span>
                </button>
              </div>

              {addresses.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#0e0d0c] border border-[#2a2724] text-center text-xs text-[#787065]">
                  No saved addresses found. Please add a new delivery address.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {addresses.map((addr) => (
                    <div
                      key={addr._id}
                      onClick={() => handleAddressChange(addr._id)}
                      className={`cursor-pointer p-4 rounded-xl border text-xs space-y-1 relative transition-all ${
                        selectedAddressId === addr._id
                          ? 'border-brand-500 bg-brand-950/20 text-[#f5ede6]'
                          : 'border-[#2a2724] text-[#a89f91] hover:border-[#3a3530]'
                      }`}
                    >
                      {selectedAddressId === addr._id && (
                        <CheckCircle2 className="w-4 h-4 text-brand-500 absolute top-3 right-3" />
                      )}
                      <p className="font-bold text-sm text-[#f5ede6]">{addr.name}</p>
                      <p className="line-clamp-2">{addr.addressLine1}, {addr.city}</p>
                      <p className="text-[#787065] font-mono">{addr.postalCode}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Payment Method Section */}
          <div className="bg-[#191715] p-6 rounded-2xl border border-[#2a2724] shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#f5ede6] flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-brand-500" />
              <span>Payment Method</span>
            </h2>

            <div className="space-y-3">
              <label className="flex items-center space-x-3 p-4 rounded-xl border border-[#2a2724] cursor-pointer hover:bg-[#24211e] transition-colors">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="online"
                  checked={paymentMethod === 'online'}
                  onChange={() => setPaymentMethod('online')}
                  className="w-4 h-4 text-brand-500 focus:ring-brand-500"
                />
                <div>
                  <p className="text-sm font-bold text-[#f5ede6]">Online Payment (Card/Gateway)</p>
                  <p className="text-xs text-[#787065]">Secure provider-hosted payment</p>
                </div>
              </label>

              {orderType === 'delivery' && (
                <label className="flex items-center space-x-3 p-4 rounded-xl border border-[#2a2724] cursor-pointer hover:bg-[#24211e] transition-colors">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="w-4 h-4 text-brand-500 focus:ring-brand-500"
                  />
                  <div>
                    <p className="text-sm font-bold text-[#f5ede6]">Cash on Delivery (COD)</p>
                    <p className="text-xs text-[#787065]">Pay cash to courier upon arrival</p>
                  </div>
                </label>
              )}

              {orderType === 'pickup' && (
                <label className="flex items-center space-x-3 p-4 rounded-xl border border-[#2a2724] cursor-pointer hover:bg-[#24211e] transition-colors">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="pay_at_pickup"
                    checked={paymentMethod === 'pay_at_pickup'}
                    onChange={() => setPaymentMethod('pay_at_pickup')}
                    className="w-4 h-4 text-brand-500 focus:ring-brand-500"
                  />
                  <div>
                    <p className="text-sm font-bold text-[#f5ede6]">Pay at Pickup</p>
                    <p className="text-xs text-[#787065]">Pay at the counter when picking up</p>
                  </div>
                </label>
              )}
            </div>

            <FormField label="Order Note (Optional)" id="order-note">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
                placeholder="e.g. Please drop off at the front desk"
              />
            </FormField>
          </div>
        </div>

        {/* Right Column: Final Quote & Place Order */}
        {quote && (
          <div className="bg-[#191715] p-6 rounded-2xl border border-[#2a2724] shadow-sm space-y-6 h-fit">
            <h2 className="text-lg font-bold text-[#f5ede6] border-b pb-3 border-[#2a2724]">
              Order Summary
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-[#a89f91]">
                <span>Subtotal</span>
                <span>{formatMoney(quote.pricing.subtotal, config.currency)}</span>
              </div>
              <div className="flex justify-between text-[#a89f91]">
                <span>Delivery Fee</span>
                <span>{formatMoney(quote.pricing.deliveryFee, config.currency)}</span>
              </div>
              <div className="flex justify-between text-[#a89f91]">
                <span>Taxes &amp; Charges</span>
                <span>{formatMoney(quote.pricing.tax, config.currency)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-[#f5ede6] pt-3 border-t border-[#2a2724]">
                <span>Total Amount</span>
                <span>{formatMoney(quote.pricing.total, config.currency)}</span>
              </div>
            </div>

            {!quote.canPlaceOrder && quote.blockReason && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/40 flex items-center space-x-2 text-amber-300 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{quote.blockReason}</span>
              </div>
            )}

            <button
              onClick={handlePlaceOrder}
              disabled={!quote.canPlaceOrder || submitting || (orderType === 'delivery' && !selectedAddressId)}
              className="w-full py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm transition-colors shadow-md disabled:opacity-50 min-h-touch flex items-center justify-center space-x-2"
            >
              <span>{submitting ? 'Placing Order...' : 'Confirm & Place Order'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Add Address Modal */}
      <Modal isOpen={addressModalOpen} onClose={() => setAddressModalOpen(false)} title="Add Delivery Address">
        <form onSubmit={handleSaveAddress} className="space-y-4">
          <FormField label="Address Title" id="addr-name" required>
            <input
              type="text"
              value={newAddress.name}
              onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
              placeholder="e.g. Home or Office"
            />
          </FormField>

          <FormField label="Phone Number" id="addr-phone" required>
            <input
              type="tel"
              value={newAddress.phone}
              onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
              placeholder="9876543210"
            />
          </FormField>

          <FormField label="Street Address" id="addr-line1" required>
            <input
              type="text"
              value={newAddress.addressLine1}
              onChange={(e) => setNewAddress({ ...newAddress, addressLine1: e.target.value })}
              placeholder="123 Main St, Apt 4B"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="City" id="addr-city" required>
              <input
                type="text"
                value={newAddress.city}
                onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                placeholder="Metropolis"
              />
            </FormField>

            <FormField label="Postal Code" id="addr-zip" required>
              <input
                type="text"
                value={newAddress.postalCode}
                onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                placeholder="10001"
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setAddressModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#2a2724] bg-[#191715] text-[#f5ede6] text-sm font-medium hover:bg-[#24211e] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold shadow-sm"
            >
              Save Address
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CheckoutPage;
