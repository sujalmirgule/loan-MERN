import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AdminBrandingSettings } from '../pages/admin/AdminBrandingSettings';
import { AdminDocumentBrandingPage } from '../pages/admin/AdminDocumentBrandingPage';
import { AdminWebsiteContentPage } from '../pages/admin/AdminWebsiteContentPage';
import { BrandingProvider } from '../contexts/BrandingContext';
import { api } from '../api/client';

vi.mock('../api/client', () => {
  const mockFn = vi.fn();
  const mockApi: any = Object.assign(mockFn, {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  });
  return {
    api: mockApi,
    apiClient: mockApi,
    ApiError: class extends Error {},
  };
});

const mockBrandingData = {
  companyName: 'Kumbhat Financial Services',
  companyLegalName: 'Kumbhat Financial Services Limited',
  appName: 'Craft Mudra',
  logoUrl: 'https://example.com/logo.png',
  secondaryLogoUrl: 'https://example.com/secondary.png',
  approvalLetterHeaderUrl: 'https://example.com/approval_header.png',
  watermarkLogoUrl: 'https://example.com/watermark.png',
  documentWatermarkEnabled: true,
  invoiceWatermarkEnabled: true,
  watermarkOpacity: 0.15,
  watermarkSize: 'MEDIUM',
  watermarkPosition: 'CENTER',
  faviconUrl: 'https://example.com/favicon.ico',
  primaryColor: '#047857',
  secondaryColor: '#0f172a',
  email: 'support@craftmudra.in',
  phone: '+91 8942014797',
  address: '5th Floor, Kumbhat Complex, Chennai',
  website: 'https://craftmudra.in',
  termsUrl: '/terms',
  privacyUrl: '/privacy',
  heroHeadline: 'Simple, Transparent Loan Application',
  heroSubheadline: 'Apply online and track your application status.',
  minLoanAmount: 10000,
  maxLoanAmount: 3000000,
  minTenureMonths: 6,
  maxTenureMonths: 84,
  minApr: 12.0,
  maxApr: 36.0,
};

const renderWithProviders = (component: React.ReactElement) => {
  if (!global.URL.createObjectURL) {
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-blob-url');
  }
  if (!global.URL.revokeObjectURL) {
    global.URL.revokeObjectURL = vi.fn();
  }
  return render(
    <BrowserRouter>
      <BrandingProvider>
        {component}
      </BrandingProvider>
    </BrowserRouter>
  );
};

describe('Dedicated Document Branding, Approval Letter & Website Content Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/admin/settings/document-branding')) {
        return Promise.resolve({ data: { success: true, data: mockBrandingData } });
      }
      if (url.includes('/admin/settings/branding')) {
        return Promise.resolve({ data: { success: true, data: mockBrandingData } });
      }
      if (url.includes('/public/config')) {
        return Promise.resolve({ data: mockBrandingData });
      }
      if (url.includes('/preview/approval-letter') || url.includes('/preview/invoice')) {
        return Promise.resolve({ data: new Blob(['%PDF-1.4 Mock PDF content'], { type: 'application/pdf' }) });
      }
      return Promise.resolve({ data: {} });
    });
    vi.mocked(api.put).mockResolvedValue({ data: { success: true, data: mockBrandingData } });
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: { url: 'https://example.com/new_logo.png' } } });
  });

  describe('1. Dedicated Document Branding Page (AdminDocumentBrandingPage)', () => {
    it('Loads and displays existing document branding parameters', async () => {
      renderWithProviders(<AdminDocumentBrandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: /DOCUMENT BRANDING/i })).toBeInTheDocument();
        expect(screen.getByText('15%')).toBeInTheDocument();
      });

      expect(screen.getByRole('heading', { level: 2, name: /APPROVAL LETTER HEADER/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /DOCUMENT WATERMARK/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /INVOICE BRANDING/i })).toBeInTheDocument();
      expect(screen.getByText(/Watermark Opacity/i)).toBeInTheDocument();
    });

    it('Opens live approval letter preview modal', async () => {
      renderWithProviders(<AdminDocumentBrandingPage />);

      await waitFor(() => {
        expect(screen.getAllByText(/Preview Approval Letter/i).length).toBeGreaterThan(0);
      });

      fireEvent.click(screen.getAllByText(/Preview Approval Letter/i)[0]);

      await waitFor(() => {
        expect(screen.getByText(/Live PDF Preview: Loan Approval Letter/i)).toBeInTheDocument();
      });
    });

    it('Updates watermark opacity slider and submits changes', async () => {
      renderWithProviders(<AdminDocumentBrandingPage />);

      await waitFor(() => {
        expect(screen.getByText('15%')).toBeInTheDocument();
      });

      const opacitySlider = screen.getByRole('slider');
      fireEvent.change(opacitySlider, { target: { value: '0.20' } });

      expect(screen.getByText('20%')).toBeInTheDocument();

      const saveButtons = screen.getAllByRole('button', { name: /SAVE DOCUMENT BRANDING/i });
      fireEvent.click(saveButtons[0]);

      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith(
          expect.stringContaining('/admin/settings/document-branding'),
          expect.objectContaining({
            watermarkOpacity: 0.20,
          })
        );
      });
    });
  });

  describe('2. Dedicated Website Branding Page (AdminBrandingSettings)', () => {
    it('Loads brand identity, favicon, and dynamic color controls', async () => {
      renderWithProviders(<AdminBrandingSettings />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Craft Mudra')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Kumbhat Financial Services Limited')).toBeInTheDocument();
        expect(screen.getAllByDisplayValue('#047857').length).toBeGreaterThan(0);
      });

      expect(screen.getByText(/Browser Tab Icon \(Favicon\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Document Branding Settings/i)).toBeInTheDocument();
      expect(screen.getByText(/Website Content Management/i)).toBeInTheDocument();
    });

    it('Saves website branding with SAVE WEBSITE BRANDING CTA', async () => {
      renderWithProviders(<AdminBrandingSettings />);

      await waitFor(() => {
        expect(screen.getAllByText(/SAVE WEBSITE BRANDING/i).length).toBeGreaterThan(0);
      });

      const saveButton = screen.getAllByText(/SAVE WEBSITE BRANDING/i)[0];
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith(
          expect.stringContaining('/admin/settings/branding'),
          expect.objectContaining({
            appName: 'Craft Mudra',
          })
        );
      });
    });
  });

  describe('3. Dedicated Website Content Page (AdminWebsiteContentPage)', () => {
    it('Loads hero headline, financial parameters, and document checklist', async () => {
      renderWithProviders(<AdminWebsiteContentPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Simple, Transparent Loan Application')).toBeInTheDocument();
        expect(screen.getByDisplayValue('10000')).toBeInTheDocument();
        expect(screen.getByDisplayValue('3000000')).toBeInTheDocument();
      });

      expect(screen.getByText(/Hero Section & Mobile App CTA/i)).toBeInTheDocument();
      expect(screen.getByText(/Loan Information & Financial Parameters/i)).toBeInTheDocument();
      expect(screen.getByText(/Borrower Eligibility Criteria/i)).toBeInTheDocument();
      expect(screen.getByText(/Required Documents Checklist/i)).toBeInTheDocument();
      expect(screen.getByText(/Frequently Asked Questions \(FAQ\)/i)).toBeInTheDocument();
    });
  });
});
