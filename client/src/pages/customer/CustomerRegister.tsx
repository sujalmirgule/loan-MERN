import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Landmark } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useBranding } from '@/contexts/BrandingContext';
import { useBrandTitle } from '@/hooks/useBrandTitle';
import { CustomerRegisterForm } from '@/components/customer/CustomerRegisterForm';

export const CustomerRegister: React.FC = () => {
  const { branding } = useBranding();
  useBrandTitle('Create Account');

  return (
    <div className="theme-customer min-h-screen bg-[#F7FAFC] text-[#0B1F3A] flex flex-col justify-between py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto w-full">
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#52657A] hover:text-[#0B1F3A] transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="flex items-center space-x-2">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.appName || 'Logo'}
                className="w-8 h-8 rounded-lg object-contain shadow-sm"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center shadow-sm">
                <Landmark className="w-4 h-4" />
              </div>
            )}
            <span className="font-extrabold text-[#0B1F3A] text-sm tracking-tight">
              {(branding.appName || branding.companyName || 'Loan Approve').toUpperCase()}
            </span>
          </div>
        </div>

        <Card className="border-[#D9E6F2] shadow-xl rounded-3xl overflow-hidden bg-white">
          <CardContent className="p-6 sm:p-10">
            <CustomerRegisterForm isEmbedded={false} onSuccessRedirect="/customer/dashboard" />

            <div className="mt-8 text-center text-xs text-[#52657A]">
              Already registered with {branding.appName || 'us'}?{' '}
              <Link to="/customer/login" className="text-[#2563EB] font-bold hover:underline">
                Sign In to Portal
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <footer className="max-w-md mx-auto w-full text-center pt-6 text-xs text-[#52657A]">
        <p>© {new Date().getFullYear()} {branding.companyName || branding.appName || 'Loan Finance'}. All financial data is encrypted and secure.</p>
      </footer>
    </div>
  );
};

export default CustomerRegister;

