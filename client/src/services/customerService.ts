import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';

export const customerService = {
  getProfile: async () => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.CUSTOMERS.PROFILE, {
      tokenType: 'customer',
    });
    return res.data;
  },

  updateProfile: async (payload: any) => {
    const res = await apiClient<{ success: boolean; data: any; message?: string }>(API_ENDPOINTS.CUSTOMERS.UPDATE, {
      method: 'PATCH',
      tokenType: 'customer',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  getDashboard: async () => {
    const res = await apiClient<any>(API_ENDPOINTS.DASHBOARD.CUSTOMER, {
      tokenType: 'customer',
    });
    return res?.data ?? res;
  },
};
