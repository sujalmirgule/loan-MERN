import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminLayout } from '@/layouts/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { adminService } from '@/services/adminService';
import { apiClient } from '@/api/client';

vi.mock('@/services/adminService', () => ({
  adminService: {
    getDashboard: vi.fn(),
  },
}));

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', role: 'ADMIN', fullName: 'Super Admin', email: 'admin@loanapprove.com' },
    isAuthenticated: true,
    logout: vi.fn(),
    hasPermission: () => true,
  }),
}));

vi.mock('@/contexts/BrandingContext', () => ({
  useBranding: () => ({
    branding: {
      appName: 'Loan Approve Operations',
      logoUrl: '',
      primaryColor: '#D4AF37',
    },
  }),
}));

const mockDashboardData = {
  kpis: {
    totalCustomers: 1250,
    totalLoanApplications: 840,
    loansUnderReview: 42,
    approvedLoans: 610,
    totalDisbursed: 45000000,
    paymentPending: 18,
  },
  applicationTrend: [
    { date: '2026-09-20', applications: 25, approved: 18 },
    { date: '2026-09-21', applications: 30, approved: 22 },
  ],
  statusDistribution: [
    { status: 'APPROVED', count: 610 },
    { status: 'UNDER_REVIEW', count: 42 },
    { status: 'PENDING', count: 18 },
  ],
  recentApplications: [
    {
      id: 'app-001',
      applicationNumber: 'LA-2026-001',
      customerName: 'Aarav Patel',
      mobile: '9876543210',
      loanType: 'Personal Loan',
      requestedAmount: 250000,
      state: 'Maharashtra',
      submittedAt: '2026-09-22T10:00:00Z',
      status: 'UNDER_REVIEW',
    },
    {
      id: 'app-002',
      applicationNumber: 'LA-2026-002',
      customerName: 'Priya Sharma',
      mobile: '9876543211',
      loanType: 'Business Loan',
      requestedAmount: 1000000,
      state: 'Karnataka',
      submittedAt: '2026-09-22T11:30:00Z',
      status: 'APPROVED',
    },
  ],
};

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

describe('Loan Approve Blue, Navy & White Admin Theme System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminService.getDashboard).mockResolvedValue(mockDashboardData as any);
  });

  it('TEST 1: AdminLayout renders with dark theme container and sidebar navigation', async () => {
    (apiClient.get as any).mockResolvedValue({ data: { unreadCount: 0 } });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <Routes>
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="dashboard" element={<div data-testid="admin-child">Dashboard Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByTestId('admin-child')).toBeInTheDocument();
    // Sidebar contains app brand
    expect(screen.getAllByText(/Loan/i).length).toBeGreaterThan(0);
    // Sidebar includes Charges & Fee Approval route
    expect(screen.getByText(/Charges & Fee Approval/i)).toBeInTheDocument();
  });

  it('TEST 2: Core Button variants support gold and semantic operational styles', () => {
    const { container: c1 } = render(<Button variant="gold">Gold Action</Button>);
    expect(c1.firstChild).toHaveClass('bg-[#C9A227]');
    expect(c1.firstChild).toHaveClass('border-[#6E5A1F]');

    const { container: c2 } = render(<Button variant="approve">Approve Deal</Button>);
    expect(c2.firstChild).toHaveClass('bg-[#22C55E]');

    const { container: c3 } = render(<Button variant="reject">Reject Application</Button>);
    expect(c3.firstChild).toHaveClass('bg-[#EF4444]');

    const { container: c4 } = render(<Button variant="review">Review KYC</Button>);
    expect(c4.firstChild).toHaveClass('bg-[#F59E0B]');
  });

  it('TEST 3: Core Badge variants support gold and high-contrast semantic status colors', () => {
    const { container: b1 } = render(<Badge variant="gold">VIP</Badge>);
    expect(b1.firstChild).toHaveClass('text-[#B8860B]');
    expect(b1.firstChild).toHaveClass('bg-[#FEF9E7]');

    const { container: b2 } = render(<Badge variant="approved">APPROVED</Badge>);
    expect(b2.firstChild).toHaveClass('text-emerald-700');

    const { container: b3 } = render(<Badge variant="rejected">REJECTED</Badge>);
    expect(b3.firstChild).toHaveClass('text-rose-700');

    const { container: b4 } = render(<Badge variant="pending">PENDING</Badge>);
    expect(b4.firstChild).toHaveClass('text-amber-700');
  });

  it('TEST 4: AdminDashboard renders executive command banner and KPI metrics', async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Executive Portfolio Command/i)).toBeInTheDocument();
      expect(screen.getByText('Total Customers')).toBeInTheDocument();
      expect(screen.getByText('1,250')).toBeInTheDocument();
      expect(screen.getByText('Loan Applications')).toBeInTheDocument();
      expect(screen.getAllByText('840').length).toBeGreaterThan(0);
      expect(screen.getByText('Approved Loans')).toBeInTheDocument();
      expect(screen.getAllByText('610').length).toBeGreaterThan(0);
    });
  });

  it('TEST 5: AdminDashboard recent applications table shows semantic Approve & Reject buttons', async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Aarav Patel')).toBeInTheDocument();
      expect(screen.getByText('LA-2026-001')).toBeInTheDocument();
      // For UNDER_REVIEW status, Approve and Reject action buttons are present
      expect(screen.getAllByRole('button', { name: /^Approve$/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: /^Reject$/i }).length).toBeGreaterThan(0);
    });
  });
});
