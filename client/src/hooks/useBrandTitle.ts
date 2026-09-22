import { useEffect } from 'react';
import { useBranding } from '@/contexts/BrandingContext';

/**
 * Sets a page-specific browser title using the dynamic brand name.
 *
 * Usage:
 *   useBrandTitle('Login')    → "Login — ABC Finance"
 *   useBrandTitle('')         → "ABC Finance"
 *
 * The title resets automatically when the component unmounts.
 */
export function useBrandTitle(pageTitle?: string) {
  const { branding } = useBranding();

  useEffect(() => {
    const appName = branding.appName || 'LoanApp';
    document.title = pageTitle ? `${pageTitle} — ${appName}` : appName;

    return () => {
      // Reset to just the brand name when navigating away
      document.title = appName;
    };
  }, [pageTitle, branding.appName]);
}
