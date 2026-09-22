import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { API_ENDPOINTS } from '../../api/endpoints';
import {
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  ShieldCheck,
} from 'lucide-react';

export const AdminWhatsAppSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form fields
  const [provider, setProvider] = useState('META_CLOUD');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [businessAccountId, setBusinessAccountId] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [hasExistingToken, setHasExistingToken] = useState(false);
  const [enabled, setEnabled] = useState(true);

  // Test State
  const [testNumber, setTestNumber] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  const fetchWhatsAppSettings = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.get(API_ENDPOINTS.SETTINGS.WHATSAPP_GET);
      const data = res.data?.data || res.data;
      if (data) {
        setProvider(data.provider || 'META_CLOUD');
        setPhoneNumber(data.phoneNumber || '');
        setPhoneNumberId(data.phoneNumberId || '');
        setBusinessAccountId(data.businessAccountId || '');
        setApiEndpoint(data.apiEndpoint || '');
        setEnabled(data.enabled ?? true);
        setHasExistingToken(Boolean(data.hasAccessToken));
      }
    } catch (err: unknown) {
      console.error('Failed to load WhatsApp settings:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load WhatsApp settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWhatsAppSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    setTestResult(null);

    try {
      await api.put(API_ENDPOINTS.SETTINGS.WHATSAPP_UPDATE, {
        provider,
        phoneNumber: phoneNumber.trim(),
        phoneNumberId: phoneNumberId.trim() || undefined,
        businessAccountId: businessAccountId.trim() || undefined,
        apiEndpoint: apiEndpoint.trim() || undefined,
        accessToken: accessToken.trim() || undefined,
        enabled,
      });

      setSuccessMessage('WhatsApp gateway configuration updated securely.');
      setAccessToken('');
      fetchWhatsAppSettings();
    } catch (err: unknown) {
      console.error('Failed to update WhatsApp settings:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update WhatsApp settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testNumber.trim()) return;

    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post(API_ENDPOINTS.SETTINGS.WHATSAPP_TEST, {
        toNumber: testNumber.trim(),
      });
      setTestResult(res.data?.data?.message || res.data?.message || 'Test message ping sent!');
    } catch (err: unknown) {
      setTestResult(`Error: ${err instanceof Error ? err.message : 'Failed to send test ping'}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-emerald-600" />
            WhatsApp Business Gateway
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure Meta Cloud API or aggregator webhook credentials for automated WhatsApp approval & payment alerts
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border-l-4 border-success text-emerald-800 rounded flex items-center justify-between">
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
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-2" />
          <p className="text-sm">Loading WhatsApp configuration...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main WhatsApp Form */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Provider Integration
                </h2>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  Enable WhatsApp Gateway
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    API Provider
                  </label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="META_CLOUD">Meta Cloud API (Official WhatsApp)</option>
                    <option value="TWILIO">Twilio for WhatsApp</option>
                    <option value="GUPSHUP">Gupshup Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Sender Phone Number (with Country Code) *
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+919876543210"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Phone Number ID (Meta)
                  </label>
                  <input
                    type="text"
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    placeholder="e.g. 109283746501928"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Business Account ID (WABA)
                  </label>
                  <input
                    type="text"
                    value={businessAccountId}
                    onChange={(e) => setBusinessAccountId(e.target.value)}
                    placeholder="e.g. 98172635481920"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  API Endpoint / Webhook URL
                </label>
                <input
                  type="url"
                  value={apiEndpoint}
                  onChange={(e) => setApiEndpoint(e.target.value)}
                  placeholder="https://graph.facebook.com/v18.0"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  System User Access Token / Secret Key {hasExistingToken ? '(Encrypted at rest)' : '*'}
                </label>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder={hasExistingToken ? '•••••••••••• (Leave blank to retain)' : 'Enter permanent system user token'}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  required={!hasExistingToken}
                />
              </div>

              <div className="pt-4 border-t flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-success text-background hover:brightness-110 disabled:bg-emerald-300 text-text-primary font-semibold text-sm rounded-lg shadow-sm transition"
                >
                  {saving ? 'Saving...' : 'Save WhatsApp Configuration'}
                </button>
              </div>
            </form>
          </div>

          {/* Test Ping Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-600" />
              Send Test WhatsApp Ping
            </h3>
            <p className="text-xs text-gray-500">
              Dispatch an instant diagnostic test message to verify your sender number and Meta access token.
            </p>

            <form onSubmit={handleSendTest} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Recipient Mobile Number
                </label>
                <input
                  type="text"
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                  placeholder="+919876543210"
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={testing || !testNumber}
                className="w-full py-2.5 bg-gray-900 hover:bg-black disabled:bg-gray-400 text-text-primary text-xs font-semibold rounded-lg shadow transition flex items-center justify-center gap-2"
              >
                {testing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Dispatching...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Dispatch Test Ping
                  </>
                )}
              </button>
            </form>

            {testResult && (
              <div
                className={`p-3.5 rounded-lg text-xs font-medium ${
                  testResult.startsWith('Error')
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : testResult.includes('Development') || testResult.includes('Not Delivered') || testResult.includes('Sandbox')
                    ? 'bg-amber-50 text-amber-900 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {testResult}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWhatsAppSettings;
