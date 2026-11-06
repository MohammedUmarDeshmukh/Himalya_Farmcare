import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearStoredToken,
  clearStoredUser,
  getMe,
  getStoredToken,
  getStoredUser,
  login as apiLogin,
  register as apiRegister,
  storeToken,
  storeUser,
} from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [token, setToken] = useState(() => getStoredToken());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Verify and rehydrate session on initial mount
  useEffect(() => {
    let isMounted = true;

    async function rehydrateSession() {
      const activeToken = getStoredToken();
      if (!activeToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const { user: currentUser } = await getMe(activeToken);
        if (isMounted) {
          setUser(currentUser);
          storeUser(currentUser);
        }
      } catch (err) {
        console.warn('Session verification failed or token expired:', err.message);
        if (isMounted) {
          setUser(null);
          setToken(null);
          clearStoredToken();
          clearStoredUser();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    rehydrateSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    setError('');
    try {
      const result = await apiLogin({ email, password });
      setUser(result.user);
      setToken(result.token);
      storeToken(result.token);
      storeUser(result.user);
      return result;
    } catch (err) {
      setError(err.message || 'Login failed.');
      throw err;
    }
  }, []);

  const register = useCallback(async (userData) => {
    setError('');
    try {
      const result = await apiRegister(userData);
      setUser(result.user);
      setToken(result.token);
      storeToken(result.token);
      storeUser(result.user);
      return result;
    } catch (err) {
      setError(err.message || 'Registration failed.');
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setError('');
    clearStoredToken();
    clearStoredUser();
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      error,
      isAuthenticated: Boolean(user && token),
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
      clearError: () => setError(''),
    }),
    [user, token, isLoading, error, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return context;
}

export default AuthContext;
