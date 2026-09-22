import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { loanApi, CustomerLoanApplication } from '@/api/loanApi';
import { LoanStatusBadge } from '@/components/LoanStatusBadge';
import {
  FileText,
  Plus,
  ArrowRight,
  Clock,
  Sparkles,
  Calendar,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Lock,
  ShieldCheck,
  Upload,
  CheckCircle2,
} from 'lucide-react';
import { useBrandTitle } from '@/hooks/useBrandTitle';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { CustomerLoanDocumentsSection } from '@/components/customer/CustomerLoanDocumentsSection';

const LOAN_DOC_CHECKLIST = [
  { type: 'PAN', title: 'PAN CARD', required: true, buttonLabel: 'Upload PAN' },
  { type: 'BANK_STATEMENT', title: 'BANK STATEMENT', required: true, buttonLabel: 'Upload Bank Statement' },
  { type: 'INCOME_PROOF', title: 'INCOME PROOF', required: true, buttonLabel: 'Upload Income Proof' },
  { type: 'OTHER', title: 'OTHER DOCUMENTS', required: false, buttonLabel: 'Upload Document' },
];

export const CustomerLoansPage: React.FC = () => {
  useBrandTitle('My Loans');
  const navigate = useNavigate();
  const [expandedLoanDocs, setExpandedLoanDocs] = useState<Record<string, boolean>>({});

  // Loan Document Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>('');
  const [targetReuploadDocId, setTargetReuploadDocId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const toggleLoanDocs = (loanId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedLoanDocs((prev) => ({
      ...prev,
      [loanId]: !prev[loanId],
    }));
  };

  const {
    data: response,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['customerLoans'],
    queryFn: () => loanApi.getCustomerApplications(),
    refetchInterval: 1500,
  });

  const { data: docsData, refetch: refetchDocs } = useQuery({
    queryKey: ['customerDocs'],
    queryFn: async () => {
      try {
        const res = await apiClient.get(API_ENDPOINTS.CUSTOMER_DOCS.LIST);
        return res.data?.data || { documents: [], kycStatus: 'NOT_SUBMITTED' };
      } catch {
        return { documents: [], kycStatus: 'NOT_SUBMITTED' };
      }
    },
    refetchInterval: 1500,
  });

  const { data: chargesData, refetch: refetchCharges } = useQuery({
    queryKey: ['customerCharges'],
    queryFn: async () => {
      try {
        const res = await apiClient.get(API_ENDPOINTS.CUSTOMER_CHARGES.LIST);
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
    refetchInterval: 1500,
  });

  const documents = docsData?.documents || [];
  const kycStatus = docsData?.kycStatus || docsData?.customer?.kycStatus || 'NOT_SUBMITTED';
  const charges = chargesData || [];

  const isKycApproved = kycStatus === 'APPROVED' || kycStatus === 'VERIFIED';
  const kycCharge = charges.find(
    (c: any) =>
      c.name?.toUpperCase().includes('KYC') ||
      c.remark?.toUpperCase().includes('KYC')
  );
  const isKycChargePaid = Boolean(kycCharge && kycCharge.status === 'PAID');
  const isLoanDocsUnlocked = isKycApproved || isKycChargePaid;

  const uploadedLoanDocsCount = LOAN_DOC_CHECKLIST.filter((cfg) =>
    documents.some((d: any) => d.documentType === cfg.type && d.status !== 'REJECTED')
  ).length;

  const handleOpenUpload = (docType: string, docId?: string) => {
    setSelectedDocType(docType);
    setTargetReuploadDocId(docId || null);
    setSelectedFile(null);
    setUploadError(null);
    setUploadModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds 10MB limit.');
      setSelectedFile(null);
      return;
    }
    setUploadError(null);
    setSelectedFile(f);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile || !selectedDocType) {
      setUploadError('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('documentType', selectedDocType);

    try {
      if (targetReuploadDocId) {
        await apiClient.post(API_ENDPOINTS.CUSTOMER_DOCS.REUPLOAD(targetReuploadDocId), formData);
        setUploadSuccess('Document re-uploaded successfully.');
      } else {
        await apiClient.post(API_ENDPOINTS.CUSTOMER_DOCS.UPLOAD, formData);
        setUploadSuccess('Document uploaded successfully.');
      }

      setUploadModalOpen(false);
      setSelectedFile(null);
      refetchDocs();
      refetchCharges();
      refetch();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to upload document.';
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const applications = response?.data || [];
  const pendingOffers = applications.filter((app) => app.status === 'OFFER_PENDING_CUSTOMER');
  const docsRequiredLoans = applications.filter((app) => app.status === 'DOCUMENTS_REQUIRED');
  const activeApplication = applications.find((app) =>
    !['REJECTED', 'CANCELLED', 'CLOSED'].includes(app.status)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            My Loan Applications
          </h1>
          <p className="text-sm text-text-secondary">
            Track your submitted loan requests, status updates, and modified loan offers.
          </p>
        </div>
        {activeApplication ? (
          <Button
            onClick={() => navigate(`/customer/loans/${activeApplication.id}`)}
            className="bg-primary hover:bg-primary/90 text-white font-semibold text-xs shadow-sm"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            Active Application (#{activeApplication.applicationNumber})
          </Button>
        ) : (
          <Link to="/customer/apply">
            <Button className="bg-success text-background hover:brightness-110 text-text-primary shadow-sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Apply for Loan
            </Button>
          </Link>
        )}
      </div>

      {/* Offer Available Banner */}
      {pendingOffers.length > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-background shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-white/20">
              <Sparkles className="w-5 h-5 text-text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">
                You have an offer waiting for your review!
              </p>
              <p className="text-xs text-background/90">
                Application #{pendingOffers[0].applicationNumber} has a proposed offer of ₹
                {pendingOffers[0].proposedAmount?.toLocaleString('en-IN')}.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => navigate(`/customer/loans/${pendingOffers[0].id}`)}
            className="bg-background text-primary hover:bg-background/90 font-semibold text-xs shrink-0 shadow-sm"
          >
            Review Offer
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      )}

      {/* Additional Documents Required Banner */}
      {docsRequiredLoans.length > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-white/20">
              <FolderOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm">
                Underwriting Action: Additional Documents Required!
              </p>
              <p className="text-xs text-white/90">
                Application #{docsRequiredLoans[0].applicationNumber} requires additional verification documents to continue review.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/customer/documents')}
            className="bg-white text-amber-900 hover:bg-white/90 font-bold text-xs shrink-0 shadow-sm"
          >
            Upload Documents
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      )}

      {/* Feedback Alerts */}
      {uploadSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{uploadSuccess}</span>
          </div>
          <button onClick={() => setUploadSuccess(null)} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {/* ── SECTION: LOAN DOCUMENTS (4 REQUIRED DOCUMENT CARDS) ───────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-text-primary flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-[#2563EB]" />
              <span>LOAN DOCUMENTS</span>
            </h2>
            <p className="text-xs text-text-secondary">
              Upload mandatory underwriting documents to complete loan processing.
            </p>
          </div>
          <Badge className="bg-[#EFF6FF] text-[#2563EB] border border-[#D6E4F5] text-xs font-bold px-3 py-1 self-start sm:self-auto">
            {uploadedLoanDocsCount} / 4 Documents Uploaded
          </Badge>
        </div>

        {/* LOCKED GATE */}
        {!isLoanDocsUnlocked ? (
          <Card className="border border-[#D6E4F5] bg-[#F7FAFF] rounded-2xl shadow-xs p-6 sm:p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white border border-[#D6E4F5] text-[#2563EB] flex items-center justify-center mx-auto shadow-xs">
              <Lock className="w-6 h-6 text-[#2563EB]" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h4 className="text-base font-bold text-[#0F172A]">
                Loan Application Documents Locked
              </h4>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Complete the required KYC verification and payment before uploading loan application documents.
              </p>
            </div>
            <div className="pt-2 flex justify-center">
              <Button
                size="sm"
                onClick={() => navigate('/customer/kyc')}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs h-10 px-5 rounded-xl shadow-sm flex items-center gap-1.5 transition active:scale-95"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Complete KYC Verification</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </Card>
        ) : (
          /* UNLOCKED: 4 REQUIRED DOCUMENT CARDS */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {LOAN_DOC_CHECKLIST.map((cfg) => {
              const doc = documents.find((d: any) => d.documentType === cfg.type);
              const isUploaded = Boolean(doc && doc.status !== 'REJECTED');

              return (
                <Card
                  key={cfg.type}
                  className="bg-white border border-[#D6E4F5] rounded-2xl shadow-xs p-4 flex flex-col justify-between hover:border-[#2563EB]/40 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="font-bold text-xs uppercase tracking-wider text-[#0F172A]">
                        {cfg.title}
                      </span>
                      {cfg.required && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded">
                          Required
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-[#64748B]">
                      Status:{' '}
                      <strong className={isUploaded ? 'text-emerald-700' : 'text-slate-600'}>
                        {doc ? (
                          doc.status === 'APPROVED' ? 'Verified ✓' :
                          doc.status === 'UNDER_REVIEW' ? 'Under Review' :
                          doc.status === 'REUPLOAD_REQUIRED' ? 'Re-upload Required' :
                          'Uploaded'
                        ) : 'Not Uploaded'}
                      </strong>
                    </div>

                    {doc && (
                      <div className="p-2 rounded-lg bg-[#F7FAFF] border border-[#D6E4F5] text-[11px] truncate text-[#0F172A] font-medium">
                        {doc.fileName}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 mt-2 border-t border-[#D6E4F5] flex items-center justify-between gap-2">
                    {doc && (
                      <a
                        href={`/api/customer/documents/${doc.id}/file`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-[#2563EB] hover:underline"
                      >
                        View
                      </a>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleOpenUpload(cfg.type, doc?.id)}
                      className={`text-xs h-10 px-3 font-bold rounded-xl flex-1 transition active:scale-95 ${
                        isUploaded
                          ? 'bg-white border border-[#D6E4F5] text-[#0F172A] hover:bg-[#F7FAFF]'
                          : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5 mr-1" />
                      <span>{isUploaded ? 'Re-upload' : cfg.buttonLabel}</span>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-[#D6E4F5] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0F172A]">
              {targetReuploadDocId ? 'Re-upload Document' : `Upload ${selectedDocType}`}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#64748B]">
              Supported formats: PDF, JPG, PNG (Max 10MB).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {uploadError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {uploadError}
              </div>
            )}

            <div className="border-2 border-dashed border-[#D6E4F5] hover:border-[#2563EB] rounded-2xl p-6 text-center transition cursor-pointer bg-[#F7FAFF]">
              <input
                type="file"
                id="loan-doc-file-input"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="loan-doc-file-input" className="cursor-pointer block space-y-2">
                <Upload className="w-8 h-8 text-[#2563EB] mx-auto" />
                <span className="text-xs font-semibold text-[#0F172A] block">
                  {selectedFile ? selectedFile.name : 'Click to select document'}
                </span>
                <span className="text-[10px] text-[#64748B] block">
                  {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'PDF, JPG, or PNG up to 10MB'}
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadModalOpen(false)}
              className="text-xs h-10 px-4 rounded-xl border-[#D6E4F5]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isUploading || !selectedFile}
              onClick={handleUploadSubmit}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs h-10 px-5 rounded-xl shadow-md"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  <span>Uploading...</span>
                </>
              ) : (
                'Upload & Save'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Content Area */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-text-secondary">Loading your loan applications...</p>
        </div>
      ) : isError ? (
        <Card className="border-danger/30 bg-danger/10">
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-danger mx-auto" />
            <p className="text-sm font-medium text-danger">
              Failed to load loan applications.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : applications.length === 0 ? (
        /* Empty State */
        <Card className="border-dashed border-2 border-border bg-surface">
          <CardContent className="py-16 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-surface-elevated text-text-secondary flex items-center justify-center mx-auto">
              <FileText className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg text-text-primary">
                No loan applications yet
              </h3>
              <p className="text-sm text-text-secondary max-w-sm mx-auto">
                You haven&apos;t applied for any loans. Submit an application in minutes to get started.
              </p>
            </div>
            <Link to="/customer/apply">
              <Button className="bg-success text-background hover:brightness-110 text-text-primary">
                <Plus className="w-4 h-4 mr-1.5" />
                Start Your First Application
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        /* Applications List */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {applications.map((app: CustomerLoanApplication) => (
            <Card
              key={app.id}
              className="hover:shadow-md transition-shadow border-border bg-surface cursor-pointer group"
              onClick={() => navigate(`/customer/loans/${app.id}`)}
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-text-secondary bg-surface-elevated px-2 py-0.5 rounded">
                    {app.applicationNumber}
                  </span>
                  <LoanStatusBadge status={app.status} />
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-text-secondary font-medium">Requested Amount</span>
                  <div className="text-2xl font-bold text-text-primary">
                    ₹{app.requestedAmount.toLocaleString('en-IN')}
                  </div>
                  {app.status === 'OFFER_PENDING_CUSTOMER' && app.proposedAmount && (
                    <p className="text-xs text-primary font-semibold">
                      Proposed Offer: ₹{app.proposedAmount.toLocaleString('en-IN')}
                    </p>
                  )}
                  {app.status === 'OFFER_ACCEPTED' && app.acceptedAmount && (
                    <p className="text-xs text-primary font-semibold">
                      Accepted Amount: ₹{app.acceptedAmount.toLocaleString('en-IN')}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary pt-2 border-t border-border/50">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-text-secondary" />
                    <span>{app.tenureMonths} Months Tenure</span>
                  </div>
                  <div className="flex items-center space-x-1.5 justify-end">
                    <Calendar className="w-3.5 h-3.5 text-text-secondary" />
                    <span>{new Date(app.submittedAt || app.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 text-text-secondary border-t border-border/40">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => toggleLoanDocs(app.id, e)}
                    className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/5 flex items-center gap-1 font-medium"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Loan Documents</span>
                    {expandedLoanDocs[app.id] ? (
                      <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                    )}
                  </Button>

                  <span className="text-primary font-medium group-hover:underline inline-flex items-center">
                    View Details
                    <ArrowRight className="w-3 h-3 ml-0.5" />
                  </span>
                </div>

                {/* Inline Loan Documents Section Drawer */}
                {expandedLoanDocs[app.id] && (
                  <div
                    className="mt-4 pt-4 border-t border-border/60"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CustomerLoanDocumentsSection
                      loan={app}
                      documents={documents}
                      kycStatus={kycStatus}
                      charges={charges}
                      onRefresh={() => {
                        refetch();
                        refetchDocs();
                        refetchCharges();
                      }}
                      isCompact={true}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
