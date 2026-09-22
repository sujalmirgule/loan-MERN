import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';

// â”€â”€â”€ Document Checklist Item â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface DocumentChecklistItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  mandatory: boolean;
}

// â”€â”€â”€ FAQ Item â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface FaqItem {
  question: string;
  answer: string;
}

// â”€â”€â”€ Full Public Branding Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  // â”€â”€ Landing page structured config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  hero: {
    headline: string;
    subheadline: string;
  };
  lender: {
    name: string | null;
    legalName: string | null;
    registrationNumber: string | null;
    type: string | null;
    address: string | null;
    website: string | null;
    isDirectLender: boolean;
  };
  partner: {
    name: string | null;
    relationship: string | null;
  };
  financial: {
    minLoanAmount: number;
    maxLoanAmount: number;
    minTenureMonths: number;
    maxTenureMonths: number;
    minApr: number;
    maxApr: number;
    processingFeePolicy: string;
    otherChargesPolicy: string;
  };
  eligibility: {
    minAge: number;
    maxAge: number;
    minMonthlyIncome: number;
    creditScoreCriteria: string;
    bankAccountRequired: boolean;
    employmentCriteria: string;
    residentialStatusCriteria: string;
  };
  documents: DocumentChecklistItem[];
  disclaimer: string | null;
  faqs: FaqItem[];
  app: {
    enabled: boolean;
    downloadUrl: string | null;
  };
}

const defaultBranding: PublicBrandingConfig = {
  companyName: 'Your Financial Services',
  appName: 'LoanApp',
  logoUrl: null,
  faviconUrl: null,
  primaryColor: '#0B1F3A',
  secondaryColor: '#2563EB',
  email: 'support@yourcompany.com',
  phone: '+91 98765 43210',
  address: '',
  website: '',
  termsUrl: '',
  privacyUrl: '',
  payment: {
    chargeAmount: 500,
    chargeType: 'PROCESSING_DEPOSIT',
    upiId: '',
    accountHolderName: '',
    instructions: 'Please transfer the processing fee using UPI or IMPS and enter the 12-digit UTR number below.',
  },
  hero: {
    headline: 'Simple, Transparent Loan Application',
    subheadline: 'Apply online, complete verification, and track your application status â€” all in one place.',
  },
  lender: {
    name: null,
    legalName: null,
    registrationNumber: null,
    type: null,
    address: null,
    website: null,
    isDirectLender: false,
  },
  partner: {
    name: null,
    relationship: null,
  },
  financial: {
    minLoanAmount: 10000,
    maxLoanAmount: 3000000,
    minTenureMonths: 6,
    maxTenureMonths: 84,
    minApr: 12.0,
    maxApr: 36.0,
    processingFeePolicy: 'Processing fee applicable as per loan terms. GST as per applicable rates.',
    otherChargesPolicy: 'Late payment charges, prepayment charges, and other fees as per the approved loan agreement.',
  },
  eligibility: {
    minAge: 18,
    maxAge: 60,
    minMonthlyIncome: 15000,
    creditScoreCriteria: 'Good credit history preferred. Applications assessed individually.',
    bankAccountRequired: true,
    employmentCriteria: 'Salaried, Self-Employed, or Business Owner',
    residentialStatusCriteria: 'Indian Resident with valid address proof',
  },
  documents: [],
  disclaimer: null,
  faqs: [],
  app: {
    enabled: false,
    downloadUrl: null,
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

/**
 * Converts a hex color string (#RRGGBB) to an "R, G, B" string.
 */
function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '4, 120, 87';
  return `${r}, ${g}, ${b}`;
}

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<PublicBrandingConfig>(defaultBranding);
  const [isLoading, setIsLoading] = useState(false);

  const applyBrandingToDom = useCallback((config: PublicBrandingConfig) => {
    const root = document.documentElement;

    // 1. CSS Variables â€” primary
    if (config.primaryColor) {
      root.style.setProperty('--brand-primary', config.primaryColor);
      root.style.setProperty('--brand-primary-rgb', hexToRgb(config.primaryColor));
    }

    // 2. CSS Variables â€” secondary
    if (config.secondaryColor) {
      root.style.setProperty('--brand-secondary', config.secondaryColor);
      root.style.setProperty('--brand-secondary-rgb', hexToRgb(config.secondaryColor));
    }

    // 3. Favicon
    if (config.faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = config.faviconUrl;
    }

    // 4. Document title (base â€” pages can override via useBrandTitle)
    if (config.appName) {
      document.title = config.appName;
    }

    // 5. theme-color meta tag
    if (config.primaryColor) {
      let themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (!themeMeta) {
        themeMeta = document.createElement('meta');
        themeMeta.name = 'theme-color';
        document.head.appendChild(themeMeta);
      }
      themeMeta.content = config.primaryColor;
    }

    // 6. og:title meta tag
    if (config.appName) {
      let ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
      if (!ogTitle) {
        ogTitle = document.createElement('meta');
        ogTitle.setAttribute('property', 'og:title');
        document.head.appendChild(ogTitle);
      }
      ogTitle.content = config.appName;
    }
  }, []);

  const refreshBranding = useCallback(async () => {
    try {
      setIsLoading(true);

      // 1. Fetch global branding config
      const res = await apiClient.get(API_ENDPOINTS.SETTINGS.PUBLIC_CONFIG);
      const globalConfig = res?.data as PublicBrandingConfig | undefined;
      if (globalConfig) {
        setBranding(globalConfig);
        applyBrandingToDom(globalConfig);
      }

      // 2. Fetch domain-specific branding to override helpline / contactEmail
      try {
        const hostname = window.location.hostname;
        const domainRes = await apiClient.get(
          API_ENDPOINTS.DOMAINS.PUBLIC_CONFIG(hostname !== 'localhost' ? hostname : undefined)
        );
        const domainData = domainRes?.data;
        if (domainData && globalConfig) {
          const merged: PublicBrandingConfig = {
            ...globalConfig,
            phone: domainData.helplineNumber || globalConfig.phone,
            email: domainData.contactEmail || globalConfig.email,
            appName: domainData.appName || globalConfig.appName,
            primaryColor: domainData.primaryColor || globalConfig.primaryColor,
          };
          setBranding(merged);
          applyBrandingToDom(merged);
        }
      } catch {
        // Domain-config is optional â€” silently fall back to global branding
      }
    } catch {
      // Fallback silently to defaults
    } finally {
      setIsLoading(false);
    }
  }, [applyBrandingToDom]);

  useEffect(() => {
    refreshBranding();

    // Periodic real-time background sync (~2s) when page is visible
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshBranding();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [refreshBranding]);

  return (
    <BrandingContext.Provider value={{ branding, isLoading, refreshBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};


// eslint-disable-next-line react-refresh/only-export-components
export const useBranding = () => useContext(BrandingContext);
