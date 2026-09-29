import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const fetchUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data && res.data.data) {
        setUser(res.data.data);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications/unread-count');
      if (res.data && res.data.data) {
        setUnreadNotificationsCount(res.data.data.unreadCount || 0);
      }
    } catch (e) {
      // Ignore background notification fetch errors
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
    }
  }, [user]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data && res.data.data) {
      setUser(res.data.data);
      return res.data.data;
    }
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    if (res.data && res.data.data) {
      setUser(res.data.data);
      return res.data.data;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.warn('Logout request failed', e);
    } finally {
      setUser(null);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        unreadNotificationsCount,
        login,
        register,
        logout,
        refreshUser: fetchUser,
        refreshNotifications: fetchUnreadCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
