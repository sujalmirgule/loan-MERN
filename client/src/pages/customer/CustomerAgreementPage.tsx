import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileSignature,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Printer,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

interface AgreementData {
  agreementId: string;
  loanId: string;
  applicationNumber: string;
  customerName: string;
  sanctionedAmount: number;
  tenureMonths: number;
  emi: number;
  interestRate: number;
  agreementVersion: string;
  contentHtml: string;
  acceptanceStatus: string;
  acceptedAt?: string;
  ipAddress?: string;
  userAgent?: string;
}

export const CustomerAgreementPage: React.FC = () => {
  const { loanId, id } = useParams<{ loanId?: string; id?: string }>();
  const effectiveLoanId = loanId || id || 'test-loan-1';
  const queryClient = useQueryClient();

  const [agreedCheckbox, setAgreedCheckbox] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<AgreementData>({
    queryKey: ['loan-agreement', effectiveLoanId],
    queryFn: async () => {
      const res = await apiClient.get(API_ENDPOINTS.AGREEMENTS.CUSTOMER_GET(effectiveLoanId));
      return res.data?.data || res.data;
    },
    enabled: Boolean(effectiveLoanId),
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveLoanId) throw new Error('Missing Loan ID');
      return apiClient.post(API_ENDPOINTS.AGREEMENTS.CUSTOMER_ACCEPT(effectiveLoanId));
    },
    onSuccess: () => {
      setSuccessMessage('Loan agreement accepted and signed successfully. Your application is now ready for disbursement.');
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['loan-agreement', effectiveLoanId] });
      queryClient.invalidateQueries({ queryKey: ['customer-dashboard'] });
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || 'Failed to sign loan agreement. Please retry.');
      setSuccessMessage(null);
    },
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse max-w-4xl mx-auto">
        <div className="h-8 bg-slate-200 rounded w-1/3" />
        <div className="h-96 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="max-w-2xl mx-auto border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
        <h3 className="text-base font-semibold text-red-900">Failed to load loan agreement</h3>
        <p className="text-xs text-red-700 mt-1 mb-4">Could not retrieve the agreement document for this loan.</p>
        <Button onClick={() => refetch()} size="sm" variant="outline" className="border-red-300">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Retry
        </Button>
      </Card>
    );
  }

  const isAccepted = data.acceptanceStatus === 'ACCEPTED';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2">
            <FileSignature className="w-6 h-6 text-primary" />
            <span>Master Loan Agreement</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Application: <span className="font-mono font-bold text-slate-900">{data.applicationNumber}</span> | Borrower: {data.customerName}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {isAccepted ? (
            <Badge className="bg-emerald-600 text-white px-3 py-1 text-xs">Agreement Accepted ✓</Badge>
          ) : (
            <Badge className="bg-amber-600 text-white px-3 py-1 text-xs">Pending Digital Signature</Badge>
          )}
          <Button variant="outline" size="sm" onClick={handlePrint} className="text-xs h-8">
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Accepted Confirmation Stamp */}
      {isAccepted && (
        <Card className="border-emerald-300 bg-emerald-50 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-emerald-950 text-sm">Digitally Signed & Confirmed</p>
                <p className="text-emerald-800">
                  Signed on {data.acceptedAt ? new Date(data.acceptedAt).toLocaleString('en-IN') : 'Recently'} | Document Version: {data.agreementVersion}
                </p>
              </div>
            </div>
            <Link to="/customer/loans">
              <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-800 text-xs h-8">
                My Loans
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Agreement Terms Paper Box */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700">Legal Agreement v{data.agreementVersion || '1.0'}</span>
            <span className="font-mono text-slate-500">ID: {(data.agreementId || '').slice(0, 8)}...</span>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div
            className="prose prose-sm max-w-none text-slate-800"
            dangerouslySetInnerHTML={{ __html: data.contentHtml || '' }}
          />
        </CardContent>
      </Card>

      {/* Acceptance Section */}
      {!isAccepted && (
        <Card className="shadow-sm border-primary/30 bg-emerald-50/40">
          <CardContent className="p-5 space-y-4">
            {successMessage && (
              <div className="p-3 rounded bg-emerald-100 text-emerald-900 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded bg-red-100 text-red-900 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="agreeTerms"
                checked={agreedCheckbox}
                onChange={(e) => setAgreedCheckbox(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="agreeTerms" className="text-xs text-slate-700 leading-relaxed cursor-pointer select-none">
                <strong>I have read, understood, and agree to the loan agreement and repayment terms.</strong> I understand
                that this constitutes an electronically executed binding agreement under the Information Technology Act, 2000.
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <Link to="/customer/dashboard">
                <Button variant="outline" size="sm" className="text-xs h-9">
                  Review Later
                </Button>
              </Link>
              <Button
                size="sm"
                disabled={!agreedCheckbox || acceptMutation.isPending}
                onClick={() => acceptMutation.mutate()}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-9 px-4"
              >
                {acceptMutation.isPending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Signing Agreement...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-1.5" />
                    Accept & Digitally Sign Agreement
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
