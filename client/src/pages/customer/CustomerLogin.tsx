import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Smartphone,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Landmark,
  ShieldCheck,
  Lock,
  ArrowLeft,
  CheckCircle2,
  FileText,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { useBrandTitle } from '@/hooks/useBrandTitle';
import { ApiError } from '@/api/client';

export const CustomerLogin: React.FC = () => {
  const { branding } = useBranding();
  useBrandTitle('Sign In');
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const { loginCustomer } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const signupSuccess = (location.state as { signupSuccess?: boolean; mobile?: string } | null)?.signupSuccess;
  const prefillMobile = (location.state as { signupSuccess?: boolean; mobile?: string } | null)?.mobile || '';

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobile(raw);
    if (error) setError(null);
  };

  // Pre-fill mobile if passed from registration
  useEffect(() => {
    if (prefillMobile) setMobile(prefillMobile);
  }, [prefillMobile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!/^[6-9]/.test(mobile)) {
      setError('Mobile number must start with 6, 7, 8, or 9.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await loginCustomer(mobile);
      navigate('/customer/dashboard', { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setError('No customer account found with this number. Please register below.');
        } else {
          setError(err.message || 'Login failed. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="theme-customer min-h-screen bg-[#F7FAFF] flex flex-col lg:flex-row antialiased">
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* LEFT SECTION: Modern Fintech Visual Branding (Desktop Only)            */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-7/12 bg-gradient-to-br from-[#EFF6FF] via-[#DBEAFE] to-[#EFF6FF] border-r border-[#D6E4F5] flex-col justify-between p-12 xl:p-16 relative overflow-hidden">
        {/* Subtle decorative background circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#2563EB]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#1D4ED8]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center space-x-3">
          {branding.logoUrl && !logoError ? (
            <img
              src={branding.logoUrl}
              alt={branding.appName || 'Logo'}
              onError={() => setLogoError(true)}
              className="w-11 h-11 rounded-xl object-contain bg-white border border-[#D6E4F5] p-1 shadow-sm"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Landmark className="w-6 h-6" />
            </div>
          )}
          <div>
            <span className="font-extrabold text-xl tracking-tight text-[#0F172A] block">
              {branding.appName || branding.companyName || 'Loan Finance'}
            </span>
            <span className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wider">
              Customer Lending Portal
            </span>
          </div>
        </div>

        {/* Center Visual: Abstract Fintech Card & Benefits */}
        <div className="relative z-10 my-auto space-y-10 py-8 max-w-lg">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#D6E4F5] text-xs font-bold text-[#2563EB] shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
              Smart Digital Lending
            </span>
            <h2 className="text-3xl xl:text-4xl font-black tracking-tight text-[#0F172A] leading-tight">
              Financial support made simple, transparent, and immediate.
            </h2>
            <p className="text-sm text-[#64748B] leading-relaxed">
              Track your loan application journey, upload verification documents at each stage, and access official sanction letters directly from your portal.
            </p>
          </div>

          {/* Abstract Fintech Card Preview */}
          <div className="relative rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#1D4ED8] text-white p-6 shadow-2xl shadow-blue-900/20 border border-slate-700/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium text-slate-400">APPLICATION PASS</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ACTIVE PORTAL
              </span>
            </div>

            <div className="mt-6 mb-4">
              <span className="text-xs text-slate-400 font-medium">Eligible Loan Limit</span>
              <p className="text-3xl font-black font-mono tracking-tight text-white mt-0.5">₹5,00,000</p>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300 pt-3 border-t border-slate-700/60 font-mono">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-[#60A5FA]" />
                <span>•••• •••• •••• 8842</span>
              </div>
              <span className="text-emerald-400 font-semibold">STAGE-GATED REVIEW</span>
            </div>
          </div>

          {/* Factual Value Props */}
          <div className="grid grid-cols-1 gap-4 pt-2">
            <div className="flex items-start space-x-3.5">
              <div className="p-2 rounded-xl bg-white border border-[#D6E4F5] text-[#2563EB] shrink-0 shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0F172A]">Secure Access</h4>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Instant passwordless verification linked directly to your verified mobile number.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5">
              <div className="p-2 rounded-xl bg-white border border-[#D6E4F5] text-[#2563EB] shrink-0 shadow-xs">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0F172A]">Loan Documents Section</h4>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Manage PAN, bank statements, sanction letters, and loan agreements in one place.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5">
              <div className="p-2 rounded-xl bg-white border border-[#D6E4F5] text-[#2563EB] shrink-0 shadow-xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0F172A]">Simple Process</h4>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Real-time underwriter review, digital agreement signing, and verified payment invoices.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Left Footer */}
        <div className="relative z-10 text-xs text-[#64748B] flex items-center justify-between border-t border-[#D6E4F5]/80 pt-4">
          <span>© {new Date().getFullYear()} {branding.companyName || branding.appName || 'Loan Finance'}</span>
          <span>Encrypted Financial Platform</span>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* RIGHT SECTION: Login Interaction Card                                    */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 xl:w-5/12 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16">
        {/* Top Navigation */}
        <header className="flex items-center justify-between pb-6 sm:pb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Homepage
          </Link>
          <Link
            to="/customer/register"
            className="text-xs font-bold text-[#2563EB] hover:text-[#1D4ED8] transition"
          >
            New Application →
          </Link>
        </header>

        {/* Main Form Container */}
        <main className="max-w-md w-full mx-auto my-auto space-y-6">
          <Card className="bg-white border border-[#D6E4F5] rounded-[20px] shadow-xl shadow-blue-900/5 p-7 sm:p-9 space-y-6">
            {/* Header with Logo */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                {branding.logoUrl && !logoError ? (
                  <img
                    src={branding.logoUrl}
                    alt={branding.appName || 'Logo'}
                    onError={() => setLogoError(true)}
                    className="w-12 h-12 rounded-xl object-contain border border-[#D6E4F5] p-1 shadow-xs"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                    <Landmark className="w-6 h-6" />
                  </div>
                )}
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EFF6FF] border border-[#D6E4F5] text-[11px] font-bold text-[#2563EB]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" /> Customer Portal
                </span>
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight">
                  Welcome to {branding.appName || 'Loan Finance'}
                </h1>
                <p className="text-xs font-semibold text-[#2563EB] mt-0.5">Welcome back</p>
                <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                  Enter your registered mobile number to access your customer dashboard, active loans, and payment invoices.
                </p>
              </div>
            </div>

            {/* Signup Success Banner */}
            {signupSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start space-x-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed">
                  Account created successfully! Please enter your registered mobile number below to sign in.
                </span>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start space-x-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="mobile-input" className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Mobile Number
                </Label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-sm text-[#0F172A] font-bold select-none border-r border-[#D6E4F5] pr-3 h-6">
                    <Smartphone className="w-4 h-4 text-[#2563EB]" />
                    <span>+91</span>
                  </div>
                  <Input
                    id="mobile-input"
                    type="tel"
                    placeholder="XXXXX XXXXX"
                    value={mobile}
                    onChange={handleMobileChange}
                    className="pl-24 h-12 text-base font-mono tracking-wider font-semibold bg-[#F7FAFF] border-[#D6E4F5] text-[#0F172A] rounded-xl focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 transition shadow-inner"
                    maxLength={10}
                    autoFocus
                    required
                  />
                </div>
                <p className="text-[11px] text-[#64748B] leading-relaxed">
                  Passwordless authentication. Instant verified access.
                </p>
              </div>

              <Button
                type="submit"
                disabled={mobile.length !== 10 || isSubmitting}
                className="w-full h-12 text-sm font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Signing in to Portal...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Navigation Links */}
            <div className="pt-3 border-t border-[#D6E4F5] text-center space-y-2">
              <p className="text-xs text-[#64748B]">
                Don&apos;t have an account?{' '}
                <Link to="/customer/register" className="font-bold text-[#2563EB] hover:underline">
                  Create Account
                </Link>
              </p>
              <p className="text-[11px] text-[#94A3B8]">
                Are you a credit administrator?{' '}
                <Link to="/admin/login" className="text-[#64748B] font-semibold hover:text-[#0F172A] underline">
                  Admin Console
                </Link>
              </p>
            </div>
          </Card>

          {/* Factual Trust Badges */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 rounded-xl bg-white border border-[#D6E4F5] shadow-xs flex flex-col items-center gap-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
              <span className="text-[10px] font-bold text-[#0F172A]">256-bit SSL</span>
              <span className="text-[9px] text-[#64748B]">Bank-Grade Security</span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-[#D6E4F5] shadow-xs flex flex-col items-center gap-0.5">
              <Lock className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="text-[10px] font-bold text-[#0F172A]">Encrypted Data</span>
              <span className="text-[9px] text-[#64748B]">Secure Storage</span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-[#D6E4F5] shadow-xs flex flex-col items-center gap-0.5">
              <Smartphone className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="text-[10px] font-bold text-[#0F172A]">Instant Access</span>
              <span className="text-[9px] text-[#64748B]">Live Portal Status</span>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="pt-6 text-center text-[11px] text-[#64748B]">
          <p>© {new Date().getFullYear()} {branding.companyName || branding.appName || 'Loan Finance'}. All financial records are protected.</p>
        </footer>
      </div>
    </div>
  );
};

export default CustomerLogin;
