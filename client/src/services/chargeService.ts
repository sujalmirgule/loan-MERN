import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';

export const chargeService = {
  getCustomerCharges: async () => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.CUSTOMER_CHARGES.LIST, {
      tokenType: 'customer',
    });
    return res.data;
  },

  getChargesByApplication: async (appId: string) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.CUSTOMER_CHARGES.BY_APPLICATION(appId), {
      tokenType: 'customer',
    });
    return res.data;
  },

  submitUtr: async (chargeId: string, utr: string, notes?: string) => {
    const res = await apiClient<{ success: boolean; data: any; message?: string }>(API_ENDPOINTS.CUSTOMER_CHARGES.SUBMIT_UTR(chargeId), {
      method: 'POST',
      tokenType: 'customer',
      body: JSON.stringify({ utr, notes }),
    });
    return res.data;
  },

  downloadInvoicePdf: async (chargeId: string) => {
    return apiClient(API_ENDPOINTS.CUSTOMER_CHARGES.INVOICE(chargeId, true), {
      tokenType: 'customer',
      responseType: 'blob',
    });
  },
};
