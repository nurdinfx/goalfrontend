import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState('checking');

  const checkBackendConnection = useCallback(async () => {
    try {
      setBackendStatus('checking');
      await apiService.getHealth();
      setBackendStatus('connected');
    } catch (error) {
      console.log('Backend connection failed');
      setBackendStatus('disconnected');
    }
  }, []);

  const checkAuthStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');

      if (token && userData) {
        setUser(JSON.parse(userData));
      }

      // Always perform a single, quick backend health check on app start
      // so the login screen can show "Connected" or "Demo mode" promptly.
      await checkBackendConnection();

    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  }, [checkBackendConnection]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const clearAuthData = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const login = async (credentials) => {
    try {
      setLoading(true);
      
      // Try backend login first
      try {
        const response = await apiService.login(credentials);
        
        if (response.token && response.user) {
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          setUser(response.user);
          setBackendStatus('connected');
          
          return { 
            success: true, 
            user: response.user
          };
        }
      } catch (backendError) {
        console.log('Backend login failed, using demo mode');
        setBackendStatus('disconnected');
      }

      // Demo mode fallback for admin/password
      if (credentials.username === 'admin' && credentials.password === 'password') {
        const demoUser = {
          _id: 'demo-admin-id',
          username: 'admin',
          email: 'admin@garbage.com',
          name: 'System Administrator',
          role: 'admin',
          createdAt: new Date().toISOString()
        };
        
        const demoToken = 'demo-jwt-token-' + Date.now();
        
        localStorage.setItem('token', demoToken);
        localStorage.setItem('user', JSON.stringify(demoUser));
        setUser(demoUser);
        setBackendStatus('disconnected');
        
        return {
          success: true,
          user: demoUser
        };
      }
      
      return { 
        success: false, 
        error: 'Invalid username or password' 
      };
      
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.message || 'Login failed. Please try again.' 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearAuthData();
    setBackendStatus('checking');
    window.location.href = '/login';
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    login,
    logout,
    loading,
    updateUser,
    backendStatus,
    checkBackendConnection
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
