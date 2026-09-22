import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';

export const paymentService = {
  getPaymentOptions: async () => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.ACTIVE_PAYMENT_OPTIONS);
    return res.data;
  },

  getPaymentRequirement: async (loanId: string) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.PAYMENTS.CUSTOMER_REQUIREMENT(loanId), {
      tokenType: 'customer',
    });
    return res.data;
  },

  submitUtr: async (loanId: string, utr: string, notes?: string) => {
    const res = await apiClient<{ success: boolean; data: any; message?: string }>(API_ENDPOINTS.PAYMENTS.SUBMIT_UTR(loanId), {
      method: 'POST',
      tokenType: 'customer',
      body: JSON.stringify({ utr, notes }),
    });
    return res.data;
  },
};
