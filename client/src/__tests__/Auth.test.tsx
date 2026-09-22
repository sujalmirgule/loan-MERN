import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { CustomerLogin } from '../pages/customer/CustomerLogin';
import { CustomerRegister } from '../pages/customer/CustomerRegister';
import { AdminLogin } from '../pages/admin/AdminLogin';

// Mock API Client
vi.mock('@/api/client', () => ({
  apiClient: vi.fn(),
  ApiError: class extends Error {
    public status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

describe('Frontend Authentication Flow', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Customer Login Screen', () => {
    it('renders customer mobile login form without password or OTP', () => {
      render(
        <AuthProvider>
          <BrowserRouter>
            <CustomerLogin />
          </BrowserRouter>
        </AuthProvider>
      );

      expect(screen.getByText(/Welcome to/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Mobile Number/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Continue to Portal/i })).toBeInTheDocument();
      // Ensure NO password or OTP input exists
      expect(screen.queryByLabelText(/^Password$/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/OTP/i)).not.toBeInTheDocument();
    });

    it('enforces 10-digit mobile number input length and button disabled state', () => {
      render(
        <AuthProvider>
          <BrowserRouter>
            <CustomerLogin />
          </BrowserRouter>
        </AuthProvider>
      );

      const mobileInput = screen.getByLabelText(/Mobile Number/i) as HTMLInputElement;
      const submitBtn = screen.getByRole('button', { name: /Continue to Portal/i });

      // Initially disabled when empty
      expect(submitBtn).toBeDisabled();

      // Enter 5 digits -> still disabled
      fireEvent.change(mobileInput, { target: { value: '98765' } });
      expect(submitBtn).toBeDisabled();

      // Enter full 10 digits -> enabled
      fireEvent.change(mobileInput, { target: { value: '9876543210' } });
      expect(submitBtn).not.toBeDisabled();
    });
  });

  describe('Customer Registration Screen', () => {
    it('renders step 1 loan requirements and navigates to step 2 identity fields', async () => {
      render(
        <AuthProvider>
          <BrowserRouter>
            <CustomerRegister />
          </BrowserRouter>
        </AuthProvider>
      );

      // Step 1: Loan Requirements
      expect(screen.getByText(/What do you need a loan for/i)).toBeInTheDocument();
      expect(screen.getByText(/Select Loan Type/i)).toBeInTheDocument();
      expect(screen.getByText(/Required Amount/i)).toBeInTheDocument();
      expect(screen.getByText(/Estimated EMI/i)).toBeInTheDocument();

      const nextBtn = screen.getByRole('button', { name: /Next Step/i });
      fireEvent.click(nextBtn);

      // Step 2: Personal Details
      await waitFor(() => {
        expect(screen.getByText(/Personal Details/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Mobile Number/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Aadhaar Number/i)).toBeInTheDocument();
      });
    });

    it('dynamically populates cities when navigating to address step and selecting a state', async () => {
      render(
        <AuthProvider>
          <BrowserRouter>
            <CustomerRegister />
          </BrowserRouter>
        </AuthProvider>
      );

      // Step 1 -> Step 2
      fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

      // Fill Step 2 valid details
      await waitFor(() => {
        expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Ajay Kumar' } });
      fireEvent.change(screen.getByLabelText(/Mobile Number/i), { target: { value: '9876543210' } });
      fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'ajay@example.com' } });
      fireEvent.change(screen.getByLabelText(/Aadhaar Number/i), { target: { value: '123456789012' } });

      // Step 2 -> Step 3
      fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

      // Step 3: Address & Verification
      await waitFor(() => {
        expect(screen.getByLabelText(/State/i)).toBeInTheDocument();
      });

      const stateSelect = screen.getByLabelText(/State/i);
      const citySelect = screen.getByLabelText(/City/i);

      // Initially city is disabled
      expect(citySelect).toBeDisabled();

      // Select Maharashtra
      fireEvent.change(stateSelect, { target: { value: 'Maharashtra' } });

      // City select should now be enabled and have Mumbai & Pune
      expect(citySelect).not.toBeDisabled();
      expect(screen.getByText('Mumbai')).toBeInTheDocument();
      expect(screen.getByText('Pune')).toBeInTheDocument();
    });
  });

  describe('Admin Login Screen', () => {
    it('renders email, password, and show/hide password toggle', () => {
      render(
        <AuthProvider>
          <BrowserRouter>
            <AdminLogin />
          </BrowserRouter>
        </AuthProvider>
      );

      expect(screen.getByText(/Admin Console/i)).toBeInTheDocument();
      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/^Password$/i);
      const submitBtn = screen.getByRole('button', { name: /Access Command Center/i });

      expect(emailInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Toggle password visibility
      const toggleBtn = screen.getByRole('button', { name: /Show password/i });
      fireEvent.click(toggleBtn);
      expect(passwordInput).toHaveAttribute('type', 'text');

      // Initially disabled
      expect(submitBtn).toBeDisabled();

      // Filled -> enabled
      fireEvent.change(emailInput, { target: { value: 'admin@loanapprove.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Admin@123456' } });
      expect(submitBtn).not.toBeDisabled();
    });
  });
});
