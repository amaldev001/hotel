import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response Interceptor for global 401 handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const currentPath = window.location.pathname;
      // Do not redirect if already on login or register
      if (currentPath !== '/login' && currentPath !== '/register') {
        const returnUrl = encodeURIComponent(currentPath + window.location.search);
        window.location.href = `/login?returnPath=${returnUrl}`;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
