import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const ConfigContext = createContext(null);

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({
    currency: 'USD',
    timezone: 'UTC',
    taxPercent: 5,
    appName: 'Savora',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/config')
      .then((res) => {
        if (res.data && res.data.data) {
          setConfig(res.data.data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load /api/config, using defaults:', err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <ConfigContext.Provider value={{ config, loading }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
};
