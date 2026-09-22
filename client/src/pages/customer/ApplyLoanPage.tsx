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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/customer/loans')}
          className="text-text-secondary hover:text-text-primary p-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Applications
        </Button>
      </div>

      <Card className="shadow-sm border-border bg-surface">
        <CardHeader>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Apply for a New Loan</CardTitle>
              <CardDescription>
                Provide your loan requirements. Financial terms and decisions will be reviewed by our underwriters.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-5">
            {serverError && (
              <div className="p-3.5 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm flex items-start space-x-2">
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Loan Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-sm font-medium text-text-primary">
                Requested Loan Amount (₹) <span className="text-danger">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-text-secondary font-semibold">₹</span>
                <Input
                  id="amount"
                  type="number"
                  step="any"
                  placeholder="e.g. 100000"
                  className="pl-7 text-base font-medium bg-surface-elevated border-border text-text-primary"
                  disabled={isSubmitting}
                  {...register('amount')}
                />
              </div>
              {watchedAmount && !isNaN(Number(watchedAmount)) && Number(watchedAmount) > 0 && (
                <p className="text-xs text-primary font-medium">
                  Applying for: ₹{Number(watchedAmount).toLocaleString('en-IN')}
                </p>
              )}
              {errors.amount && (
                <p className="text-xs text-danger">{errors.amount.message}</p>
              )}
            </div>

            {/* Tenure */}
            <div className="space-y-1.5">
              <Label htmlFor="tenureMonths" className="text-sm font-medium text-text-primary">
                Repayment Tenure (in Months) <span className="text-danger">*</span>
              </Label>
              <Input
                id="tenureMonths"
                type="number"
                placeholder="e.g. 12, 24, 36"
                className="bg-surface-elevated border-border text-text-primary"
                disabled={isSubmitting}
                {...register('tenureMonths')}
              />
              <p className="text-xs text-text-secondary">
                Specify duration in whole months (e.g. 12 months = 1 year).
              </p>
              {errors.tenureMonths && (
                <p className="text-xs text-danger">{errors.tenureMonths.message}</p>
              )}
            </div>

            {/* Purpose */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="purpose" className="text-sm font-medium text-text-primary">
                  Purpose of Loan <span className="text-danger">*</span>
                </Label>
                <span className="text-[11px] text-text-secondary">
                  {watchedPurpose.length} / 500
                </span>
              </div>
              <textarea
                id="purpose"
                rows={3}
                placeholder="Briefly state the intended purpose of this loan (e.g., Higher education, home repairs, medical expenses)"
                className="w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary ring-offset-background placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-none"
                disabled={isSubmitting}
                {...register('purpose')}
              />
              {errors.purpose && (
                <p className="text-xs text-danger">{errors.purpose.message}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t border-border pt-4">
            <Link to="/customer/loans">
              <Button type="button" variant="outline" className="border-border text-text-primary" disabled={isSubmitting}>
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-success text-background hover:brightness-110 text-text-primary min-w-[140px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Application'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
