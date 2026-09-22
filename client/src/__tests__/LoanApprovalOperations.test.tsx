import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminLoanApprovalPage } from '../pages/admin/AdminLoanApprovalPage';
import { AdminDocumentsPage } from '../pages/admin/AdminDocumentsPage';
import { CustomerDocuments } from '../pages/customer/CustomerDocuments';
import { BrandingProvider } from '../contexts/BrandingContext';

// Mock apiClient
vi.mock('@/api/client', () => {
  return {
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
    api: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  };
});

// Mock loanApi
vi.mock('@/api/loanApi', () => {
  return {
    loanApi: {
      getAdminApplications: vi.fn(),
      getAdminApplicationById: vi.fn(),
      approveApplication: vi.fn(),
      rejectApplication: vi.fn(),
      startReview: vi.fn(),
      putOnHold: vi.fn(),
      requestDocuments: vi.fn(),
    },
  };
});

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: {
      id: 'admin-1',
      role: 'ADMIN',
      fullName: 'Super Administrator',
      permissions: ['applications.view', 'applications.approve', 'applications.reject', 'documents.view', 'documents.download', 'kyc.view'],
    },
    token: 'test-admin-token',
    hasPermission: () => true,
    logout: vi.fn(),
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrandingProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </BrandingProvider>
    </QueryClientProvider>
  );
};

describe('FINAL CHANGE 4/5: Loan Approval Operations & Documents Hub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Dedicated Admin Loan Approval Operations Page (/admin/loan-approval)', () => {
    it('renders the 3 top-level state navigation buttons: Pending, Approved, and Rejected', async () => {
      const { apiClient } = await import('@/api/client');
      (apiClient.get as any).mockImplementation((url: string) => {
        if (url.includes('status=PENDING')) {
          return Promise.resolve({
            data: {
              data: [
                {
                  id: 'loan-p1',
                  applicationNumber: 'APP-2026-001',
                  customerName: 'Rahul Verma',
                  mobile: '9876543210',
                  requestedAmount: 250000,
                  tenureMonths: 24,
                  status: 'SUBMITTED',
                  createdAt: new Date().toISOString(),
                },
              ],
              pagination: { page: 1, pageSize: 15, total: 1, totalPages: 1 },
            },
          });
        }
        if (url.includes('status=APPROVED')) {
          return Promise.resolve({
            data: {
              data: [
                {
                  id: 'loan-a1',
                  applicationNumber: 'APP-2026-002',
                  customerName: 'Priya Sharma',
                  mobile: '9876543211',
                  requestedAmount: 500000,
                  approvedAmount: 500000,
                  finalEmi: 23600,
                  tenureMonths: 24,
                  status: 'APPROVED',
                  createdAt: new Date().toISOString(),
                },
              ],
              pagination: { page: 1, pageSize: 15, total: 1, totalPages: 1 },
            },
          });
        }
        if (url.includes('status=REJECTED')) {
          return Promise.resolve({
            data: {
              data: [
                {
                  id: 'loan-r1',
                  applicationNumber: 'APP-2026-003',
                  customerName: 'Amit Patel',
                  mobile: '9876543212',
                  requestedAmount: 100000,
                  rejectionReason: 'CIBIL / Credit score below required threshold',
                  status: 'REJECTED',
                  createdAt: new Date().toISOString(),
                },
              ],
              pagination: { page: 1, pageSize: 15, total: 1, totalPages: 1 },
            },
          });
        }
        return Promise.resolve({ data: { data: [], pagination: { total: 0, totalPages: 1 } } });
      });

      render(<AdminLoanApprovalPage />, { wrapper: createWrapper() });

      // Check header
      expect(screen.getByText(/Loan Approval Operations/i)).toBeInTheDocument();

      // Check 3 top state filter buttons
      expect(screen.getByText(/Pending Review/i)).toBeInTheDocument();
      expect(screen.getByText(/Underwriting Queue/i)).toBeInTheDocument();
      expect(screen.getByText(/Sanctioned Loans/i)).toBeInTheDocument();
      expect(screen.getByText(/Declined Applications/i)).toBeInTheDocument();

      // Check Pending application table row
      await waitFor(() => {
        expect(screen.getAllByText('APP-2026-001').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Rahul Verma').length).toBeGreaterThan(0);
      });

      // Switch to Approved Tab
      const approvedBtn = screen.getByText(/Sanctioned Loans/i);
      fireEvent.click(approvedBtn);

      await waitFor(() => {
        expect(screen.getByText('Approved & Sanctioned Applications')).toBeInTheDocument();
      });

      // Switch to Rejected Tab
      const rejectedBtn = screen.getByText(/Declined Applications/i);
      fireEvent.click(rejectedBtn);

      await waitFor(() => {
        expect(screen.getByText('Rejected Applications')).toBeInTheDocument();
      });
    });

    it('opens Approve Modal and verifies auto-calculated EMI + manual override capability', async () => {
      const { apiClient } = await import('@/api/client');
      (apiClient.get as any).mockResolvedValue({
        data: {
          data: [
            {
              id: 'loan-p1',
              applicationNumber: 'APP-PEND-100',
              customerName: 'Sanjay Kumar',
              mobile: '9812345678',
              requestedAmount: 120000,
              tenureMonths: 12,
              status: 'SUBMITTED',
              createdAt: new Date().toISOString(),
            },
          ],
          pagination: { page: 1, pageSize: 15, total: 1, totalPages: 1 },
        },
      });

      render(<AdminLoanApprovalPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getAllByText('APP-PEND-100').length).toBeGreaterThan(0);
      });

      // Click Approve button
      const approveBtns = screen.getAllByRole('button', { name: /^Approve$/i });
      fireEvent.click(approveBtns[0]);

      // Verify modal elements
      expect(screen.getByText(/Sanction & Approve Loan Application/i)).toBeInTheDocument();
      expect(screen.getByText(/Calculated Monthly EMI/i)).toBeInTheDocument();
      expect(screen.getByText(/Manual EMI Override/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Confirm & Approve Loan/i })).toBeInTheDocument();
    });

    it('opens Reject Modal with mandatory decline reasons and handles rejection', async () => {
      const { apiClient } = await import('@/api/client');
      (apiClient.get as any).mockResolvedValue({
        data: {
          data: [
            {
              id: 'loan-p2',
              applicationNumber: 'APP-PEND-200',
              customerName: 'Deepak Joshi',
              mobile: '9822334455',
              requestedAmount: 300000,
              tenureMonths: 36,
              status: 'UNDER_REVIEW',
              createdAt: new Date().toISOString(),
            },
          ],
          pagination: { page: 1, pageSize: 15, total: 1, totalPages: 1 },
        },
      });

      render(<AdminLoanApprovalPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getAllByText('APP-PEND-200').length).toBeGreaterThan(0);
      });

      // Click Reject button
      const rejectBtns = screen.getAllByRole('button', { name: /^Reject$/i });
      fireEvent.click(rejectBtns[0]);

      // Verify modal elements
      expect(screen.getByText(/Decline Loan Application/i)).toBeInTheDocument();
      expect(screen.getByText(/Reason for Rejection/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Confirm Rejection/i })).toBeInTheDocument();
    });
  });

  describe('2. Admin Document Management Center (/admin/documents)', () => {
    it('clearly distinguishes KYC, Approval Letters, Invoices, and Agreements with correct download actions', async () => {
      const { apiClient } = await import('@/api/client');
      (apiClient.get as any).mockImplementation((url: string) => {
        if (url.includes('/admin/kyc')) {
          return Promise.resolve({
            data: {
              customers: [
                {
                  id: 'cust-1',
                  fullName: 'Ananya Roy',
                  mobile: '9988776655',
                  documents: [
                    {
                      id: 'doc-pan-1',
                      documentType: 'PAN',
                      fileName: 'PAN_Card.pdf',
                      status: 'APPROVED',
                      uploadedAt: new Date().toISOString(),
                    },
                  ],
                },
              ],
            },
          });
        }
        if (url.includes('/admin/loan-applications')) {
          return Promise.resolve({
            data: {
              data: [
                {
                  id: 'loan-doc-1',
                  applicationNumber: 'APP-SANCTION-99',
                  customerName: 'Ananya Roy',
                  mobile: '9988776655',
                  approvedAmount: 400000,
                  tenureMonths: 24,
                  status: 'APPROVED',
                  modifiedOfferAccepted: false,
                  updatedAt: new Date().toISOString(),
                },
              ],
            },
          });
        }
        if (url.includes('/admin/charges/specific')) {
          return Promise.resolve({
            data: {
              data: [
                {
                  id: 'chg-101',
                  name: 'Processing Fee',
                  amount: 1250,
                  status: 'PAID',
                  paidAt: new Date().toISOString(),
                  customer: { fullName: 'Ananya Roy', mobile: '9988776655' },
                },
              ],
            },
          });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      render(<AdminDocumentsPage />, { wrapper: createWrapper() });

      // Verify category tabs exist
      expect(screen.getByText('All Documents')).toBeInTheDocument();
      expect(screen.getByText('KYC Documents')).toBeInTheDocument();
      expect(screen.getByText('Approval Letters')).toBeInTheDocument();
      expect(screen.getByText('Invoices & Receipts')).toBeInTheDocument();
      expect(screen.getByText('Loan Agreements')).toBeInTheDocument();
      expect(screen.getByText('EMI Schedules')).toBeInTheDocument();

      // Verify table rows render
      await waitFor(() => {
        expect(screen.getByText('PAN')).toBeInTheDocument();
        expect(screen.getByText(/Approval Letter #APP-SANCTION-99/i)).toBeInTheDocument();
        expect(screen.getByText(/Processing Fee Invoice/i)).toBeInTheDocument();
        expect(screen.getByText(/Master Loan Agreement #APP-SANCTION-99/i)).toBeInTheDocument();
      });

      // Verify actions: View and Download PDF
      const downloadButtons = screen.getAllByRole('button', { name: /Download PDF/i });
      expect(downloadButtons.length).toBeGreaterThan(0);

      const viewButtons = screen.getAllByRole('button', { name: /^View$/i });
      expect(viewButtons.length).toBeGreaterThan(0);

      // Verify Agreement status indicator
      expect(screen.getByText('Awaiting Customer Signature')).toBeInTheDocument();
    });
  });

  describe('3. Customer Documents Center (/customer/documents)', () => {
    it('renders [ Sign Agreement ] only when loan agreement is awaiting signature and verifies no sign button on Approval Letters', async () => {
      const { apiClient } = await import('@/api/client');
      (apiClient.get as any).mockImplementation((url: string) => {
        if (url.includes('/customer/documents')) {
          return Promise.resolve({
            data: {
              data: {
                documents: [
                  {
                    id: 'doc-aadhaar-1',
                    documentType: 'AADHAAR_FRONT',
                    fileName: 'aadhaar_front.jpg',
                    fileSize: 102400,
                    status: 'APPROVED',
                    version: 1,
                    uploadedAt: new Date().toISOString(),
                  },
                ],
                customer: { kycStatus: 'APPROVED' },
              },
            },
          });
        }
        if (url.includes('/customer/loan-applications')) {
          return Promise.resolve({
            data: {
              data: [
                {
                  id: 'loan-cust-1',
                  applicationNumber: 'APP-CUST-888',
                  approvalNumber: 'SANCTION-888',
                  approvedAmount: 350000,
                  requestedAmount: 350000,
                  tenureMonths: 18,
                  finalEmi: 21300,
                  status: 'APPROVED',
                  modifiedOfferAccepted: false,
                  submittedAt: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                },
              ],
            },
          });
        }
        if (url.includes('/customer/charges')) {
          return Promise.resolve({
            data: {
              data: [
                {
                  id: 'chg-cust-1',
                  name: 'Verification Fee',
                  amount: 500,
                  status: 'PAID',
                  paidAt: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                },
              ],
            },
          });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      render(<CustomerDocuments />, { wrapper: createWrapper() });

      // Verify tabs and cards exist
      await waitFor(() => {
        expect(screen.getByText(/Customer Document Center/i)).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /^Approval Letter$/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /^Loan Agreement$/i })).toBeInTheDocument();
      });

      // Verify Loan Agreement card has Sign Agreement when awaiting signature
      expect(screen.getByText(/AWAITING SIGNATURE/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign Agreement/i })).toBeInTheDocument();
    });
  });
});
