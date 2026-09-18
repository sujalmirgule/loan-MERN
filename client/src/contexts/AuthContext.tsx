import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';

export type UserRole = 'CUSTOMER' | 'ADMIN';

export interface CustomerUser {
  id: string;
  role: 'CUSTOMER';
  fullName: string;
  mobile: string;
  email: string;
  address: string;
  state: string;
  city: string;
  aadhaarMasked: string;
  monthlyIncome: number;
  status: string;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  role: 'ADMIN';
  fullName: string;
  email: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export type SafeUser = CustomerUser | AdminUser;

export interface CustomerRegisterData {
  fullName: string;
  mobile: string;
  email: string;
  address: string;
  state: string;
  city: string;
  aadhaar: string;
  monthlyIncome: number;
}

interface AuthResponse {
  success: boolean;
  message?: string;
  data: {
    token: string;
    user: SafeUser;
  };
}

interface MeResponse {
  success: boolean;
  data: {
    user: SafeUser;
  };
}

interface AuthContextType {
  user: SafeUser | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginCustomer: (mobile: string) => Promise<void>;
  registerCustomer: (data: CustomerRegisterData) => Promise<void>;
  loginAdmin: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (data: Partial<CustomerUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore authenticated session on initial app load
  const restoreSession = useCallback(async () => {
    const activeRole = localStorage.getItem('loan_approve_active_role') as UserRole | null;
    const token =
      activeRole === 'ADMIN'
        ? localStorage.getItem('loan_approve_admin_token')
        : localStorage.getItem('loan_approve_customer_token');

    if (!token || !activeRole) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiClient<MeResponse>(API_ENDPOINTS.AUTH.ME, {
        tokenType: activeRole === 'ADMIN' ? 'admin' : 'customer',
      });

      if (response.success && response.data.user) {
        setUser(response.data.user);
        setRole(response.data.user.role);
      } else {
        throw new Error('Session invalid');
      }
    } catch {
      // Clear corrupt or expired tokens
      localStorage.removeItem('loan_approve_customer_token');
      localStorage.removeItem('loan_approve_admin_token');
      localStorage.removeItem('loan_approve_active_role');
      setUser(null);
      setRole(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const loginCustomer = async (mobile: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient<AuthResponse>(API_ENDPOINTS.AUTH.CUSTOMER_LOGIN, {
        method: 'POST',
        body: JSON.stringify({ mobile }),
      });

      if (response.success && response.data) {
        localStorage.setItem('loan_approve_customer_token', response.data.token);
        localStorage.setItem('loan_approve_active_role', 'CUSTOMER');
        setUser(response.data.user);
        setRole('CUSTOMER');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const registerCustomer = async (data: CustomerRegisterData) => {
    setIsLoading(true);
    try {
      const response = await apiClient<AuthResponse>(API_ENDPOINTS.AUTH.CUSTOMER_REGISTER, {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (response.success && response.data) {
        localStorage.setItem('loan_approve_customer_token', response.data.token);
        localStorage.setItem('loan_approve_active_role', 'CUSTOMER');
        setUser(response.data.user);
        setRole('CUSTOMER');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loginAdmin = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient<AuthResponse>(API_ENDPOINTS.AUTH.ADMIN_LOGIN, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (response.success && response.data) {
        localStorage.setItem('loan_approve_admin_token', response.data.token);
        localStorage.setItem('loan_approve_active_role', 'ADMIN');
        setUser(response.data.user);
        setRole('ADMIN');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient(API_ENDPOINTS.AUTH.LOGOUT, {
        method: 'POST',
      }).catch(() => {
        // Ignore server error on logout
      });
    } finally {
      localStorage.removeItem('loan_approve_customer_token');
      localStorage.removeItem('loan_approve_admin_token');
      localStorage.removeItem('loan_approve_active_role');
      setUser(null);
      setRole(null);
    }
  };

  const refreshUser = async () => {
    await restoreSession();
  };

  const updateUser = (updatedFields: Partial<CustomerUser>) => {
    setUser((prev) => {
      if (!prev || prev.role !== 'CUSTOMER') return prev;
      return {
        ...prev,
        ...updatedFields,
      };
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: !!user,
        isLoading,
        loginCustomer,
        registerCustomer,
        loginAdmin,
        logout,
        refreshUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
