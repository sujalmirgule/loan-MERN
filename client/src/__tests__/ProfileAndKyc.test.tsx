import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { CustomerProfile } from '../pages/customer/CustomerProfile';
import { CustomerDocuments } from '../pages/customer/CustomerDocuments';
import { AdminKycList } from '../pages/admin/AdminKycList';
import { apiClient } from '@/api/client';

// Mock API Client
vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
  ApiError: class extends Error {
    public status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

describe('Customer Profile & KYC Frontend Flow', () => {
  const mockCustomerProfile = {
    id: 'cust-123',
    fullName: 'Ramesh Patel',
    mobile: '9876543210',
    email: 'ramesh@example.com',
    address: '123 MG Road',
    state: 'Maharashtra',
    city: 'Mumbai',
    aadhaarMasked: 'XXXX XXXX 8899',
    monthlyIncome: 65000,
    status: 'ACTIVE',
    kycStatus: 'UNDER_REVIEW',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockDocumentsData = {
    customer: {
      id: 'cust-123',
      fullName: 'Ramesh Patel',
      kycStatus: 'REUPLOAD_REQUIRED',
    },
    documents: [
      {
        id: 'doc-1',
        documentType: 'AADHAAR_FRONT',
        fileName: 'aadhaar_front.pdf',
        originalFileName: 'aadhaar_front.pdf',
        fileSize: 45000,
        mimeType: 'application/pdf',
        status: 'REUPLOAD_REQUIRED',
        version: 1,
        rejectionReason: 'Corners are cropped. Upload full card.',
        uploadedAt: '2026-01-02T10:00:00.000Z',
      },
      {
        id: 'doc-2',
        documentType: 'PAN',
        fileName: 'pan.jpg',
        originalFileName: 'pan.jpg',
        fileSize: 32000,
        mimeType: 'image/jpeg',
        status: 'APPROVED',
        version: 1,
        uploadedAt: '2026-01-02T10:00:00.000Z',
      },
    ],
    pendingRequests: [
      {
        id: 'req-1',
        documentType: 'BANK_STATEMENT',
        title: '3 Months Salary Bank Statement',
        description: 'Provide recent bank statement.',
        status: 'PENDING',
        createdAt: '2026-01-03T10:00:00.000Z',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('CustomerProfile Page', () => {
    it('renders customer profile information with masked Aadhaar', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { data: { profile: mockCustomerProfile } },
      });

      render(
        <AuthProvider>
          <BrowserRouter>
            <CustomerProfile />
          </BrowserRouter>
        </AuthProvider>
      );

      // Loading spinner initially
      expect(screen.getByText(/Loading profile details/i)).toBeInTheDocument();

      // After data resolves
      await waitFor(() => {
        expect(screen.getAllByText('Ramesh Patel').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/9876543210/)).toBeInTheDocument();
        expect(screen.getByText('ramesh@example.com')).toBeInTheDocument();
        expect(screen.getByText('XXXX XXXX 8899')).toBeInTheDocument();
        expect(screen.getByText(/65,000/)).toBeInTheDocument();
      });

      // Verify "Edit Profile" button is present
      expect(screen.getByRole('button', { name: /Edit Profile/i })).toBeInTheDocument();
    });

    it('toggles edit mode and allows updating fields while mobile number stays immutable', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { data: { profile: mockCustomerProfile } },
      });

      render(
        <AuthProvider>
          <BrowserRouter>
            <CustomerProfile />
          </BrowserRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getAllByText('Ramesh Patel').length).toBeGreaterThanOrEqual(1);
      });

      const editBtn = screen.getByRole('button', { name: /Edit Profile/i });
      fireEvent.click(editBtn);

      // Form inputs should now be present
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Street Address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();

      // Mobile number is immutable login ID
      expect(screen.getByText(/Primary Login ID \(Immutable\)/i)).toBeInTheDocument();
    });
  });

  describe('CustomerDocuments Page', () => {
    it('renders overall KYC status banner and document cards with reviewer feedback', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { data: mockDocumentsData },
      });

      render(
        <AuthProvider>
          <BrowserRouter>
            <CustomerDocuments />
          </BrowserRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Action Required: Document Re-upload/i)).toBeInTheDocument();
        expect(screen.getByText(/Corners are cropped. Upload full card./i)).toBeInTheDocument();
        expect(screen.getByText('3 Months Salary Bank Statement')).toBeInTheDocument();
      });

      // Check for re-upload button for the rejected/re-upload document
      expect(
        screen.getByRole('button', { name: /Re-upload Corrected Version/i })
      ).toBeInTheDocument();
    });

    it('opens upload modal when clicking upload button', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { data: mockDocumentsData },
      });

      render(
        <AuthProvider>
          <BrowserRouter>
            <CustomerDocuments />
          </BrowserRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Action Required/i)).toBeInTheDocument();
      });

      const reuploadBtn = screen.getByRole('button', { name: /Re-upload Corrected Version/i });
      fireEvent.click(reuploadBtn);

      // Modal appears with Choose File and Use Camera options
      expect(screen.getByText(/Re-upload Corrected Document/i)).toBeInTheDocument();
      expect(screen.getByText('Choose File')).toBeInTheDocument();
      expect(screen.getByText('Use Camera')).toBeInTheDocument();
    });
  });

  describe('AdminKycList Page', () => {
    it('renders KYC queue table and filter buttons', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: {
          data: {
            customers: [
              {
                id: 'cust-1',
                fullName: 'Kiran Rao',
                mobile: '9123456780',
                email: 'kiran@example.com',
                state: 'Karnataka',
                city: 'Bengaluru',
                accountStatus: 'ACTIVE',
                kycStatus: 'UNDER_REVIEW',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
                docStats: {
                  total: 3,
                  approved: 2,
                  pending: 1,
                  reuploadRequired: 0,
                  rejected: 0,
                },
              },
            ],
            pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
          },
        },
      });

      render(
        <AuthProvider>
          <BrowserRouter>
            <AdminKycList />
          </BrowserRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Kiran Rao')).toBeInTheDocument();
        expect(screen.getByText(/2 \/ 3 Approved/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Review KYC/i })).toBeInTheDocument();
      });

      // Check filter options
      expect(screen.getByRole('button', { name: 'Under Review' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Re-upload Needed' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'All Customers' })).toBeInTheDocument();
    });
  });
});
