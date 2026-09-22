import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, ShieldCheck, FileCheck2, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { useBranding } from '@/contexts/BrandingContext';
import { useBrandTitle } from '@/hooks/useBrandTitle';

interface VerificationData {
  isValid: boolean;
  status: string;
  documentType: string;
  customerName: string;
  applicationNumber: string;
  loanAccountNumber: string;
  approvalDate: string;
  verifiedAt: string;
  message: string;
}

export const VerifyDocumentPage: React.FC = () => {
  const { branding } = useBranding();
  useBrandTitle('Verify Document');
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VerificationData | null>(null);

  useEffect(() => {
    const fetchVerification = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(
          API_ENDPOINTS.VERIFICATION.VERIFY_DOCUMENT(token || '')
        );
        if (res.data?.success) {
          setData(res.data.data);
        } else {
          setError(res.data?.message || 'Document record not found');
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'Document verification failed. Invalid or expired token.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchVerification();
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-surface-elevated text-slate-100 flex flex-col justify-between p-4">
      <header className="max-w-md mx-auto w-full pt-4 pb-2 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-1.5 text-xs text-text-secondary hover:text-text-primary transition">
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </Link>
        <span className="font-bold text-sm tracking-tight text-text-primary">{branding.appName} Document Authenticity Portal</span>
      </header>

      <main className="max-w-md mx-auto w-full flex-1 flex items-center justify-center my-6">
        <Card className="w-full bg-surface border-border text-slate-100 shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="text-center pb-3 border-b border-border">
            {loading ? (
              <div className="flex flex-col items-center py-6 space-y-3">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-text-secondary">Verifying cryptographic digital signature...</span>
              </div>
            ) : error ? (
              <div className="py-4 space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-danger/20 text-danger flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg text-red-300">Verification Unsuccessful</CardTitle>
                <p className="text-xs text-text-secondary">{error}</p>
              </div>
            ) : (
              <div className="py-2 space-y-2">
                <div className="w-14 h-14 mx-auto rounded-full bg-success/20 text-success flex items-center justify-center border border-success/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <CardTitle className="text-xl font-black text-text-primary">Official Document Verified</CardTitle>
                <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-success/30 text-success text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>AUTHENTIC & VALID</span>
                </div>
              </div>
            )}
          </CardHeader>

          {data && (
            <CardContent className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-surface-elevated/60 border border-border/60 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Document Type</span>
                  <span className="font-bold text-text-primary flex items-center space-x-1">
                    <FileCheck2 className="w-3.5 h-3.5 text-primary" />
                    <span>Loan Sanction Letter</span>
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Customer Name</span>
                  <span className="font-bold text-success text-sm">{data.customerName}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Application Number</span>
                  <span className="font-mono font-bold text-text-primary">{data.applicationNumber}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Loan Account No.</span>
                  <span className="font-mono text-text-primary">{data.loanAccountNumber}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Sanction / Approval Date</span>
                  <span className="text-text-primary">
                    {new Date(data.approvalDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              <div className="text-center text-[11px] text-text-secondary leading-relaxed px-2">
                This verification certifies that this document was issued directly by the{' '}
                <strong className="text-text-primary">{branding.appName} Platform</strong> under secure digital authorization.
              </div>

              <div className="pt-2">
                <Link to="/">
                  <Button className="w-full h-10 bg-primary text-background hover:bg-secondary text-text-primary font-semibold rounded-xl text-xs">
                    Return to {branding.appName}
                  </Button>
                </Link>
              </div>
            </CardContent>
          )}
        </Card>
      </main>

      <footer className="max-w-md mx-auto w-full text-center text-[10px] text-slate-600 pb-2">
        © {new Date().getFullYear()} {branding.companyName || branding.appName}. All rights reserved. Secure verification token: {token}
      </footer>
    </div>
  );
};
