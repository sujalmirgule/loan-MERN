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

  it('TEST 2: CustomerHome renders all key financial sections in correct visual hierarchy', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrandingProvider>
          <MemoryRouter>
            <CustomerHome />
          </MemoryRouter>
        </BrandingProvider>
      </QueryClientProvider>
    );

    // Section 1: Customer / Loan Hero
    await waitFor(() => {
      expect(screen.getAllByText(/Application #LA-2026-999/i).length).toBeGreaterThan(0);
    });

    // Section 2: Loan Overview / Financing Summary
    expect(screen.getByText(/LOAN OVERVIEW/i)).toBeInTheDocument();

    // Section 3: Quick Actions
    expect(screen.getByText(/QUICK ACTIONS/i)).toBeInTheDocument();

    // Section 4: Applied Charges & Fees
    expect(screen.getByText(/APPLIED CHARGES & FEES/i)).toBeInTheDocument();

    // Section 5: Important Update / Agreement Notice
    expect(screen.getByText(/IMPORTANT UPDATE/i)).toBeInTheDocument();

    // Section 6: Loan Progress
    expect(screen.getByText(/LOAN PROGRESS/i)).toBeInTheDocument();

    // Section 7: Payment & Invoice History
    expect(screen.getByText(/PAYMENT & INVOICE HISTORY/i)).toBeInTheDocument();

    // Section 8: Current Loan Status
    expect(screen.getByText(/CURRENT LOAN STATUS/i)).toBeInTheDocument();

    // Section 9: Document Center
    expect(screen.getByText(/DOCUMENT CENTER/i)).toBeInTheDocument();

    // Section 10: Customer Information
    expect(screen.getByText(/CUSTOMER INFORMATION/i)).toBeInTheDocument();
    expect(screen.getAllByText('Rahul Sharma').length).toBeGreaterThan(0);
    expect(screen.getByText('Devendra Sharma')).toBeInTheDocument();

    // Section 11: Bank Account Details
    expect(screen.getByText(/BANK ACCOUNT DETAILS/i)).toBeInTheDocument();
    expect(screen.getAllByText(/HDFC Bank/i).length).toBeGreaterThan(0);

    // Section 12: Borrower Support
    expect(screen.getAllByText(/BORROWER SUPPORT/i).length).toBeGreaterThan(0);
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
});
