import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';

export interface DashboardKPIs {
  totalCustomers: number;
  kycPending: number;
  kycApproved: number;
  kycRejected: number;
  totalLoanApplications: number;
  loansUnderReview: number;
  approvedLoans: number;
  rejectedLoans: number;
  paymentPending: number;
  paymentVerified: number;
  totalDisbursed: number;
  activeLoans: number;
}

export interface DashboardResponse {
  kpis: DashboardKPIs;
  funnel: Array<{ step: string; count: number; percentage: number }>;
  applicationTrend: Array<{ date: string; applications: number; approved: number; rejected: number }>;
  statusDistribution: Array<{ status: string; count: number }>;
  disbursementTrend?: Array<{ date: string; amount: number }>;
  recentApplications: Array<{
    id: string;
    applicationNumber: string;
    customerName: string;
    customerId: string;
    mobile: string;
    state: string;
    city?: string;
    loanType: string;
    requestedAmount: number;
    approvedAmount?: number;
    status: string;
    submittedAt: string;
    createdAt?: string;
  }>;
}

export const adminService = {
  // --- Dashboard ---
  getDashboard: async (params?: Record<string, string | number | boolean | undefined>) => {
    const res = await apiClient<{ success: boolean; data: DashboardResponse }>(API_ENDPOINTS.DASHBOARD.ADMIN, {
      tokenType: 'admin',
      params,
    });
    return res.data;
  },

  // --- Customers ---
  getCustomers: async (params?: Record<string, string | number | boolean | undefined>) => {
    const res = await apiClient<{ success: boolean; data: any; pagination?: any }>(API_ENDPOINTS.CUSTOMERS.LIST, {
      tokenType: 'admin',
      params,
    });
    return res;
  },

  getAllMatchingCustomers: async (params?: Record<string, string | number | boolean | undefined>) => {
    const res = await apiClient<{ success: boolean; data: any[]; total: number }>(API_ENDPOINTS.CUSTOMERS.ALL_MATCHING, {
      tokenType: 'admin',
      params,
    });
    return res;
  },

  getCustomer360: async (id: string) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.CUSTOMERS.DETAIL(id), {
      tokenType: 'admin',
    });
    return res.data;
  },

  getStates: async () => {
    const res = await apiClient<{ success: boolean; data: string[] }>(API_ENDPOINTS.CUSTOMERS.STATES, {
      tokenType: 'admin',
    });
    return res.data;
  },

  createManualCustomer: async (payload: any) => {
    const res = await apiClient<{ success: boolean; data: any; message?: string }>('/admin/customers/manual', {
      method: 'POST',
      tokenType: 'admin',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  exportCustomers: async (params?: Record<string, string | number | boolean | undefined>) => {
    return apiClient(API_ENDPOINTS.CUSTOMERS.EXPORT, {
      tokenType: 'admin',
      params,
      responseType: 'blob',
    });
  },

  deactivateCustomer: async (id: string, reason?: string) => {
    const res = await apiClient<{ success: boolean; message?: string; data: any }>(API_ENDPOINTS.CUSTOMERS.DEACTIVATE(id), {
      method: 'PATCH',
      tokenType: 'admin',
      body: JSON.stringify({ reason }),
    });
    return res;
  },

  reactivateCustomer: async (id: string, reason?: string) => {
    const res = await apiClient<{ success: boolean; message?: string; data: any }>(API_ENDPOINTS.CUSTOMERS.REACTIVATE(id), {
      method: 'PATCH',
      tokenType: 'admin',
      body: JSON.stringify({ reason }),
    });
    return res;
  },

  bulkSendWhatsApp: async (payload: {
    customerIds?: string[];
    applicationIds?: string[];
    filter?: Record<string, any>;
    message: string;
    templateName?: string;
  }) => {
    const res = await apiClient<{
      success: boolean;
      message?: string;
      data: {
        total: number;
        sentCount: number;
        failedCount: number;
        results: Array<{
          customerId?: string;
          customerName?: string;
          recipient?: string;
          phone?: string;
          status: string;
          success?: boolean;
          error?: string;
          failureReason?: string;
        }>;
      };
    }>('/admin/communication/whatsapp/bulk', {
      method: 'POST',
      tokenType: 'admin',
      body: JSON.stringify(payload),
    });
    return res;
  },

  bulkSendEmail: async (payload: {
    customerIds?: string[];
    applicationIds?: string[];
    filter?: Record<string, any>;
    subject: string;
    message: string;
    templateName?: string;
  }) => {
    const res = await apiClient<{
      success: boolean;
      message?: string;
      data: {
        total: number;
        sentCount: number;
        failedCount: number;
        results: Array<{
          customerId?: string;
          customerName?: string;
          recipient?: string;
          status: string;
          success?: boolean;
          error?: string;
          failureReason?: string;
        }>;
      };
    }>('/admin/communication/email/bulk', {
      method: 'POST',
      tokenType: 'admin',
      body: JSON.stringify(payload),
    });
    return res;
  },

  // --- Loans & Underwriting ---
  getLoanApplications: async (params?: Record<string, string | number | boolean | undefined>) => {
    const res = await apiClient<{ success: boolean; data: any; pagination?: any }>(API_ENDPOINTS.ADMIN_LOANS.LIST, {
      tokenType: 'admin',
      params,
    });
    return res;
  },

  getLoanDetail: async (id: string) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.ADMIN_LOANS.DETAIL(id), {
      tokenType: 'admin',
    });
    return res.data;
  },

  startReview: async (id: string, notes?: string) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.ADMIN_LOANS.REVIEW(id), {
      method: 'POST',
      tokenType: 'admin',
      body: JSON.stringify({ notes }),
    });
    return res.data;
  },

  approveLoan: async (id: string, payload: {
    approvedAmount: number;
    interestRate: number;
    tenureMonths: number;
    finalEmi: number;
    processingFeeAmount?: number;
    insuranceAmount?: number;
    totalPayable?: number;
    disbursementDate?: string;
    remarks?: string;
  }) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.ADMIN_LOANS.APPROVE(id), {
      method: 'POST',
      tokenType: 'admin',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  rejectLoan: async (id: string, payload: { reason: string; remarks?: string }) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.ADMIN_LOANS.REJECT(id), {
      method: 'POST',
      tokenType: 'admin',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  holdLoan: async (id: string, payload: { reason: string; remarks?: string }) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.ADMIN_LOANS.HOLD(id), {
      method: 'POST',
      tokenType: 'admin',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  requestLoanDocuments: async (id: string, payload: { requiredDocuments: string[]; notes?: string }) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.ADMIN_LOANS.REQUEST_DOCUMENTS(id), {
      method: 'POST',
      tokenType: 'admin',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  // --- KYC ---
  getKycList: async (params?: Record<string, string | number | boolean | undefined>) => {
    const res = await apiClient<{ success: boolean; data: any; pagination?: any }>(API_ENDPOINTS.ADMIN.KYC_LIST, {
      tokenType: 'admin',
      params,
    });
    return res;
  },

  getKycDetail: async (customerId: string) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.ADMIN.KYC_DETAIL(customerId), {
      tokenType: 'admin',
    });
    return res.data;
  },

  reviewKycDocument: async (docId: string, payload: { status: 'VERIFIED' | 'REJECTED' | 'CORRECTION_REQUIRED'; rejectionReason?: string; remarks?: string }) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.ADMIN.REVIEW_DOCUMENT(docId), {
      method: 'POST',
      tokenType: 'admin',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  overrideKycDecision: async (customerId: string, payload: { status: 'APPROVED' | 'REJECTED' | 'DOCUMENTS_REQUIRED'; notes?: string }) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.ADMIN.KYC_DECISION(customerId), {
      method: 'POST',
      tokenType: 'admin',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  // --- Payments & Verification ---
  getPendingPayments: async (params?: Record<string, string | number | boolean | undefined>) => {
    const res = await apiClient<{ success: boolean; data: any }>('/admin/payments/pending', {
      tokenType: 'admin',
      params,
    });
    return res.data;
  },

  getAllPayments: async (params?: Record<string, string | number | boolean | undefined>) => {
    const res = await apiClient<{ success: boolean; data: any; pagination?: any }>(API_ENDPOINTS.PAYMENTS.ADMIN_LIST, {
      tokenType: 'admin',
      params,
    });
    return res;
  },

  verifyPayment: async (id: string, notes?: string) => {
    const res = await apiClient<{ success: boolean; data: any; message?: string }>(API_ENDPOINTS.PAYMENTS.VERIFY(id), {
      method: 'PATCH',
      tokenType: 'admin',
      body: JSON.stringify({ notes }),
    });
    return res.data;
  },

  rejectPayment: async (id: string, reason: string) => {
    const res = await apiClient<{ success: boolean; data: any; message?: string }>(API_ENDPOINTS.PAYMENTS.REJECT(id), {
      method: 'PATCH',
      tokenType: 'admin',
      body: JSON.stringify({ reason }),
    });
    return res.data;
  },

  // --- Single UPI Method Settings ---
  getUpiSettings: async () => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.UPI_SETTINGS.GET, {
      tokenType: 'admin',
    });
    return res.data;
  },

  updateUpiSettings: async (payload: {
    enabled?: boolean;
    upiId: string;
    merchantName: string;
    qrCodeUrl?: string;
  }) => {
    const res = await apiClient<{ success: boolean; data: any; message?: string }>(API_ENDPOINTS.UPI_SETTINGS.UPDATE, {
      method: 'PATCH',
      tokenType: 'admin',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  // --- Bank Settings & Links ---
  getBankSettings: async () => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.BANK_SETTINGS.GET, {
      tokenType: 'admin',
    });
    return res.data;
  },

  updateBankSettings: async (payload: any) => {
    const res = await apiClient<{ success: boolean; data: any; message?: string }>(API_ENDPOINTS.BANK_SETTINGS.UPDATE, {
      method: 'PATCH',
      tokenType: 'admin',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  getPaymentLinks: async () => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.PAYMENT_LINKS.LIST, {
      tokenType: 'admin',
    });
    return res.data;
  },

  createPaymentLink: async (payload: any) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.PAYMENT_LINKS.CREATE, {
      method: 'POST',
      tokenType: 'admin',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  updatePaymentLink: async (id: string, payload: any) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.PAYMENT_LINKS.UPDATE(id), {
      method: 'PATCH',
      tokenType: 'admin',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  deletePaymentLink: async (id: string) => {
    const res = await apiClient<{ success: boolean }>(API_ENDPOINTS.PAYMENT_LINKS.DELETE(id), {
      method: 'DELETE',
      tokenType: 'admin',
    });
    return res;
  },

  // --- Charges & Fees ---
  getChargesConfig: async () => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.CHARGES.CONFIG, {
      tokenType: 'admin',
    });
    return res.data;
  },

  updateChargesConfig: async (payload: {
    interestRate?: number;
    kycChargeAmount?: number;
    processingFeeAmount?: number;
    gstPercentage?: number;
  }) => {
    const res = await apiClient<{ success: boolean; data: any; message?: string }>(API_ENDPOINTS.CHARGES.CONFIG, {
      method: 'PATCH',
      tokenType: 'admin',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  getChargesRecords: async (params?: Record<string, string | number | boolean | undefined>) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.CHARGES.RECORDS, {
      tokenType: 'admin',
      params,
    });
    return res.data;
  },

  getSpecificChargesByApplication: async (appId: string) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.CHARGES.SPECIFIC.BY_APPLICATION(appId), {
      tokenType: 'admin',
    });
    return res.data;
  },

  getSpecificChargesByCustomer: async (customerId: string) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.CHARGES.SPECIFIC.BY_CUSTOMER(customerId), {
      tokenType: 'admin',
    });
    return res.data;
  },

  createSpecificCharge: async (payload: {
    customerId: string;
    loanApplicationId?: string;
    chargeType: string;
    amount: number;
    notes?: string;
    dueDate?: string;
  }) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.CHARGES.SPECIFIC.CREATE, {
      method: 'POST',
      tokenType: 'admin',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  verifySpecificChargePayment: async (chargeId: string, payload?: { utr?: string; notes?: string }) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.CHARGES.SPECIFIC.VERIFY_PAYMENT(chargeId), {
      method: 'POST',
      tokenType: 'admin',
      body: JSON.stringify(payload || {}),
    });
    return res.data;
  },

  cancelSpecificCharge: async (chargeId: string, notes?: string) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.CHARGES.SPECIFIC.CANCEL(chargeId), {
      method: 'POST',
      tokenType: 'admin',
      body: JSON.stringify({ notes }),
    });
    return res.data;
  },

  // --- Communication Center ---
  getCommunicationCustomers: async (params?: Record<string, string | number | boolean | undefined>) => {
    const res = await apiClient<{ success: boolean; data: any; pagination?: any }>(API_ENDPOINTS.COMMUNICATION.CUSTOMERS, {
      tokenType: 'admin',
      params,
    });
    return res;
  },

  getCommunicationTemplates: async () => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.COMMUNICATION.TEMPLATES, {
      tokenType: 'admin',
    });
    return res.data;
  },

  sendCustomerEmail: async (payload: {
    customerIds: string[];
    subject: string;
    message: string;
    templateId?: string;
  }) => {
    const res = await apiClient<{ success: boolean; sentCount?: number; message?: string }>(API_ENDPOINTS.COMMUNICATION.SEND_EMAIL, {
      method: 'POST',
      tokenType: 'admin',
      body: JSON.stringify(payload),
    });
    return res;
  },

  sendBulkWhatsApp: async (payload: {
    customerIds: string[];
    message: string;
    templateId?: string;
  }) => {
    const res = await apiClient<{ success: boolean; sentCount?: number; message?: string }>('/admin/communication/whatsapp/bulk', {
      method: 'POST',
      tokenType: 'admin',
      body: JSON.stringify(payload),
    });
    return res;
  },

  getCommunicationHistory: async (params?: Record<string, string | number | boolean | undefined>) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.COMMUNICATION.HISTORY, {
      tokenType: 'admin',
      params,
    });
    return res.data;
  },

  getCommunicationSettings: async () => {
    const res = await apiClient<{ success: boolean; data: any }>('/admin/settings/communication', {
      tokenType: 'admin',
    });
    return res.data;
  },

  updateCommunicationSettings: async (payload: any) => {
    const res = await apiClient<{ success: boolean; data: any }>('/admin/settings/communication', {
      method: 'PATCH',
      tokenType: 'admin',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  // --- Settings: Branding & Domains ---
  getBranding: async () => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.SETTINGS.BRANDING_GET, {
      tokenType: 'admin',
    });
    return res.data;
  },

  updateBranding: async (payload: any) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.SETTINGS.BRANDING_UPDATE, {
      method: 'PATCH',
      tokenType: 'admin',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  getDomains: async () => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.DOMAINS.LIST, {
      tokenType: 'admin',
    });
    return res.data;
  },

  createDomain: async (payload: any) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.DOMAINS.CREATE, {
      method: 'POST',
      tokenType: 'admin',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  updateDomain: async (id: string, payload: any) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.DOMAINS.UPDATE(id), {
      method: 'PATCH',
      tokenType: 'admin',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  deleteDomain: async (id: string) => {
    const res = await apiClient<{ success: boolean }>(API_ENDPOINTS.DOMAINS.DELETE(id), {
      method: 'DELETE',
      tokenType: 'admin',
    });
    return res;
  },

  // --- Settings: Email & WhatsApp Channels ---
  getEmailSettings: async () => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.SETTINGS.EMAIL_GET, {
      tokenType: 'admin',
    });
    return res.data;
  },

  updateEmailSettings: async (payload: any) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.SETTINGS.EMAIL_UPDATE, {
      method: 'PATCH',
      tokenType: 'admin',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  testEmailConnection: async () => {
    const res = await apiClient<{ success: boolean; message?: string; status?: string; error?: string }>(API_ENDPOINTS.SETTINGS.EMAIL_TEST_CONNECTION, {
      method: 'POST',
      tokenType: 'admin',
    });
    return res;
  },

  sendTestEmail: async (payload: { toEmail: string; subject?: string; message?: string }) => {
    const res = await apiClient<{ success: boolean; message?: string; previewUrl?: string; error?: string }>(API_ENDPOINTS.SETTINGS.EMAIL_TEST, {
      method: 'POST',
      tokenType: 'admin',
      body: JSON.stringify(payload),
    });
    return res;
  },

  getWhatsAppSettings: async () => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.SETTINGS.WHATSAPP_GET, {
      tokenType: 'admin',
    });
    return res.data;
  },

  updateWhatsAppSettings: async (payload: any) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.SETTINGS.WHATSAPP_UPDATE, {
      method: 'PATCH',
      tokenType: 'admin',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  testWhatsAppConnection: async () => {
    const res = await apiClient<{ success: boolean; message?: string; status?: string; error?: string }>(API_ENDPOINTS.SETTINGS.WHATSAPP_TEST_CONNECTION, {
      method: 'POST',
      tokenType: 'admin',
    });
    return res;
  },

  sendTestWhatsApp: async (payload: { toNumber: string; message?: string }) => {
    const res = await apiClient<{ success: boolean; message?: string; delivered?: boolean; error?: string }>(API_ENDPOINTS.SETTINGS.WHATSAPP_TEST, {
      method: 'POST',
      tokenType: 'admin',
      body: JSON.stringify(payload),
    });
    return res;
  },

  // --- Dynamic Payment Methods Enable/Disable ---
  getPaymentMethods: async () => {
    const res = await apiClient<{ success: boolean; data: { upi: boolean; bankTransfer: boolean; merchantVpa: boolean } }>(
      API_ENDPOINTS.PAYMENT_METHODS.GET,
      { tokenType: 'admin' }
    );
    return res.data;
  },

  updatePaymentMethods: async (payload: { upi?: boolean; bankTransfer?: boolean; merchantVpa?: boolean }) => {
    const res = await apiClient<{ success: boolean; message?: string; data: { upi: boolean; bankTransfer: boolean; merchantVpa: boolean } }>(
      API_ENDPOINTS.PAYMENT_METHODS.UPDATE,
      {
        method: 'PUT',
        tokenType: 'admin',
        body: JSON.stringify(payload),
      }
    );
    return res;
  },

  // --- Reports & Audits ---
  getReportsSummary: async (params?: Record<string, string | number | boolean | undefined>) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.REPORTS.SUMMARY, {
      tokenType: 'admin',
      params,
    });
    return res.data;
  },

  exportReportsExcel: async (type: string, params?: Record<string, string | number | boolean | undefined>) => {
    return apiClient(API_ENDPOINTS.REPORTS.EXPORT_EXCEL(type), {
      tokenType: 'admin',
      params,
      responseType: 'blob',
    });
  },

  getAuditLogs: async (params?: Record<string, string | number | boolean | undefined>) => {
    const res = await apiClient<{ success: boolean; data: any; pagination?: any }>(API_ENDPOINTS.AUDIT.LIST, {
      tokenType: 'admin',
      params,
    });
    return res;
  },

  // --- Admin Users & Notifications ---
  getAdminUsers: async () => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.ADMIN_USERS.LIST, {
      tokenType: 'admin',
    });
    return res.data;
  },

  createAdminUser: async (payload: any) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.ADMIN_USERS.CREATE, {
      method: 'POST',
      tokenType: 'admin',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  updateAdminUser: async (id: string, payload: any) => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.ADMIN_USERS.UPDATE(id), {
      method: 'PATCH',
      tokenType: 'admin',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  getNotifications: async () => {
    const res = await apiClient<{ success: boolean; data: any }>(API_ENDPOINTS.NOTIFICATIONS.ADMIN_LIST, {
      tokenType: 'admin',
    });
    return res.data;
  },

  markNotificationRead: async (id: string) => {
    const res = await apiClient<{ success: boolean }>(API_ENDPOINTS.NOTIFICATIONS.ADMIN_MARK_READ(id), {
      method: 'PATCH',
      tokenType: 'admin',
    });
    return res;
  },
};
