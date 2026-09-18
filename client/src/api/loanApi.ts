import { apiClient, ApiResponse } from './client';
import { API_ENDPOINTS } from './endpoints';

export type LoanStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'DOCUMENTS_REQUIRED'
  | 'ON_HOLD'
  | 'APPROVED'
  | 'REJECTED'
  | 'OFFER_PENDING_CUSTOMER'
  | 'OFFER_ACCEPTED'
  | 'OFFER_REJECTED';

export interface CustomerLoanApplication {
  id: string;
  applicationNumber: string;
  customerId?: string;
  requestedAmount: number;
  proposedAmount?: number | null;
  approvedAmount?: number | null;
  acceptedAmount?: number | null;
  tenureMonths: number;
  purpose: string;
  status: LoanStatus;
  rejectionReason?: string | null;
  holdReason?: string | null;
  docRequestReason?: string | null;
  modifiedOfferAccepted?: boolean | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  documentRequests?: Array<{
    id: string;
    documentType: string;
    title: string;
    description?: string | null;
    status: string;
    createdAt: string;
  }>;
}

export interface AdminLoanApplicationListItem {
  id: string;
  applicationNumber: string;
  customerId: string;
  customerName: string;
  mobile: string;
  email: string;
  state: string;
  city: string;
  kycStatus: string;
  requestedAmount: number;
  proposedAmount?: number | null;
  approvedAmount?: number | null;
  acceptedAmount?: number | null;
  tenureMonths: number;
  purpose: string;
  status: LoanStatus;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminLoanApplicationDetail {
  id: string;
  applicationNumber: string;
  customerId: string;
  requestedAmount: number;
  proposedAmount?: number | null;
  approvedAmount?: number | null;
  acceptedAmount?: number | null;
  tenureMonths: number;
  purpose: string;
  status: LoanStatus;
  rejectionReason?: string | null;
  holdReason?: string | null;
  docRequestReason?: string | null;
  modifiedOfferAccepted?: boolean | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    fullName: string;
    mobile: string;
    email: string;
    address: string;
    state: string;
    city: string;
    monthlyIncome: number;
    aadhaarMasked: string;
    kycStatus: string;
    status: string;
    createdAt: string;
  };
  documents: Array<{
    id: string;
    documentType: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    status: string;
    uploadedAt: string;
  }>;
  documentRequests: Array<{
    id: string;
    documentType: string;
    title: string;
    description?: string | null;
    status: string;
    requestedBy?: string | null;
    createdAt: string;
  }>;
}

export interface AdminFilterParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  state?: string;
  city?: string;
  dateFilter?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedAdminLoansResponse {
  success: boolean;
  data: AdminLoanApplicationListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const loanApi = {
  // Customer APIs
  async createApplication(data: {
    amount: number;
    tenureMonths: number;
    purpose: string;
  }): Promise<ApiResponse<CustomerLoanApplication>> {
    return apiClient<ApiResponse<CustomerLoanApplication>>(API_ENDPOINTS.LOANS.CUSTOMER_APPLY, {
      method: 'POST',
      body: JSON.stringify(data),
      tokenType: 'customer',
    });
  },

  async getCustomerApplications(): Promise<ApiResponse<CustomerLoanApplication[]>> {
    return apiClient<ApiResponse<CustomerLoanApplication[]>>(API_ENDPOINTS.LOANS.CUSTOMER_LIST, {
      method: 'GET',
      tokenType: 'customer',
    });
  },

  async getCustomerApplicationById(id: string): Promise<ApiResponse<CustomerLoanApplication>> {
    return apiClient<ApiResponse<CustomerLoanApplication>>(
      API_ENDPOINTS.LOANS.CUSTOMER_DETAIL(id),
      {
        method: 'GET',
        tokenType: 'customer',
      }
    );
  },

  async acceptOffer(id: string): Promise<ApiResponse<CustomerLoanApplication>> {
    return apiClient<ApiResponse<CustomerLoanApplication>>(
      API_ENDPOINTS.LOANS.ACCEPT_OFFER(id),
      {
        method: 'POST',
        tokenType: 'customer',
      }
    );
  },

  async rejectOffer(id: string): Promise<ApiResponse<CustomerLoanApplication>> {
    return apiClient<ApiResponse<CustomerLoanApplication>>(
      API_ENDPOINTS.LOANS.REJECT_OFFER(id),
      {
        method: 'POST',
        tokenType: 'customer',
      }
    );
  },

  // Admin APIs
  async getAdminApplications(
    params?: AdminFilterParams
  ): Promise<PaginatedAdminLoansResponse> {
    return apiClient<PaginatedAdminLoansResponse>(API_ENDPOINTS.ADMIN_LOANS.LIST, {
      method: 'GET',
      params: params as Record<string, string | number | boolean | undefined>,
      tokenType: 'admin',
    });
  },

  async getAdminApplicationById(id: string): Promise<ApiResponse<AdminLoanApplicationDetail>> {
    return apiClient<ApiResponse<AdminLoanApplicationDetail>>(
      API_ENDPOINTS.ADMIN_LOANS.DETAIL(id),
      {
        method: 'GET',
        tokenType: 'admin',
      }
    );
  },

  async startReview(id: string): Promise<ApiResponse<CustomerLoanApplication>> {
    return apiClient<ApiResponse<CustomerLoanApplication>>(
      API_ENDPOINTS.ADMIN_LOANS.REVIEW(id),
      {
        method: 'POST',
        tokenType: 'admin',
      }
    );
  },

  async requestDocuments(
    id: string,
    data: { documentType: string; title: string; description?: string }
  ): Promise<ApiResponse<unknown>> {
    return apiClient<ApiResponse<unknown>>(
      API_ENDPOINTS.ADMIN_LOANS.REQUEST_DOCUMENTS(id),
      {
        method: 'POST',
        body: JSON.stringify(data),
        tokenType: 'admin',
      }
    );
  },

  async putOnHold(
    id: string,
    data: { holdReason: string }
  ): Promise<ApiResponse<CustomerLoanApplication>> {
    return apiClient<ApiResponse<CustomerLoanApplication>>(
      API_ENDPOINTS.ADMIN_LOANS.HOLD(id),
      {
        method: 'POST',
        body: JSON.stringify(data),
        tokenType: 'admin',
      }
    );
  },

  async rejectApplication(
    id: string,
    data: { rejectionReason: string }
  ): Promise<ApiResponse<CustomerLoanApplication>> {
    return apiClient<ApiResponse<CustomerLoanApplication>>(
      API_ENDPOINTS.ADMIN_LOANS.REJECT(id),
      {
        method: 'POST',
        body: JSON.stringify(data),
        tokenType: 'admin',
      }
    );
  },

  async approveApplication(id: string): Promise<ApiResponse<CustomerLoanApplication>> {
    return apiClient<ApiResponse<CustomerLoanApplication>>(
      API_ENDPOINTS.ADMIN_LOANS.APPROVE(id),
      {
        method: 'POST',
        tokenType: 'admin',
      }
    );
  },

  async modifyAmount(
    id: string,
    data: { proposedAmount: number }
  ): Promise<ApiResponse<CustomerLoanApplication>> {
    return apiClient<ApiResponse<CustomerLoanApplication>>(
      API_ENDPOINTS.ADMIN_LOANS.MODIFY_AMOUNT(id),
      {
        method: 'POST',
        body: JSON.stringify(data),
        tokenType: 'admin',
      }
    );
  },
};
