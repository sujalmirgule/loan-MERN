import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { API_ENDPOINTS } from '../../api/endpoints';
import { useBranding } from '../../contexts/BrandingContext';
import {
  Palette,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  Globe,
  Building2,
} from 'lucide-react';

export const AdminBrandingSettings: React.FC = () => {
  const { refreshBranding } = useBranding();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form fields
  const [companyName, setCompanyName] = useState('');
  const [appName, setAppName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#047857');
  const [secondaryColor, setSecondaryColor] = useState('#0f172a');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [termsUrl, setTermsUrl] = useState('');
  const [privacyUrl, setPrivacyUrl] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.get(API_ENDPOINTS.SETTINGS.BRANDING_GET);
      const data = res.data?.data || res.data;
      if (data) {
        setCompanyName(data.companyName || '');
        setAppName(data.appName || '');
        setLogoUrl(data.logoUrl || '');
        setFaviconUrl(data.faviconUrl || '');
        setPrimaryColor(data.primaryColor || '#047857');
        setSecondaryColor(data.secondaryColor || '#0f172a');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await api.put(API_ENDPOINTS.SETTINGS.BRANDING_UPDATE, {
        companyName,
        appName,
        logoUrl: logoUrl.trim() || undefined,
        faviconUrl: faviconUrl.trim() || undefined,
        primaryColor,
        secondaryColor,
        email,
        phone,
        address,
        website,
        termsUrl: termsUrl.trim() || undefined,
        privacyUrl: privacyUrl.trim() || undefined,
      });

      setSuccessMessage('Branding settings updated successfully! Dynamic styling applied.');
      await refreshBranding();
    } catch (err: unknown) {
      console.error('Failed to update branding settings:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update branding settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Palette className="w-7 h-7 text-indigo-600" />
            White-Label & Branding
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Customize platform company branding, primary accent color palette, logos, and public contact metadata
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 rounded flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-700 text-sm">Dismiss</button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-red-700 text-sm">Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-gray-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
          <p className="text-sm">Loading white-label configuration...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-5">
              <h2 className="text-base font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gray-600" />
                Company Identity
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Company Legal Name *
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Application / Brand Name *
                  </label>
                  <input
                    type="text"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Logo Image URL (SVG/PNG)
                  </label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.svg"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Favicon URL
                  </label>
                  <input
                    type="url"
                    value={faviconUrl}
                    onChange={(e) => setFaviconUrl(e.target.value)}
                    placeholder="https://example.com/favicon.ico"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <h2 className="text-base font-bold text-gray-900 border-b pb-2 pt-2 flex items-center gap-2">
                <Palette className="w-5 h-5 text-gray-600" />
                Color Palette & Theme
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Primary Brand Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 border border-gray-300 rounded cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 font-mono text-sm border border-gray-300 rounded-lg p-2.5 uppercase"
                      pattern="^#[0-9A-Fa-f]{6}$"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Secondary Accent Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-10 h-10 border border-gray-300 rounded cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-1 font-mono text-sm border border-gray-300 rounded-lg p-2.5 uppercase"
                      pattern="^#[0-9A-Fa-f]{6}$"
                    />
                  </div>
                </div>
              </div>

              <h2 className="text-base font-bold text-gray-900 border-b pb-2 pt-2 flex items-center gap-2">
                <Globe className="w-5 h-5 text-gray-600" />
                Contact & Regulatory Links
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Support Email *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Support Phone *
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Registered Office Address *
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Website URL *
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Terms of Service URL
                  </label>
                  <input
                    type="url"
                    value={termsUrl}
                    onChange={(e) => setTermsUrl(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Privacy Policy URL
                  </label>
                  <input
                    type="url"
                    value={privacyUrl}
                    onChange={(e) => setPrivacyUrl(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold text-sm rounded-lg shadow-sm transition"
                >
                  {saving ? 'Saving...' : 'Save Branding Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Live Preview Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Eye className="w-5 h-5 text-indigo-600" />
              Live Brand Preview
            </h3>

            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 space-y-3">
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded" />
                ) : (
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {appName.slice(0, 2).toUpperCase() || 'LA'}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{appName || 'App Name'}</h4>
                  <p className="text-xs text-gray-500">{companyName || 'Legal Entity'}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 space-y-2">
                <div className="text-xs text-gray-600">
                  <span className="font-semibold">Support:</span> {email || 'support@domain.com'}
                </div>
                <div className="text-xs text-gray-600">
                  <span className="font-semibold">Phone:</span> {phone || '+91 00000 00000'}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  className="w-full py-2 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                  style={{ backgroundColor: primaryColor }}
                >
                  Example Primary Button
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBrandingSettings;
