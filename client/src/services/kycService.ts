import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';

export const kycService = {
  getCustomerDocuments: async () => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.CUSTOMER_DOCS.LIST, {
      tokenType: 'customer',
    });
    return res.data;
  },

  uploadDocument: async (formData: FormData) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.CUSTOMER_DOCS.UPLOAD, {
      method: 'POST',
      tokenType: 'customer',
      body: formData,
    });
    return res.data;
  },

  reuploadDocument: async (docId: string, formData: FormData) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.CUSTOMER_DOCS.REUPLOAD(docId), {
      method: 'POST',
      tokenType: 'customer',
      body: formData,
    });
    return res.data;
  },
};
