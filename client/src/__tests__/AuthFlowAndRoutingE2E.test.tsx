import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { BrandingProvider } from '../contexts/BrandingContext';
import { LandingPage } from '../pages/LandingPage';
import { CustomerLogin } from '../pages/customer/CustomerLogin';
import { CustomerRegister } from '../pages/customer/CustomerRegister';
import { AdminLogin } from '../pages/admin/AdminLogin';
import { CustomerRoute, AdminRoute, CustomerPublicOnlyRoute, AdminPublicOnlyRoute } from '../routes/RouteGuards';

// Mock API Client
const mockApiClient = vi.fn();
vi.mock('@/api/client', () => ({
  apiClient: Object.assign(
    (...args: unknown[]) => mockApiClient(...args),
    {
      get: (...args: unknown[]) => mockApiClient(...args),
      post: (...args: unknown[]) => mockApiClient(...args),
      put: (...args: unknown[]) => mockApiClient(...args),
      patch: (...args: unknown[]) => mockApiClient(...args),
      delete: (...args: unknown[]) => mockApiClient(...args),
    }
  ),
  ApiError: class extends Error {
    public status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

describe('Complete Customer Auth & Routing Isolation E2E', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();

    mockApiClient.mockImplementation((endpoint: string) => {
      if (typeof endpoint === 'string' && endpoint.includes('/public/config')) {
        return Promise.resolve({
          success: true,
          data: {
            appName: 'Loan Finance Test',
            companyName: 'Loan Finance Test Corp',
            documents: [],
            faqs: [],
            hero: { headline: 'Simple Loans', subheadline: 'Apply online easily' },
            financial: { minApr: 12.0, maxApr: 24.0, minLoanAmount: 25000, maxLoanAmount: 1000000 },
            eligibility: { minAge: 21, maxAge: 60, minMonthlyIncome: 20000, bankAccountRequired: true },
          },
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });
  });

  afterEach(() => {
    cleanup();
  });

  const renderAppAt = (initialRoute: string) => {
    return render(
      <AuthProvider>
        <BrandingProvider>
          <MemoryRouter initialEntries={[initialRoute]}>
            <Routes>
              {/* Landing Page */}
              <Route path="/" element={<LandingPage />} />

              {/* Public Customer Auth */}
              <Route
                path="/customer/login"
                element={
                  <CustomerPublicOnlyRoute>
                    <CustomerLogin />
                  </CustomerPublicOnlyRoute>
                }
              />
              <Route
                path="/customer/register"
                element={
                  <CustomerPublicOnlyRoute>
                    <CustomerRegister />
                  </CustomerPublicOnlyRoute>
                }
              />

              {/* Protected Customer Portal */}
              <Route element={<CustomerRoute />}>
                <Route
                  path="/customer/dashboard"
                  element={<div data-testid="customer-dashboard-page">Customer Dashboard Active</div>}
                />
                <Route
                  path="/customer/apply"
                  element={<div data-testid="customer-apply-page">Customer Apply Loan Page</div>}
                />
                <Route
                  path="/customer/kyc"
                  element={<div data-testid="customer-kyc-page">Customer KYC Page</div>}
                />
              </Route>

              {/* Public Admin Auth */}
              <Route
                path="/admin/login"
                element={
                  <AdminPublicOnlyRoute>
                    <AdminLogin />
                  </AdminPublicOnlyRoute>
                }
              />

              {/* Protected Admin Console */}
              <Route element={<AdminRoute />}>
                <Route
                  path="/admin/dashboard"
                  element={<div data-testid="admin-dashboard-page">Admin Command Center Active</div>}
                />
              </Route>
            </Routes>
          </MemoryRouter>
        </BrandingProvider>
      </AuthProvider>
    );
  };

  it('TEST 1: Landing page "Apply Now" links directly to /customer/register without opening Admin', async () => {
    renderAppAt('/');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    // Verify top nav "Apply Now" has href /customer/register
    const applyLinks = screen.getAllByRole('link', { name: /Apply Now/i });
    expect(applyLinks[0]).toHaveAttribute('href', '/customer/register');

    // Verify hero "Apply for a Loan" CTA has href /customer/register
    const heroApplyBtn = document.getElementById('hero-apply-btn');
    expect(heroApplyBtn).toHaveAttribute('href', '/customer/register');
  });

  it('TEST 2: Customer can access /customer/register even if stale admin token existed in localStorage', async () => {
    // Simulate stale admin token
    localStorage.setItem('loan_approve_admin_token', 'stale-admin-token');
    localStorage.setItem('loan_approve_active_role', 'ADMIN');

    mockApiClient.mockImplementation((endpoint: string) => {
      if (endpoint === '/api/auth/me') {
        return Promise.resolve({
          success: true,
          data: {
            user: { id: 'admin-1', role: 'ADMIN', fullName: 'Admin User', email: 'admin@test.com' },
          },
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });

    renderAppAt('/customer/register');

    // CustomerPublicOnlyRoute must NOT redirect to Admin dashboard; it must show Customer Registration
    await waitFor(() => {
      expect(screen.getByText(/What do you need a loan for/i)).toBeInTheDocument();
      expect(screen.queryByTestId('admin-dashboard-page')).not.toBeInTheDocument();
    });
  });

  it('TEST 3: Customer Login authenticates, clears admin token, and navigates to /customer/dashboard', async () => {
    // Simulate previous admin token in storage
    localStorage.setItem('loan_approve_admin_token', 'old-admin-token');

    mockApiClient.mockImplementation((endpoint: string) => {
      if (endpoint.includes('/public/config')) {
        return Promise.resolve({
          success: true,
          data: {
            appName: 'Loan Finance Test',
            companyName: 'Loan Finance Test Corp',
          },
        });
      }
      if (endpoint.includes('/auth/customer/login')) {
        return Promise.resolve({
          success: true,
          data: {
            token: 'valid-customer-jwt-token',
            user: {
              id: 'cust-123',
              role: 'CUSTOMER',
              fullName: 'Aarav Sharma',
              mobile: '9876543210',
              status: 'ACTIVE',
            },
          },
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });

    renderAppAt('/customer/login');

    await waitFor(() => {
      expect(screen.getByLabelText(/Mobile Number/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Mobile Number/i), { target: { value: '9876543210' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue to Portal/i }));

    await waitFor(() => {
      expect(screen.getByTestId('customer-dashboard-page')).toBeInTheDocument();
      expect(screen.queryByTestId('admin-dashboard-page')).not.toBeInTheDocument();
    });

    // Verify localStorage has customer token and cleared admin token
    expect(localStorage.getItem('loan_approve_customer_token')).toBe('valid-customer-jwt-token');
    expect(localStorage.getItem('loan_approve_active_role')).toBe('CUSTOMER');
    expect(localStorage.getItem('loan_approve_admin_token')).toBeNull();
  });

  it('TEST 4: Authenticated Customer visiting /admin/dashboard is blocked and redirected to /admin/login', async () => {
    localStorage.setItem('loan_approve_customer_token', 'valid-customer-jwt-token');
    localStorage.setItem('loan_approve_active_role', 'CUSTOMER');

    mockApiClient.mockImplementation((endpoint: string) => {
      if (endpoint.includes('/public/config')) {
        return Promise.resolve({
          success: true,
          data: {
            appName: 'Loan Finance Test',
            companyName: 'Loan Finance Test Corp',
          },
        });
      }
      if (endpoint.includes('/auth/me')) {
        return Promise.resolve({
          success: true,
          data: {
            user: {
              id: 'cust-123',
              role: 'CUSTOMER',
              fullName: 'Aarav Sharma',
              mobile: '9876543210',
            },
          },
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });

    renderAppAt('/admin/dashboard');

    await waitFor(() => {
      // Must be redirected to Admin Login, NOT granted Admin Dashboard
      expect(screen.getByText(/Admin Console/i)).toBeInTheDocument();
      expect(screen.queryByTestId('admin-dashboard-page')).not.toBeInTheDocument();
    });
  });

  it('TEST 5: Admin Login authenticates, clears customer token, and navigates to /admin/dashboard', async () => {
    localStorage.setItem('loan_approve_customer_token', 'old-customer-token');

    mockApiClient.mockImplementation((endpoint: string) => {
      if (endpoint.includes('/public/config')) {
        return Promise.resolve({
          success: true,
          data: {
            appName: 'Loan Finance Test',
            companyName: 'Loan Finance Test Corp',
          },
        });
      }
      if (endpoint.includes('/auth/admin/login')) {
        return Promise.resolve({
          success: true,
          data: {
            token: 'valid-admin-jwt-token',
            user: {
              id: 'admin-999',
              role: 'ADMIN',
              adminRole: 'SUPER_ADMIN',
              fullName: 'Operations Lead',
              email: 'admin@loanapprove.com',
            },
          },
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });

    renderAppAt('/admin/login');

    await waitFor(() => {
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'admin@loanapprove.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'Admin@123' } });
    fireEvent.click(screen.getByRole('button', { name: /Access Command Center/i }));

    await waitFor(() => {
      expect(screen.getByTestId('admin-dashboard-page')).toBeInTheDocument();
      expect(screen.queryByTestId('customer-dashboard-page')).not.toBeInTheDocument();
    });

    expect(localStorage.getItem('loan_approve_admin_token')).toBe('valid-admin-jwt-token');
    expect(localStorage.getItem('loan_approve_active_role')).toBe('ADMIN');
    expect(localStorage.getItem('loan_approve_customer_token')).toBeNull();
  });

  it('TEST 6: Authenticated Admin visiting /customer/dashboard is redirected to /customer/login', async () => {
    localStorage.setItem('loan_approve_admin_token', 'valid-admin-jwt-token');
    localStorage.setItem('loan_approve_active_role', 'ADMIN');

    mockApiClient.mockImplementation((endpoint: string) => {
      if (endpoint.includes('/public/config')) {
        return Promise.resolve({
          success: true,
          data: {
            appName: 'Loan Finance Test',
            companyName: 'Loan Finance Test Corp',
          },
        });
      }
      if (endpoint.includes('/auth/me')) {
        return Promise.resolve({
          success: true,
          data: {
            user: {
              id: 'admin-999',
              role: 'ADMIN',
              adminRole: 'SUPER_ADMIN',
              fullName: 'Operations Lead',
              email: 'admin@loanapprove.com',
            },
          },
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });

    renderAppAt('/customer/dashboard');

    await waitFor(() => {
      // Must be redirected to Customer Login, NOT granted Customer Dashboard
      expect(screen.getByText(/Welcome to/i)).toBeInTheDocument();
      expect(screen.queryByTestId('customer-dashboard-page')).not.toBeInTheDocument();
    });
  });

  it('TEST 7: Embedded Landing Page Signup form creates customer and leads to /customer/dashboard', async () => {
    mockApiClient.mockImplementation((endpoint: string) => {
      if (typeof endpoint === 'string' && endpoint.includes('/public/config')) {
        return Promise.resolve({
          success: true,
          data: {
            appName: 'Loan Finance Test',
            companyName: 'Loan Finance Test Corp',
            documents: [],
            faqs: [],
            hero: { headline: 'Simple Loans', subheadline: 'Apply online easily' },
            financial: { minApr: 12.0, maxApr: 24.0, minLoanAmount: 25000, maxLoanAmount: 1000000 },
            eligibility: { minAge: 21, maxAge: 60, minMonthlyIncome: 20000, bankAccountRequired: true },
          },
        });
      }
      if (typeof endpoint === 'string' && endpoint.includes('/auth/customer/register')) {
        return Promise.resolve({
          success: true,
          data: {
            token: 'embedded-customer-jwt-token',
            user: {
              id: 'cust-456',
              role: 'CUSTOMER',
              fullName: 'Ravi Verma',
              mobile: '9812345678',
              status: 'ACTIVE',
            },
          },
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });

    renderAppAt('/');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Start Your Loan Application/i })).toBeInTheDocument();
    });

    // Step 1: Click Next Step in embedded form
    const nextBtn1 = screen.getByRole('button', { name: /Next Step/i });
    fireEvent.click(nextBtn1);

    // Step 2: Fill Personal Details
    await waitFor(() => {
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Ravi Verma' } });
    fireEvent.change(screen.getByLabelText(/Mobile Number/i), { target: { value: '9812345678' } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'ravi@example.com' } });
    fireEvent.change(screen.getByLabelText(/Aadhaar Number/i), { target: { value: '987654321098' } });

    const nextBtn2 = screen.getByRole('button', { name: /Next Step/i });
    fireEvent.click(nextBtn2);

    // Step 3: Fill Address Details
    await waitFor(() => {
      expect(screen.getByLabelText(/Monthly Income/i)).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText(/Monthly Income/i), { target: { value: '50000' } });
    fireEvent.change(screen.getByLabelText(/State/i), { target: { value: 'Maharashtra' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'Mumbai' } });
    fireEvent.change(screen.getByLabelText(/Full Residential Address/i), {
      target: { value: '404 Nariman Point' },
    });

    const submitBtn = screen.getByRole('button', { name: /Submit Application/i });
    fireEvent.click(submitBtn);

    await waitFor(
      () => {
        expect(screen.getByText(/Account created successfully!/i)).toBeInTheDocument();
        expect(screen.queryByTestId('admin-dashboard-page')).not.toBeInTheDocument();
      },
      { timeout: 4000 }
    );
  }, 15000);
});
