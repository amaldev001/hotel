import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import FormField from '../components/common/FormField';
import { Utensils, Lock } from 'lucide-react';

export const Login = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnPath = searchParams.get('returnPath') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const loggedUser = await login(email, password);
      showToast('Login successful!', 'success');
      if (loggedUser.mustChangePassword) {
        navigate('/change-password');
      } else {
        navigate(decodeURIComponent(returnPath));
      }
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || 'Invalid email or password';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-[#191715] p-8 rounded-2xl shadow-2xl border border-[#2a2724]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-brand-500 text-white flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Utensils className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-[#f5ede6] font-serif">Welcome Back</h2>
          <p className="mt-1 text-sm text-[#a89f91]">Sign in to your Savora account</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/50 text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <FormField label="Email Address" id="login-email" required>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              autoComplete="email"
            />
          </FormField>

          <FormField label="Password" id="login-password" required>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </FormField>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-50 min-h-touch flex items-center justify-center space-x-2"
          >
            <Lock className="w-4 h-4" />
            <span>{loading ? 'Signing in...' : 'Sign In'}</span>
          </button>
        </form>

        <p className="text-center text-xs text-[#787065]">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-brand-400 hover:text-brand-300">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
