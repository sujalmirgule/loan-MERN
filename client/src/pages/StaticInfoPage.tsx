import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Landmark, ArrowLeft, Mail, Phone, MapPin, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useBranding } from '@/contexts/BrandingContext';
import { useBrandTitle } from '@/hooks/useBrandTitle';

export const StaticInfoPage: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;
  const { branding } = useBranding();

  let title = `About ${branding.appName}`;
  let subtitle = 'Transparent, secure, and modern loan management platform.';
  let content = null;

  if (path.includes('terms')) {
    title = 'Terms & Conditions';
    subtitle = `Please review the terms of service governing the usage of ${branding.appName}.`;
    content = (
      <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
        <p>1. <strong>Acceptance of Terms</strong>: By accessing or using the {branding.appName} platform, you agree to comply with and be bound by these Terms and Conditions.</p>
        <p>2. <strong>Loan Eligibility & Origination</strong>: Submission of a loan application does not constitute guaranteed sanction. All loan sanctions are subject to underwriting criteria, verification of submitted KYC documents, and compliance reviews.</p>
        <p>3. <strong>Repayment & EMI</strong>: Borrowers agree to service monthly EMIs on or before the specified due date as per the Sanction Letter and Loan Agreement schedule.</p>
        <p>4. <strong>Charges & Fees</strong>: Processing charges, insurance, and administrative fees are non-refundable once the loan sanction process has commenced.</p>
        <p>5. <strong>Private Brand Notice</strong>: {branding.appName} is an independent fintech technology and loan management application. It does not represent any government department or official banking authority.</p>
      </div>
    );
  } else if (path.includes('privacy')) {
    title = 'Privacy Policy';
    subtitle = 'Your privacy and data security are our top priorities.';
    content = (
      <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
        <p>1. <strong>Information Collection</strong>: We collect personal information (Full Name, Contact, PAN, Aadhaar) solely for KYC identity verification, credit appraisal, and servicing loan contracts.</p>
        <p>2. <strong>Data Encryption</strong>: Sensitive identifiers such as Aadhaar and PAN numbers are masked and securely encrypted at rest and in transit using industry-standard protocols.</p>
        <p>3. <strong>Third-Party Sharing</strong>: We do not sell or rent borrower information to third parties. Data is shared exclusively with verified lenders, credit bureaus, and payment partners strictly for processing requested loans.</p>
        <p>4. <strong>Access and Correction</strong>: Borrowers may request inspection or rectification of their personal information at any time via the Customer Portal or Help Desk.</p>
      </div>
    );
  } else if (path.includes('contact')) {
    title = 'Contact Support';
    subtitle = 'Our dedicated support desk is available to assist you with applications, EMIs, and document verification.';
    content = (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <Mail className="w-6 h-6 text-primary mb-2" />
            <div className="font-semibold text-slate-900 text-sm">Email Support</div>
            <div className="text-xs text-text-secondary mt-1">{branding.email || 'support@yourcompany.com'}</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <Phone className="w-6 h-6 text-primary mb-2" />
            <div className="font-semibold text-slate-900 text-sm">Helpline</div>
            <div className="text-xs text-text-secondary mt-1">{branding.phone || '+91 1800 000 000'}</div>
            <div className="text-xs text-text-secondary">Mon - Sat, 9:00 AM - 7:00 PM</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <MapPin className="w-6 h-6 text-primary mb-2" />
            <div className="font-semibold text-slate-900 text-sm">Headquarters</div>
            <div className="text-xs text-text-secondary mt-1">{branding.address || 'Financial District, Mumbai, Maharashtra 400051'}</div>
          </div>
        </div>
      </div>
    );
  } else {
    // Default About / Loan Information
    title = `About ${branding.appName}`;
    subtitle = 'Fintech-grade loan origination, verification, and servicing ecosystem.';
    content = (
      <div className="space-y-5 text-slate-600 text-sm leading-relaxed">
        <p>{branding.appName} is an advanced fintech loan management platform engineered to streamline borrower onboarding, automated and manual underwriting, digital KYC evaluation, and seamless multi-channel repayments.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-900 text-sm">Paperless Digital KYC</div>
              <div className="text-xs text-slate-600 mt-0.5">Secure document uploads, Aadhaar & PAN masking, and multi-version document verification.</div>
            </div>
          </div>
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-900 text-sm">Live Approval Letters</div>
              <div className="text-xs text-slate-600 mt-0.5">Automated sanction letters with real QR code authenticity verification and binary PDF downloads.</div>
            </div>
          </div>
          <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-900 text-sm">Flexible UPI & Bank Repayments</div>
              <div className="text-xs text-slate-600 mt-0.5">Support for GPay, PhonePe, Paytm, dynamic QR scan & pay with UTR tracking, and payment receipts.</div>
            </div>
          </div>
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-900 text-sm">Multi-Tenant Domain Engine</div>
              <div className="text-xs text-slate-600 mt-0.5">Custom branding, dynamic host-header detection, and per-tenant application styling.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  useBrandTitle(title);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <header className="bg-white border-b border-slate-200 py-4 px-6 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.appName} className="w-9 h-9 rounded-xl object-contain shadow" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow">
                <Landmark className="w-5 h-5" />
              </div>
            )}
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900">{branding.appName.toUpperCase()}</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/emi-calculator">
              <Button variant="outline" size="sm">EMI Calculator</Button>
            </Link>
            <Link to="/customer/login">
              <Button size="sm">Borrower Portal</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto w-full px-4 py-10 flex-1">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-slate-900 mb-4 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
        </div>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="pt-6">
            {content}
          </CardContent>
        </Card>
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-text-secondary">
        <div className="flex justify-center gap-6 mb-2">
          <Link to="/about" className="hover:text-slate-800">About</Link>
          <Link to="/emi-calculator" className="hover:text-slate-800">EMI Calculator</Link>
          <Link to="/terms" className="hover:text-slate-800">Terms of Service</Link>
          <Link to="/privacy" className="hover:text-slate-800">Privacy Policy</Link>
          <Link to="/contact" className="hover:text-slate-800">Contact</Link>
        </div>
        © {new Date().getFullYear()} {branding.companyName || branding.appName}. All rights reserved.
      </footer>
    </div>
  );
};
