import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShoppingBag, Bell, Utensils, User, LogOut, Shield, Store } from 'lucide-react';

export const Navbar = () => {
  const { user, logout, unreadNotificationsCount } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-[#0e0d0c]/95 backdrop-blur-md border-b border-[#2a2724]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center space-x-2.5 font-bold text-xl tracking-tight">
          <div className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-sm">
            <Utensils className="w-5 h-5" />
          </div>
          <span className="font-semibold tracking-tight text-[#f5ede6] text-2xl font-serif">Savora</span>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center space-x-1 sm:space-x-3">
          <Link
            to="/restaurants"
            className="px-3 py-2 rounded-lg text-sm font-medium text-[#a89f91] hover:text-[#f5ede6] hover:bg-[#24211e] transition-colors"
          >
            Restaurants
          </Link>

          {user && user.role === 'customer' && (
            <>
              <Link
                to="/cart"
                className="p-2 rounded-lg text-[#a89f91] hover:text-[#f5ede6] hover:bg-[#24211e] relative min-h-touch min-w-touch flex items-center justify-center transition-colors"
                aria-label="View Cart"
              >
                <ShoppingBag className="w-5 h-5" />
              </Link>
              <Link
                to="/notifications"
                className="p-2 rounded-lg text-[#a89f91] hover:text-[#f5ede6] hover:bg-[#24211e] relative min-h-touch min-w-touch flex items-center justify-center transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </Link>
            </>
          )}

          {user && user.role === 'restaurant' && (
            <Link
              to="/restaurant/dashboard"
              className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium text-brand-400 bg-brand-950/60 border border-brand-900/50 hover:bg-brand-900/60 transition-colors"
            >
              <Store className="w-4 h-4" />
              <span className="hidden sm:inline">Owner Portal</span>
            </Link>
          )}

          {user && user.role === 'admin' && (
            <Link
              to="/admin/dashboard"
              className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium text-amber-300 bg-amber-950/60 border border-amber-900/50 hover:bg-amber-900/60 transition-colors"
            >
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Admin Portal</span>
            </Link>
          )}

          {/* User Menu */}
          {user ? (
            <div className="flex items-center space-x-1 sm:space-x-2 pl-2 border-l border-[#2a2724]">
              <Link
                to="/profile"
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-[#f5ede6] hover:bg-[#24211e] transition-colors"
              >
                <User className="w-4 h-4" />
                <span className="hidden md:inline">{user.name}</span>
              </Link>
              <button
                onClick={logout}
                className="p-2 rounded-lg text-stone-400 hover:text-rose-400 hover:bg-rose-950/40 min-h-touch min-w-touch flex items-center justify-center transition-colors"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 pl-2">
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl text-sm font-medium text-[#f5ede6] hover:bg-[#24211e] min-h-touch flex items-center transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-xl text-sm font-medium bg-brand-500 hover:bg-brand-600 text-white shadow-sm min-h-touch flex items-center transition-colors"
              >
                Register
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
