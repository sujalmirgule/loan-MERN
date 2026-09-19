import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CreditCard,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  FileSignature,
} from 'lucide-react';

interface PaymentRequirementData {
  loanId: string;
  applicationNumber: string;
  loanStatus: string;
  paymentStatus: string;
  chargeAmount: number;
  chargeType: string;
  upiId: string;
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  instructions: string;
  paymentRecord: {
    id: string;
    amount: number;
    transactionRef: string;
    paymentMethod: string;
    status: string;
    rejectionReason?: string;
    submittedAt: string;
    verifiedAt?: string;
    verifiedBy?: string;
  } | null;
}

export const CustomerPaymentPage: React.FC = () => {
  const { loanId } = useParams<{ loanId: string }>();
  const queryClient = useQueryClient();

  const [utr, setUtr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [notes, setNotes] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<PaymentRequirementData>({
    queryKey: ['customer-payment', loanId],
    queryFn: async () => {
      if (!loanId) throw new Error('Loan ID is required');
      const res = await apiClient.get(API_ENDPOINTS.PAYMENTS.CUSTOMER_REQUIREMENT(loanId));
      return res.data;
    },
    enabled: Boolean(loanId),
    refetchInterval: 10000,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!loanId) throw new Error('Missing Loan ID');
      return apiClient.post(API_ENDPOINTS.PAYMENTS.SUBMIT_UTR(loanId), {
        utr: utr.trim().toUpperCase(),
        paymentMethod,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      setFeedbackSuccess('Payment reference submitted successfully. Our operations team is verifying your transaction.');
      setFeedbackError(null);
      queryClient.invalidateQueries({ queryKey: ['customer-payment', loanId] });
      queryClient.invalidateQueries({ queryKey: ['customer-dashboard'] });
    },
    onError: (err: Error) => {
      setFeedbackError(err.message || 'Failed to submit payment reference.');
      setFeedbackSuccess(null);
    },
  });

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!utr || utr.trim().length < 6) {
      setFeedbackError('Please provide a valid 6-to-50 character UTR / transaction reference number.');
      return;
    }
    submitMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse max-w-3xl mx-auto">
        <div className="h-8 bg-slate-200 rounded w-1/3" />
        <div className="h-44 bg-slate-200 rounded-xl" />
        <div className="h-64 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="max-w-2xl mx-auto border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
        <h3 className="text-base font-semibold text-red-900">Failed to load payment requirements</h3>
        <p className="text-xs text-red-700 mt-1 mb-4">Could not retrieve payment information for this loan application.</p>
        <Button onClick={() => refetch()} size="sm" variant="outline" className="border-red-300">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Retry
        </Button>
      </Card>
    );
  }

  const isPaid = data.paymentStatus === 'PAID';
  const isUnderVerification = data.paymentStatus === 'UNDER_VERIFICATION';
  const isRejected = data.paymentStatus === 'REJECTED';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2">
            <CreditCard className="w-6 h-6 text-primary" />
            <span>Loan Verification Payment</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Application Reference: <span className="font-mono font-bold text-slate-900">{data.applicationNumber}</span>
          </p>
        </div>
        <div>
          {isPaid ? (
            <Badge className="bg-emerald-600 text-white px-3 py-1 text-xs">Payment Verified ✓</Badge>
          ) : isUnderVerification ? (
            <Badge className="bg-amber-600 text-white px-3 py-1 text-xs animate-pulse">Under Verification</Badge>
          ) : isRejected ? (
            <Badge className="bg-red-600 text-white px-3 py-1 text-xs">Verification Rejected</Badge>
          ) : (
            <Badge className="bg-blue-600 text-white px-3 py-1 text-xs">Payment Pending</Badge>
          )}
        </div>
      </div>

      {/* 1. Payment Verified Success Card */}
      {isPaid && (
        <Card className="border-emerald-300 bg-emerald-50/80 shadow-sm">
          <CardContent className="p-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-950">Verification Payment Confirmed</h3>
              <p className="text-xs text-emerald-800 mt-1">
                Your nominal verification fee of ₹{data.chargeAmount} was verified by {data.paymentRecord?.verifiedBy || 'operations'}.
                Your loan has been approved!
              </p>
            </div>
            <div className="pt-2 flex justify-center space-x-3">
              <Link to={`/customer/agreement/${data.loanId}`}>
                <Button className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-9">
                  <FileSignature className="w-4 h-4 mr-1.5" />
                  Proceed to Loan Agreement
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Payment Instructions & Transfer Details Card */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Payment Details & Instructions</CardTitle>
            <span className="text-xs font-bold text-primary px-2.5 py-1 rounded bg-primary/10">
              Amount Due: ₹{data.chargeAmount}
            </span>
          </div>
          <CardDescription>{data.instructions}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* UPI ID */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-slate-500 block text-[11px]">Primary UPI Handle</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{data.upiId}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(data.upiId, 'upi')}
                className="h-7 px-2 text-slate-600"
              >
                {copiedField === 'upi' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>

            {/* Account Holder */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Beneficiary Name</span>
              <span className="font-semibold text-slate-900 text-sm">{data.accountHolderName}</span>
            </div>

            {/* Bank Account Number */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-slate-500 block text-[11px]">Bank Account Number</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{data.accountNumber}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(data.accountNumber, 'acc')}
                className="h-7 px-2 text-slate-600"
              >
                {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>

            {/* IFSC Code */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-slate-500 block text-[11px]">IFSC Code</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{data.ifscCode}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(data.ifscCode, 'ifsc')}
                className="h-7 px-2 text-slate-600"
              >
                {copiedField === 'ifsc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. UTR Reference Submission Form */}
      {!isPaid && (
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>{data.paymentRecord ? 'Update Payment Reference (UTR)' : 'Submit Payment Reference (UTR)'}</span>
            </CardTitle>
            <CardDescription>
              Enter the 12-digit UTR or Transaction Reference number generated by your banking app or UPI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {feedbackSuccess && (
                <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{feedbackSuccess}</span>
                </div>
              )}

              {feedbackError && (
                <div className="p-3 rounded bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{feedbackError}</span>
                </div>
              )}

              {isRejected && data.paymentRecord?.rejectionReason && (
                <div className="p-3 rounded bg-red-50 border border-red-200 text-red-900 text-xs">
                  <p className="font-bold">Previous Submission Rejected:</p>
                  <p className="mt-0.5">{data.paymentRecord.rejectionReason}</p>
                </div>
              )}

              {isUnderVerification && (
                <div className="p-3 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-spin" />
                  <span>
                    UTR <strong>{data.paymentRecord?.transactionRef}</strong> is currently being verified by an operations administrator.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="utrInput" className="text-xs font-semibold text-slate-700">
                    UTR / Transaction Reference Number <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="utrInput"
                    placeholder="e.g. 324567891234 or UPI-987654"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value.toUpperCase())}
                    className="font-mono text-sm uppercase"
                    maxLength={50}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="paymentMethodSelect" className="text-xs font-semibold text-slate-700">
                    Payment Method
                  </label>
                  <select
                    id="paymentMethodSelect"
                    aria-label="Payment Method"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full text-xs h-9 px-2.5 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="UPI">UPI (GPay / PhonePe / Paytm / BHIM)</option>
                    <option value="NET_BANKING">Net Banking (IMPS / NEFT)</option>
                    <option value="DEBIT_CARD">Debit Card</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="paymentNotes" className="text-xs font-semibold text-slate-700">Optional Notes / Remarks</label>
                <Input
                  id="paymentNotes"
                  placeholder="e.g. Paid from HDFC Bank account ending 4321"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={300}
                />
              </div>

              <Button
                type="submit"
                disabled={submitMutation.isPending || !utr.trim()}
                className="w-full text-xs h-10"
              >
                {submitMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                    Submitting UTR...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    {data.paymentRecord ? 'Update Transaction Reference' : 'Submit Reference for Verification'}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
