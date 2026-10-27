import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');

  const refreshSession = useCallback(async () => {
    setSessionError('');
    try {
      const { data } = await api.get('/customers/me');
      setCustomer(data.customer);
    } catch (error) {
      if (error.response?.status === 401) {
        setCustomer(null);
        return;
      }
      setSessionError('Could not restore your session. Check your connection and retry.');
      throw error;
    }
  }, []);

  useEffect(() => {
    refreshSession()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshSession]);

  const login = useCallback(async (credentials) => {
    const { data } = await api.post('/customers/login', credentials);
    setCustomer(data.customer);
    return data.customer;
  }, []);

  const register = useCallback(async (details) => {
    const { data } = await api.post('/customers/register', details);
    setCustomer(data.customer);
    return data.customer;
  }, []);

  const logout = useCallback(async () => {
    await api.post('/customers/logout');
    setCustomer(null);
  }, []);

  const becomeCreator = useCallback(async () => {
    const { data } = await api.patch('/customers/become-creator');
    setCustomer(data.customer);
    return data.customer;
  }, []);

  const value = useMemo(
    () => ({
      customer,
      loading,
      sessionError,
      login,
      register,
      logout,
      becomeCreator,
      refreshSession,
    }),
    [customer, loading, sessionError, login, register, logout, becomeCreator, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
