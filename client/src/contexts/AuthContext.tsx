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
  adminRole?: 'SUPER_ADMIN' | 'ADMIN' | 'STAFF';
  permissions?: string[];
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
  hasPermission: (permissionKey: string | string[]) => boolean;
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
    const isPathAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
    const isPathCustomer = typeof window !== 'undefined' && window.location.pathname.startsWith('/customer');

    let activeRole: UserRole | null = null;
    let token: string | null = null;

    if (isPathAdmin) {
      activeRole = 'ADMIN';
      token = localStorage.getItem('loan_approve_admin_token');
    } else if (isPathCustomer) {
      activeRole = 'CUSTOMER';
      token = localStorage.getItem('loan_approve_customer_token');
    } else {
      const storedRole = localStorage.getItem('loan_approve_active_role') as UserRole | null;
      if (storedRole === 'ADMIN' && localStorage.getItem('loan_approve_admin_token')) {
        activeRole = 'ADMIN';
        token = localStorage.getItem('loan_approve_admin_token');
      } else if (localStorage.getItem('loan_approve_customer_token')) {
        activeRole = 'CUSTOMER';
        token = localStorage.getItem('loan_approve_customer_token');
      } else if (localStorage.getItem('loan_approve_admin_token')) {
        activeRole = 'ADMIN';
        token = localStorage.getItem('loan_approve_admin_token');
      }
    }

    if (!token || token === 'undefined' || token === 'null' || !activeRole) {
      if (token === 'undefined' || token === 'null') {
        if (activeRole === 'ADMIN') localStorage.removeItem('loan_approve_admin_token');
        else localStorage.removeItem('loan_approve_customer_token');
      }
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiClient<MeResponse>(API_ENDPOINTS.AUTH.ME, {
        tokenType: activeRole === 'ADMIN' ? 'admin' : 'customer',
      });

      if (response.success && response.data?.user) {
        setUser(response.data.user);
        setRole(response.data.user.role);
        localStorage.setItem('loan_approve_active_role', response.data.user.role);
      } else {
        throw new Error('Session invalid');
      }
    } catch {
      // Clear corrupt or expired token for only the target role
      if (activeRole === 'ADMIN') {
        localStorage.removeItem('loan_approve_admin_token');
      } else {
        localStorage.removeItem('loan_approve_customer_token');
      }
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

      if (response.success && response.data?.token) {
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

      if (response.success && response.data?.token) {
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

      if (response.success && response.data?.token) {
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
    const currentRole = role;
    try {
      await apiClient(API_ENDPOINTS.AUTH.LOGOUT, {
        method: 'POST',
        tokenType: currentRole === 'ADMIN' ? 'admin' : 'customer',
      }).catch(() => {
        // Ignore server error on logout
      });
    } finally {
      if (currentRole === 'ADMIN') {
        localStorage.removeItem('loan_approve_admin_token');
      } else {
        localStorage.removeItem('loan_approve_customer_token');
      }
      if (localStorage.getItem('loan_approve_active_role') === currentRole) {
        localStorage.removeItem('loan_approve_active_role');
      }
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

  const hasPermission = useCallback(
    (permissionKey: string | string[]): boolean => {
      if (!user || user.role !== 'ADMIN') return false;
      const adminUser = user as AdminUser;
      if (adminUser.adminRole === 'SUPER_ADMIN') return true;
      const userPerms = adminUser.permissions || [];
      if (Array.isArray(permissionKey)) {
        return permissionKey.some((k) => userPerms.includes(k));
      }
      return userPerms.includes(permissionKey);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: !!user,
        isLoading,
        hasPermission,
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
