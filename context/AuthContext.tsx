import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, setAuthToken, getAuthToken } from '../api/client';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const userData = await authAPI.getMe();
          if (userData && userData.id) {
            setUser({
              ...userData,
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'User')}&background=3B82F6&color=fff`
            });
          } else {
            // Invalid response, clear token
            setAuthToken(null);
          }
        } catch (err) {
          // Only clear token on auth errors (401/403), not on network errors
          const isAuthError = err instanceof Error &&
            (err.message.includes('401') ||
             err.message.includes('403') ||
             err.message.includes('Invalid') ||
             err.message.includes('expired'));
          if (isAuthError) {
            setAuthToken(null);
          } else {
            // Network error - keep the token, user can retry
            console.warn('Auth check failed (network error):', err);
          }
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await authAPI.login(email, password);
      setUser({
        ...response.user,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(response.user.name)}&background=3B82F6&color=fff`
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      error
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
