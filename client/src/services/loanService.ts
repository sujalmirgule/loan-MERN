import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';

export const loanService = {
  applyLoan: async (payload: {
    loanType: string;
    requestedAmount: number;
    tenureMonths: number;
    purpose?: string;
  }) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.LOANS.CUSTOMER_APPLY, {
      method: 'POST',
      tokenType: 'customer',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  getCustomerLoans: async () => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.LOANS.CUSTOMER_LIST, {
      tokenType: 'customer',
    });
    return res.data;
  },

  getLoanDetail: async (id: string) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.LOANS.CUSTOMER_DETAIL(id), {
      tokenType: 'customer',
    });
    return res.data;
  },

  acceptOffer: async (id: string) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.LOANS.ACCEPT_OFFER(id), {
      method: 'POST',
      tokenType: 'customer',
    });
    return res.data;
  },

  rejectOffer: async (id: string, reason?: string) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.LOANS.REJECT_OFFER(id), {
      method: 'POST',
      tokenType: 'customer',
      body: JSON.stringify({ reason }),
    });
    return res.data;
  },

  getAgreement: async (id: string) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.AGREEMENTS.CUSTOMER_GET(id), {
      tokenType: 'customer',
    });
    return res.data;
  },

  acceptAgreement: async (id: string) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.AGREEMENTS.CUSTOMER_ACCEPT(id), {
      method: 'POST',
      tokenType: 'customer',
    });
    return res.data;
  },
};
