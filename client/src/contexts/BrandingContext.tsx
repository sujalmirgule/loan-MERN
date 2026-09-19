import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';

export interface PublicBrandingConfig {
  companyName: string;
  appName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  termsUrl: string;
  privacyUrl: string;
  payment: {
    chargeAmount: number;
    chargeType: string;
    upiId: string;
    accountHolderName: string;
    instructions: string;
  };
}

const defaultBranding: PublicBrandingConfig = {
  companyName: 'Loan Approve Financial Services',
  appName: 'Loan Approve',
  logoUrl: null,
  faviconUrl: null,
  primaryColor: '#047857',
  secondaryColor: '#0f172a',
  email: 'support@loanapprove.com',
  phone: '+91 98765 43210',
  address: 'Nariman Point, Mumbai, Maharashtra 400021',
  website: 'https://loanapprove.com',
  termsUrl: 'https://loanapprove.com/terms',
  privacyUrl: 'https://loanapprove.com/privacy',
  payment: {
    chargeAmount: 500,
    chargeType: 'PROCESSING_DEPOSIT',
    upiId: 'pay@loanapprove',
    accountHolderName: 'Loan Approve Financial Services',
    instructions: 'Please transfer the processing fee using UPI or IMPS and enter the 12-digit UTR number below.',
  },
};

interface BrandingContextType {
  branding: PublicBrandingConfig;
  isLoading: boolean;
  refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType>({
  branding: defaultBranding,
  isLoading: false,
  refreshBranding: async () => {},
});

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<PublicBrandingConfig>(defaultBranding);
  const [isLoading, setIsLoading] = useState(false);

  const applyBrandingToDom = useCallback((config: PublicBrandingConfig) => {
    // 1. Update Document Title
    if (config.appName) {
      document.title = `${config.appName} — Fast & Secure Digital Loans`;
    }

    // 2. Update Favicon if custom url exists
    if (config.faviconUrl) {
      const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (link) {
        link.href = config.faviconUrl;
      }
    }

    // 3. Inject CSS Variables for primary brand color
    if (config.primaryColor) {
      document.documentElement.style.setProperty('--brand-primary', config.primaryColor);
    }
  }, []);

  const refreshBranding = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get(API_ENDPOINTS.SETTINGS.PUBLIC_CONFIG);
      if (res?.data) {
        setBranding(res.data);
        applyBrandingToDom(res.data);
      }
    } catch {
      // Fallback silently to defaults
    } finally {
      setIsLoading(false);
    }
  }, [applyBrandingToDom]);

  useEffect(() => {
    refreshBranding();
  }, [refreshBranding]);

  return (
    <BrandingContext.Provider value={{ branding, isLoading, refreshBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useBranding = () => useContext(BrandingContext);
