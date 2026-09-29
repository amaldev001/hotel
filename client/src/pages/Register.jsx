import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import FormField from '../components/common/FormField';
import { UserPlus } from 'lucide-react';

export const Register = () => {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.password) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await register(formData);
      showToast('Registration successful! Welcome to Savora.', 'success');
      navigate('/');
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || 'Registration failed.';
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
          <h2 className="text-2xl font-bold text-[#f5ede6] font-serif">Create an Account</h2>
          <p className="mt-1 text-sm text-[#a89f91]">Join Savora to order delicious food</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/50 text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <FormField label="Full Name" id="reg-name" required>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
            />
          </FormField>

          <FormField label="Email Address" id="reg-email" required>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
            />
          </FormField>

          <FormField label="Phone Number" id="reg-phone" required helpText="10-digit mobile number">
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="9876543210"
            />
          </FormField>

          <FormField label="Password" id="reg-password" required helpText="At least 10 characters">
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••••"
            />
          </FormField>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-50 min-h-touch flex items-center justify-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>{loading ? 'Creating account...' : 'Create Account'}</span>
          </button>
        </form>

        <p className="text-center text-xs text-[#787065]">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-400 hover:text-brand-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
