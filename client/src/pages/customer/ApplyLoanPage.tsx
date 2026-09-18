import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loanApi } from '@/api/loanApi';
import { Landmark, ArrowLeft, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';

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
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successAppNumber, setSuccessAppNumber] = useState<string | null>(null);

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
        setTimeout(() => {
          navigate(`/customer/loans/${res.data.id}`);
        }, 2000);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to submit loan application';
      setServerError(errorMsg);
    }
  };

  if (successAppNumber) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <Card className="border-emerald-200 bg-emerald-50/50 shadow-md">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Application Submitted!</h2>
            <p className="text-sm text-slate-600">
              Your application has been received with reference number:
            </p>
            <div className="inline-block px-4 py-2 bg-white rounded-lg border border-emerald-300 font-mono font-bold text-emerald-800 text-lg shadow-sm">
              {successAppNumber}
            </div>
            <p className="text-xs text-slate-500">
              Redirecting you to your application details dashboard...
            </p>
          </CardContent>
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
          className="text-slate-600 hover:text-slate-900 p-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Applications
        </Button>
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
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
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start space-x-2">
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Loan Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-sm font-medium text-slate-800">
                Requested Loan Amount (₹) <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 font-semibold">₹</span>
                <Input
                  id="amount"
                  type="number"
                  step="any"
                  placeholder="e.g. 100000"
                  className="pl-7 text-base font-medium"
                  disabled={isSubmitting}
                  {...register('amount')}
                />
              </div>
              {watchedAmount && !isNaN(Number(watchedAmount)) && Number(watchedAmount) > 0 && (
                <p className="text-xs text-emerald-700 font-medium">
                  Applying for: ₹{Number(watchedAmount).toLocaleString('en-IN')}
                </p>
              )}
              {errors.amount && (
                <p className="text-xs text-red-600">{errors.amount.message}</p>
              )}
            </div>

            {/* Tenure */}
            <div className="space-y-1.5">
              <Label htmlFor="tenureMonths" className="text-sm font-medium text-slate-800">
                Repayment Tenure (in Months) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tenureMonths"
                type="number"
                placeholder="e.g. 12, 24, 36"
                disabled={isSubmitting}
                {...register('tenureMonths')}
              />
              <p className="text-xs text-slate-500">
                Specify duration in whole months (e.g. 12 months = 1 year).
              </p>
              {errors.tenureMonths && (
                <p className="text-xs text-red-600">{errors.tenureMonths.message}</p>
              )}
            </div>

            {/* Purpose */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="purpose" className="text-sm font-medium text-slate-800">
                  Purpose of Loan <span className="text-red-500">*</span>
                </Label>
                <span className="text-[11px] text-slate-400">
                  {watchedPurpose.length} / 500
                </span>
              </div>
              <textarea
                id="purpose"
                rows={3}
                placeholder="Briefly state the intended purpose of this loan (e.g., Higher education, home repairs, medical expenses)"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-none"
                disabled={isSubmitting}
                {...register('purpose')}
              />
              {errors.purpose && (
                <p className="text-xs text-red-600">{errors.purpose.message}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t border-border pt-4">
            <Link to="/customer/loans">
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]"
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
