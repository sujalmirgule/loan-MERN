import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  FileText,
  Menu,
  ChevronDown,
  ChevronUp,
  X,
  Banknote,
  Clock,
  Users,
  MapPin,
  Phone,
  Mail,
  Info,
  AlertTriangle,
  Building2,
  CreditCard,
  TrendingUp,
  Smartphone,
  ClipboardCheck,
  Search,
  UserCheck,
  Headphones,
  FileCheck,
  FileSignature
} from 'lucide-react';
import { useBranding } from '@/contexts/BrandingContext';
import { useBrandTitle } from '@/hooks/useBrandTitle';
import { CustomerRegisterForm } from '@/components/customer/CustomerRegisterForm';

// ─── Utility ─────────────────────────────────────────────────────────────────
function formatCurrency(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function calcEmi(principal: number, annualRate: number, tenureMonths: number): number {
  if (annualRate === 0 || tenureMonths === 0) return principal / (tenureMonths || 1);
  const r = annualRate / 100 / 12;
  const n = tenureMonths;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

// ─── Default FAQ content ──────────────────────────────────────────────────────
const DEFAULT_FAQS = [
  { question: 'What documents do I need to apply?', answer: 'You typically need identity proof (Aadhaar / PAN), address proof, bank statements, income proof (salary slips or ITR), and a completed application form. Specific requirements depend on your applicant profile and the loan type.' },
  { question: 'Who is eligible to apply?', answer: 'Indian residents with a regular income source and a valid bank account may apply. Exact eligibility is determined during the application assessment process based on configured criteria.' },
  { question: 'How much can I apply for?', answer: 'Loan amounts are subject to configured limits and individual assessment. The displayed range on this page reflects the currently configured parameters.' },
  { question: 'What is the repayment tenure?', answer: 'Repayment tenure range is displayed in the Loan Information section. Actual tenure for your loan will be determined based on the approved application terms.' },
  { question: 'How is the interest rate determined?', answer: 'Interest rates are determined by the applicable lender based on your credit profile, repayment capacity, loan amount, and tenure. The displayed APR range is indicative only.' },
  { question: 'Is loan approval guaranteed after applying?', answer: 'No. Submission of an application does not guarantee approval. Applications are assessed individually based on eligibility, documentation, credit history, and applicable lender policies.' },
  { question: 'How long does application review take?', answer: 'Review timelines depend on the completeness of your application and documentation, and the applicable lender\'s processing policy. You can track your application status in your dashboard.' },
  { question: 'What happens after I submit my application?', answer: 'After submission, your application enters a review queue. You may be asked to submit additional documents. The final decision (approval or rejection) is communicated through your dashboard and registered contact details.' },
  { question: 'How do I upload documents?', answer: 'After logging in, navigate to your dashboard and access the KYC / Document Upload section. You can upload PDF, JPG, JPEG, and PNG files for each required document type.' },
  { question: 'How can I track my application?', answer: 'Log in with your registered mobile number and navigate to the Applications section in your customer dashboard. Your application ID, status, and last update are visible there.' },
  { question: 'How can I contact support?', answer: 'You can reach our support team through the contact details displayed in the Contact section of this page, or submit a support ticket through your customer dashboard.' },
  { question: 'What happens if additional documents are required?', answer: 'If additional documents are required, you will receive a notification and a document request will appear in your dashboard. You can upload the requested documents directly from there.' },
];

// ─── Default Document Checklist ───────────────────────────────────────────────
const DEFAULT_DOCUMENTS = [
  { id: 'application_form', name: 'Completed Application Form', description: 'The duly filled and submitted loan application form.', icon: 'ClipboardCheck', enabled: true, mandatory: true },
  { id: 'photograph', name: 'Passport-Sized Photograph', description: 'Recent passport-size photograph of the applicant.', icon: 'Users', enabled: true, mandatory: true },
  { id: 'identity_proof', name: 'Identity Proof', description: 'Aadhaar Card, PAN Card, Passport, Voter ID, or Driving Licence.', icon: 'UserCheck', enabled: true, mandatory: true },
  { id: 'address_proof', name: 'Address Proof', description: 'Utility bill, Aadhaar, Voter ID, Passport, or Rent Agreement.', icon: 'MapPin', enabled: true, mandatory: true },
  { id: 'business_proof', name: 'Business Registration Proof', description: 'GST Certificate, MSME Certificate, Trade Licence, or Partnership Deed (if applicable).', icon: 'Building2', enabled: true, mandatory: false },
  { id: 'bank_statement', name: 'Bank Statements', description: 'Last 3–6 months bank account statements showing income credits.', icon: 'Banknote', enabled: true, mandatory: true },
  { id: 'income_proof', name: 'Income Proof / Balance Sheets', description: 'Salary slips, ITR, Form 16, or audited balance sheets for self-employed.', icon: 'TrendingUp', enabled: true, mandatory: true },
];

type IconKey = 'ClipboardCheck' | 'Users' | 'UserCheck' | 'MapPin' | 'Building2' | 'Banknote' | 'TrendingUp' | 'FileText' | 'CreditCard';
const ICON_MAP: Record<IconKey, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  ClipboardCheck, Users, UserCheck, MapPin, Building2, Banknote, TrendingUp, FileText, CreditCard,
};

// ─── Check Eligibility Modal ───────────────────────────────────────────────────
interface EligibilityModalProps {
  eligibility: { minAge: number; maxAge: number; minMonthlyIncome: number; bankAccountRequired: boolean; employmentCriteria: string };
  onClose: () => void;
  onApply: () => void;
}

const EligibilityModal: React.FC<EligibilityModalProps> = ({ onClose, eligibility, onApply }) => {
  const [age, setAge] = useState('');
  const [income, setIncome] = useState('');
  const [hasBank, setHasBank] = useState('yes');
  const [result, setResult] = useState<'pass' | 'fail' | null>(null);

  const check = () => {
    const a = parseInt(age);
    const inc = parseFloat(income);
    const ageOk = !isNaN(a) && a >= eligibility.minAge && a <= eligibility.maxAge;
    const incomeOk = !isNaN(inc) && inc >= eligibility.minMonthlyIncome;
    const bankOk = !eligibility.bankAccountRequired || hasBank === 'yes';
    setResult(ageOk && incomeOk && bankOk ? 'pass' : 'fail');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white border border-[#D9E6F2] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D9E6F2] bg-[#F7FAFC]">
          <h3 className="font-bold text-[#0B1F3A] flex items-center gap-2 text-base">
            <Search className="w-5 h-5 text-[#2563EB]" /> Check Eligibility
          </h3>
          <button id="eligibility-modal-close" onClick={onClose} className="p-1 text-[#52657A] hover:text-[#0B1F3A] hover:bg-[#EAF4FF] rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-xs bg-[#EAF4FF] border border-[#CBDDE9] rounded-xl p-3 text-[#123B66] leading-relaxed">
            This is a preliminary self-assessment only. Final eligibility is determined during full underwriting review.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="eligibility-age" className="text-xs font-semibold text-[#52657A] block mb-1.5">Age (years)</label>
              <input
                type="number"
                id="eligibility-age"
                value={age}
                onChange={e => setAge(e.target.value)}
                placeholder={`${eligibility.minAge}–${eligibility.maxAge}`}
                className="w-full h-10 px-3 rounded-xl border border-[#CBDDE9] bg-white text-sm text-[#0B1F3A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label htmlFor="eligibility-income" className="text-xs font-semibold text-[#52657A] block mb-1.5">Monthly Income (₹)</label>
              <input
                type="number"
                id="eligibility-income"
                value={income}
                onChange={e => setIncome(e.target.value)}
                placeholder={`Min ₹${eligibility.minMonthlyIncome.toLocaleString('en-IN')}`}
                className="w-full h-10 px-3 rounded-xl border border-[#CBDDE9] bg-white text-sm text-[#0B1F3A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              />
            </div>
          </div>

          {eligibility.bankAccountRequired && (
            <div>
              <label htmlFor="eligibility-bank" className="text-xs font-semibold text-[#52657A] block mb-1.5">Active Bank Account?</label>
              <select
                id="eligibility-bank"
                value={hasBank}
                onChange={e => setHasBank(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#CBDDE9] bg-white text-sm text-[#0B1F3A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              >
                <option value="yes">Yes — I have an active bank account</option>
                <option value="no">No</option>
              </select>
            </div>
          )}

          {result === 'pass' && (
            <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4 space-y-2">
              <p className="font-bold text-[#166534] text-sm flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#16a34a]" /> Preliminary Check Passed
              </p>
              <p className="text-xs text-[#15803d] leading-relaxed">
                Based on the information provided, you may meet the initial criteria. Final approval is subject to document verification and applicable lender policies.
              </p>
              <button
                id="eligibility-proceed-apply"
                onClick={onApply}
                className="mt-2 w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold text-sm py-2.5 px-4 rounded-xl shadow-md transition"
              >
                Proceed to Apply →
              </button>
            </div>
          )}

          {result === 'fail' && (
            <div className="bg-[#fffbeb] border border-[#fde68a] rounded-xl p-4 space-y-1">
              <p className="font-bold text-[#92400e] text-sm flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-[#d97706]" /> Some Criteria May Not Be Met
              </p>
              <p className="text-xs text-[#b45309] leading-relaxed">
                One or more criteria may not be satisfied. You may still apply — applications are assessed individually by underwriters.
              </p>
            </div>
          )}

          <button
            id="eligibility-check-btn"
            onClick={check}
            className="w-full bg-[#0B1F3A] hover:bg-[#123B66] text-white font-semibold text-sm py-3 px-4 rounded-xl shadow-md transition"
          >
            Check My Eligibility
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Landing Page ────────────────────────────────────────────────────────
export const LandingPage: React.FC = () => {
  const { branding } = useBranding();
  useBrandTitle(branding.appName || 'Simple, Transparent Digital Loans');
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [eligibilityModalOpen, setEligibilityModalOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const fin = branding?.financial || {
    minLoanAmount: 10000,
    maxLoanAmount: 3000000,
    minTenureMonths: 6,
    maxTenureMonths: 84,
    minApr: 12.0,
    maxApr: 36.0,
    processingFeePolicy: 'Processing fee applicable as per loan terms.',
    otherChargesPolicy: 'Late payment charges as per agreement.',
  };
  const elig = branding?.eligibility || {
    minAge: 18,
    maxAge: 60,
    minMonthlyIncome: 15000,
    creditScoreCriteria: 'Good credit history preferred.',
    bankAccountRequired: true,
    employmentCriteria: 'Salaried or Self-Employed',
    residentialStatusCriteria: 'Indian Resident',
  };

  // EMI Calculator State (Dynamic from Config)
  const [emiAmount, setEmiAmount] = useState<number>(() => Math.min(Math.max(250000, fin.minLoanAmount || 10000), fin.maxLoanAmount || 3000000));
  const [emiRate, setEmiRate] = useState<number>(() => Math.min(Math.max(12, fin.minApr || 12), fin.maxApr || 36));
  const [emiTenure, setEmiTenure] = useState<number>(() => Math.min(Math.max(36, fin.minTenureMonths || 6), fin.maxTenureMonths || 84));

  const emiResult = useMemo(() => {
    const monthly = calcEmi(emiAmount, emiRate, emiTenure);
    const total = monthly * emiTenure;
    const interest = total - emiAmount;
    return { monthly, total, interest: Math.max(0, interest) };
  }, [emiAmount, emiRate, emiTenure]);

  const docList = useMemo(() => {
    const configured = (branding?.documents || []).filter(d => d.enabled);
    return configured.length > 0 ? configured : DEFAULT_DOCUMENTS;
  }, [branding?.documents]);

  const faqList = useMemo(() => {
    return (branding?.faqs && branding.faqs.length > 0) ? branding.faqs : DEFAULT_FAQS;
  }, [branding?.faqs]);

  return (
    <div className="min-h-screen bg-[#F7FAFC] text-[#0B1F3A] font-sans antialiased selection:bg-[#EAF4FF] selection:text-[#2563EB]">
      {/* ── 1. HEADER / NAVIGATION ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#D9E6F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <Link to="/" className="flex items-center gap-3 group">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.appName || 'Logo'} className="h-10 w-auto object-contain" />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0B1F3A] to-[#123B66] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6 text-[#EAF4FF]" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-extrabold text-lg sm:text-xl text-[#0B1F3A] tracking-tight leading-tight">
                {branding.appName || branding.companyName || 'Loan Approve'}
              </span>
              <span className="text-[11px] font-medium text-[#52657A] tracking-wider uppercase">
                Digital Lending Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-7 text-sm font-medium text-[#52657A]">
            <a href="#features" className="hover:text-[#2563EB] transition">Features</a>
            <a href="#how-it-works" className="hover:text-[#2563EB] transition">Process</a>
            <a href="#calculator" className="hover:text-[#2563EB] transition">Calculator</a>
            <a href="#eligibility" className="hover:text-[#2563EB] transition">Eligibility</a>
            <a href="#apply" className="hover:text-[#2563EB] transition">Apply</a>
            <a href="#documents" className="hover:text-[#2563EB] transition">Documents</a>
            <a href="#financial-info" className="hover:text-[#2563EB] transition">Terms</a>
            <a href="#faq" className="hover:text-[#2563EB] transition">FAQ</a>
            <a href="#contact" className="hover:text-[#2563EB] transition">Contact</a>
          </nav>

          {/* Header Action Buttons */}
          <div className="hidden sm:flex items-center space-x-3">
            <Link
              to="/customer/login"
              className="px-4 py-2.5 text-sm font-semibold text-[#0B1F3A] hover:text-[#2563EB] hover:bg-[#EAF4FF] rounded-xl transition"
            >
              Login
            </Link>
            <Link
              to="/customer/register"
              className="px-5 py-2.5 text-sm font-semibold bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl shadow-md shadow-blue-500/10 hover:shadow-lg transition active:scale-95"
            >
              Apply Now
            </Link>
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex lg:hidden items-center space-x-2">
            <Link
              to="/customer/login"
              className="px-3 py-2 text-xs font-semibold text-[#0B1F3A] bg-[#EAF4FF] rounded-lg"
            >
              Login
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#0B1F3A] hover:bg-[#EAF4FF] rounded-xl transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-[#D9E6F2] px-6 py-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-2 text-sm font-medium text-[#52657A]">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="p-2 hover:text-[#2563EB]">Features</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="p-2 hover:text-[#2563EB]">Process</a>
              <a href="#calculator" onClick={() => setMobileMenuOpen(false)} className="p-2 hover:text-[#2563EB]">Calculator</a>
              <a href="#eligibility" onClick={() => setMobileMenuOpen(false)} className="p-2 hover:text-[#2563EB]">Eligibility</a>
              <a href="#apply" onClick={() => setMobileMenuOpen(false)} className="p-2 hover:text-[#2563EB]">Apply</a>
              <a href="#documents" onClick={() => setMobileMenuOpen(false)} className="p-2 hover:text-[#2563EB]">Documents</a>
              <a href="#financial-info" onClick={() => setMobileMenuOpen(false)} className="p-2 hover:text-[#2563EB]">Terms</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="p-2 hover:text-[#2563EB]">FAQ</a>
              <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="p-2 hover:text-[#2563EB]">Contact</a>
            </div>
            <div className="pt-3 border-t border-[#D9E6F2] flex flex-col gap-2">
              <Link
                to="/customer/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-3 bg-[#2563EB] text-white font-semibold text-sm rounded-xl shadow-md"
              >
                Apply for a Loan Now
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── 2. HERO SECTION — PREMIUM FINTECH REDESIGN ────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-[#F7FAFC] to-[#EAF4FF]/40 pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-[#D9E6F2]">
        {/* Subtle background ambient glow & grid pattern */}
        <div className="absolute inset-0 fintech-grid-pattern pointer-events-none opacity-60" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#EAF4FF] rounded-full filter blur-3xl opacity-70 pointer-events-none" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-[#DCEEFF] rounded-full filter blur-3xl opacity-50 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Trust Eyebrow Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EAF4FF] border border-[#CBDDE9] text-xs font-semibold text-[#123B66] shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse" />
                <span>Simple • Transparent • Digital</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#0B1F3A] leading-[1.12]">
                Financial Support,{' '}
                <span className="text-[#2563EB] block sm:inline">Made Simple.</span>
              </h1>

              {/* Sub-headline / Description */}
              <p className="text-base sm:text-lg text-[#52657A] max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                {branding.hero?.subheadline ||
                  'Apply online, complete seamless document verification, and track your application journey in real time with transparent terms and dedicated borrower support.'}
              </p>

              {/* Hero Call-to-Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  id="hero-check-eligibility-btn"
                  onClick={() => setEligibilityModalOpen(true)}
                  className="w-full sm:w-auto px-7 py-3.5 bg-[#0B1F3A] hover:bg-[#123B66] text-white font-bold text-sm rounded-xl shadow-lg shadow-slate-900/10 hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
                >
                  <Search className="w-4 h-4 text-[#EAF4FF]" />
                  <span>Check Eligibility</span>
                </button>

                <Link
                  to="/customer/register"
                  id="hero-apply-btn"
                  className="w-full sm:w-auto px-7 py-3.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
                >
                  <span>Apply for a Loan</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Micro Trust Indicators */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-[#52657A] font-medium">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                  <span>100% Digital Flow</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                  <span>No Hidden Charges</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                  <span>Encrypted Data Protection</span>
                </div>
              </div>
            </div>

            {/* Right Hero Visual — Premium Financial Application Card */}
            <div className="lg:col-span-5 relative flex justify-center">
              {/* Outer Decorative Glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#2563EB]/20 to-[#0B1F3A]/10 rounded-3xl filter blur-2xl transform rotate-1 scale-95 pointer-events-none" />

              {/* Main Financial Card */}
              <div className="relative w-full max-w-md bg-gradient-to-br from-[#0B1F3A] via-[#0B1F3A] to-[#123B66] text-white rounded-3xl p-7 border border-[#224570] shadow-2xl space-y-6">
                {/* Header Strip */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#2563EB]/30 border border-[#2563EB]/40 flex items-center justify-center text-[#EAF4FF]">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white tracking-wide">Application Preview</p>
                      <p className="text-[11px] text-[#94A3B8]">Personal Loan Category</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#F59E0B]/20 border border-[#F59E0B]/40 text-[#F59E0B] text-[10px] font-bold uppercase tracking-wider">
                    Under Review
                  </span>
                </div>

                {/* Amount Highlight */}
                <div className="space-y-1">
                  <span className="text-xs text-[#94A3B8] uppercase tracking-wider font-semibold">Requested Amount</span>
                  <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono">
                    ₹2,50,000
                  </div>
                </div>

                {/* 3-Column Metrics */}
                <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <div>
                    <span className="text-[10px] text-[#94A3B8] block">Est. EMI</span>
                    <span className="text-sm font-bold text-[#EAF4FF] font-mono">₹8,304/mo</span>
                  </div>
                  <div className="border-x border-white/10">
                    <span className="text-[10px] text-[#94A3B8] block">Tenure</span>
                    <span className="text-sm font-bold text-white">36 Months</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#94A3B8] block">APR</span>
                    <span className="text-sm font-bold text-[#16A34A] font-mono">{fin.minApr}% p.a.</span>
                  </div>
                </div>

                {/* Application Steps Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-[#94A3B8]">
                    <span>Verification Progress</span>
                    <span className="text-[#EAF4FF] font-bold">Step 3 of 4</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="w-3/4 h-full bg-[#2563EB] rounded-full" />
                  </div>
                </div>

                {/* Card CTA */}
                <button
                  onClick={() => setEligibilityModalOpen(true)}
                  className="w-full py-3 bg-white hover:bg-[#EAF4FF] text-[#0B1F3A] font-bold text-xs rounded-xl shadow transition"
                >
                  Estimate Your Loan Terms →
                </button>
              </div>

              {/* Floating Pill Badges */}
              <div className="hidden sm:flex absolute -top-4 -left-6 bg-white border border-[#D9E6F2] rounded-2xl py-2 px-3.5 shadow-lg items-center gap-2 text-xs font-bold text-[#0B1F3A] animate-bounce duration-1000">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                <span>Secure KYC Verification</span>
              </div>

              <div className="hidden sm:flex absolute -bottom-4 -right-4 bg-white border border-[#D9E6F2] rounded-2xl py-2 px-3.5 shadow-lg items-center gap-2 text-xs font-bold text-[#0B1F3A]">
                <FileSignature className="w-4 h-4 text-[#2563EB]" />
                <span>Digital Agreement Signing</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. TRUST STRIP ────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-[#D9E6F2] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-bold text-[#52657A] uppercase tracking-wider mb-6">
            Built for a simple, transparent borrowing experience
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#F7FAFC] border border-[#D9E6F2] flex items-center gap-3.5 hover:border-[#2563EB]/40 transition">
              <div className="w-10 h-10 rounded-xl bg-[#EAF4FF] text-[#2563EB] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0B1F3A]">Secure Application</h4>
                <p className="text-[11px] text-[#52657A]">End-to-end encrypted</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F7FAFC] border border-[#D9E6F2] flex items-center gap-3.5 hover:border-[#2563EB]/40 transition">
              <div className="w-10 h-10 rounded-xl bg-[#EAF4FF] text-[#2563EB] flex items-center justify-center shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0B1F3A]">Transparent Process</h4>
                <p className="text-[11px] text-[#52657A]">Clear disclosure policies</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F7FAFC] border border-[#D9E6F2] flex items-center gap-3.5 hover:border-[#2563EB]/40 transition">
              <div className="w-10 h-10 rounded-xl bg-[#EAF4FF] text-[#2563EB] flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0B1F3A]">Document Verification</h4>
                <p className="text-[11px] text-[#52657A]">Compliant KYC desk</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F7FAFC] border border-[#D9E6F2] flex items-center gap-3.5 hover:border-[#2563EB]/40 transition">
              <div className="w-10 h-10 rounded-xl bg-[#EAF4FF] text-[#2563EB] flex items-center justify-center shrink-0">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0B1F3A]">Dedicated Support</h4>
                <p className="text-[11px] text-[#52657A]">Assistance throughout</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. START YOUR LOAN APPLICATION (INLINE APPLICATION SECTION) ─────── */}
      <section id="apply" className="py-20 lg:py-24 bg-[#F4F9FF] border-b border-[#D9E6F2]">
        <div id="signup" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Heading */}
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
            <span className="text-xs font-bold text-[#2563EB] uppercase tracking-wider bg-white px-4 py-1.5 rounded-full border border-[#CBDDE9] inline-flex items-center gap-1.5 shadow-sm">
              <UserCheck className="w-3.5 h-3.5 text-[#2563EB]" /> Get Started Today
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0B1F3A] tracking-tight uppercase">
              Start Your Loan Application
            </h2>
            <p className="text-sm sm:text-base text-[#52657A] leading-relaxed">
              Complete your details in a few simple steps.
            </p>
          </div>

          {/* Embedded Registration Form Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-[#D9E6F2] p-6 sm:p-10 lg:p-12 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#2563EB] via-[#60A5FA] to-[#123B66]" />
            <CustomerRegisterForm isEmbedded={true} onSuccessRedirect="/customer/dashboard" />
          </div>

          {/* Value Props & Guarantees */}
          <div className="mt-8 text-center text-xs text-[#52657A] flex flex-wrap items-center justify-center gap-6">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> 256-Bit SSL Encrypted
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> Zero Upfront Application Fees
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> Real-Time Application Tracking
            </span>
          </div>
        </div>
      </section>

      {/* ── 5. FEATURES SECTION — "EVERYTHING YOU NEED, IN ONE PLACE" ──────── */}
      <section id="features" className="py-20 bg-[#F7FAFC] border-b border-[#D9E6F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-[#2563EB] uppercase tracking-wider bg-[#EAF4FF] px-3 py-1 rounded-full border border-[#CBDDE9]">
              Platform Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1F3A] tracking-tight">
              Everything You Need, In One Place
            </h2>
            <p className="text-sm sm:text-base text-[#52657A]">
              Designed to simplify borrowing from your first application step through final loan closure.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature Card 1 */}
            <div className="p-7 rounded-3xl bg-white border border-[#D9E6F2] hover:border-[#2563EB]/50 hover:shadow-xl hover:shadow-blue-500/5 transition duration-300 space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-[#EAF4FF] text-[#2563EB] flex items-center justify-center group-hover:scale-110 transition-transform">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0B1F3A]">Easy Application</h3>
              <p className="text-sm text-[#52657A] leading-relaxed">
                Apply digitally in minutes without unnecessary paperwork or complex physical branch visits.
              </p>
            </div>

            {/* Feature Card 2 */}
            <div className="p-7 rounded-3xl bg-white border border-[#D9E6F2] hover:border-[#2563EB]/50 hover:shadow-xl hover:shadow-blue-500/5 transition duration-300 space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-[#EAF4FF] text-[#2563EB] flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0B1F3A]">Secure KYC</h3>
              <p className="text-sm text-[#52657A] leading-relaxed">
                Upload and track your identity verification documents securely with versioning and status tracking.
              </p>
            </div>

            {/* Feature Card 3 */}
            <div className="p-7 rounded-3xl bg-white border border-[#D9E6F2] hover:border-[#2563EB]/50 hover:shadow-xl hover:shadow-blue-500/5 transition duration-300 space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-[#EAF4FF] text-[#2563EB] flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0B1F3A]">Transparent Charges</h3>
              <p className="text-sm text-[#52657A] leading-relaxed">
                Review any applicable processing or verification fees upfront with full invoice clarity.
              </p>
            </div>

            {/* Feature Card 4 */}
            <div className="p-7 rounded-3xl bg-white border border-[#D9E6F2] hover:border-[#2563EB]/50 hover:shadow-xl hover:shadow-blue-500/5 transition duration-300 space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-[#EAF4FF] text-[#2563EB] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0B1F3A]">Application Tracking</h3>
              <p className="text-sm text-[#52657A] leading-relaxed">
                Follow your application journey in real time with stage-by-stage status indicators and alerts.
              </p>
            </div>

            {/* Feature Card 5 */}
            <div className="p-7 rounded-3xl bg-white border border-[#D9E6F2] hover:border-[#2563EB]/50 hover:shadow-xl hover:shadow-blue-500/5 transition duration-300 space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-[#EAF4FF] text-[#2563EB] flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0B1F3A]">Digital Documents</h3>
              <p className="text-sm text-[#52657A] leading-relaxed">
                Instantly access official approval letters, signed agreements, and individual tax invoices.
              </p>
            </div>

            {/* Feature Card 6 */}
            <div className="p-7 rounded-3xl bg-white border border-[#D9E6F2] hover:border-[#2563EB]/50 hover:shadow-xl hover:shadow-blue-500/5 transition duration-300 space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-[#EAF4FF] text-[#2563EB] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Headphones className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0B1F3A]">Dedicated Support</h3>
              <p className="text-sm text-[#52657A] leading-relaxed">
                Connect with our support desk directly via ticketing, email, or WhatsApp updates whenever needed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. PROCESS SECTION — "FROM APPLICATION TO APPROVAL" ───────────── */}
      <section id="how-it-works" className="py-20 bg-white border-b border-[#D9E6F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-[#2563EB] uppercase tracking-wider bg-[#EAF4FF] px-3 py-1 rounded-full border border-[#CBDDE9]">
              Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1F3A] tracking-tight">
              From Application to Approval
            </h2>
            <p className="text-sm sm:text-base text-[#52657A]">
              A structured 6-step digital journey with complete transparency at every stage.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
            {[
              { num: '01', title: 'Create Account', desc: 'Register with your verified mobile number and set your secure password.' },
              { num: '02', title: 'Submit Application', desc: 'Specify your loan requirement, repayment tenure, and personal income details.' },
              { num: '03', title: 'Complete KYC', desc: 'Upload clear copies of your Aadhaar Card, PAN Card, and relevant income proofs.' },
              { num: '04', title: 'Application Review', desc: 'Underwriters evaluate eligibility, credit profile, and submitted documentation.' },
              { num: '05', title: 'Loan Decision', desc: 'Receive your formal sanction decision, interest terms, and official approval letter.' },
              { num: '06', title: 'Access Documents', desc: 'Review electronic agreements, amortization schedules, and verifiable tax invoices.' },
            ].map((step) => (
              <div key={step.num} className="p-6 rounded-3xl bg-[#F7FAFC] border border-[#D9E6F2] relative space-y-3 hover:bg-[#EAF4FF]/40 transition">
                <div className="w-10 h-10 rounded-xl bg-[#0B1F3A] text-white font-mono font-bold text-sm flex items-center justify-center shadow-md">
                  {step.num}
                </div>
                <h3 className="text-base font-bold text-[#0B1F3A]">{step.title}</h3>
                <p className="text-xs text-[#52657A] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. EMI CALCULATOR — HERO INTERACTIVE FEATURE ───────────────────── */}
      <section id="calculator" className="py-20 bg-gradient-to-b from-[#F7FAFC] to-white border-b border-[#D9E6F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Context */}
            <div className="lg:col-span-5 space-y-5">
              <span className="text-xs font-bold text-[#2563EB] uppercase tracking-wider bg-[#EAF4FF] px-3 py-1 rounded-full border border-[#CBDDE9]">
                Financial Planning
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1F3A] tracking-tight leading-tight">
                Plan Your Monthly Repayment
              </h2>
              <p className="text-sm text-[#52657A] leading-relaxed">
                Estimate monthly EMI, total interest, and gross repayment using our interactive amortization tool.
              </p>
              <div className="p-4 rounded-2xl bg-[#EAF4FF] border border-[#CBDDE9] space-y-2 text-xs text-[#123B66]">
                <p className="font-bold flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-[#2563EB]" /> Indicative Calculator
                </p>
                <p className="leading-relaxed">
                  Actual loan terms, interest rates, and EMI schedules are finalized upon formal underwriter assessment and sanction letter generation.
                </p>
              </div>
            </div>

            {/* Right Calculator Component */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-[#D9E6F2] shadow-xl p-6 sm:p-8 space-y-7">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                {/* Sliders Input Area */}
                <div className="space-y-6">
                  {/* Loan Amount */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <label htmlFor="emi-amount-slider" className="text-[#52657A]">Loan Amount</label>
                      <span className="text-[#0B1F3A] font-mono font-bold text-sm">₹{emiAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <input
                      type="range"
                      id="emi-amount-slider"
                      aria-label="Loan Amount"
                      min={fin.minLoanAmount}
                      max={fin.maxLoanAmount}
                      step={5000}
                      value={emiAmount}
                      onChange={e => setEmiAmount(Number(e.target.value))}
                      className="w-full h-2 bg-[#EAF4FF] rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                    />
                    <div className="flex justify-between text-[11px] text-[#52657A]">
                      <span>{formatCurrency(fin.minLoanAmount)}</span>
                      <span>{formatCurrency(fin.maxLoanAmount)}</span>
                    </div>
                  </div>

                  {/* Interest Rate */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <label htmlFor="emi-rate-slider" className="text-[#52657A]">Interest Rate (p.a.)</label>
                      <span className="text-[#2563EB] font-mono font-bold text-sm">{emiRate}%</span>
                    </div>
                    <input
                      type="range"
                      id="emi-rate-slider"
                      aria-label="Interest Rate"
                      min={fin.minApr}
                      max={fin.maxApr}
                      step={0.5}
                      value={emiRate}
                      onChange={e => setEmiRate(Number(e.target.value))}
                      className="w-full h-2 bg-[#EAF4FF] rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                    />
                    <div className="flex justify-between text-[11px] text-[#52657A]">
                      <span>{fin.minApr}%</span>
                      <span>{fin.maxApr}%</span>
                    </div>
                  </div>

                  {/* Tenure */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <label htmlFor="emi-tenure-slider" className="text-[#52657A]">Tenure (Months)</label>
                      <span className="text-[#0B1F3A] font-mono font-bold text-sm">{emiTenure} Months</span>
                    </div>
                    <input
                      type="range"
                      id="emi-tenure-slider"
                      aria-label="Tenure"
                      min={fin.minTenureMonths}
                      max={fin.maxTenureMonths}
                      step={1}
                      value={emiTenure}
                      onChange={e => setEmiTenure(Number(e.target.value))}
                      className="w-full h-2 bg-[#EAF4FF] rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                    />
                    <div className="flex justify-between text-[11px] text-[#52657A]">
                      <span>{fin.minTenureMonths} mo</span>
                      <span>{fin.maxTenureMonths} mo</span>
                    </div>
                  </div>
                </div>

                {/* Output Breakdown Card */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0B1F3A] to-[#123B66] text-white space-y-5">
                  <div className="text-center space-y-1">
                    <span className="text-xs text-[#94A3B8] uppercase tracking-wider font-semibold">Estimated Monthly EMI</span>
                    <div className="text-3xl sm:text-4xl font-black text-white font-mono">
                      ₹{Math.round(emiResult.monthly).toLocaleString('en-IN')}
                    </div>
                    <span className="text-[11px] text-[#94A3B8]">for {emiTenure} monthly installments</span>
                  </div>

                  <div className="pt-3 border-t border-white/10 space-y-2 text-xs">
                    <div className="flex justify-between text-[#94A3B8]">
                      <span>Principal Amount</span>
                      <span className="text-white font-mono font-semibold">₹{emiAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-[#94A3B8]">
                      <span>Total Interest</span>
                      <span className="text-[#16A34A] font-mono font-semibold">₹{Math.round(emiResult.interest).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-[#94A3B8] font-bold pt-1 border-t border-white/10">
                      <span className="text-white">Total Repayment</span>
                      <span className="text-[#EAF4FF] font-mono">₹{Math.round(emiResult.total).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/customer/register?amount=${emiAmount}&tenure=${emiTenure}`)}
                    className="w-full py-3 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-xs rounded-xl shadow transition active:scale-95"
                  >
                    Apply for This Loan →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. ELIGIBILITY SECTION ────────────────────────────────────────── */}
      <section id="eligibility" className="py-20 bg-white border-b border-[#D9E6F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-[#2563EB] uppercase tracking-wider bg-[#EAF4FF] px-3 py-1 rounded-full border border-[#CBDDE9]">
              Requirements
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1F3A] tracking-tight">
              Check Your Eligibility
            </h2>
            <p className="text-sm sm:text-base text-[#52657A]">
              Standard assessment parameters applied during loan evaluation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
            <div className="p-5 rounded-2xl bg-[#F7FAFC] border border-[#D9E6F2] text-center space-y-2">
              <span className="text-xs font-bold text-[#52657A] uppercase">Age Bracket</span>
              <div className="text-lg font-black text-[#0B1F3A]">{elig.minAge} – {elig.maxAge} Yrs</div>
              <p className="text-[11px] text-[#52657A]">At time of application</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F7FAFC] border border-[#D9E6F2] text-center space-y-2">
              <span className="text-xs font-bold text-[#52657A] uppercase">Monthly Income</span>
              <div className="text-lg font-black text-[#2563EB]">Min ₹{elig.minMonthlyIncome.toLocaleString('en-IN')}</div>
              <p className="text-[11px] text-[#52657A]">Regular monthly credit</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F7FAFC] border border-[#D9E6F2] text-center space-y-2">
              <span className="text-xs font-bold text-[#52657A] uppercase">Employment</span>
              <div className="text-sm font-bold text-[#0B1F3A] pt-1">{elig.employmentCriteria}</div>
              <p className="text-[11px] text-[#52657A]">Salaried or Self-Employed</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F7FAFC] border border-[#D9E6F2] text-center space-y-2">
              <span className="text-xs font-bold text-[#52657A] uppercase">Bank Account</span>
              <div className="text-lg font-black text-[#16A34A]">{elig.bankAccountRequired ? 'Mandatory' : 'Optional'}</div>
              <p className="text-[11px] text-[#52657A]">In applicant’s name</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F7FAFC] border border-[#D9E6F2] text-center space-y-2">
              <span className="text-xs font-bold text-[#52657A] uppercase">Citizenship</span>
              <div className="text-sm font-bold text-[#0B1F3A] pt-1">{elig.residentialStatusCriteria}</div>
              <p className="text-[11px] text-[#52657A]">With valid identity proof</p>
            </div>
          </div>

          {/* Post-Eligibility Signup CTA Banner */}
          <div className="mt-12 p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-[#0B1F3A] via-[#123B66] to-[#0B1F3A] border border-[#224570] text-center sm:text-left text-white shadow-xl flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2563EB]/20 text-[#60A5FA] border border-[#2563EB]/30 text-xs font-bold tracking-wide uppercase">
                <CheckCircle2 className="w-3.5 h-3.5" /> Eligibility Criteria
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Ready to Apply?
              </h3>
              <p className="text-sm sm:text-base text-[#CBDDE9] leading-relaxed">
                Create your account and start your loan application.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full lg:w-auto">
              <button
                id="eligibility-self-check-btn"
                onClick={() => setEligibilityModalOpen(true)}
                className="w-full sm:w-auto px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-xl border border-white/20 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Search className="w-4 h-4 text-[#60A5FA]" />
                <span>Test Eligibility</span>
              </button>
              <Link
                to="/customer/register"
                id="eligibility-signup-cta-btn"
                className="w-full sm:w-auto px-8 py-3.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all flex items-center justify-center gap-2 group whitespace-nowrap active:scale-95"
              >
                <span>Create Account / Apply for a Loan</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. REQUIRED DOCUMENTS CHECKLIST ───────────────────────────────── */}
      <section id="documents" className="py-20 bg-[#F7FAFC] border-b border-[#D9E6F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-[#2563EB] uppercase tracking-wider bg-[#EAF4FF] px-3 py-1 rounded-full border border-[#CBDDE9]">
              Checklist
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1F3A] tracking-tight">
              Required Documents
            </h2>
            <p className="text-sm sm:text-base text-[#52657A]">
              Keep these ready in digital PDF or JPG format for expedited underwriting review.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {docList.map((doc) => {
              const IconComp = ICON_MAP[doc.icon as IconKey] || FileText;
              return (
                <div key={doc.id} className="p-6 rounded-3xl bg-white border border-[#D9E6F2] hover:border-[#2563EB]/40 hover:shadow-md transition space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#EAF4FF] text-[#2563EB] flex items-center justify-center">
                      <IconComp className="w-5 h-5" />
                    </div>
                    {doc.mandatory ? (
                      <span className="px-2 py-0.5 rounded-full bg-[#DC2626]/10 text-[#DC2626] text-[10px] font-bold uppercase">
                        Mandatory
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-[#52657A]/10 text-[#52657A] text-[10px] font-medium">
                        If Applicable
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-[#0B1F3A]">{doc.name}</h3>
                  <p className="text-xs text-[#52657A] leading-relaxed">{doc.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 9. FINANCIAL INFORMATION / DISCLOSURES ────────────────────────── */}
      <section id="financial-info" className="py-20 bg-white border-b border-[#D9E6F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-[#2563EB] uppercase tracking-wider bg-[#EAF4FF] px-3 py-1 rounded-full border border-[#CBDDE9]">
              Financial Terms
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1F3A] tracking-tight">
              Loan Terms & Disclosures
            </h2>
            <p className="text-sm sm:text-base text-[#52657A]">
              Transparent summary of product limits, interest APR parameters, and fee policies.
            </p>
          </div>

          <div className="bg-[#0B1F3A] text-white rounded-3xl p-8 sm:p-10 border border-[#224570] shadow-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-8 border-b border-white/10 text-center sm:text-left">
              <div className="space-y-1">
                <span className="text-xs text-[#94A3B8] uppercase font-semibold">Loan Amount Range</span>
                <div className="text-2xl font-black text-white font-mono">
                  {formatCurrency(fin.minLoanAmount)} – {formatCurrency(fin.maxLoanAmount)}
                </div>
                <p className="text-[11px] text-[#94A3B8]">Assessed per applicant</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-[#94A3B8] uppercase font-semibold">Repayment Tenure</span>
                <div className="text-2xl font-black text-white font-mono">
                  {fin.minTenureMonths} – {fin.maxTenureMonths} Months
                </div>
                <p className="text-[11px] text-[#94A3B8]">Flexible monthly terms</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-[#94A3B8] uppercase font-semibold">Annual Percentage Rate (APR)</span>
                <div className="text-2xl font-black text-[#16A34A] font-mono">
                  {fin.minApr}% – {fin.maxApr}% p.a.
                </div>
                <p className="text-[11px] text-[#94A3B8]">Reducing balance</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-[#94A3B8] uppercase font-semibold">Processing Fee Policy</span>
                <div className="text-sm font-bold text-[#EAF4FF] pt-1">
                  {fin.processingFeePolicy}
                </div>
                <p className="text-[11px] text-[#94A3B8]">GST applicable</p>
              </div>
            </div>

            <div className="pt-6 text-xs text-[#94A3B8] leading-relaxed">
              <p><strong>Other Charges:</strong> {fin.otherChargesPolicy}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 10. LENDER / PARTNER DISCLOSURE ────────────────────────────────── */}
      <section id="partner" className="py-20 bg-[#F7FAFC] border-b border-[#D9E6F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-[#2563EB] uppercase tracking-wider bg-[#EAF4FF] px-3 py-1 rounded-full border border-[#CBDDE9]">
              Regulatory Transparency
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1F3A] tracking-tight">
              Lender & Partner Disclosure
            </h2>
            <p className="text-sm sm:text-base text-[#52657A]">
              Clear demarcation of technology facilitator and lending institution roles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Platform Facilitator Card */}
            <div className="p-7 rounded-3xl bg-white border border-[#D9E6F2] space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAF4FF] text-[#2563EB] flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-[#52657A] font-semibold block">Technology Platform / Facilitator</span>
                  <h3 className="text-lg font-bold text-[#0B1F3A]">{branding.companyName}</h3>
                </div>
              </div>
              <div className="text-xs text-[#52657A] space-y-1 pt-2 border-t border-[#D9E6F2]">
                {branding.address && <p><strong>Address:</strong> {branding.address}</p>}
                {branding.email && <p><strong>Email:</strong> {branding.email}</p>}
                {branding.website && <p><strong>Website:</strong> {branding.website}</p>}
              </div>
            </div>

            {/* Lending Institution Card */}
            <div className="p-7 rounded-3xl bg-white border border-[#D9E6F2] space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAF4FF] text-[#2563EB] flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-[#52657A] font-semibold block">Registered Lending Partner</span>
                  <h3 className="text-lg font-bold text-[#0B1F3A]">{branding.lender?.name || 'Authorized Financial Partner'}</h3>
                </div>
              </div>
              <div className="text-xs text-[#52657A] space-y-1 pt-2 border-t border-[#D9E6F2]">
                {branding.lender?.legalName && <p><strong>Legal Name:</strong> {branding.lender.legalName}</p>}
                {branding.lender?.registrationNumber && <p><strong>Registration No:</strong> {branding.lender.registrationNumber}</p>}
                {branding.lender?.address && <p><strong>Address:</strong> {branding.lender.address}</p>}
                {!branding.lender?.name && (
                  <p className="italic text-[#52657A]">Partner details will be shown once configured by the platform administrator.</p>
                )}
              </div>
            </div>
          </div>

          {/* Statutory Disclaimer Box */}
          <div className="p-6 rounded-2xl bg-[#EAF4FF] border border-[#CBDDE9] flex items-start gap-3.5 text-xs text-[#123B66] leading-relaxed">
            <Info className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[#0B1F3A] mb-1">Partner & Facilitator Disclaimer</p>
              <p>
                {branding.disclaimer ||
                  `${branding.companyName} provides loan application facilitation and customer document management technologies. Final loan sanctions, underwriting assessments, disbursements, and terms are exclusively determined by the applicable registered lending institution.`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 11. FAQ ACCORDION ─────────────────────────────────────────────── */}
      <section id="faq" className="py-20 bg-white border-b border-[#D9E6F2]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-3">
            <span className="text-xs font-bold text-[#2563EB] uppercase tracking-wider bg-[#EAF4FF] px-3 py-1 rounded-full border border-[#CBDDE9]">
              Got Questions?
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1F3A] tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-sm sm:text-base text-[#52657A]">
              Quick answers about application steps, documents, and repayment terms.
            </p>
          </div>

          <div className="space-y-3">
            {faqList.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="border border-[#D9E6F2] rounded-2xl overflow-hidden bg-[#F7FAFC] hover:border-[#2563EB]/40 transition"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full text-left p-5 flex items-center justify-between font-bold text-sm sm:text-base text-[#0B1F3A] hover:text-[#2563EB] transition"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? <ChevronUp className="w-5 h-5 text-[#2563EB] shrink-0" /> : <ChevronDown className="w-5 h-5 text-[#52657A] shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-[#52657A] leading-relaxed border-t border-[#D9E6F2]/60 bg-white pt-4">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 12. CONTACT & SUPPORT SECTION ─────────────────────────────────── */}
      <section id="contact" className="py-20 bg-[#0B1F3A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-5">
              <span className="text-xs font-bold text-[#EAF4FF] uppercase tracking-wider bg-[#2563EB]/30 px-3 py-1 rounded-full border border-[#2563EB]/40">
                Help & Inquiries
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                We’re Here to Assist You
              </h2>
              <p className="text-sm text-[#94A3B8] leading-relaxed">
                Have questions regarding your loan application or document verification? Our borrower support desk is ready to assist.
              </p>

              <div className="space-y-3.5 pt-2 text-sm text-[#EAF4FF]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#2563EB]">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-[#94A3B8] block">Helpline Number</span>
                    <a href={`tel:${branding.phone}`} className="font-bold hover:text-[#2563EB] transition">{branding.phone}</a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#2563EB]">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-[#94A3B8] block">Email Support</span>
                    <a href={`mailto:${branding.email}`} className="font-bold hover:text-[#2563EB] transition">{branding.email}</a>
                  </div>
                </div>

                {branding.address && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#2563EB]">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs text-[#94A3B8] block">Registered Office</span>
                      <span className="font-medium text-xs text-[#94A3B8]">{branding.address}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Contact Action Box */}
            <div className="p-8 rounded-3xl bg-[#123B66]/60 border border-[#224570] text-center space-y-6">
              <h3 className="text-xl font-bold text-white">Ready to Apply?</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Check preliminary eligibility or create your customer account to start an application right away.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setEligibilityModalOpen(true)}
                  className="py-3 px-6 bg-white hover:bg-[#EAF4FF] text-[#0B1F3A] font-bold text-xs rounded-xl shadow transition"
                >
                  Check Eligibility
                </button>
                <Link
                  to="/customer/register"
                  className="py-3 px-6 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-xs rounded-xl shadow transition"
                >
                  Apply Now →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 13. FOOTER ────────────────────────────────────────────────────── */}
      <footer className="bg-[#07111F] text-[#94A3B8] text-xs pt-16 pb-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {/* Col 1: Brand Info */}
            <div className="col-span-2 space-y-4">
              <span className="font-black text-lg text-white tracking-tight">
                {branding.appName || branding.companyName}
              </span>
              <p className="text-xs text-[#64748B] max-w-sm leading-relaxed">
                A secure digital lending technology platform enabling seamless loan applications, automated KYC processing, and transparent borrower tracking.
              </p>
            </div>

            {/* Col 2: Products */}
            <div className="space-y-3">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Products</h4>
              <ul className="space-y-2">
                <li><a href="#calculator" className="hover:text-white transition">Personal Loans</a></li>
                <li><a href="#calculator" className="hover:text-white transition">EMI Calculator</a></li>
                <li><a href="#eligibility" className="hover:text-white transition">Eligibility Engine</a></li>
              </ul>
            </div>

            {/* Col 3: Resources */}
            <div className="space-y-3">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Resources</h4>
              <ul className="space-y-2">
                <li><a href="#documents" className="hover:text-white transition">Document Guide</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition">How it Works</a></li>
                <li><a href="#faq" className="hover:text-white transition">FAQ</a></li>
              </ul>
            </div>

            {/* Col 4: Legal */}
            <div className="space-y-3">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Legal</h4>
              <ul className="space-y-2">
                <li><Link to="/terms" className="hover:text-white transition">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
                <li><a href="#partner" className="hover:text-white transition">Partner Disclosures</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#64748B]">
            <p>© {new Date().getFullYear()} {branding.companyName}. All rights reserved.</p>
            <p>Digital Lending Platform • ISO 27001 Security Standard Practices</p>
          </div>
        </div>
      </footer>

      {/* Eligibility Modal Component */}
      {eligibilityModalOpen && (
        <EligibilityModal
          eligibility={elig}
          onClose={() => setEligibilityModalOpen(false)}
          onApply={() => {
            setEligibilityModalOpen(false);
            navigate('/customer/register');
          }}
        />
      )}
    </div>
  );
};
