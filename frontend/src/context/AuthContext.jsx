import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Session is ONLY active if explicitly unlocked in this browser/PWA window session
  const isSessionActive = typeof window !== 'undefined' && sessionStorage.getItem('attendly_session_active') === 'true';
  const initialToken = isSessionActive ? (sessionStorage.getItem('contractor_token') || localStorage.getItem('contractor_token')) : null;

  const [token, setToken] = useState(initialToken);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(initialToken));
  const [isDemo, setIsDemo] = useState(
    isSessionActive && (sessionStorage.getItem('contractor_is_demo') === 'true' || localStorage.getItem('contractor_is_demo') === 'true')
  );
  const [loading, setLoading] = useState(true);
  const [appTitle, setAppTitle] = useState('Attendly');

  useEffect(() => {
    const checkAuth = async () => {
      const active = sessionStorage.getItem('attendly_session_active') === 'true';
      const storedToken = active ? (sessionStorage.getItem('contractor_token') || localStorage.getItem('contractor_token')) : null;

      if (storedToken) {
        try {
          const res = await api.get('/auth/verify');
          setIsAuthenticated(true);
          const demoMode = Boolean(res.data.is_demo);
          setIsDemo(demoMode);
          sessionStorage.setItem('contractor_is_demo', demoMode ? 'true' : 'false');
          localStorage.setItem('contractor_is_demo', demoMode ? 'true' : 'false');
        } catch (err) {
          console.warn('Session expired or invalid:', err);
          logout();
        }
      } else {
        setIsAuthenticated(false);
        setIsDemo(false);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const loginWithMpin = async (mpin) => {
    try {
      const response = await api.post('/auth/login-mpin', { mpin });
      const { access_token, app_title, is_demo } = response.data;
      sessionStorage.setItem('attendly_session_active', 'true');
      sessionStorage.setItem('contractor_token', access_token);
      sessionStorage.setItem('contractor_is_demo', is_demo ? 'true' : 'false');
      localStorage.setItem('contractor_token', access_token);
      localStorage.setItem('contractor_is_demo', is_demo ? 'true' : 'false');
      setToken(access_token);
      setIsAuthenticated(true);
      setIsDemo(Boolean(is_demo));
      if (app_title) setAppTitle(app_title);
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Invalid MPIN. Please try again.';
      return { success: false, message: errorMsg };
    }
  };

  const loginDemo = async () => {
    try {
      const response = await api.post('/auth/demo-login');
      const { access_token, app_title, is_demo } = response.data;
      sessionStorage.setItem('attendly_session_active', 'true');
      sessionStorage.setItem('contractor_token', access_token);
      sessionStorage.setItem('contractor_is_demo', 'true');
      localStorage.setItem('contractor_token', access_token);
      localStorage.setItem('contractor_is_demo', 'true');
      setToken(access_token);
      setIsAuthenticated(true);
      setIsDemo(true);
      if (app_title) setAppTitle(app_title);
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Could not launch demo account. Please try again.';
      return { success: false, message: errorMsg };
    }
  };

  const logout = () => {
    sessionStorage.removeItem('attendly_session_active');
    sessionStorage.removeItem('contractor_token');
    sessionStorage.removeItem('contractor_is_demo');
    localStorage.removeItem('contractor_token');
    localStorage.removeItem('contractor_is_demo');
    setToken(null);
    setIsAuthenticated(false);
    setIsDemo(false);
    setAppTitle('Attendly');
  };

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, isDemo, loading, appTitle, loginWithMpin, loginDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
