import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loanApi } from '@/api/loanApi';
import { Landmark, ArrowLeft, Loader2, CheckCircle2, ShieldAlert, ShieldCheck, ArrowRight } from 'lucide-react';
import { useBrandTitle } from '@/hooks/useBrandTitle';

const applyLoanSchema = z.object({
  amount: z.coerce
    .number({ required_error: 'Loan amount is required' })
    .positive('Loan amount must be greater than zero')
    .finite('Please enter a valid loan amount'),
  tenureMonths: z.coerce
    .number({ required_error: 'Tenure in months is required' })
    .int('Tenure must be a whole number of months')
    .positive('Tenure must be greater than zero'),
  purpose: z
    .string({ required_error: 'Purpose is required' })
    .trim()
    .min(3, 'Purpose must be at least 3 characters')
    .max(500, 'Purpose cannot exceed 500 characters'),
});

type ApplyLoanFormData = z.infer<typeof applyLoanSchema>;

export const ApplyLoanPage: React.FC = () => {
  useBrandTitle('Apply for Loan');
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successAppNumber, setSuccessAppNumber] = useState<string | null>(null);

  // Fetch customer profile to enforce KYC Gate
  const { data: profile } = useQuery({
    queryKey: ['customer-profile'],
    queryFn: async () => {
      const res = await apiClient.get(API_ENDPOINTS.CUSTOMERS.PROFILE);
      return res.data?.data?.profile || res.data?.profile || res.data?.data || res.data;
    },
    refetchInterval: 1500,
  });

  // Fetch eligibility to enforce One Active Loan Application rule
  const { data: eligibility } = useQuery({
    queryKey: ['customer-loan-eligibility'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/customer/loan-applications/eligibility');
        return res.data?.data || res.data;
      } catch {
        return { canApply: true, activeApplication: null };
      }
    },
    refetchInterval: 1500,
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ApplyLoanFormData>({
    resolver: zodResolver(applyLoanSchema),
    defaultValues: {
      amount: undefined,
      tenureMonths: 12,
      purpose: '',
    },
  });

  const watchedAmount = watch('amount');
  const watchedPurpose = watch('purpose') || '';

  const onSubmit = async (data: ApplyLoanFormData) => {
    try {
      setServerError(null);
      const res = await loanApi.createApplication(data);
      if (res.success && res.data) {
        setSuccessAppNumber(res.data.applicationNumber);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to submit loan application';
      setServerError(errorMsg);
    }
  };

  // Check if customer already has an active loan application
  if (eligibility?.activeApplication) {
    const activeApp = eligibility.activeApplication;
    return (
      <div className="max-w-xl mx-auto py-12 animate-in fade-in duration-200">
        <Card className="border-blue-200 bg-blue-50/50 shadow-xl rounded-3xl overflow-hidden text-center p-8 sm:p-10 space-y-5">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider bg-blue-100/80 px-3 py-1 rounded-full">
              Application In Progress
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0B1F3A]">
              Active Loan Exists
            </h2>
            <p className="text-sm text-[#52657A] max-w-md mx-auto leading-relaxed">
              You already have an active loan application (<strong>#{activeApp.applicationNumber}</strong>). Under lending policy, one borrower may only have one active application at a time.
            </p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-blue-200 text-xs font-medium text-blue-900 flex justify-between items-center">
            <span>Status:</span>
            <strong className="font-bold text-primary">
              {activeApp.status?.replace(/_/g, ' ')}
            </strong>
          </div>

          <div className="pt-2">
            <Button
              onClick={() => navigate(`/customer/loans/${activeApp.id}`)}
              className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-sm h-11 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2"
            >
              <span>View Active Application</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Loading state while customer profile is being fetched
  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  // REQUIREMENT: KYC Gate
  // Customer MUST have APPROVED/VERIFIED KYC before accessing or submitting loan application
  const effectiveKycStatus = profile?.kycStatus;
  const isKycVerified = effectiveKycStatus === 'APPROVED' || effectiveKycStatus === 'VERIFIED';

  if (!isKycVerified) {
    return (
      <div className="max-w-xl mx-auto py-12 animate-in fade-in duration-200">
        <Card className="border-amber-200 bg-amber-50/60 shadow-xl rounded-3xl overflow-hidden text-center p-8 sm:p-10 space-y-5">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider bg-amber-100/80 px-3 py-1 rounded-full">
              KYC Verification Gate
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0B1F3A]">
              Complete KYC First
            </h2>
            <p className="text-sm text-[#52657A] max-w-md mx-auto leading-relaxed">
              Identity verification is required before you can apply for a loan.
            </p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs font-medium text-amber-900">
            Current Status:{' '}
            <strong className="font-bold">
              {effectiveKycStatus === 'UNDER_REVIEW'
                ? 'Pending Verification'
                : effectiveKycStatus === 'REUPLOAD_REQUIRED'
                ? 'Correction Required'
                : effectiveKycStatus === 'REJECTED'
                ? 'Rejected'
                : 'Not Started'}
            </strong>
          </div>

          <div className="pt-2">
            <Button
              onClick={() => navigate('/customer/kyc')}
              className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-sm h-11 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2"
            >
              <span>Complete KYC</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Success State after loan application submission
  if (successAppNumber) {
    return (
      <div className="max-w-xl mx-auto py-12 animate-in fade-in zoom-in-95 duration-200">
        <Card className="border-emerald-200 bg-emerald-50/60 shadow-xl rounded-3xl overflow-hidden text-center p-8 sm:p-10 space-y-5">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider bg-emerald-100/80 px-3 py-1 rounded-full">
              Application Registered
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0B1F3A]">
              Application Submitted!
            </h2>
            <p className="text-sm text-[#52657A]">
              Your application has been registered with reference ID:
            </p>
          </div>
          <div className="inline-block px-5 py-2.5 bg-white rounded-xl border border-emerald-200 font-mono font-extrabold text-[#0B1F3A] text-lg sm:text-xl shadow-sm">
            {successAppNumber}
          </div>
          <div className="p-4 bg-white/80 rounded-2xl border border-emerald-100 text-left space-y-1">
            <p className="text-xs font-bold text-[#0B1F3A] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2563EB]" /> Next Step: Upload Loan Documents
            </p>
            <p className="text-xs text-[#52657A] leading-relaxed">
              To complete loan underwriting, please upload your PAN Card, Bank Statement, and Income Proof in the Loan Documents section.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => navigate('/customer/documents')}
              className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-sm h-11 rounded-xl shadow-md transition-all active:scale-95"
            >
              Upload Loan Documents →
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/customer/loans')}
              className="w-full text-xs font-semibold h-11 rounded-xl border-border text-text-primary"
            >
              View My Applications
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const watchedTenure = watch('tenureMonths') || 12;

  // Calculate estimated EMI for live preview
  const numAmount = Number(watchedAmount);
  const numTenure = Number(watchedTenure);
  let estimatedEmi = 0;
  if (!isNaN(numAmount) && numAmount > 0 && !isNaN(numTenure) && numTenure > 0) {
    const r = 12 / 12 / 100; // 12% p.a. default interest rate
    estimatedEmi = Math.round((numAmount * r * Math.pow(1 + r, numTenure)) / (Math.pow(1 + r, numTenure) - 1));
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 py-4 sm:py-6 px-2 sm:px-4 text-[#0F172A]">
      {/* Top Header / Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D7E3F5]">
        <div className="flex items-start gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/customer/loans')}
            className="bg-white border-[#D7E3F5] text-[#0B1220] hover:bg-[#F4F8FF] text-xs h-10 px-3 rounded-xl font-bold shrink-0 mt-0.5"
          >
            <ArrowLeft className="w-4 h-4 mr-1 text-[#155EEF]" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-[#EFF6FF] text-[#155EEF] border border-[#D7E3F5]">
                Loan Application Step
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#07152F] tracking-tight">
              ENTER REQUIRED LOAN AMOUNT
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] mt-0.5 font-medium">
              Specify your required loan amount, repayment tenure, and purpose.
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Container */}
      <Card className="shadow-lg border-[#D7E3F5] bg-white rounded-3xl overflow-hidden">
        <CardHeader className="p-6 sm:p-8 bg-[#F4F8FF] border-b border-[#D7E3F5]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white border border-[#D7E3F5] text-[#155EEF] flex items-center justify-center font-black shadow-xs shrink-0">
              <Landmark className="w-7 h-7" />
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl font-black text-[#07152F]">
                Loan Requirement Details
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-[#64748B] mt-0.5 font-medium">
                Enter your exact loan requirement below to proceed with credit processing.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="p-6 sm:p-8 space-y-8">
            {serverError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start space-x-3 font-medium">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            {/* 1. REQUIRED LOAN AMOUNT (PROMINENT INPUT) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="amount" className="text-base sm:text-lg font-black text-[#07152F] flex items-center gap-2">
                  <span>1. Required Loan Amount (₹)</span>
                  <span className="text-rose-600">*</span>
                </Label>
                <span className="text-xs text-[#64748B] font-bold">Min: ₹10,000 | Max: ₹50,00,000</span>
              </div>

              {/* Large Input Field */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl sm:text-3xl font-black text-[#155EEF]">
                  ₹
                </div>
                <Input
                  id="amount"
                  type="number"
                  step="any"
                  placeholder="e.g. 150000"
                  className="pl-11 sm:pl-14 text-2xl sm:text-3xl font-black font-mono text-[#07152F] bg-[#F4F8FF] border-[#D7E3F5] h-16 sm:h-20 rounded-2xl focus:border-[#155EEF] focus:bg-white transition-all shadow-xs"
                  disabled={isSubmitting}
                  {...register('amount')}
                />
              </div>

              {/* Preset Amount Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1 scrollbar-none">
                <span className="text-xs text-[#64748B] font-bold shrink-0 mr-1">Quick Select:</span>
                {[50000, 100000, 200000, 500000, 1000000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('amount') as HTMLInputElement;
                      if (el) {
                        el.value = String(preset);
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#EFF6FF] border border-[#D7E3F5] text-[#155EEF] hover:bg-[#155EEF] hover:text-white transition-all whitespace-nowrap"
                  >
                    ₹{preset.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>

              {/* Formatted Amount Preview Banner */}
              {numAmount > 0 && !isNaN(numAmount) && (
                <div className="p-4 rounded-2xl bg-[#EFF6FF] border border-[#D7E3F5] flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                  <div>
                    <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">
                      Amount Requested
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-[#155EEF] font-mono block mt-0.5">
                      ₹{numAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">
                      Amount in Words
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-[#07152F] block mt-0.5">
                      {numberToWords(numAmount)}
                    </span>
                  </div>
                </div>
              )}

              {errors.amount && (
                <p className="text-xs sm:text-sm font-bold text-rose-600 flex items-center gap-1.5 mt-1">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errors.amount.message}</span>
                </p>
              )}
            </div>

            {/* 2. REPAYMENT TENURE (MONTHS) */}
            <div className="space-y-3 pt-2 border-t border-[#D7E3F5]">
              <div className="flex items-center justify-between">
                <Label htmlFor="tenureMonths" className="text-base sm:text-lg font-black text-[#07152F] flex items-center gap-2">
                  <span>2. Repayment Tenure (Months)</span>
                  <span className="text-rose-600">*</span>
                </Label>
                <span className="text-xs text-[#64748B] font-bold">Standard 6 - 84 Months</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[6, 12, 24, 36, 48, 60].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('tenureMonths') as HTMLInputElement;
                      if (el) {
                        el.value = String(m);
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                      }
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
                      numTenure === m
                        ? 'bg-[#155EEF] text-white border-[#155EEF] shadow-xs'
                        : 'bg-[#F4F8FF] border-[#D7E3F5] text-[#07152F] hover:bg-[#EFF6FF]'
                    }`}
                  >
                    {m} Months
                  </button>
                ))}
              </div>

              <Input
                id="tenureMonths"
                type="number"
                placeholder="Custom months (e.g. 12, 18, 24)"
                className="text-base font-bold text-[#07152F] bg-[#F4F8FF] border-[#D7E3F5] h-12 rounded-xl focus:border-[#155EEF] focus:bg-white"
                disabled={isSubmitting}
                {...register('tenureMonths')}
              />

              {errors.tenureMonths && (
                <p className="text-xs sm:text-sm font-bold text-rose-600 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errors.tenureMonths.message}</span>
                </p>
              )}

              {/* Estimated EMI Summary Box */}
              {estimatedEmi > 0 && (
                <div className="p-4 rounded-2xl bg-[#F8FAFF] border border-[#D7E3F5] flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">
                      Estimated Monthly Installment (EMI)
                    </span>
                    <span className="text-xs text-[#64748B] mt-0.5">Calculated at standard 12% p.a. interest</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-[#16A34A] font-mono">
                      ₹{estimatedEmi.toLocaleString('en-IN')}/mo
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. PURPOSE OF LOAN */}
            <div className="space-y-3 pt-2 border-t border-[#D7E3F5]">
              <div className="flex justify-between items-center">
                <Label htmlFor="purpose" className="text-base sm:text-lg font-black text-[#07152F] flex items-center gap-2">
                  <span>3. Purpose of Loan</span>
                  <span className="text-rose-600">*</span>
                </Label>
                <span className="text-xs text-[#64748B] font-medium">
                  {watchedPurpose.length} / 500 characters
                </span>
              </div>
              <textarea
                id="purpose"
                rows={4}
                placeholder="State the intended purpose of this loan (e.g., Home renovation, medical emergency, business expansion, personal expenses)"
                className="w-full rounded-2xl border border-[#D7E3F5] bg-[#F4F8FF] p-4 text-sm sm:text-base font-medium text-[#07152F] placeholder-[#64748B] focus:outline-none focus:border-[#155EEF] focus:bg-white transition-all resize-none shadow-xs"
                disabled={isSubmitting}
                {...register('purpose')}
              />
              {errors.purpose && (
                <p className="text-xs sm:text-sm font-bold text-rose-600 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errors.purpose.message}</span>
                </p>
              )}
            </div>
          </CardContent>

          {/* Form Actions Footer */}
          <CardFooter className="p-6 sm:p-8 bg-[#F4F8FF] border-t border-[#D7E3F5] flex flex-col sm:flex-row justify-between items-center gap-3">
            <Link to="/customer/loans" className="w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto h-12 px-6 border-[#D7E3F5] text-[#07152F] hover:bg-white font-bold text-xs sm:text-sm rounded-xl"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto h-14 sm:h-16 px-8 sm:px-12 bg-[#155EEF] hover:bg-[#1149B8] text-white font-extrabold text-base sm:text-lg rounded-2xl shadow-xl shadow-[#155EEF]/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Submitting Loan Application...</span>
                </>
              ) : (
                <>
                  <span>Submit Loan Application</span>
                  <ArrowRight className="w-5 h-5 ml-1" />
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

function numberToWords(num: number): string {
  if (!num || isNaN(num) || num <= 0) return '';
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ',
    'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    if (n === 0) return '';
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
    if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? 'and ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 !== 0 ? inWords(n % 10000000) : '');
  }

  const rounded = Math.round(num);
  const words = inWords(rounded).trim();
  return (words ? words : 'Zero') + ' Rupees Only';
}
