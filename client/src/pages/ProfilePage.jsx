import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import FormField from '../components/common/FormField';
import Modal from '../components/common/Modal';
import Skeleton from '../components/common/Skeleton';
import { User, MapPin, Plus, Trash2, CheckCircle2 } from 'lucide-react';

export const ProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Profile Edit State
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Address Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addrForm, setAddrForm] = useState({
    name: 'Home',
    phone: '',
    addressLine1: '',
    city: '',
    state: '',
    postalCode: '',
    isDefault: false,
  });

  const fetchAddresses = () => {
    setLoading(true);
    api
      .get('/profile/addresses')
      .then((res) => {
        setAddresses(res.data.data || []);
      })
      .catch((err) => {
        showToast('Failed to fetch addresses', 'error');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.put('/profile', { name, phone });
      showToast('Profile updated successfully', 'success');
      await refreshUser();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleOpenModal = (addr = null) => {
    if (addr) {
      setEditingAddress(addr);
      setAddrForm({
        name: addr.name,
        phone: addr.phone,
        addressLine1: addr.addressLine1,
        city: addr.city,
        state: addr.state,
        postalCode: addr.postalCode,
        isDefault: addr.isDefault || false,
      });
    } else {
      setEditingAddress(null);
      setAddrForm({
        name: 'Home',
        phone: user?.phone || '',
        addressLine1: '',
        city: '',
        state: '',
        postalCode: '',
        isDefault: addresses.length === 0,
      });
    }
    setModalOpen(true);
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    try {
      if (editingAddress) {
        await api.put(`/profile/addresses/${editingAddress._id}`, addrForm);
        showToast('Address updated successfully', 'success');
      } else {
        await api.post('/profile/addresses', addrForm);
        showToast('Address added successfully', 'success');
      }
      setModalOpen(false);
      fetchAddresses();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to save address', 'error');
    }
  };

  const handleDeleteAddress = async (addrId) => {
    try {
      await api.delete(`/profile/addresses/${addrId}`);
      showToast('Address deleted', 'info');
      fetchAddresses();
    } catch (err) {
      showToast('Failed to delete address', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-[#f5ede6]">Account Settings</h1>

      {/* Profile Info Form */}
      <div className="bg-[#191715] p-6 sm:p-8 rounded-2xl border border-[#2a2724] shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-[#f5ede6] flex items-center space-x-2">
          <User className="w-5 h-5 text-brand-500" />
          <span>Personal Details</span>
        </h2>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Full Name" id="prof-name" required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </FormField>

            <FormField label="Phone Number" id="prof-phone" required>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </FormField>
          </div>

          <FormField label="Email Address (ReadOnly)" id="prof-email">
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="bg-[#0e0d0c] opacity-60 cursor-not-allowed"
            />
          </FormField>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-sm transition-colors min-h-touch"
            >
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Saved Delivery Addresses */}
      <div className="bg-[#191715] p-6 sm:p-8 rounded-2xl border border-[#2a2724] shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#f5ede6] flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-brand-500" />
              <span>Saved Delivery Addresses</span>
            </h2>
            <p className="text-xs text-[#787065] mt-0.5">Maximum 5 saved addresses</p>
          </div>

          {addresses.length < 5 && (
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center space-x-1 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-sm min-h-touch"
            >
              <Plus className="w-4 h-4" />
              <span>Add Address</span>
            </button>
          )}
        </div>

        {loading ? (
          <Skeleton className="h-24" count={2} />
        ) : addresses.length === 0 ? (
          <p className="text-xs text-[#787065] text-center py-4">No saved addresses found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div
                key={addr._id}
                className="p-4 rounded-xl border border-[#2a2724] bg-[#0e0d0c] text-xs space-y-2 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#f5ede6]">{addr.name}</span>
                  {addr.isDefault && (
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-brand-900/30 text-brand-300">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-[#a89f91]">{addr.addressLine1}, {addr.city}</p>
                <p className="text-[#787065] font-mono">ZIP: {addr.postalCode} &bull; Ph: {addr.phone}</p>

                <div className="flex items-center space-x-3 pt-2 border-t border-[#2a2724]">
                  <button
                    onClick={() => handleOpenModal(addr)}
                    className="text-brand-400 hover:underline font-semibold"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteAddress(addr._id)}
                    className="text-rose-400 hover:underline font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Address Edit/Add Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingAddress ? 'Edit Address' : 'Add New Address'}>
        <form onSubmit={handleSaveAddress} className="space-y-4">
          <FormField label="Address Title" id="mod-addr-name" required>
            <input
              type="text"
              value={addrForm.name}
              onChange={(e) => setAddrForm({ ...addrForm, name: e.target.value })}
              placeholder="e.g. Home or Work"
            />
          </FormField>

          <FormField label="Recipient Phone" id="mod-addr-phone" required>
            <input
              type="tel"
              value={addrForm.phone}
              onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })}
              placeholder="9876543210"
            />
          </FormField>

          <FormField label="Street Address" id="mod-addr-line1" required>
            <input
              type="text"
              value={addrForm.addressLine1}
              onChange={(e) => setAddrForm({ ...addrForm, addressLine1: e.target.value })}
              placeholder="123 Main St"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="City" id="mod-addr-city" required>
              <input
                type="text"
                value={addrForm.city}
                onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                placeholder="Metropolis"
              />
            </FormField>

            <FormField label="Postal Code" id="mod-addr-zip" required>
              <input
                type="text"
                value={addrForm.postalCode}
                onChange={(e) => setAddrForm({ ...addrForm, postalCode: e.target.value })}
                placeholder="10001"
              />
            </FormField>
          </div>

          <label className="flex items-center space-x-2 text-xs font-semibold text-[#f5ede6]">
            <input
              type="checkbox"
              checked={addrForm.isDefault}
              onChange={(e) => setAddrForm({ ...addrForm, isDefault: e.target.checked })}
              className="rounded text-brand-500 focus:ring-brand-500"
            />
            <span>Set as Default Address</span>
          </label>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
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

export default ProfilePage;
