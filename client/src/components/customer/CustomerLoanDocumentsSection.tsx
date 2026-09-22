import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  Eye,
  Download,
  ShieldCheck,
  Lock,
  FileSignature,
  Calendar,
  CreditCard,
  ArrowRight,
  Sparkles,
  Loader2,
  FileCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';

export interface LoanDocumentItem {
  id: string;
  documentType: string;
  fileName: string;
  originalFileName?: string;
  fileSize: number;
  mimeType: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'REUPLOAD_REQUIRED';
  version: number;
  rejectionReason?: string | null;
  uploadedAt: string;
  loanId?: string | null;
}

export interface CustomerChargeItem {
  id: string;
  name: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
  remark?: string | null;
  paidAt?: string | null;
  transactionRef?: string | null;
  loanId?: string | null;
  createdAt: string;
}

export interface CustomerLoanContext {
  id: string;
  applicationNumber: string;
  accountNumber?: string | null;
  approvalNumber?: string | null;
  requestedAmount: number;
  approvedAmount?: number | null;
  tenureMonths: number;
  status: string;
  submittedAt?: string;
  createdAt?: string;
}

export const LOAN_DOC_CONFIG = [
  {
    type: 'PAN',
    title: 'PAN Card',
    description: 'Permanent Account Number card showing PAN number and signature.',
    required: true,
  },
  {
    type: 'BANK_STATEMENT',
    title: 'Bank Statement',
    description: 'Recent 3-6 months bank account statement in PDF or clear image format.',
    required: false,
  },
  {
    type: 'INCOME_PROOF',
    title: 'Income Proof / Salary Slip',
    description: 'Latest salary slip, Form 16, or ITR document certifying regular income.',
    required: false,
  },
  {
    type: 'OTHER',
    title: 'Other Documents',
    description: 'Any supplementary financial or guarantor documentation requested by underwriting.',
    required: false,
  },
];

interface CustomerLoanDocumentsSectionProps {
  loan: CustomerLoanContext;
  documents: LoanDocumentItem[];
  kycStatus: string;
  charges: CustomerChargeItem[];
  onRefresh?: () => void;
  isCompact?: boolean;
}

export const CustomerLoanDocumentsSection: React.FC<CustomerLoanDocumentsSectionProps> = ({
  loan,
  documents,
  kycStatus,
  charges,
  onRefresh,
  isCompact = false,
}) => {
  const navigate = useNavigate();

  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState<boolean>(false);
  const [selectedDocType, setSelectedDocType] = useState<string>('');
  const [targetReuploadDocId, setTargetReuploadDocId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // PDF / Document preview modal state
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [downloadBlobFn, setDownloadBlobFn] = useState<(() => void) | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // WORKFLOW STAGE EVALUATION
  // ─────────────────────────────────────────────────────────────────────────────
  const isKycApproved = kycStatus === 'APPROVED' || kycStatus === 'VERIFIED';
  
  const kycCharge = charges.find(
    (c) =>
      c.name?.toUpperCase().includes('KYC') ||
      c.remark?.toUpperCase().includes('KYC')
  );
  const isKycChargePaid = Boolean(kycCharge && kycCharge.status === 'PAID');

  const processingFeeCharge = charges.find(
    (c) =>
      c.name?.toUpperCase().includes('PROCESSING') ||
      c.remark?.toUpperCase().includes('PROCESSING') ||
      c.name?.toUpperCase().includes('DEPOSIT')
  );
  const isProcessingFeePaid = Boolean(processingFeeCharge && processingFeeCharge.status === 'PAID');

  // Documents uploaded for this loan or overall profile
  const panDoc = documents.find((d) => d.documentType === 'PAN' && (!d.loanId || d.loanId === loan.id));
  const hasMandatoryLoanDocs = Boolean(panDoc && panDoc.status !== 'REJECTED' && panDoc.status !== 'REUPLOAD_REQUIRED');

  // Is loan in an approved or post-approval state?
  const isSanctioned = [
    'APPROVED',
    'AGREEMENT_PENDING',
    'AGREEMENT_SIGNED',
    'DISBURSED',
    'ACTIVE',
    'CLOSED',
  ].includes(loan.status.toUpperCase());

  // ─────────────────────────────────────────────────────────────────────────────
  // DOCUMENT HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────
  const openUploadModal = (docType: string, reuploadDocId?: string) => {
    setSelectedDocType(docType);
    setTargetReuploadDocId(reuploadDocId || null);
    setSelectedFile(null);
    setUploadError(null);
    setUploadDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds 10 MB limit.');
      setSelectedFile(null);
      return;
    }

    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setUploadError('Invalid file type. Supported formats: PDF, JPG, PNG.');
      setSelectedFile(null);
      return;
    }

    setUploadError(null);
    setSelectedFile(file);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile || !selectedDocType) {
      setUploadError('Please choose a file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('documentType', selectedDocType);
      if (loan.id) {
        formData.append('loanId', loan.id);
      }

      if (targetReuploadDocId) {
        await apiClient.post(API_ENDPOINTS.CUSTOMER_DOCS.REUPLOAD(targetReuploadDocId), formData);
        setUploadSuccess('Corrected document re-uploaded successfully.');
      } else {
        await apiClient.post(API_ENDPOINTS.CUSTOMER_DOCS.UPLOAD, formData);
        setUploadSuccess('Document uploaded successfully and queued for review.');
      }

      setUploadDialogOpen(false);
      setSelectedFile(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to upload document.';
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadBlob = async (url: string, filename: string) => {
    try {
      const res = await apiClient.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch {
      alert('Failed to download document.');
    }
  };

  const handleViewPdf = async (url: string, title: string, downloadFn?: () => void) => {
    try {
      setPreviewTitle(title);
      setPreviewLoading(true);
      setPreviewUrl(null);
      setDownloadBlobFn(() => downloadFn || null);
      setPreviewOpen(true);

      const res = await apiClient.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(blob);
      setPreviewUrl(blobUrl);
    } catch {
      alert('Could not load PDF document preview.');
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleViewGenericDoc = async (docId: string, fileName: string) => {
    try {
      const res = await apiClient.get(API_ENDPOINTS.CUSTOMER_DOCS.FILE(docId), {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(blob);
      setPreviewUrl(blobUrl);
      setPreviewTitle(fileName);
      setDownloadBlobFn(() => () => handleDownloadBlob(API_ENDPOINTS.CUSTOMER_DOCS.FILE(docId), fileName));
      setPreviewOpen(true);
    } catch {
      alert('Could not open document.');
    }
  };

  const getDocStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Verified
          </Badge>
        );
      case 'UNDER_REVIEW':
        return (
          <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
            <Clock className="w-3 h-3 mr-1 text-blue-600" /> Under Review
          </Badge>
        );
      case 'REUPLOAD_REQUIRED':
        return (
          <Badge className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
            <RotateCw className="w-3 h-3 mr-1 text-amber-600" /> Re-upload
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">
            <AlertCircle className="w-3 h-3 mr-1 text-red-600" /> Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[#64748B] border-[#D6E4F5] text-[10px]">
            Not Uploaded
          </Badge>
        );
    }
  };

  const approvalNo = loan.approvalNumber || loan.accountNumber || loan.applicationNumber;

  return (
    <div className={isCompact ? "space-y-3.5" : "space-y-5"}>
      {/* ── Section Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#D6E4F5]">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-[#0F172A] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#2563EB]" />
            <span>Documents for Application #{loan.applicationNumber}</span>
          </h3>
          <p className="text-xs text-[#64748B]">
            Manage stage-specific documents, verification records, and official sanction letters for this loan.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-semibold text-[#64748B]">Loan Status:</span>
          <Badge className="bg-[#EFF6FF] text-[#2563EB] border border-[#D6E4F5] text-[11px] font-bold">
            {loan.status.replace(/_/g, ' ')}
          </Badge>
        </div>
      </div>

      {/* Notifications */}
      {uploadSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{uploadSuccess}</span>
          </div>
          <button onClick={() => setUploadSuccess(null)} className="text-emerald-700 hover:text-emerald-900 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* STAGE 1: BEFORE KYC VERIFICATION                                    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {!isKycApproved && (
        <Card className="border border-[#D6E4F5] bg-[#F7FAFF] rounded-2xl shadow-xs">
          <CardContent className="p-5 sm:p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white border border-[#D6E4F5] text-[#2563EB] flex items-center justify-center mx-auto shadow-xs">
              <Lock className="w-6 h-6 text-[#2563EB]" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h4 className="text-sm sm:text-base font-bold text-[#0F172A]">
                KYC Identity Verification Required
              </h4>
              <p className="text-xs text-[#64748B] leading-relaxed">
                To protect your financial identity, loan documents unlock after your <strong>Aadhaar Card (Front & Back)</strong> has been inspected and verified by our compliance team.
              </p>
            </div>
            <div className="pt-2 flex justify-center">
              <Button
                size="sm"
                onClick={() => navigate('/customer/kyc')}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs h-9 px-5 rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Complete KYC Verification</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* STAGE 3: KYC VERIFIED &rarr; LOAN DOCUMENTS UNLOCKED                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isKycApproved && (
        <div className="space-y-4">
          {/* Non-blocking reminder if KYC charge is pending */}
          {!isKycChargePaid && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-600 shrink-0" />
                <span>KYC Identity Approved. You may upload loan documents below while completing the KYC verification fee.</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/customer/payments')}
                className="h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-100 shrink-0"
              >
                Pay KYC Fee
              </Button>
            </div>
          )}
          {/* Workflow Stage Banner */}
          <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#D6E4F5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#2563EB] text-white flex items-center justify-center shrink-0">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-[#0F172A]">Loan Documents Active</p>
                <p className="text-[#64748B] text-[11px]">
                  Upload required financial documents for loan assessment.
                </p>
              </div>
            </div>

            {hasMandatoryLoanDocs && !isProcessingFeePaid && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#64748B] font-medium">Next Stage:</span>
                <Button
                  size="sm"
                  onClick={() => navigate('/customer/payments')}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs h-7.5 px-3 rounded-lg shadow-xs"
                >
                  Pay Processing Fee →
                </Button>
              </div>
            )}
          </div>

          {/* Grid of Loan Documents */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {LOAN_DOC_CONFIG.map((cfg) => {
              const doc = documents.find(
                (d) => d.documentType === cfg.type && (!d.loanId || d.loanId === loan.id)
              );
              const status = doc ? doc.status : 'NOT_UPLOADED';

              return (
                <Card
                  key={cfg.type}
                  className="bg-white border border-[#D6E4F5] rounded-xl shadow-xs flex flex-col justify-between hover:border-[#2563EB]/40 transition-colors"
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm font-bold text-[#0F172A]">
                            {cfg.title}
                          </CardTitle>
                          {cfg.required && (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded">
                              Required
                            </span>
                          )}
                        </div>
                        <CardDescription className="text-xs text-[#64748B]">
                          {cfg.description}
                        </CardDescription>
                      </div>
                      <div>{getDocStatusBadge(status)}</div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 space-y-3">
                    {/* Review Feedback if Rejected or Correction Required */}
                    {doc && (doc.status === 'REUPLOAD_REQUIRED' || doc.status === 'REJECTED') && doc.rejectionReason && (
                      <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                        <span className="font-bold block text-[11px] mb-0.5">Reviewer Note:</span>
                        <p className="text-[11px] leading-tight">{doc.rejectionReason}</p>
                      </div>
                    )}

                    {/* Uploaded File Info */}
                    {doc && (
                      <div className="p-2.5 rounded-lg bg-[#F7FAFF] border border-[#D6E4F5] flex items-center justify-between text-xs">
                        <div className="truncate mr-2">
                          <p className="font-semibold text-[#0F172A] truncate text-[11px]">{doc.fileName}</p>
                          <p className="text-[10px] text-[#64748B]">
                            {(doc.fileSize / 1024).toFixed(1)} KB • v{doc.version} • {new Date(doc.uploadedAt).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewGenericDoc(doc.id, doc.fileName)}
                          className="h-7 px-2 text-xs text-[#2563EB] hover:bg-[#EFF6FF] shrink-0 font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
                        </Button>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#D6E4F5]/60">
                      {!doc ? (
                        <Button
                          size="sm"
                          onClick={() => openUploadModal(cfg.type)}
                          className="w-full sm:w-auto h-8 px-3 text-xs bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload {cfg.title}</span>
                        </Button>
                      ) : doc.status === 'REUPLOAD_REQUIRED' || doc.status === 'REJECTED' ? (
                        <Button
                          size="sm"
                          onClick={() => openUploadModal(cfg.type, doc.id)}
                          className="w-full sm:w-auto h-8 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>Re-upload Corrected</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openUploadModal(cfg.type, doc.id)}
                          className="text-xs text-[#64748B] hover:text-[#0F172A] h-7"
                        >
                          <span>Replace File</span>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* STAGE 5: SANCTIONED DOCUMENTS (APPROVAL LETTER, AGREEMENT, EMI, INVOICES) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isSanctioned && (
        <div className="space-y-3 pt-4 border-t border-[#D6E4F5]">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-[#0F172A] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Sanctioned Loan Documents</span>
              </h4>
              <p className="text-xs text-[#64748B]">
                Official legal agreements, sanction approval letters, and verified payment invoices.
              </p>
            </div>
            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
              SANCTIONED
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {/* 1. Approval Letter */}
            <Card className="bg-white border border-[#D6E4F5] rounded-xl shadow-xs flex flex-col justify-between">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                    ISSUED
                  </Badge>
                </div>
                <CardTitle className="text-xs sm:text-sm font-bold text-[#0F172A] mt-2">
                  Approval Letter
                </CardTitle>
                <CardDescription className="text-[11px] text-[#64748B]">
                  Sanction terms & authorized credit letter.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 pt-1 space-y-2">
                <div className="text-[11px] text-[#64748B] bg-[#F7FAFF] p-2 rounded-lg border border-[#D6E4F5]">
                  <span>Sanctioned: </span>
                  <strong className="text-[#0F172A] font-mono">
                    ₹{(loan.approvedAmount || loan.requestedAmount).toLocaleString('en-IN')}
                  </strong>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleViewPdf(
                        `/customer/loans/${loan.id}/approval-letter/pdf`,
                        `Approval Letter - ${approvalNo}`,
                        () =>
                          handleDownloadBlob(
                            `/customer/loans/${loan.id}/approval-letter/pdf?download=true`,
                            `Approval_Letter_${approvalNo}.pdf`
                          )
                      )
                    }
                    className="flex-1 text-xs h-8 border-[#D6E4F5] text-[#0F172A] hover:bg-[#EFF6FF]"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1 text-[#2563EB]" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      handleDownloadBlob(
                        `/customer/loans/${loan.id}/approval-letter/pdf?download=true`,
                        `Approval_Letter_${approvalNo}.pdf`
                      )
                    }
                    className="flex-1 text-xs h-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 2. Loan Agreement */}
            <Card className="bg-white border border-[#D6E4F5] rounded-xl shadow-xs flex flex-col justify-between">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                    <FileSignature className="w-4 h-4" />
                  </div>
                  {loan.status === 'DISBURSED' || loan.status === 'ACTIVE' || loan.status === 'AGREEMENT_SIGNED' ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      SIGNED ✓
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                      AWAITING SIGNATURE
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-xs sm:text-sm font-bold text-[#0F172A] mt-2">
                  Loan Agreement
                </CardTitle>
                <CardDescription className="text-[11px] text-[#64748B]">
                  Borrower covenants & digital execution deed.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 pt-1 space-y-2">
                <div className="text-[11px] text-[#64748B] bg-[#F7FAFF] p-2 rounded-lg border border-[#D6E4F5]">
                  <span>Status: </span>
                  <strong className="text-[#0F172A]">
                    {loan.status === 'DISBURSED' || loan.status === 'ACTIVE' || loan.status === 'AGREEMENT_SIGNED'
                      ? 'Digitally Accepted'
                      : 'Pending Signature'}
                  </strong>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/customer/loans/${loan.id}/agreement`)}
                    className="w-full text-xs h-8 border-[#D6E4F5] text-[#2563EB] hover:bg-[#EFF6FF] font-semibold"
                  >
                    <FileSignature className="w-3.5 h-3.5 mr-1" />
                    {loan.status === 'DISBURSED' || loan.status === 'ACTIVE' || loan.status === 'AGREEMENT_SIGNED'
                      ? 'View Agreement'
                      : 'Review & Sign Agreement'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 3. EMI Schedule */}
            <Card className="bg-white border border-[#D6E4F5] rounded-xl shadow-xs flex flex-col justify-between">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                    AVAILABLE
                  </Badge>
                </div>
                <CardTitle className="text-xs sm:text-sm font-bold text-[#0F172A] mt-2">
                  EMI Schedule
                </CardTitle>
                <CardDescription className="text-[11px] text-[#64748B]">
                  Monthly amortization & principal split.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 pt-1 space-y-2">
                <div className="text-[11px] text-[#64748B] bg-[#F7FAFF] p-2 rounded-lg border border-[#D6E4F5]">
                  <span>Tenure: </span>
                  <strong className="text-[#0F172A] font-mono">{loan.tenureMonths} Months</strong>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/customer/loans/${loan.id}/emi`)}
                    className="flex-1 text-xs h-8 border-[#D6E4F5] text-[#0F172A] hover:bg-[#EFF6FF]"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1 text-[#2563EB]" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      handleDownloadBlob(
                        `/customer/loans/${loan.id}/emi-pdf`,
                        `EMI_Schedule_${loan.applicationNumber}.pdf`
                      )
                    }
                    className="flex-1 text-xs h-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* UPLOAD MODAL                                                        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md bg-white border border-[#D6E4F5] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#2563EB]" />
              <span>Upload Document</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#64748B]">
              Application #{loan.applicationNumber} • Document: {selectedDocType.replace(/_/g, ' ')}
            </DialogDescription>
          </DialogHeader>

          {uploadError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {uploadError}
            </div>
          )}

          <div className="space-y-3 py-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#D6E4F5] hover:border-[#2563EB] rounded-xl p-6 text-center cursor-pointer bg-[#F7FAFF] hover:bg-[#EFF6FF]/40 transition-colors"
            >
              <Upload className="w-8 h-8 text-[#2563EB] mx-auto mb-2" />
              <p className="text-xs font-bold text-[#0F172A]">
                {selectedFile ? selectedFile.name : 'Click to browse and upload file'}
              </p>
              <p className="text-[11px] text-[#64748B] mt-1">
                Supported formats: PDF, JPG, PNG (Max 10MB)
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadDialogOpen(false)}
              disabled={isUploading}
              className="border-[#D6E4F5] text-[#64748B]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUploadSubmit}
              disabled={isUploading || !selectedFile}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload Document'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* PDF / DOCUMENT VIEWER MODAL                                         */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl w-full h-[85vh] bg-white border border-[#D6E4F5] rounded-2xl flex flex-col p-4">
          <DialogHeader className="pb-2 border-b border-[#D6E4F5]">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm font-bold text-[#0F172A]">
                {previewTitle}
              </DialogTitle>
              {downloadBlobFn && (
                <Button
                  size="sm"
                  onClick={downloadBlobFn}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs h-7 px-3 mr-6 font-semibold"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Download
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 w-full h-full bg-[#F7FAFF] rounded-xl overflow-hidden mt-2 relative">
            {previewLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
              </div>
            ) : previewUrl ? (
              <iframe
                src={previewUrl}
                title={previewTitle}
                className="w-full h-full border-none rounded-xl"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-[#64748B]">
                Unable to load document preview.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
