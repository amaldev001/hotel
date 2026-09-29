import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useConfig } from '../context/ConfigContext';
import { useToast } from '../components/common/Toast';
import FormField from '../components/common/FormField';
import Skeleton from '../components/common/Skeleton';
import ErrorState from '../components/common/ErrorState';
import { Store, Clock, MapPin, DollarSign } from 'lucide-react';

export const RestaurantProfilePage = () => {
  const { config } = useConfig();
  const { showToast } = useToast();

  const [restaurant, setRestaurant] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    cuisineTypes: '',
    deliveryFee: 500,
    minOrderAmount: 1000,
    isAcceptingOrders: true,
    servicePostalCodes: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchProfile = () => {
    setLoading(true);
    setError(null);
    api
      .get('/restaurant/profile')
      .then((res) => {
        const rest = res.data.data;
        setRestaurant(rest);
        setFormData({
          description: rest.description || '',
          cuisineTypes: rest.cuisineTypes?.join(', ') || '',
          deliveryFee: rest.deliveryFee || 0,
          minOrderAmount: rest.minOrderAmount || 0,
          isAcceptingOrders: rest.isAcceptingOrders ?? true,
          servicePostalCodes: rest.servicePostalCodes?.join(', ') || '',
        });
      })
      .catch((err) => {
        setError(err.response?.data?.error?.message || 'Failed to load restaurant profile');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      description: formData.description,
      cuisineTypes: formData.cuisineTypes
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
      deliveryFee: parseInt(formData.deliveryFee, 10) || 0,
      minOrderAmount: parseInt(formData.minOrderAmount, 10) || 0,
      isAcceptingOrders: formData.isAcceptingOrders,
      servicePostalCodes: formData.servicePostalCodes
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean),
    };

    try {
      const res = await api.put('/restaurant/profile', payload);
      setRestaurant(res.data.data);
      showToast('Restaurant parameters updated successfully', 'success');
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to update restaurant profile', 'error');
    } finally {
      setSaving(false);
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
    return <ErrorState message={error} onRetry={fetchProfile} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-3">
        <Store className="w-7 h-7 text-brand-500" />
        <span>Restaurant Profile & Operating Settings</span>
      </h1>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
        <div className="border-b pb-4 border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{restaurant.name}</h2>
          <p className="text-xs text-slate-500">Status: {restaurant.status}</p>
        </div>

        <FormField label="Accepting Orders Toggle" id="rest-accepting">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isAcceptingOrders}
              onChange={(e) => setFormData({ ...formData, isAcceptingOrders: e.target.checked })}
              className="w-5 h-5 rounded text-brand-500 focus:ring-brand-500"
            />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {formData.isAcceptingOrders ? 'Currently Accepting Orders' : 'PAUSED - Not Accepting Orders'}
            </span>
          </label>
        </FormField>

        <FormField label="Description" id="rest-desc">
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </FormField>

        <FormField label="Cuisine Types (comma-separated)" id="rest-cuisines">
          <input
            type="text"
            value={formData.cuisineTypes}
            onChange={(e) => setFormData({ ...formData, cuisineTypes: e.target.value })}
            placeholder="Italian, Pizza, Pasta"
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Delivery Fee (Minor Units)" id="rest-fee">
            <input
              type="number"
              value={formData.deliveryFee}
              onChange={(e) => setFormData({ ...formData, deliveryFee: e.target.value })}
            />
          </FormField>

          <FormField label="Minimum Order Amount (Minor Units)" id="rest-min">
            <input
              type="number"
              value={formData.minOrderAmount}
              onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
            />
          </FormField>
        </div>

        <FormField label="Service Postal Codes (comma-separated)" id="rest-postalcodes" helpText="Leave empty to deliver anywhere">
          <input
            type="text"
            value={formData.servicePostalCodes}
            onChange={(e) => setFormData({ ...formData, servicePostalCodes: e.target.value })}
            placeholder="10001, 10002, 10003"
          />
        </FormField>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-sm transition-colors min-h-touch"
          >
            {saving ? 'Saving...' : 'Save Operating Parameters'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RestaurantProfilePage;
