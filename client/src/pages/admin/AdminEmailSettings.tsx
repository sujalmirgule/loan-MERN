import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { API_ENDPOINTS } from '../../api/endpoints';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Lock,
} from 'lucide-react';

export const AdminEmailSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form fields
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [hasExistingPassword, setHasExistingPassword] = useState(false);
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [encryption, setEncryption] = useState('TLS');

  // Test Email
  const [testEmailTo, setTestEmailTo] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  const fetchEmailSettings = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.get(API_ENDPOINTS.SETTINGS.EMAIL_GET);
      const data = res.data?.data || res.data;
      if (data) {
        setSmtpHost(data.smtpHost || '');
        setSmtpPort(data.smtpPort || 587);
        setSmtpUsername(data.smtpUsername || '');
        setFromName(data.fromName || '');
        setFromEmail(data.fromEmail || '');
        setEncryption(data.encryption || 'TLS');
        setHasExistingPassword(Boolean(data.hasPassword));
      }
    } catch (err: unknown) {
      console.error('Failed to load email settings:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load email settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmailSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    setTestResult(null);

    try {
      await api.put(API_ENDPOINTS.SETTINGS.EMAIL_UPDATE, {
        smtpHost: smtpHost.trim(),
        smtpPort: Number(smtpPort),
        smtpUsername: smtpUsername.trim(),
        smtpPassword: smtpPassword.trim() || undefined,
        fromName: fromName.trim(),
        fromEmail: fromEmail.trim(),
        encryption,
      });

      setSuccessMessage('SMTP Email configuration saved securely.');
      setSmtpPassword('');
      fetchEmailSettings();
    } catch (err: unknown) {
      console.error('Failed to update email settings:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update email settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailTo.trim()) return;

    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post(API_ENDPOINTS.SETTINGS.EMAIL_TEST, {
        toEmail: testEmailTo.trim(),
      });
      setTestResult(res.data?.data?.message || res.data?.message || 'Test email dispatched!');
    } catch (err: unknown) {
      setTestResult(`Error: ${err instanceof Error ? err.message : 'Failed to send test email'}`);
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
            <Mail className="w-7 h-7 text-indigo-600" />
            SMTP & Email Delivery Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure transactional email delivery for loan notices, verification OTPs, and approval notifications
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
          <p className="text-sm">Loading email parameters...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main SMTP Form */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-5">
              <h2 className="text-base font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                <Lock className="w-5 h-5 text-gray-600" />
                SMTP Host & Authentication
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    SMTP Host *
                  </label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.sendgrid.net / smtp.mailgun.org"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Port *
                  </label>
                  <input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    SMTP Username *
                  </label>
                  <input
                    type="text"
                    value={smtpUsername}
                    onChange={(e) => setSmtpUsername(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    SMTP Password {hasExistingPassword ? '(Encrypted at rest)' : '*'}
                  </label>
                  <input
                    type="password"
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    placeholder={hasExistingPassword ? '•••••••••••• (Leave blank to retain)' : 'Enter password'}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    required={!hasExistingPassword}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Sender Name *
                  </label>
                  <input
                    type="text"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="e.g. Loan Approve Alerts"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    From Email Address *
                  </label>
                  <input
                    type="email"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    placeholder="no-reply@loanapprove.com"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Encryption
                  </label>
                  <select
                    value={encryption}
                    onChange={(e) => setEncryption(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="TLS">TLS (Recommended)</option>
                    <option value="SSL">SSL</option>
                    <option value="NONE">None</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold text-sm rounded-lg shadow-sm transition"
                >
                  {saving ? 'Saving...' : 'Save Email Settings'}
                </button>
              </div>
            </form>
          </div>

          {/* Test Dispatch Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-indigo-600" />
              Send Test Email
            </h3>
            <p className="text-xs text-gray-500">
              Verify server-side SMTP configuration by dispatching a test email to your inbox.
            </p>

            <form onSubmit={handleSendTest} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={testEmailTo}
                  onChange={(e) => setTestEmailTo(e.target.value)}
                  placeholder="admin@yourdomain.com"
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={testing || !testEmailTo}
                className="w-full py-2.5 bg-gray-900 hover:bg-black disabled:bg-gray-400 text-white text-xs font-semibold rounded-lg shadow transition flex items-center justify-center gap-2"
              >
                {testing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Test Email
                  </>
                )}
              </button>
            </form>

            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs font-medium ${
                  testResult.startsWith('Error')
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
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

export default AdminEmailSettings;
