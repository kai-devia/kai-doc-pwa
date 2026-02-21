import { useState, useCallback } from 'react';
import { login as apiLogin, logout as apiLogout, isAuthenticated } from '../api/client';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (user, password) => {
    setLoading(true);
    setError(null);
    
    try {
      await apiLogin(user, password);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    apiLogout();
  }, []);

  return {
    isAuthenticated: isAuthenticated(),
    login,
    logout,
    loading,
    error,
  };
}
