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

const mockConfigData = {
  appName: 'Loan Approve Finance',
  companyName: 'Loan Approve Finance Ltd',
  documents: [],
  faqs: [],
  hero: { headline: 'Instant Digital Loans', subheadline: 'Simple, transparent loans' },
  financial: { minApr: 12.0, maxApr: 24.0, minLoanAmount: 25000, maxLoanAmount: 1000000 },
  eligibility: { minAge: 21, maxAge: 60, minMonthlyIncome: 20000, bankAccountRequired: true },
};

describe('LOAN FINANCE — FINAL LANDING PAGE SIGNUP INTEGRATION (TESTS 1 to 9)', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();

    mockApiClient.mockImplementation((endpoint: string) => {
      if (typeof endpoint === 'string' && endpoint.includes('/public/config')) {
        return Promise.resolve({
          success: true,
          data: mockConfigData,
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });
  });

  const renderApp = (initialRoute: string) => {
    return render(
      <AuthProvider>
        <BrandingProvider>
          <MemoryRouter initialEntries={[initialRoute]}>
            <Routes>
              {/* Landing Page */}
              <Route path="/" element={<LandingPage />} />

              {/* Customer Routes */}
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
              <Route element={<CustomerRoute />}>
                <Route
                  path="/customer/dashboard"
                  element={<div data-testid="customer-dashboard">Customer Dashboard Active</div>}
                />
              </Route>

              {/* Admin Routes */}
              <Route
                path="/admin/login"
                element={
                  <AdminPublicOnlyRoute>
                    <AdminLogin />
                  </AdminPublicOnlyRoute>
                }
              />
              <Route element={<AdminRoute />}>
                <Route
                  path="/admin/dashboard"
                  element={<div data-testid="admin-dashboard">Admin Dashboard Active</div>}
                />
              </Route>
            </Routes>
          </MemoryRouter>
        </BrandingProvider>
      </AuthProvider>
    );
  };

  it('TEST 1: Hero button "Apply for a Loan" links directly to /customer/register', async () => {
    renderApp('/');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    const heroApplyBtn = document.getElementById('hero-apply-btn');
    expect(heroApplyBtn).toBeInTheDocument();
    expect(heroApplyBtn).toHaveAttribute('href', '/customer/register');
  });

  it('TEST 1b: Direct /customer/register page renders working 3-step form', async () => {
    renderApp('/customer/register');

    await waitFor(() => {
      expect(screen.getByText(/What do you need a loan for\?/i)).toBeInTheDocument();
      expect(screen.getByText(/Personal Loan/i)).toBeInTheDocument();
      expect(screen.getByText(/Required Amount/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Next Step/i })).toBeInTheDocument();
    });
  });

  it('TEST 2: Navbar "Apply Now" button links directly to /customer/register', async () => {
    renderApp('/');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    const applyLinks = screen.getAllByRole('link', { name: /Apply Now/i });
    expect(applyLinks.length).toBeGreaterThan(0);
    expect(applyLinks[0]).toHaveAttribute('href', '/customer/register');
  });

  it('TEST 3: Landing page has "Start Your Loan Application" section with the SAME working 3-step form', async () => {
    renderApp('/');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Start Your Loan Application/i })).toBeInTheDocument();
    });

    const applySection = document.getElementById('apply');
    expect(applySection).toBeInTheDocument();

    // Verify Step 1 elements inside the embedded section
    expect(screen.getByText(/What do you need a loan for\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Select Loan Type/i)).toBeInTheDocument();
    expect(screen.getByText(/Required Amount/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next Step/i })).toBeInTheDocument();
  });

  it('TEST 4, 5, 6: Embedded form transitions through Step 1 -> Step 2 -> Step 3 and completes signup to Customer Login', async () => {
    mockApiClient.mockImplementation((endpoint: string) => {
      if (typeof endpoint === 'string' && endpoint.includes('/public/config')) {
        return Promise.resolve({
          success: true,
          data: mockConfigData,
        });
      }
      if (typeof endpoint === 'string' && endpoint.includes('/auth/customer/register')) {
        return Promise.resolve({
          success: true,
          data: {
            token: 'embedded-token',
            user: { id: 'cust-new', mobile: '9812345678', fullName: 'Ravi Verma' },
          },
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });

    renderApp('/');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Start Your Loan Application/i })).toBeInTheDocument();
    });

    // TEST 4: Complete Step 1 -> Click Next Step -> Step 2 Identity
    const nextBtn1 = screen.getByRole('button', { name: /Next Step/i });
    fireEvent.click(nextBtn1);

    await waitFor(() => {
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    });

    // TEST 5: Complete Step 2 -> Click Next Step -> Step 3 Address
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Ravi Verma' } });
    fireEvent.change(screen.getByLabelText(/Mobile Number/i), { target: { value: '9812345678' } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'ravi@example.com' } });
    fireEvent.change(screen.getByLabelText(/Aadhaar Number/i), { target: { value: '987654321098' } });

    const nextBtn2 = screen.getByRole('button', { name: /Next Step/i });
    fireEvent.click(nextBtn2);

    await waitFor(() => {
      expect(screen.getByLabelText(/Monthly Income/i)).toBeInTheDocument();
    });

    // TEST 6: Complete Step 3 -> Submit -> Redirects to Customer Login (NOT Admin)
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
        expect(screen.getByText(/Welcome to/i)).toBeInTheDocument();
        expect(screen.queryByTestId('admin-dashboard')).not.toBeInTheDocument();
      },
      { timeout: 4000 }
    );
  });

  it('TEST 7: Public "Login" button links to /customer/login with mobile number input', async () => {
    renderApp('/');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    const loginLinks = screen.getAllByRole('link', { name: /^Login$/i });
    expect(loginLinks.length).toBeGreaterThan(0);
    expect(loginLinks[0]).toHaveAttribute('href', '/customer/login');
  });

  it('TEST 7b: Direct /customer/login renders mobile number input and CTA', async () => {
    renderApp('/customer/login');

    await waitFor(() => {
      expect(screen.getByLabelText(/Mobile Number/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Continue to Portal/i })).toBeInTheDocument();
    });
  });

  it('TEST 8: Direct access to /admin/login renders dedicated Admin Console with Email & Password', async () => {
    renderApp('/admin/login');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Admin Console/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(document.getElementById('admin-password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Access Command Center/i })).toBeInTheDocument();
    });
  });

  it('TEST 9: Admin login authenticates and redirects to /admin/dashboard', async () => {
    mockApiClient.mockImplementation((endpoint: string) => {
      if (endpoint.includes('/public/config')) {
        return Promise.resolve({ success: true, data: { appName: 'Loan Approve' } });
      }
      if (endpoint.includes('/auth/admin/login')) {
        return Promise.resolve({
          success: true,
          data: {
            token: 'valid-admin-token',
            user: { id: 'admin-1', role: 'ADMIN', adminRole: 'SUPER_ADMIN', fullName: 'Super Admin' },
          },
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });

    renderApp('/admin/login');

    await waitFor(() => {
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'admin@loanapprove.com' } });
    fireEvent.change(document.getElementById('admin-password')!, { target: { value: 'Admin@123' } });
    fireEvent.click(screen.getByRole('button', { name: /Access Command Center/i }));

    await waitFor(() => {
      expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
      expect(localStorage.getItem('loan_approve_admin_token')).toBe('valid-admin-token');
      expect(localStorage.getItem('loan_approve_active_role')).toBe('ADMIN');
      expect(localStorage.getItem('loan_approve_customer_token')).toBeNull();
    });
  });
});
