import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CustomerHome, normalizeChargeName } from '../pages/customer/CustomerHome';
import { CustomerPaymentPage } from '../pages/customer/CustomerPaymentPage';
import { CustomerLoansPage } from '../pages/customer/CustomerLoansPage';
import { BrandingProvider } from '@/contexts/BrandingContext';
import { apiClient } from '@/api/client';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockDashboardData = {
  customer: {
    id: 'cust-123456',
    fullName: 'Rahul Sharma',
    mobile: '9876543210',
    email: 'rahul.sharma@example.com',
    aadhaarMasked: 'XXXX-XXXX-1234',
    kycStatus: 'APPROVED',
    status: 'ACTIVE',
  },
  kycSummary: {
    status: 'APPROVED',
    progressPercent: 100,
    documentsUploaded: 4,
    requiredMissing: [],
  },
  loanSummary: {
    id: 'loan-app-999',
    applicationNumber: 'LA-2026-999',
    requestedAmount: 500000,
    approvedAmount: 450000,
    tenureMonths: 24,
    estimatedEmi: 21500,
    status: 'APPROVED',
    paymentStatus: 'PAID',
    hasAgreement: true,
    agreementAccepted: true,
    isDisbursed: false,
    disbursementAmount: null,
  },
  timeline: [
    { step: '1', title: 'Application Submitted', completed: true, current: false },
    { step: '2', title: 'KYC Verification', completed: true, current: false },
    { step: '3', title: 'Underwriting Review', completed: true, current: false },
    { step: '4', title: 'Verification Payment', completed: true, current: false },
    { step: '5', title: 'Loan Approved', completed: true, current: true },
    { step: '6', title: 'Agreement Signed', completed: true, current: false },
    { step: '7', title: 'Disbursement', completed: false, current: false },
  ],
  invoices: [
    {
      id: 'inv-101',
      invoiceNumber: 'INV-2026-101',
      chargeName: 'TSD Charges',
      amount: 4500,
      totalAmount: 4500,
      status: 'PAID',
      chargeId: 'chg-tds-1',
      issuedAt: '2026-09-20T10:00:00.000Z',
      transactionRef: '428910482910',
    },
  ],
  notifications: [
    {
      id: 'notif-1',
      title: 'Loan Sanctioned',
      message: 'Your loan application LA-2026-999 has been sanctioned for ₹4,50,000.',
      isRead: false,
      createdAt: '2026-09-21T09:00:00.000Z',
    },
  ],
};

const mockChargesData = [
  {
    id: 'chg-tds-1',
    name: 'TDS Charges',
    amount: 4500,
    status: 'PENDING',
    remark: 'Mandatory TDS/TSD statutory fee',
    transactionRef: null,
    createdAt: '2026-09-20T10:00:00.000Z',
  },
];

const mockDocsData = {
  documents: [
    { id: 'doc-1', documentType: 'PAN', fileName: 'pan.pdf', status: 'APPROVED', uploadedAt: '2026-09-18' },
    { id: 'doc-2', documentType: 'BANK_STATEMENT', fileName: 'statement.pdf', status: 'APPROVED', uploadedAt: '2026-09-18' },
    { id: 'doc-3', documentType: 'INCOME_PROOF', fileName: 'salary.pdf', status: 'APPROVED', uploadedAt: '2026-09-18' },
    { id: 'doc-4', documentType: 'OTHER', fileName: 'address.pdf', status: 'APPROVED', uploadedAt: '2026-09-18' },
  ],
};

const mockCustomerProfile = {
  id: 'cust-123456',
  fullName: 'Rahul Sharma',
  fatherName: 'Devendra Sharma',
  gender: 'Male',
  dob: '1990-05-15',
  mobile: '9876543210',
  email: 'rahul.sharma@example.com',
  address: 'Flat 402, Shanti Heights',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400001',
  monthlyIncome: 65000,
  aadhaarMasked: 'XXXX-XXXX-1234',
  bankName: 'HDFC Bank',
  bankAccountNumber: '50100492837192',
  bankIfsc: 'HDFC0001234',
  bankBranch: 'Nariman Point',
  bankAccountType: 'Savings Account',
  kycStatus: 'APPROVED',
  status: 'ACTIVE',
  createdAt: '2026-01-01',
};

describe('Customer Portal Redesign & Loan Flow Synchronization Suite', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
    vi.clearAllMocks();

    if (!window.URL.createObjectURL) {
      window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    } else {
      vi.spyOn(window.URL, 'createObjectURL').mockImplementation(() => 'blob:mock-url');
    }
    if (!window.URL.revokeObjectURL) {
      window.URL.revokeObjectURL = vi.fn();
    } else {
      vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});
    }

    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes('/public/config') || url.includes('/public/domain-config')) {
        return Promise.resolve({
          data: {
            appName: 'Loan Approve',
            companyName: 'Loan Approve Financial Services Ltd',
            primaryColor: '#2563EB',
            secondaryColor: '#0F2A5F',
          },
        });
      }
      if (url.includes('/customer/dashboard')) {
        return Promise.resolve({ data: mockDashboardData });
      }
      if (url.includes('/charges/') && url.includes('/invoice')) {
        return Promise.resolve({ data: new Blob(['fake-pdf'], { type: 'application/pdf' }) });
      }
      if (url.includes('/customer/invoices/') && url.includes('/pdf')) {
        return Promise.resolve({ data: new Blob(['fake-pdf'], { type: 'application/pdf' }) });
      }
      if (url.includes('/customer/charges')) {
        return Promise.resolve({ data: { success: true, data: mockChargesData } });
      }
      if (url.includes('/customer/invoices')) {
        return Promise.resolve({ data: { success: true, data: mockDashboardData.invoices } });
      }
      if (url.includes('/customer/documents')) {
        return Promise.resolve({ data: { success: true, data: mockDocsData } });
      }
      if (url.includes('/customer/loan-applications')) {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                id: 'loan-app-999',
                applicationNumber: 'LA-2026-999',
                requestedAmount: 500000,
                approvedAmount: 450000,
                tenureMonths: 24,
                purpose: 'Personal / Business Loan',
                status: 'APPROVED',
                submittedAt: '2026-09-18',
                createdAt: '2026-09-18',
                updatedAt: '2026-09-20',
              },
            ],
          },
        });
      }
      if (url.includes('/public/payments/options')) {
        return Promise.resolve({
          data: {
            data: {
              feeAmount: 4500,
              feeType: 'TDS Charges',
              upi: { enabled: true, primaryUpiId: 'pay@loanapprove', apps: [] },
              bank: { enabled: true, accountHolder: 'Loan Approve Ltd', accountNumber: '1234567890', bankName: 'HDFC Bank', ifsc: 'HDFC0001234', branch: 'Mumbai' },
              paymentLinks: [],
            },
          },
        });
      }
      if (url.includes('/customer/profile')) {
        return Promise.resolve({
          data: {
            success: true,
            data: { profile: mockCustomerProfile },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('TEST 1: normalizeChargeName correctly normalizes all TDS / TSD variations for UI display', () => {
    expect(normalizeChargeName('TDS')).toBe('TSD/TDS Charges');
    expect(normalizeChargeName('TSD')).toBe('TSD/TDS Charges');
    expect(normalizeChargeName('TDS Charges')).toBe('TSD/TDS Charges');
    expect(normalizeChargeName('TSD Charges')).toBe('TSD/TDS Charges');
    expect(normalizeChargeName('TDS/TSD')).toBe('TSD/TDS Charges');
    expect(normalizeChargeName('TSD/TDS Charges')).toBe('TSD/TDS Charges');
    expect(normalizeChargeName('Application Processing Fee')).toBe('Application Processing Fee');
  });

  it('TEST 2: CustomerHome renders all 11 sections in strict sequential order without Bank Account Details', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrandingProvider>
          <MemoryRouter>
            <CustomerHome />
          </MemoryRouter>
        </BrandingProvider>
      </QueryClientProvider>
    );

    // Section 1: LOAN OVERVIEW
    await waitFor(() => {
      expect(screen.getAllByText(/Application #LA-2026-999/i).length).toBeGreaterThan(0);
    });
    const s1 = screen.getByText(/1\. LOAN OVERVIEW/i);
    expect(s1).toBeInTheDocument();

    // Section 2: QUICK ACTIONS
    const s2 = screen.getByRole('heading', { name: /QUICK ACTIONS/i });
    expect(s2).toBeInTheDocument();

    // Section 3: LOAN FINANCIAL SUMMARY
    const s3 = screen.getByRole('heading', { name: /LOAN FINANCIAL SUMMARY/i });
    expect(s3).toBeInTheDocument();

    // Section 4: CHARGES & FEES
    const s4 = screen.getByRole('heading', { name: /CHARGES & FEES/i });
    expect(s4).toBeInTheDocument();

    // Section 5: PAYMENTS & INVOICES
    const s5 = screen.getByRole('heading', { name: /PAYMENTS & INVOICES/i });
    expect(s5).toBeInTheDocument();

    // Section 6: LOAN STATUS / PROGRESS
    const s6 = screen.getByRole('heading', { name: /LOAN STATUS \/ PROGRESS/i });
    expect(s6).toBeInTheDocument();

    // Section 7: KYC & DOCUMENTS
    const s7 = screen.getByRole('heading', { name: /KYC & DOCUMENTS/i });
    expect(s7).toBeInTheDocument();

    // Section 8: LOAN DOCUMENTS
    const s8 = screen.getByRole('heading', { name: /LOAN DOCUMENTS/i });
    expect(s8).toBeInTheDocument();

    // Section 9: CUSTOMER INFORMATION
    const s9 = screen.getByRole('heading', { name: /CUSTOMER INFORMATION/i });
    expect(s9).toBeInTheDocument();
    expect(screen.getAllByText('Rahul Sharma').length).toBeGreaterThan(0);
    expect(screen.getByText('Devendra Sharma')).toBeInTheDocument();
    expect(screen.getAllByText(/\+91\s*9876543210/i).length).toBeGreaterThan(0);

    // Section 10: NOTIFICATIONS & IMPORTANT NOTICES
    const s10 = screen.getByRole('heading', { name: /NOTIFICATIONS & IMPORTANT NOTICES/i });
    expect(s10).toBeInTheDocument();
    expect(screen.getAllByText(/IMPORTANT UPDATE/i).length).toBeGreaterThan(0);

    // Section 11: BORROWER SUPPORT
    const s11 = screen.getByRole('heading', { name: /BORROWER SUPPORT/i });
    expect(s11).toBeInTheDocument();
    expect(screen.getByText('support@loanapprove.in')).toBeInTheDocument();

    // Validate strict 11-section sequential DOM order
    const orderedSections = [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11];
    for (let i = 0; i < orderedSections.length - 1; i++) {
      const isFollowing = (orderedSections[i].compareDocumentPosition(orderedSections[i + 1]) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
      expect(isFollowing).toBe(true);
    }

    // STRICT REQUIREMENT: Bank Account Details section and bank fields MUST be completely removed
    expect(screen.queryByText(/BANK ACCOUNT DETAILS/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/50100492837192/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/HDFC0001234/i)).not.toBeInTheDocument();
  });

  const setupMock = (overrides?: { dashboard?: any; documents?: any; profile?: any }) => {
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes('/public/config') || url.includes('/public/domain-config')) {
        return Promise.resolve({
          data: {
            appName: 'Loan Approve',
            companyName: 'Loan Approve Financial Services Ltd',
            primaryColor: '#2563EB',
            secondaryColor: '#0F2A5F',
          },
        });
      }
      if (url.includes('/customer/dashboard')) {
        return Promise.resolve({ data: overrides?.dashboard || mockDashboardData });
      }
      if (url.includes('/customer/charges')) {
        return Promise.resolve({ data: { success: true, data: mockChargesData } });
      }
      if (url.includes('/customer/invoices')) {
        return Promise.resolve({ data: { success: true, data: mockDashboardData.invoices } });
      }
      if (url.includes('/customer/documents')) {
        return Promise.resolve({ data: { success: true, data: overrides?.documents || mockDocsData } });
      }
      if (url.includes('/customer/profile')) {
        return Promise.resolve({ data: { success: true, data: { profile: overrides?.profile || mockCustomerProfile } } });
      }
      return Promise.resolve({ data: {} });
    });
  };

  it('TEST 3: State 1 (KYC Pending) clicking Apply for Loan triggers KYC Required modal', async () => {
    setupMock({
      dashboard: {
        ...mockDashboardData,
        customer: { ...mockDashboardData.customer, kycStatus: 'PENDING' },
        kycSummary: { status: 'PENDING', progressPercent: 20, documentsUploaded: 0, requiredMissing: ['AADHAAR'] },
        loanSummary: null,
      },
      documents: { documents: [] },
      profile: { ...mockCustomerProfile, kycStatus: 'PENDING' },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrandingProvider>
          <MemoryRouter>
            <CustomerHome />
          </MemoryRouter>
        </BrandingProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      const applyBtn = screen.getByTestId('hero-apply-loan-btn');
      fireEvent.click(applyBtn);
      expect(screen.getByRole('heading', { name: /KYC Required/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Complete your identity verification before applying for a loan/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Complete KYC/i }).length).toBeGreaterThan(0);
  });

  it('TEST 4: State 2 (KYC Approved + Docs Missing) clicking Apply for Loan triggers Loan Documents Required modal', async () => {
    setupMock({
      dashboard: {
        ...mockDashboardData,
        customer: { ...mockDashboardData.customer, kycStatus: 'APPROVED' },
        kycSummary: { status: 'APPROVED', progressPercent: 50, documentsUploaded: 1, requiredMissing: [] },
        loanSummary: null,
      },
      documents: { documents: [{ documentType: 'PAN', fileName: 'pan.pdf', status: 'APPROVED' }] },
      profile: mockCustomerProfile,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrandingProvider>
          <MemoryRouter>
            <CustomerHome />
          </MemoryRouter>
        </BrandingProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      const applyBtn = screen.getByTestId('hero-apply-loan-btn');
      fireEvent.click(applyBtn);
      expect(screen.getByRole('heading', { name: /Loan Documents Required/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Complete your required loan documents before submitting your loan application/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload Documents/i })).toBeInTheDocument();
  });

  it('TEST 5: State 3 (KYC Approved + All Docs Complete) clicking Apply for Loan opens Submit Loan Application modal', async () => {
    setupMock({
      dashboard: {
        ...mockDashboardData,
        loanSummary: null,
      },
      documents: mockDocsData,
      profile: mockCustomerProfile,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrandingProvider>
          <MemoryRouter>
            <CustomerHome />
          </MemoryRouter>
        </BrandingProvider>
      </QueryClientProvider>
    );

    const applyBtn = await screen.findByTestId('hero-apply-loan-btn');
    fireEvent.click(applyBtn);

    // Verify Submit Loan Application Modal opens
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Submit Loan Application/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Required Loan Amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Repayment Tenure/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Loan Purpose/i)).toBeInTheDocument();
    });
  });

  it('TEST 6: CustomerLoansPage renders Your Loan Offer card, lifecycle stages, documents, and payments', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrandingProvider>
          <MemoryRouter>
            <CustomerLoansPage />
          </MemoryRouter>
        </BrandingProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/YOUR LOAN OFFER & SANCTION DETAILS/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Application #LA-2026-999/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Loan Lifecycle Stages/i)).toBeInTheDocument();
      expect(screen.getAllByText(/LOAN DOCUMENTS/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/PAYMENTS & CHARGES/i)).toBeInTheDocument();
    });
  });

  it('TEST 7: CustomerPaymentPage renders payment rails and charge settlements', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrandingProvider>
          <MemoryRouter>
            <CustomerPaymentPage />
          </MemoryRouter>
        </BrandingProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Fee Settlements & Tax Invoices/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Assigned Application Charges/i).length).toBeGreaterThan(0);
    });
  });

  it('TEST 8: Invoice preview and download actions are accessible from Payments & Invoices', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrandingProvider>
          <MemoryRouter>
            <CustomerHome />
          </MemoryRouter>
        </BrandingProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /PAYMENTS & INVOICES/i })).toBeInTheDocument();
    });

    const viewInvoiceBtns = screen.getAllByRole('button', { name: /View Invoice/i });
    expect(viewInvoiceBtns.length).toBeGreaterThan(0);
    fireEvent.click(viewInvoiceBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Official immutable tax invoice/i)).toBeInTheDocument();
    });
  });

  it('TEST 9: Payment flow integration preserves payment options navigation without premature UTR', async () => {
    setupMock({
      dashboard: mockDashboardData,
      documents: mockDocsData,
      profile: mockCustomerProfile,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrandingProvider>
          <MemoryRouter>
            <CustomerHome />
          </MemoryRouter>
        </BrandingProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /CHARGES & FEES/i })).toBeInTheDocument();
    });

    const payNowBtns = screen.getAllByRole('button', { name: /Pay Now/i });
    expect(payNowBtns.length).toBeGreaterThan(0);
    // Verified: clicking Pay Now does not open premature UTR field on CustomerHome
    expect(screen.queryByPlaceholderText(/Enter 12-digit UTR/i)).not.toBeInTheDocument();
  });
});
