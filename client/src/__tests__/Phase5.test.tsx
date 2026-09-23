import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminDisbursementsPage } from '../pages/admin/AdminDisbursementsPage';
import { AdminReportsPage } from '../pages/admin/AdminReportsPage';
import { AdminBrandingSettings } from '../pages/admin/AdminBrandingSettings';
import { AdminEmailSettings } from '../pages/admin/AdminEmailSettings';
import { AdminWhatsAppSettings } from '../pages/admin/AdminWhatsAppSettings';
import { AdminSupportPage } from '../pages/admin/AdminSupportPage';
import { AdminNotificationsPage } from '../pages/admin/AdminNotificationsPage';
import { CustomerAgreementPage } from '../pages/customer/CustomerAgreementPage';
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

describe('Phase 5 Frontend Modules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      // Mock Public Branding Config
      if (url.includes('/api/public/config')) {
        return mockJson({
          companyName: 'Acme Lending Corp',
          appName: 'Acme Loan',
          logoUrl: null,
          primaryColor: '#047857',
          payment: {
            chargeAmount: 500,
            chargeType: 'PROCESSING_DEPOSIT',
            upiId: 'acme@upi',
            instructions: 'Transfer fee',
          },
        });
      }

      // Mock Disbursements List
      if (url.includes('/api/admin/disbursements')) {
        return mockJson({
          success: true,
          data: [
            {
              id: 'disb-1',
              loanId: 'loan-1',
              amount: 75000,
              paymentMode: 'BANK_TRANSFER',
              referenceNumber: 'UTR8877665544',
              disbursedAt: new Date().toISOString(),
              loan: {
                applicationNumber: 'LN-2026-001',
                amount: 75000,
                user: { fullName: 'Rajesh Kumar', mobileNumber: '9876543210' },
              },
            },
          ],
        });
      }

      // Mock Approved Loans
      if (url.includes('/api/admin/loan-applications')) {
        return mockJson({
          success: true,
          data: [
            {
              id: 'loan-2',
              applicationNumber: 'LN-2026-002',
              amount: 50000,
              status: 'APPROVED',
              user: { fullName: 'Priya Sharma', mobileNumber: '9123456789' },
            },
          ],
        });
      }

      // Mock Reports Summary
      if (url.includes('/api/admin/reports/summary')) {
        return mockJson({
          success: true,
          data: {
            customers: { total: 42 },
            loans: { total: 85, approved: 60, rejected: 10, approvalRate: 70.6 },
            disbursements: { totalAmount: 4500000 },
            payments: { totalCollected: 42500, pendingVerification: 3 },
            collections: { overdueCount: 1 },
          },
        });
      }

      // Mock Branding Settings
      if (url.includes('/api/admin/settings/branding')) {
        return mockJson({
          success: true,
          data: {
            companyName: 'Acme Lending Corp',
            appName: 'Acme Loan',
            primaryColor: '#047857',
            secondaryColor: '#0f172a',
            email: 'support@acme.com',
            phone: '+91 99999 88888',
            address: 'Nariman Point, Mumbai',
            website: 'https://acmelending.in',
          },
        });
      }

      // Mock Email Settings
      if (url.includes('/api/admin/settings/email')) {
        return mockJson({
          success: true,
          data: {
            smtpHost: 'smtp.sendgrid.net',
            smtpPort: 587,
            smtpUsername: 'apikey',
            hasPassword: true,
            fromName: 'Acme Loan Alerts',
            fromEmail: 'alerts@acme.com',
            encryption: 'TLS',
          },
        });
      }

      // Mock WhatsApp Settings
      if (url.includes('/api/admin/settings/whatsapp')) {
        return mockJson({
          success: true,
          data: {
            provider: 'META_CLOUD',
            phoneNumber: '+919999988888',
            hasAccessToken: true,
            enabled: true,
          },
        });
      }

      // Mock Support Tickets
      if (url.includes('/api/admin/support/tickets')) {
        return mockJson({
          success: true,
          data: [
            {
              id: 'ticket-1',
              customerId: 'cust-1',
              subject: 'Processing Fee Query',
              message: 'I have submitted my UTR number.',
              priority: 'HIGH',
              status: 'OPEN',
              createdAt: new Date().toISOString(),
              customer: { fullName: 'Suresh Patil', mobile: '9876500000', email: 'suresh@test.com' },
            },
          ],
        });
      }

      // Mock Admin Notifications
      if (url.includes('/api/admin/notifications')) {
        return mockJson({
          success: true,
          data: [
            {
              id: 'notif-1',
              type: 'PAYMENT',
              title: 'New UTR Submitted',
              message: 'Customer submitted UTR998877 for loan LN-2026-001',
              read: false,
              createdAt: new Date().toISOString(),
            },
          ],
          unreadCount: 1,
        });
      }

      // Mock Agreement Endpoint
      if (url.includes('/agreement')) {
        return mockJson({
          success: true,
          data: {
            agreementId: 'agr-12345678',
            loanId: 'loan-1',
            applicationNumber: 'LN-2026-001',
            customerName: 'Rajesh Kumar',
            sanctionedAmount: 100000,
            tenureMonths: 12,
            emi: 8884,
            interestRate: 12,
            agreementVersion: 'v1.0',
            contentHtml: '<p>This Loan Agreement is made between Lender and Borrower...</p>',
            acceptanceStatus: 'PENDING',
          },
        });
      }

      // Fallback
      return mockJson({ success: true, data: {} });
    });
  });

  it('renders Admin Disbursements page with records and Record Disbursement button', async () => {
    render(<AdminDisbursementsPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Loan Disbursements/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Record Disbursement/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('UTR8877665544')).toBeInTheDocument();
      expect(screen.getByText('Rajesh Kumar')).toBeInTheDocument();
    });
  });

  it('renders Admin Reports & Analytics with executive KPIs', async () => {
    render(<AdminReportsPage />, { wrapper: createWrapper() });

    expect(screen.getAllByText(/Reporting/i).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText(/^85$/)).toBeInTheDocument(); // Total Applications
      expect(screen.getAllByText(/70\.6%/)[0]).toBeInTheDocument(); // Approval rate
      expect(screen.getByText(/Export CSV/i)).toBeInTheDocument();
    });
  });

  it('renders Admin Branding Settings with live preview controls', async () => {
    render(<AdminBrandingSettings />, { wrapper: createWrapper() });

    expect(screen.getAllByText(/Website Branding/i).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Acme Lending Corp')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Acme Loan')).toBeInTheDocument();
      expect(screen.getByText(/Live Customer Portal Theme Preview/i)).toBeInTheDocument();
    });
  });

  it('renders Admin Email Settings with SMTP inputs and composer', async () => {
    render(<AdminEmailSettings />, { wrapper: createWrapper() });

    expect(screen.getByText(/Customer Email Messaging/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SMTP Configuration/i })).toBeInTheDocument();
  });

  it('renders Admin WhatsApp Settings with direct composer and provider selection', async () => {
    render(<AdminWhatsAppSettings />, { wrapper: createWrapper() });

    expect(screen.getAllByText(/WhatsApp Messaging/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Provider Settings/i })).toBeInTheDocument();
  });

  it('renders Admin Support Tickets page with queue', async () => {
    render(<AdminSupportPage />, { wrapper: createWrapper() });

    expect(screen.getAllByText(/Communication Center/i).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getAllByText(/WhatsApp/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Email/i).length).toBeGreaterThan(0);
    });
  });

  it('renders Admin Notifications action center', async () => {
    render(<AdminNotificationsPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Admin Action Center/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('New UTR Submitted')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Mark Read/i })).toBeInTheDocument();
    });
  });

  it('renders Customer Agreement Page with legal contract text', async () => {
    render(<CustomerAgreementPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Master Loan Agreement/i)).toBeInTheDocument();
      expect(screen.getByText(/LN-2026-001/i)).toBeInTheDocument();
      expect(screen.getByText(/This Loan Agreement is made between Lender and Borrower/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Accept & Digitally Sign Agreement/i })).toBeInTheDocument();
    });
  });
});
