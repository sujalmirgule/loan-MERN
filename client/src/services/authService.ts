import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';

export const authService = {
  customerLogin: async (mobile: string) => {
    return apiClient<{ success: boolean; token: string; customer: any }>(API_ENDPOINTS.AUTH.CUSTOMER_LOGIN, {
      method: 'POST',
      body: JSON.stringify({ mobile }),
    });
  },

  customerRegister: async (payload: { fullName: string; mobile: string; email?: string; panNumber?: string; aadhaarNumber?: string }) => {
    return apiClient<{ success: boolean; token: string; customer: any }>(API_ENDPOINTS.AUTH.CUSTOMER_REGISTER, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  adminLogin: async (payload: { email: string; password: string }) => {
    return apiClient<{ success: boolean; token: string; admin: any }>(API_ENDPOINTS.AUTH.ADMIN_LOGIN, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getCurrentUser: async () => {
    return apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.AUTH.ME);
  },

  logout: async () => {
    try {
      await apiClient(API_ENDPOINTS.AUTH.LOGOUT, { method: 'POST' });
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('loan_approve_customer_token');
      localStorage.removeItem('loan_approve_admin_token');
      localStorage.removeItem('loan_approve_active_role');
    }
  },
};
