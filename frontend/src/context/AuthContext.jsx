import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('contractor_token') || null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('contractor_token'));
  const [loading, setLoading] = useState(true);
  const [appTitle, setAppTitle] = useState('Attendly');

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('contractor_token');
      if (storedToken) {
        try {
          await api.get('/auth/verify');
          setIsAuthenticated(true);
        } catch (err) {
          console.warn('Session expired or invalid:', err);
          logout();
        }
      } else {
        setIsAuthenticated(false);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const loginWithMpin = async (mpin) => {
    try {
      const response = await api.post('/auth/login-mpin', { mpin });
      const { access_token, app_title } = response.data;
      localStorage.setItem('contractor_token', access_token);
      setToken(access_token);
      setIsAuthenticated(true);
      if (app_title) setAppTitle(app_title);
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Invalid MPIN. Please try again.';
      return { success: false, message: errorMsg };
    }
  };

  const logout = () => {
    localStorage.removeItem('contractor_token');
    setToken(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, loading, appTitle, loginWithMpin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
