import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaymentMethodsConfigCard } from '../components/admin/PaymentMethodsConfigCard';
import { AdminUpiSettingsPage } from '../pages/admin/AdminUpiSettingsPage';
import { CustomerPaymentPage } from '../pages/customer/CustomerPaymentPage';
import { BrandingProvider } from '../contexts/BrandingContext';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrandingProvider>
        <BrowserRouter>{children}</BrowserRouter>
      </BrandingProvider>
    </QueryClientProvider>
  );
};

const mockJson = (data: unknown, status = 200) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(data),
  });

describe('Dynamic Payment Method Enable/Disable Frontend Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. PaymentMethodsConfigCard renders individual toggles and master Select All', async () => {
    global.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
      if (url.includes('/api/admin/settings/payment-methods')) {
        if (opts?.method === 'PUT') {
          return mockJson({
            success: true,
            data: JSON.parse(opts.body),
          });
        }
        return mockJson({
          success: true,
          data: {
            upi: true,
            bankTransfer: false,
            merchantVpa: true,
          },
        });
      }
      return mockJson({ success: true, data: {} });
    });

    render(<PaymentMethodsConfigCard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Payment Methods')).toBeInTheDocument();
      expect(screen.getByText('Bank Account / Bank Transfer')).toBeInTheDocument();
      expect(screen.getByText('Merchant UPI ID / VPA')).toBeInTheDocument();
    });

    const upiCheckbox = document.getElementById('pm-toggle-upi') as HTMLInputElement;
    const bankCheckbox = document.getElementById('pm-toggle-bank') as HTMLInputElement;
    const vpaCheckbox = document.getElementById('pm-toggle-vpa') as HTMLInputElement;
    const selectAllCheckbox = document.getElementById('pm-toggle-select-all') as HTMLInputElement;

    expect(upiCheckbox.checked).toBe(true);
    expect(bankCheckbox.checked).toBe(false);
    expect(vpaCheckbox.checked).toBe(true);
    expect(selectAllCheckbox.checked).toBe(false);

    // Turn ON Select All
    fireEvent.click(selectAllCheckbox);
    expect(upiCheckbox.checked).toBe(true);
    expect(bankCheckbox.checked).toBe(true);
    expect(vpaCheckbox.checked).toBe(true);
    expect(selectAllCheckbox.checked).toBe(true);

    // Turn OFF Bank Account individual toggle
    fireEvent.click(bankCheckbox);
    expect(bankCheckbox.checked).toBe(false);
    expect(selectAllCheckbox.checked).toBe(false);

    // Click Save Changes button
    const saveBtn = document.getElementById('pm-save-changes-btn') as HTMLButtonElement;
    expect(saveBtn).toHaveTextContent(/Save Payment Settings/i);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('Payment methods configuration saved successfully.')).toBeInTheDocument();
    });
  });

  it('2. CustomerPaymentPage renders ONLY enabled payment methods (Only UPI enabled)', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/public/config')) {
        return mockJson({ appName: 'Loan Approve' });
      }
      if (url.includes('/api/public/payments/options')) {
        return mockJson({
          success: true,
          data: {
            feeAmount: 1250,
            feeType: 'PROCESSING_FEE',
            paymentMethods: {
              upi: true,
              bankTransfer: false,
              merchantVpa: false,
            },
            upi: {
              enabled: true,
              primaryUpiId: 'pay@company',
              merchantName: 'Financial Services',
              apps: [{ name: 'UPI', enabled: true, id: 'pay@company' }],
              merchantVpa: { enabled: false, vpa: 'pay@company' },
            },
            bank: {
              enabled: false,
              accountHolder: 'Financial Services Pvt Ltd',
              accountNumber: '50200084729104',
              bankName: 'HDFC Bank',
              ifsc: 'HDFC0000060',
              branch: 'Fort, Mumbai',
            },
            paymentLinks: [],
          },
        });
      }
      if (url.includes('/api/customer/charges')) {
        return mockJson({ success: true, data: [] });
      }
      return mockJson({ success: true, data: {} });
    });

    render(<CustomerPaymentPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Choose Payment Method')).toBeInTheDocument();
    });

    // UPI is present
    expect(screen.getByText('Pay using any UPI app or QR Code')).toBeInTheDocument();
    // Bank Transfer is NOT present
    expect(screen.queryByText('Bank Account / Bank Transfer')).not.toBeInTheDocument();
    // Merchant VPA is NOT present
    expect(screen.queryByText('Merchant UPI ID / VPA')).not.toBeInTheDocument();
  });

  it('3. CustomerPaymentPage renders ONLY Bank Transfer when UPI is OFF and Bank Transfer is ON', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/public/config')) {
        return mockJson({ appName: 'Loan Approve' });
      }
      if (url.includes('/api/public/payments/options')) {
        return mockJson({
          success: true,
          data: {
            feeAmount: 1250,
            feeType: 'PROCESSING_FEE',
            paymentMethods: {
              upi: false,
              bankTransfer: true,
              merchantVpa: false,
            },
            upi: {
              enabled: false,
              primaryUpiId: 'pay@company',
              merchantName: 'Financial Services',
              apps: [],
              merchantVpa: { enabled: false, vpa: 'pay@company' },
            },
            bank: {
              enabled: true,
              accountHolder: 'Financial Services Pvt Ltd',
              accountNumber: '50200084729104',
              bankName: 'HDFC Bank',
              ifsc: 'HDFC0000060',
              branch: 'Fort, Mumbai',
            },
            paymentLinks: [],
          },
        });
      }
      if (url.includes('/api/customer/charges')) {
        return mockJson({ success: true, data: [] });
      }
      return mockJson({ success: true, data: {} });
    });

    render(<CustomerPaymentPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Choose Payment Method')).toBeInTheDocument();
    });

    // Bank Transfer is present
    expect(screen.getByText('Bank Account / Bank Transfer')).toBeInTheDocument();
    // UPI is NOT present
    expect(screen.queryByText('Pay using any UPI app or QR Code')).not.toBeInTheDocument();
    // Merchant VPA is NOT present
    expect(screen.queryByText('Merchant UPI ID / VPA')).not.toBeInTheDocument();
  });

  it('4. CustomerPaymentPage shows maintenance warning when ALL payment methods are disabled', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/public/config')) {
        return mockJson({ appName: 'Loan Approve' });
      }
      if (url.includes('/api/public/payments/options')) {
        return mockJson({
          success: true,
          data: {
            feeAmount: 1250,
            feeType: 'PROCESSING_FEE',
            paymentMethods: {
              upi: false,
              bankTransfer: false,
              merchantVpa: false,
            },
            upi: {
              enabled: false,
              primaryUpiId: 'pay@company',
              merchantName: 'Financial Services',
              apps: [],
              merchantVpa: { enabled: false, vpa: 'pay@company' },
            },
            bank: {
              enabled: false,
              accountHolder: 'Financial Services Pvt Ltd',
              accountNumber: '50200084729104',
              bankName: 'HDFC Bank',
              ifsc: 'HDFC0000060',
              branch: 'Fort, Mumbai',
            },
            paymentLinks: [],
          },
        });
      }
      if (url.includes('/api/customer/charges')) {
        return mockJson({ success: true, data: [] });
      }
      return mockJson({ success: true, data: {} });
    });

    render(<CustomerPaymentPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Payment Methods Temporarily Unavailable')).toBeInTheDocument();
    });

    const payBtn = screen.getByRole('button', { name: /Pay Securely/i });
    expect(payBtn).toBeDisabled();
  });

  it('5. AdminUpiSettingsPage handles custom QR preview, dynamic fallback and save flow', async () => {
    global.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
      if (url.includes('/api/admin/settings/payment-methods')) {
        return mockJson({
          success: true,
          data: { upi: true, bankTransfer: true, merchantVpa: true },
        });
      }
      if (url.includes('/api/admin/settings/upi')) {
        if (opts?.method === 'PATCH') {
          return mockJson({
            success: true,
            data: JSON.parse(opts.body),
            message: 'UPI payment gateway configuration saved successfully.',
          });
        }
        return mockJson({
          success: true,
          data: {
            upiEnabled: true,
            upiId: 'test@icici',
            merchantName: 'Test Merchant Services',
            qrCodeUrl: '',
          },
        });
      }
      return mockJson({ success: true, data: {} });
    });

    render(<AdminUpiSettingsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('UPI Gateway Configuration')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test@icici')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Merchant Services')).toBeInTheDocument();
    });

    // Dynamic QR fallback is shown
    expect(screen.getByText('Dynamic QR Fallback')).toBeInTheDocument();

    const saveBtn = document.getElementById('save-upi-settings-btn') as HTMLButtonElement;
    expect(saveBtn).toBeInTheDocument();
    expect(saveBtn).toHaveTextContent(/Save UPI Settings/i);

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('UPI payment gateway configuration saved successfully.')).toBeInTheDocument();
    });
  });
});
