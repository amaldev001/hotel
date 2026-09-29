import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import FormField from '../components/common/FormField';
import api from '../utils/api';
import { KeyRound } from 'lucide-react';

export const ChangePassword = () => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setError('Please fill in both current and new password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      showToast('Password updated successfully!', 'success');
      await refreshUser();
      navigate('/');
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || 'Failed to update password.';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-[#191715] p-8 rounded-2xl shadow-2xl border border-[#2a2724]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-[#f5ede6]">
            {user?.mustChangePassword ? 'Password Reset Required' : 'Change Password'}
          </h2>
          <p className="mt-1 text-sm text-[#a89f91]">
            {user?.mustChangePassword
              ? 'Please update your temporary password before proceeding.'
              : 'Choose a strong new password.'}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/50 text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <FormField label="Current / Temporary Password" id="pwd-current" required>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••"
            />
          </FormField>

          <FormField label="New Password" id="pwd-new" required helpText="At least 10 characters">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••"
            />
          </FormField>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-50 min-h-touch flex items-center justify-center space-x-2"
          >
            <span>{loading ? 'Updating...' : 'Update Password'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
