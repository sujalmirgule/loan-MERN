import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { useBranding } from '@/contexts/BrandingContext';
import {
  Palette,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  Globe,
  Building2,
  Upload,
  Sparkles,
  ShieldCheck,
  Check,
  Trash2,
  Award,
  ArrowRight,
  Image as ImageIcon,
} from 'lucide-react';

export const AdminBrandingSettings: React.FC = () => {
  const { refreshBranding } = useBranding();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Uploading states
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSecondaryLogo, setUploadingSecondaryLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  const [logoUploadSuccess, setLogoUploadSuccess] = useState(false);
  const [secondaryLogoUploadSuccess, setSecondaryLogoUploadSuccess] = useState(false);
  const [faviconUploadSuccess, setFaviconUploadSuccess] = useState(false);

  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const secondaryLogoFileInputRef = useRef<HTMLInputElement | null>(null);
  const faviconFileInputRef = useRef<HTMLInputElement | null>(null);

  // Form fields
  const [companyName, setCompanyName] = useState('');
  const [companyLegalName, setCompanyLegalName] = useState('');
  const [appName, setAppName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [secondaryLogoUrl, setSecondaryLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563EB');
  const [secondaryColor, setSecondaryColor] = useState('#7C3AED');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [termsUrl, setTermsUrl] = useState('');
  const [privacyUrl, setPrivacyUrl] = useState('');

  // Preserved fields from database to avoid wiping out
  const [fullBrandingData, setFullBrandingData] = useState<Record<string, any>>({});

  const fetchSettings = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.get(API_ENDPOINTS.SETTINGS.BRANDING_GET);
      const data = res.data?.data || res.data;
      if (data) {
        setFullBrandingData(data);
        setCompanyName(data.companyName || '');
        setCompanyLegalName(data.companyLegalName || data.companyName || '');
        setAppName(data.appName || '');
        setLogoUrl(data.logoUrl || '');
        setSecondaryLogoUrl(data.secondaryLogoUrl || '');
        setFaviconUrl(data.faviconUrl || '');
        setPrimaryColor(data.primaryColor || '#2563EB');
        setSecondaryColor(data.secondaryColor || '#7C3AED');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setAddress(data.address || '');
        setWebsite(data.website || '');
        setTermsUrl(data.termsUrl || '');
        setPrivacyUrl(data.privacyUrl || '');
      }
    } catch (err: unknown) {
      console.error('Failed to load branding settings:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load branding settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('Logo file exceeds maximum size limit of 2MB.');
      return;
    }

    try {
      setUploadingLogo(true);
      setErrorMessage('');
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post(API_ENDPOINTS.SETTINGS.BRANDING_UPLOAD_LOGO, formData, {
        tokenType: 'admin',
      });

      const uploadedUrl = res.data?.data?.url || res.data?.data?.logoUrl || res.data?.url;
      if (uploadedUrl) {
        setLogoUrl(uploadedUrl);
        setLogoUploadSuccess(true);
        setTimeout(() => setLogoUploadSuccess(false), 4000);
      }
    } catch (err: unknown) {
      console.error('Failed to upload primary logo:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to upload primary logo');
    } finally {
      setUploadingLogo(false);
      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
    }
  };

  const handleSecondaryLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('Secondary logo file exceeds maximum size limit of 2MB.');
      return;
    }

    try {
      setUploadingSecondaryLogo(true);
      setErrorMessage('');
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post(API_ENDPOINTS.SETTINGS.BRANDING_UPLOAD_SECONDARY_LOGO, formData, {
        tokenType: 'admin',
      });

      const uploadedUrl = res.data?.data?.url || res.data?.url;
      if (uploadedUrl) {
        setSecondaryLogoUrl(uploadedUrl);
        setSecondaryLogoUploadSuccess(true);
        setTimeout(() => setSecondaryLogoUploadSuccess(false), 4000);
      }
    } catch (err: unknown) {
      console.error('Failed to upload secondary logo:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to upload secondary logo');
    } finally {
      setUploadingSecondaryLogo(false);
      if (secondaryLogoFileInputRef.current) secondaryLogoFileInputRef.current.value = '';
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('Favicon file exceeds maximum size limit of 2MB.');
      return;
    }

    try {
      setUploadingFavicon(true);
      setErrorMessage('');
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post(API_ENDPOINTS.SETTINGS.BRANDING_UPLOAD_FAVICON, formData, {
        tokenType: 'admin',
      });

      const uploadedUrl = res.data?.data?.url || res.data?.data?.faviconUrl || res.data?.url;
      if (uploadedUrl) {
        setFaviconUrl(uploadedUrl);
        setFaviconUploadSuccess(true);
        setTimeout(() => setFaviconUploadSuccess(false), 4000);
      }
    } catch (err: unknown) {
      console.error('Failed to upload favicon:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to upload favicon file');
    } finally {
      setUploadingFavicon(false);
      if (faviconFileInputRef.current) faviconFileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await api.put(API_ENDPOINTS.SETTINGS.BRANDING_UPDATE, {
        ...fullBrandingData,
        companyName: companyName.trim(),
        companyLegalName: companyLegalName.trim() || companyName.trim(),
        appName: appName.trim(),
        logoUrl: logoUrl.trim() || undefined,
        secondaryLogoUrl: secondaryLogoUrl.trim() || undefined,
        faviconUrl: faviconUrl.trim() || undefined,
        primaryColor,
        secondaryColor,
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        website: website.trim(),
        termsUrl: termsUrl.trim() || undefined,
        privacyUrl: privacyUrl.trim() || undefined,
      });

      setSuccessMessage('✓ Website branding saved successfully.');
      await refreshBranding();
    } catch (err: unknown) {
      console.error('Failed to update website branding settings:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update website branding settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight flex items-center gap-2">
            <Palette className="w-7 h-7 text-primary" />
            Website Branding & Identity
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Configure public website branding, primary/secondary logos, browser favicon, dynamic theme colors, and legal contacts.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || uploadingFavicon || uploadingLogo || uploadingSecondaryLogo}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-lg bg-[#2563EB] hover:bg-[#123B66] text-white shadow-md transition active:scale-95 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>SAVE WEBSITE BRANDING</span>
          </button>
          <Link
            to="/admin/settings/document-branding"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary shadow-xs transition"
          >
            <Award className="w-4 h-4 text-primary" />
            <span>Document Branding (Approval & Invoices)</span>
          </Link>
        </div>
      </div>

      {/* Navigation Quick Links Callout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/admin/settings/document-branding"
          className="p-4 rounded-xl border border-border bg-surface hover:border-primary/50 transition flex items-center justify-between group shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-text-primary group-hover:text-primary transition">
                Document Branding Settings
              </div>
              <div className="text-xs text-text-secondary">
                Configure Approval Letter Header banner PNG, subtle background watermark (5%-30% opacity), and preview live documents.
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-text-secondary group-hover:text-primary group-hover:translate-x-0.5 transition shrink-0 ml-2" />
        </Link>

        <Link
          to="/admin/settings/website-content"
          className="p-4 rounded-xl border border-border bg-surface hover:border-primary/50 transition flex items-center justify-between group shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-text-primary group-hover:text-primary transition">
                Website Content Management
              </div>
              <div className="text-xs text-text-secondary">
                Edit landing page hero banners, APR limits, eligibility criteria, document checklists, and FAQs.
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-text-secondary group-hover:text-primary group-hover:translate-x-0.5 transition shrink-0 ml-2" />
        </Link>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 rounded-lg flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium text-sm">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-lg flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="font-medium text-sm">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-red-700 hover:text-red-900 text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-text-secondary">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
          <p className="text-sm font-medium">Loading website branding configuration...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Form (7 cols on lg) */}
          <div className="lg:col-span-7 bg-surface p-6 rounded-xl border border-border shadow-xs">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* SECTION 1: Brand & Legal Identity */}
              <div>
                <h2 className="text-base font-bold text-text-primary border-b border-border pb-2 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Brand & Legal Identity
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Brand / Application Name *
                    </label>
                    <input
                      type="text"
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      placeholder="e.g. Loan Finance"
                      className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary transition"
                      required
                    />
                    <p className="text-[11px] text-text-secondary mt-1">Displayed in website header, navigation, and borrower portal.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Company Legal Entity Name *
                    </label>
                    <input
                      type="text"
                      value={companyLegalName}
                      onChange={(e) => {
                        setCompanyLegalName(e.target.value);
                        if (!companyName) setCompanyName(e.target.value);
                      }}
                      placeholder="e.g. Loan Finance Private Limited"
                      className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary transition"
                      required
                    />
                    <p className="text-[11px] text-text-secondary mt-1">Used on tax receipts, legal disclosures, and footer copyright.</p>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Brand Logos & Watermark Assets */}
              <div>
                <h2 className="text-base font-bold text-text-primary border-b border-border pb-2 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  Brand Logos & Watermark Assets
                </h2>

                <div className="space-y-4 mt-4">
                  {/* Primary Brand Logo */}
                  <div className="p-4 rounded-xl border border-border bg-surface-elevated space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-text-primary uppercase flex items-center gap-1.5">
                        <span>A. Primary Brand Logo</span>
                        <span className="text-[10px] font-normal text-text-secondary">(Header & Portal Logo)</span>
                      </label>
                      {logoUploadSuccess && (
                        <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3 mr-0.5" /> Uploaded
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-16 h-14 rounded-lg border border-border bg-surface flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                        {logoUrl ? (
                          <img src={logoUrl} alt="Primary Logo" className="w-full h-full object-contain p-1" />
                        ) : (
                          <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded">DEFAULT</span>
                        )}
                      </div>
                      <div className="flex-1 flex items-center gap-2 flex-wrap">
                        <input
                          type="file"
                          ref={logoFileInputRef}
                          onChange={handleLogoUpload}
                          accept="image/png,image/jpeg,image/svg+xml,image/webp"
                          className="hidden"
                          id="primary-logo-branding-input"
                        />
                        <label
                          htmlFor="primary-logo-branding-input"
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-surface hover:bg-surface-elevated cursor-pointer shadow-xs text-text-primary transition ${
                            uploadingLogo ? 'opacity-50 pointer-events-none' : ''
                          }`}
                        >
                          {uploadingLogo ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                          ) : (
                            <Upload className="w-3.5 h-3.5 text-primary" />
                          )}
                          <span>{logoUrl ? 'Replace Logo' : 'Upload Primary Logo'}</span>
                        </label>
                        {logoUrl && (
                          <button
                            type="button"
                            onClick={() => setLogoUrl('')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Secondary PNG / Side Logo */}
                  <div className="p-4 rounded-xl border border-border bg-surface-elevated space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-text-primary uppercase flex items-center gap-1.5">
                        <span>B. Secondary PNG Logo / Emblem</span>
                        <span className="text-[10px] font-normal text-text-secondary">(Approval Letters & Side Scheme)</span>
                      </label>
                      {secondaryLogoUploadSuccess && (
                        <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3 mr-0.5" /> Uploaded
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-16 h-14 rounded-lg border border-border bg-surface flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                        {secondaryLogoUrl ? (
                          <img src={secondaryLogoUrl} alt="Secondary Logo" className="w-full h-full object-contain p-1" />
                        ) : (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">DEFAULT</span>
                        )}
                      </div>
                      <div className="flex-1 flex items-center gap-2 flex-wrap">
                        <input
                          type="file"
                          ref={secondaryLogoFileInputRef}
                          onChange={handleSecondaryLogoUpload}
                          accept="image/png,image/jpeg,image/svg+xml,image/webp"
                          className="hidden"
                          id="secondary-logo-branding-input"
                        />
                        <label
                          htmlFor="secondary-logo-branding-input"
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-surface hover:bg-surface-elevated cursor-pointer shadow-xs text-text-primary transition ${
                            uploadingSecondaryLogo ? 'opacity-50 pointer-events-none' : ''
                          }`}
                        >
                          {uploadingSecondaryLogo ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                          ) : (
                            <Upload className="w-3.5 h-3.5 text-primary" />
                          )}
                          <span>{secondaryLogoUrl ? 'Replace Emblem' : 'Upload Secondary Emblem'}</span>
                        </label>
                        {secondaryLogoUrl && (
                          <button
                            type="button"
                            onClick={() => setSecondaryLogoUrl('')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Browser Favicon */}
              <div>
                <h2 className="text-base font-bold text-text-primary border-b border-border pb-2 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Browser Favicon
                </h2>

                <div className="p-4 rounded-xl border border-border bg-surface-elevated space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-text-primary uppercase">
                      Browser Tab Icon (Favicon)
                    </label>
                    {faviconUploadSuccess && (
                      <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3 mr-0.5" /> Uploaded
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg border border-border bg-surface flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                      {faviconUrl ? (
                        <img src={faviconUrl} alt="Favicon" className="w-8 h-8 object-contain" />
                      ) : (
                        <Globe className="w-6 h-6 text-text-secondary" />
                      )}
                    </div>
                    <div className="flex-1 flex items-center gap-2 flex-wrap">
                      <input
                        type="file"
                        ref={faviconFileInputRef}
                        onChange={handleFaviconUpload}
                        accept="image/x-icon,image/png,image/svg+xml,image/jpeg,image/webp,.ico"
                        className="hidden"
                        id="favicon-file-input"
                      />
                      <label
                        htmlFor="favicon-file-input"
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-surface hover:bg-surface-elevated cursor-pointer shadow-xs text-text-primary transition ${
                          uploadingFavicon ? 'opacity-50 pointer-events-none' : ''
                        }`}
                      >
                        {uploadingFavicon ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 text-primary" />
                        )}
                        <span>{faviconUrl ? 'Replace Favicon' : 'Upload Favicon'}</span>
                      </label>
                      {faviconUrl && (
                        <button
                          type="button"
                          onClick={() => setFaviconUrl('')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Dynamic Theme Colors */}
              <div>
                <h2 className="text-base font-bold text-text-primary border-b border-border pb-2 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  Color Palette & Dynamic Theme
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Primary Brand Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-11 h-11 border border-border rounded-lg cursor-pointer p-0.5 bg-surface"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="flex-1 font-mono text-sm bg-input border border-border rounded-lg p-2.5 text-text-primary uppercase"
                        pattern="^#[0-9A-Fa-f]{6}$"
                        required
                      />
                    </div>
                    <p className="text-[11px] text-text-secondary mt-1">Used for main buttons, highlights, and customer portal theme.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Secondary Accent Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-11 h-11 border border-border rounded-lg cursor-pointer p-0.5 bg-surface"
                      />
                      <input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="flex-1 font-mono text-sm bg-input border border-border rounded-lg p-2.5 text-text-primary uppercase"
                        pattern="^#[0-9A-Fa-f]{6}$"
                      />
                    </div>
                    <p className="text-[11px] text-text-secondary mt-1">Used for badges and secondary highlights.</p>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Contact & Legal Details */}
              <div>
                <h2 className="text-base font-bold text-text-primary border-b border-border pb-2 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Contact & Regulatory Details
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Support Email *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="support@company.com"
                      className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Support Helpline Phone *
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 1800 123 4567"
                      className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary transition"
                      required
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                    Registered Office Address *
                  </label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    placeholder="Bandra Kurla Complex, Mumbai, Maharashtra 400051"
                    className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary transition"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Website URL *
                    </label>
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://company.com"
                      className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Terms URL
                    </label>
                    <input
                      type="text"
                      value={termsUrl}
                      onChange={(e) => setTermsUrl(e.target.value)}
                      placeholder="/terms or https://..."
                      className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Privacy URL
                    </label>
                    <input
                      type="text"
                      value={privacyUrl}
                      onChange={(e) => setPrivacyUrl(e.target.value)}
                      placeholder="/privacy or https://..."
                      className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary transition"
                    />
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-4 border-t border-border flex items-center justify-between">
                <Link
                  to="/admin/settings/document-branding"
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5"
                >
                  <Award className="w-4 h-4 text-primary" />
                  <span>Configure Document Branding & Watermarks →</span>
                </Link>

                <button
                  type="submit"
                  disabled={saving || uploadingFavicon || uploadingLogo || uploadingSecondaryLogo}
                  className="px-8 py-3 bg-[#2563EB] hover:bg-[#123B66] disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg transition active:scale-[0.99] flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>SAVE WEBSITE BRANDING</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Live Customer Portal Preview Column (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Live Customer Portal Preview */}
            <div className="bg-surface p-5 rounded-xl border border-border shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                Live Customer Portal Theme Preview
              </h3>

              {/* Simulated Browser Bar */}
              <div className="rounded-xl border border-border overflow-hidden shadow-xs bg-slate-900">
                <div className="bg-slate-800 px-3 py-2 flex items-center space-x-2 border-b border-slate-700">
                  <div className="flex space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  </div>
                  <div className="flex-1 bg-slate-900 rounded-md px-2.5 py-1 text-[11px] text-slate-400 flex items-center space-x-1.5">
                    {faviconUrl ? (
                      <img src={faviconUrl} alt="Favicon" className="w-3.5 h-3.5 object-contain" />
                    ) : (
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span className="truncate text-slate-300 font-medium">
                      Dashboard — {appName || 'Loan Finance'}
                    </span>
                  </div>
                </div>

                {/* Simulated Portal Content */}
                <div className="p-4 bg-slate-50 text-slate-900 space-y-4">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                    <div className="flex items-center space-x-2.5">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded-md" />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-xs"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {(appName || 'LF').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-xs text-slate-900 leading-tight">
                          {appName || 'Loan Finance'}
                        </div>
                        <div className="text-[10px] text-gray-500 leading-tight">
                          {companyLegalName || companyName || 'Financial Services Pvt Ltd'}
                        </div>
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: secondaryColor }}
                    >
                      Active
                    </span>
                  </div>

                  {/* Sample Banner */}
                  <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Approved Loan Amount</span>
                      <span
                        className="text-xs font-black"
                        style={{ color: primaryColor }}
                      >
                        ₹5,00,000
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full" style={{ backgroundColor: primaryColor, width: '70%' }} />
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button
                        type="button"
                        className="flex-1 py-1.5 text-white text-xs font-bold rounded-md shadow-xs transition"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Sign Agreement
                      </button>
                      <Link
                        to="/admin/settings/document-branding"
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                      >
                        <Award className="w-3 h-3 text-primary" />
                        <span>Documents</span>
                      </Link>
                    </div>
                  </div>

                  {/* Footer metadata */}
                  <div className="text-[10px] text-gray-500 text-center space-y-0.5 pt-1">
                    <div>© {new Date().getFullYear()} {companyLegalName || appName}</div>
                    <div className="text-gray-400 font-mono text-[9px]">{email} • {phone}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic CSS Variables Preview */}
            <div className="bg-surface p-5 rounded-xl border border-border shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Active Dynamic CSS Variables
              </h4>
              <div className="p-3 bg-slate-900 rounded-lg font-mono text-[11px] text-slate-300 space-y-1 overflow-x-auto">
                <div><span className="text-indigo-400">--brand-primary:</span> <span style={{ color: primaryColor }}>{primaryColor}</span>;</div>
                <div><span className="text-indigo-400">--brand-secondary:</span> <span style={{ color: secondaryColor }}>{secondaryColor}</span>;</div>
                <div><span className="text-slate-500">/* Injected automatically into :root */</span></div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBrandingSettings;
