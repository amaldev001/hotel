import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../components/common/Toast';
import Skeleton from '../components/common/Skeleton';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import Table from '../components/common/Table';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import FormField from '../components/common/FormField';
import { Plus, Store, KeyRound, Sparkles } from 'lucide-react';

export const AdminRestaurants = () => {
  const { showToast } = useToast();

  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State - No prefilled defaults per requirements!
  const [form, setForm] = useState({
    name: '',
    description: '',
    cuisineTypes: '',
    deliveryFee: 500,
    minOrderAmount: 1000,
    servicePostalCodes: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    ownerTempPassword: '',
  });

  const fetchRestaurants = () => {
    setLoading(true);
    setError(null);
    api
      .get('/admin/restaurants')
      .then((res) => {
        setRestaurants(res.data.data || []);
      })
      .catch((err) => {
        setError(err.response?.data?.error?.message || 'Failed to fetch restaurants');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingRestaurant(null);
    setForm({
      name: '',
      description: '',
      cuisineTypes: '',
      deliveryFee: 500,
      minOrderAmount: 1000,
      servicePostalCodes: '',
      ownerName: '',
      ownerEmail: '',
      ownerPhone: '',
      ownerTempPassword: '',
    });
    setModalOpen(true);
  };

  const handleGeneratePassword = () => {
    const randomPass = `Pass_${Math.random().toString(36).substring(2, 8)}!${Math.floor(10 + Math.random() * 90)}`;
    setForm((prev) => ({ ...prev, ownerTempPassword: randomPass }));
  };

  const handleToggleStatus = async (rest) => {
    const nextStatus = rest.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.patch(`/admin/restaurants/${rest._id}/status`, {
        status: nextStatus,
      });
      showToast(`Restaurant status changed to ${nextStatus}`, 'success');
      fetchRestaurants();
    } catch (err) {
      showToast('Failed to update restaurant status', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.ownerTempPassword || form.ownerTempPassword.length < 10) {
      showToast('Temporary password must be at least 10 characters long', 'error');
      return;
    }

    setSubmitting(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      ownerName: form.ownerName.trim(),
      ownerEmail: form.ownerEmail.trim(),
      ownerPhone: form.ownerPhone.trim(),
      temporaryPassword: form.ownerTempPassword,
      deliveryFee: parseInt(form.deliveryFee, 10) || 0,
      minOrderAmount: parseInt(form.minOrderAmount, 10) || 0,
      servicePostalCodes: form.servicePostalCodes
        ? form.servicePostalCodes.split(',').map((p) => p.trim()).filter(Boolean)
        : [],
    };

    try {
      await api.post('/admin/restaurants', payload);
      showToast('Restaurant and owner account created successfully!', 'success');
      setModalOpen(false);
      fetchRestaurants();
    } catch (err) {
      const errorMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to create restaurant';
      showToast(errorMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <Store className="w-6 h-6 text-brand-500" />
          <span>Restaurant Oversight & Provisioning</span>
        </h1>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-sm min-h-touch flex items-center space-x-1"
        >
          <Plus className="w-4 h-4" />
          <span>Provision Restaurant</span>
        </button>
      </div>

      {loading ? (
        <Skeleton className="h-40" count={2} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchRestaurants} />
      ) : restaurants.length === 0 ? (
        <EmptyState title="No restaurants provisioned" message="Provision your first restaurant." />
      ) : (
        <Table headers={['Restaurant Name', 'Cuisines', 'Status', 'Actions']}>
          {restaurants.map((rest) => (
            <tr key={rest._id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
              <td className="px-4 py-3 sm:px-6">
                <p className="font-bold text-slate-900 dark:text-white">{rest.name}</p>
                <p className="text-xs text-slate-500">{rest.description}</p>
              </td>
              <td className="px-4 py-3 sm:px-6 text-xs text-slate-600 dark:text-slate-300">
                {rest.cuisineTypes?.join(', ')}
              </td>
              <td className="px-4 py-3 sm:px-6">
                <StatusBadge status={rest.status} />
              </td>
              <td className="px-4 py-3 sm:px-6">
                <button
                  onClick={() => handleToggleStatus(rest)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors min-h-touch ${
                    rest.status === 'ACTIVE'
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  }`}
                >
                  {rest.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {/* Provision Restaurant Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Provision New Restaurant & Owner Account">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="border-b pb-3 border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Restaurant Details</h3>
          </div>

          <FormField label="Restaurant Name" id="prov-rest-name" required>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Gourmet Pizzeria"
            />
          </FormField>

          <FormField label="Description" id="prov-rest-desc">
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Restaurant description"
            />
          </FormField>

          <FormField label="Cuisines (comma-separated)" id="prov-rest-cuisines" required>
            <input
              type="text"
              value={form.cuisineTypes}
              onChange={(e) => setForm({ ...form, cuisineTypes: e.target.value })}
              placeholder="Italian, Pizza"
            />
          </FormField>

          <div className="border-b pb-3 pt-2 border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Owner Account Provisioning</h3>
          </div>

          <FormField label="Owner Full Name" id="prov-owner-name" required>
            <input
              type="text"
              value={form.ownerName}
              onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
              placeholder="Jane Smith"
            />
          </FormField>

          <FormField label="Owner Email" id="prov-owner-email" required>
            <input
              type="email"
              value={form.ownerEmail}
              onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
              placeholder="owner@example.com"
            />
          </FormField>

          <FormField label="Owner Phone" id="prov-owner-phone" required>
            <input
              type="tel"
              value={form.ownerPhone}
              onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })}
              placeholder="9876543210"
            />
          </FormField>

          {/* Required Temporary Password Field + Helper */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="prov-owner-pass" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Temporary Owner Password <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="text-xs font-semibold text-brand-600 hover:underline flex items-center space-x-1"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Generate Password</span>
              </button>
            </div>
            <input
              id="prov-owner-pass"
              type="text"
              value={form.ownerTempPassword}
              onChange={(e) => setForm({ ...form, ownerTempPassword: e.target.value })}
              placeholder="Required temporary password"
              required
              className="w-full rounded-lg border px-3 py-2.5 text-sm font-mono border-slate-300 dark:border-slate-700"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-sm"
            >
              {submitting ? 'Provisioning...' : 'Provision Restaurant'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminRestaurants;
