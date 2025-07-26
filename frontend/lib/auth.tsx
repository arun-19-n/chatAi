'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { toast } from 'react-hot-toast';
import { authApi, User } from './api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  signup: (data: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    firstName?: string;
    lastName?: string;
  }) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is authenticated
  const isAuthenticated = !!user;

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = Cookies.get('token');
      const savedUser = Cookies.get('user');

      if (token && savedUser) {
        try {
          // Parse saved user data
          const userData = JSON.parse(savedUser);
          setUser(userData);

          // Optionally validate token with server
          try {
            const response = await authApi.getProfile();
            if (response.success && response.data?.user) {
              setUser(response.data.user);
              Cookies.set('user', JSON.stringify(response.data.user), { expires: 7 });
            }
          } catch (error) {
            // If profile fetch fails, use saved user data
            console.warn('Failed to fetch current profile, using cached data');
          }
        } catch (error) {
          console.error('Invalid saved user data:', error);
          logout();
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (identifier: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await authApi.login({ identifier, password });

      if (response.success && response.data) {
        const { user: userData, token, refreshToken } = response.data;
        
        // Save tokens and user data
        Cookies.set('token', token, { expires: 7 });
        Cookies.set('refreshToken', refreshToken, { expires: 30 });
        Cookies.set('user', JSON.stringify(userData), { expires: 7 });
        
        setUser(userData);
        toast.success('Login successful!');
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Login failed';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    firstName?: string;
    lastName?: string;
  }) => {
    try {
      setIsLoading(true);
      const response = await authApi.signup(data);

      if (response.success && response.data) {
        const { user: userData, token, refreshToken } = response.data;
        
        // Save tokens and user data
        Cookies.set('token', token, { expires: 7 });
        Cookies.set('refreshToken', refreshToken, { expires: 30 });
        Cookies.set('user', JSON.stringify(userData), { expires: 7 });
        
        setUser(userData);
        toast.success('Account created successfully!');
      } else {
        throw new Error(response.message || 'Signup failed');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Signup failed';
      
      // Handle validation errors
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors
          .map((err: any) => err.message)
          .join(', ');
        toast.error(errorMessages);
      } else {
        toast.error(message);
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Clear all auth data
    Cookies.remove('token');
    Cookies.remove('refreshToken');
    Cookies.remove('user');
    setUser(null);
    
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
    
    toast.success('Logged out successfully');
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const savedRefreshToken = Cookies.get('refreshToken');
      
      if (!savedRefreshToken) {
        logout();
        return false;
      }

      const response = await authApi.refresh(savedRefreshToken);
      
      if (response.success && response.data) {
        const { token, refreshToken: newRefreshToken } = response.data;
        
        // Update tokens
        Cookies.set('token', token, { expires: 7 });
        Cookies.set('refreshToken', newRefreshToken, { expires: 30 });
        
        return true;
      } else {
        logout();
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    signup,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Higher-order component for protecting routes
export const withAuth = <P extends object>(
  WrappedComponent: React.ComponentType<P>
): React.FC<P> => {
  const AuthenticatedComponent: React.FC<P> = (props) => {
    const { isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        window.location.href = '/auth/login';
      }
    }, [isLoading, isAuthenticated]);

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="loading-spinner w-8 h-8"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };

  AuthenticatedComponent.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name})`;

  return AuthenticatedComponent;
};

// Utility function to check auth status
export const checkAuthStatus = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const token = Cookies.get('token');
  const user = Cookies.get('user');
  
  return !!(token && user);
};

// Utility function to get current user from cookies
export const getCurrentUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const savedUser = Cookies.get('user');
    return savedUser ? JSON.parse(savedUser) : null;
  } catch (error) {
    console.error('Failed to parse saved user data:', error);
    return null;
  }
};