import axios from 'axios';

// Resolve API base URL from Vite environment variables (e.g. on Vercel or external domain)
const rawApiUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.trim().replace(/\/+$/, '') : '';

const getBaseUrl = () => {
  if (!rawApiUrl) {
    // Fallback to relative '/api' path (routed via Vite proxy in development)
    return '/api';
  }
  // Ensure the '/api' prefix is present
  return rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests if available
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('contractor_token') || localStorage.getItem('contractor_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Intercept 401 Unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and session lock, then redirect to login
      sessionStorage.removeItem('attendly_session_active');
      sessionStorage.removeItem('contractor_token');
      sessionStorage.removeItem('contractor_is_demo');
      localStorage.removeItem('contractor_token');
      localStorage.removeItem('contractor_is_demo');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
