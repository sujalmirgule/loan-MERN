import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { User, ShieldCheck, Smartphone, Mail, MapPin, IndianRupee, CreditCard } from 'lucide-react';

export const CustomerHome: React.FC = () => {
  const { user } = useAuth();
  const customer = user && 'mobile' in user ? user : null;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {customer?.fullName || 'Borrower'}!
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage your personal borrower account, verify KYC status, and track loan eligibility.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="success" className="px-3 py-1 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
            Account Active
          </Badge>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 shadow-sm border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <User className="w-4 h-4" />
                </div>
                <CardTitle className="text-lg">Verified Borrower Profile</CardTitle>
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Phase 1 & 2 Active
              </span>
            </div>
            <CardDescription>
              Your registered identification and contact details on record.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center space-x-2 text-slate-500 text-xs mb-1">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile Number</span>
                </div>
                <span className="font-semibold text-slate-800">
                  {customer ? `+91 ${customer.mobile}` : '—'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center space-x-2 text-slate-500 text-xs mb-1">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Address</span>
                </div>
                <span className="font-semibold text-slate-800 break-all">
                  {customer?.email || '—'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center space-x-2 text-slate-500 text-xs mb-1">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Aadhaar Representation</span>
                </div>
                <span className="font-mono font-semibold text-slate-800">
                  {customer?.aadhaarMasked || 'XXXX XXXX XXXX'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center space-x-2 text-slate-500 text-xs mb-1">
                  <IndianRupee className="w-3.5 h-3.5" />
                  <span>Reported Monthly Income</span>
                </div>
                <span className="font-semibold text-slate-800">
                  {customer?.monthlyIncome
                    ? `₹${customer.monthlyIncome.toLocaleString('en-IN')}`
                    : '—'}
                </span>
              </div>

              <div className="sm:col-span-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center space-x-2 text-slate-500 text-xs mb-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Residential Location</span>
                </div>
                <span className="font-medium text-slate-800">
                  {customer ? `${customer.address}, ${customer.city}, ${customer.state}` : '—'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security & Verification Card */}
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <CardTitle className="text-lg">Security & Privacy</CardTitle>
            </div>
            <CardDescription>Zero-trust cryptographic protections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-slate-600">
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>HMAC-SHA256 Aadhaar deduplication without reversible plaintext storage.</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>Masked representation everywhere on display: XXXX XXXX [last 4 digits].</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>Cryptographically signed JWT bearer session with automatic timeout.</span>
              </div>
            </div>

            <div className="pt-3 border-t border-border">
              <p className="text-slate-500">
                Loan applications and document uploads will be enabled in Phase 3.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
