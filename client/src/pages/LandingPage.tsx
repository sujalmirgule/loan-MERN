import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Landmark, Shield, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Smartphone, MonitorCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';

interface HealthResponse {
  status: string;
  service: string;
  environment: string;
  timestamp: string;
  database: {
    status: string;
    type: string;
  };
}

export const LandingPage: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient<HealthResponse>(API_ENDPOINTS.HEALTH);
      setHealth(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to backend server';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white border-b border-border py-4 px-6 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">LOAN APPROVE</h1>
              <p className="text-xs text-muted-foreground font-medium">Production-Grade Fintech Platform</p>
            </div>
          </div>

          {/* Real-time Health status pill */}
          <div className="flex items-center space-x-2">
            {loading ? (
              <Badge variant="secondary" className="flex items-center space-x-1 py-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Checking API...</span>
              </Badge>
            ) : health?.status === 'ok' ? (
              <Badge variant="success" className="flex items-center space-x-1.5 py-1 px-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>API & Database Online</span>
              </Badge>
            ) : (
              <Badge variant="destructive" className="flex items-center space-x-1.5 py-1 px-3">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Backend Offline</span>
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Hero Content */}
      <main className="max-w-5xl mx-auto px-4 py-12 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-4 text-emerald-800 bg-emerald-50 border-emerald-200">
            Phase 1 Foundation Verified
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Reliable, Secure & Auditable Loan Lifecycle Management
          </h2>
          <p className="text-slate-600 text-base sm:text-lg">
            A production fintech engine built for real borrowers and administrators. Choose your portal below to enter.
          </p>
        </div>

        {/* Portal Entry Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full mb-12">
          {/* Customer Portal */}
          <Card className="hover:border-primary/50 hover:shadow-fintech-lg transition-all duration-200">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center mb-2">
                <Smartphone className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl">Customer Portal</CardTitle>
              <CardDescription>
                Mobile-first loan applications, KYC document upload, instant EMI calculations, digital agreements, and repayments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Passwordless Mobile Number authentication</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Live estimated EMI preview calculator</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Aadhaar privacy protection & masked display</span>
                </li>
              </ul>
              <Link to="/customer/login" className="block pt-2">
                <Button className="w-full flex items-center justify-center space-x-2">
                  <span>Enter Customer Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Admin Portal */}
          <Card className="hover:border-slate-400 hover:shadow-fintech-lg transition-all duration-200">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-slate-900 text-white flex items-center justify-center mb-2">
                <Shield className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl">Admin Console</CardTitle>
              <CardDescription>
                Comprehensive management of customers, multi-state loan reviews, offer adjustments, disbursements, Excel/PDF reports, and audit trail.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-slate-700 shrink-0" />
                  <span>Manual review, hold, reject & loan amount adjustments</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-slate-700 shrink-0" />
                  <span>Manual bank/UPI disbursement tracking</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-slate-700 shrink-0" />
                  <span>Immutable audit logs & customizable branding</span>
                </li>
              </ul>
              <Link to="/admin/login" className="block pt-2">
                <Button variant="outline" className="w-full flex items-center justify-center space-x-2 border-slate-300 hover:bg-slate-100">
                  <span>Enter Admin Console</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Backend Connectivity Status Box */}
        <div className="bg-white border border-border rounded-xl p-5 shadow-sm max-w-xl mx-auto w-full">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <MonitorCheck className="w-5 h-5 text-slate-700" />
              <h3 className="text-sm font-semibold text-slate-900">System Integration Check</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchHealth} disabled={loading} className="text-xs h-7 px-2">
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="text-xs text-slate-500 flex items-center space-x-2 py-2">
              <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
              <span>Connecting to Express REST server (/api/health)...</span>
            </div>
          ) : error ? (
            <div className="text-xs text-destructive bg-red-50 p-2.5 rounded-lg border border-red-200">
              <p className="font-semibold">Connection Error:</p>
              <p>{error}</p>
            </div>
          ) : health ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase">Service</span>
                <span className="font-semibold text-slate-800">{health.service}</span>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase">Status</span>
                <span className="font-semibold text-emerald-600 uppercase">{health.status}</span>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase">Database</span>
                <span className="font-semibold text-slate-800">{health.database?.type || 'SQLite'}</span>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase">Environment</span>
                <span className="font-semibold text-slate-800">{health.environment}</span>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-border py-4 px-6 text-center text-xs text-slate-500">
        <p>© 2026 Loan Approve. All financial data is encrypted and protected in accordance with regulatory standards.</p>
      </footer>
    </div>
  );
};
