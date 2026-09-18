import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  IndianRupee,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  Eye,
  Plus,
  Loader2,
  FileCheck2,
  AlertTriangle,
} from 'lucide-react';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface KycDocumentDetail {
  id: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'REUPLOAD_REQUIRED';
  version: number;
  rejectionReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  uploadedAt: string;
}

interface CustomerKycData {
  customer: {
    id: string;
    fullName: string;
    mobile: string;
    email: string;
    address: string;
    state: string;
    city: string;
    monthlyIncome: number;
    aadhaarMasked: string;
    accountStatus: string;
    kycStatus: string;
    createdAt: string;
    updatedAt: string;
  };
  documents: KycDocumentDetail[];
  documentHistory: KycDocumentDetail[];
  pendingRequests: Array<{
    id: string;
    documentType: string;
    title: string;
    description?: string | null;
    status: string;
    requestedBy?: string | null;
    createdAt: string;
  }>;
}

export const AdminKycDetail: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<CustomerKycData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Review Dialog State
  const [reviewModalOpen, setReviewModalOpen] = useState<boolean>(false);
  const [activeDocForReview, setActiveDocForReview] = useState<KycDocumentDetail | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT' | 'REQUEST_REUPLOAD'>('APPROVE');
  const [reviewReason, setReviewReason] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Request Document Dialog State
  const [requestModalOpen, setRequestModalOpen] = useState<boolean>(false);
  const [requestDocType, setRequestDocType] = useState<string>('OTHER');
  const [requestTitle, setRequestTitle] = useState<string>('');
  const [requestDescription, setRequestDescription] = useState<string>('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState<boolean>(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const fetchKycDetail = useCallback(async () => {
    if (!customerId) return;
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await apiClient.get(API_ENDPOINTS.ADMIN.KYC_DETAIL(customerId));
      setData(res.data.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to load customer KYC details';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchKycDetail();
  }, [fetchKycDetail]);

  const handleOpenReviewModal = (doc: KycDocumentDetail, action: 'APPROVE' | 'REJECT' | 'REQUEST_REUPLOAD') => {
    setActiveDocForReview(doc);
    setReviewAction(action);
    setReviewReason('');
    setReviewError(null);
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!activeDocForReview) return;

    if ((reviewAction === 'REJECT' || reviewAction === 'REQUEST_REUPLOAD') && !reviewReason.trim()) {
      setReviewError('A review reason is mandatory when rejecting or requesting re-upload.');
      return;
    }

    try {
      setIsSubmittingReview(true);
      setReviewError(null);

      await apiClient.post(API_ENDPOINTS.ADMIN.REVIEW_DOCUMENT(activeDocForReview.id), {
        action: reviewAction,
        reason: reviewReason.trim() || undefined,
      });

      setSuccessMessage(`Document "${activeDocForReview.documentType}" review submitted successfully.`);
      setReviewModalOpen(false);
      fetchKycDetail();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to submit document review';
      setReviewError(msg);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleOpenDocumentFile = async (documentId: string, fileName: string) => {
    try {
      const res = await apiClient.get(API_ENDPOINTS.ADMIN.DOCUMENT_FILE(documentId), {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: res.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch {
      setErrorMessage(`Failed to open document "${fileName}". Please try again.`);
    }
  };

  const handleSubmitRequestDocument = async () => {
    if (!customerId || !requestTitle.trim()) {
      setRequestError('Please provide a document title.');
      return;
    }

    try {
      setIsSubmittingRequest(true);
      setRequestError(null);

      await apiClient.post(API_ENDPOINTS.ADMIN.REQUEST_DOCUMENT(customerId), {
        documentType: requestDocType,
        title: requestTitle.trim(),
        description: requestDescription.trim() || undefined,
      });

      setSuccessMessage('Additional document requested successfully.');
      setRequestModalOpen(false);
      setRequestTitle('');
      setRequestDescription('');
      fetchKycDetail();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to request additional document';
      setRequestError(msg);
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleOverallKycDecision = async (status: 'APPROVED' | 'REJECTED') => {
    if (!customerId) return;
    const confirmMsg =
      status === 'APPROVED'
        ? 'Are you sure you want to approve this customer for KYC compliance?'
        : 'Are you sure you want to reject this customer KYC?';

    if (!window.confirm(confirmMsg)) return;

    try {
      await apiClient.post(API_ENDPOINTS.ADMIN.KYC_DECISION(customerId), {
        status,
        reason: status === 'REJECTED' ? 'KYC documents do not satisfy compliance guidelines.' : undefined,
      });
      setSuccessMessage(`Overall KYC marked as ${status}`);
      fetchKycDetail();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update KYC status';
      setErrorMessage(msg);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Badge variant="success" className="flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
          </Badge>
        );
      case 'REUPLOAD_REQUIRED':
        return (
          <Badge variant="warning" className="flex items-center space-x-1">
            <RotateCw className="w-3 h-3 mr-1" /> Re-upload Required
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="destructive" className="flex items-center space-x-1">
            <AlertCircle className="w-3 h-3 mr-1" /> Rejected
          </Badge>
        );
      case 'UNDER_REVIEW':
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 flex items-center space-x-1">
            <Clock className="w-3 h-3 mr-1" /> Under Review
          </Badge>
        );
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-slate-500 font-medium">Loading customer KYC review...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center max-w-lg mx-auto">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-900">Customer Not Found</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">{errorMessage || 'Unable to load customer KYC details.'}</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/admin/kyc')}>
          Return to Queue
        </Button>
      </div>
    );
  }

  const { customer, documents, documentHistory, pendingRequests } = data;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Back Button and Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin/kyc')}
          className="text-xs text-slate-600 hover:text-slate-900 flex items-center space-x-1"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          <span>Back to KYC Queue</span>
        </Button>

        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRequestModalOpen(true)}
            className="text-xs flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Request Additional Document</span>
          </Button>

          {customer.kycStatus !== 'APPROVED' && (
            <Button
              size="sm"
              onClick={() => handleOverallKycDecision('APPROVED')}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              <span>Approve Full KYC</span>
            </Button>
          )}

          {customer.kycStatus !== 'REJECTED' && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleOverallKycDecision('REJECTED')}
              className="text-xs"
            >
              <AlertCircle className="w-3.5 h-3.5 mr-1" />
              <span>Reject KYC</span>
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="flex items-center space-x-2 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center space-x-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Customer Profile Summary */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-bold flex items-center space-x-2">
                <User className="w-5 h-5 text-emerald-600" />
                <span>{customer.fullName}</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Registered on {new Date(customer.createdAt).toLocaleDateString('en-IN')} • ID: {customer.id}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 font-medium">Overall KYC Status:</span>
              {getStatusBadge(customer.kycStatus)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Mobile Number</span>
              <span className="font-mono font-semibold text-slate-800 flex items-center">
                <Phone className="w-3.5 h-3.5 mr-1 text-slate-400" />
                +91 {customer.mobile}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Email Address</span>
              <span className="font-medium text-slate-800 truncate block">
                <Mail className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                {customer.email}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Location</span>
              <span className="font-medium text-slate-800">
                <MapPin className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                {customer.city}, {customer.state}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Declared Monthly Income</span>
              <span className="font-mono font-semibold text-slate-800">
                <IndianRupee className="w-3.5 h-3.5 inline mr-0.5 text-slate-400" />
                {customer.monthlyIncome.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 block mb-0.5">Residential Address</span>
              <span className="font-medium text-slate-800">{customer.address}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 block mb-0.5">Aadhaar (Protected & Masked)</span>
              <span className="font-mono font-bold text-slate-800 tracking-wider flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                {customer.aadhaarMasked}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Additional Requests from Admin */}
      {pendingRequests.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-amber-900 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Pending Customer Action: Requested Documents ({pendingRequests.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingRequests.map((r) => (
              <div key={r.id} className="bg-white p-3 rounded-md border border-amber-200 text-xs flex justify-between">
                <div>
                  <span className="font-semibold text-slate-900 block">{r.title}</span>
                  {r.description && <p className="text-slate-600 mt-0.5">{r.description}</p>}
                </div>
                <Badge variant="outline" className="h-6 text-amber-700 bg-amber-50 self-start">
                  Awaiting Customer
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Uploaded Documents for Review */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
          <FileCheck2 className="w-4 h-4 text-emerald-600" />
          <span>Active KYC Documents ({documents.length})</span>
        </h3>

        {documents.length === 0 ? (
          <Card className="text-center py-8">
            <CardContent>
              <p className="text-xs text-slate-500">The customer has not uploaded any documents yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <Card key={doc.id} className="flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                        <span>{doc.documentType.replace('_', ' ')}</span>
                        <Badge variant="outline" className="text-[10px] bg-slate-100">
                          v{doc.version}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5 truncate max-w-[240px]">
                        {doc.fileName} • {(doc.fileSize / 1024).toFixed(1)} KB
                      </CardDescription>
                    </div>
                    {getStatusBadge(doc.status)}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-2">
                  {doc.rejectionReason && (
                    <div className="p-2.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-900">
                      <span className="font-semibold block mb-0.5">Feedback Note:</span>
                      <p>{doc.rejectionReason}</p>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Uploaded: {new Date(doc.uploadedAt).toLocaleString('en-IN')}</span>
                    {doc.reviewedBy && <span>Reviewed by: {doc.reviewedBy}</span>}
                  </div>

                  {/* Document Actions */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDocumentFile(doc.id, doc.fileName)}
                      className="text-xs flex items-center space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      <span>View File</span>
                    </Button>

                    <div className="flex items-center space-x-1.5 ml-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenReviewModal(doc, 'REQUEST_REUPLOAD')}
                        className="text-xs text-amber-700 hover:bg-amber-50"
                      >
                        <RotateCw className="w-3.5 h-3.5 mr-1" />
                        <span>Re-upload</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenReviewModal(doc, 'REJECT')}
                        className="text-xs text-destructive hover:bg-red-50"
                      >
                        <AlertCircle className="w-3.5 h-3.5 mr-1" />
                        <span>Reject</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleOpenReviewModal(doc, 'APPROVE')}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        <span>Approve</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Historical Versions if any */}
      {documentHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Archived Document Version History ({documentHistory.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Previous versions preserved for audit compliance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-slate-100 text-xs">
              {documentHistory.map((h) => (
                <div key={h.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800">
                      {h.documentType.replace('_', ' ')} (Version {h.version})
                    </span>
                    <span className="text-slate-400 block">{h.fileName} • {new Date(h.uploadedAt).toLocaleDateString('en-IN')}</span>
                    {h.rejectionReason && (
                      <span className="text-red-600 block mt-0.5">Prior Reason: {h.rejectionReason}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(h.status)}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenDocumentFile(h.id, h.fileName)}
                      className="text-xs text-slate-500 hover:text-slate-900"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Dialog */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'APPROVE'
                ? 'Approve Document'
                : reviewAction === 'REJECT'
                ? 'Reject Document'
                : 'Request Document Re-upload'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Reviewing {activeDocForReview?.documentType.replace('_', ' ')} (v{activeDocForReview?.version}).
            </DialogDescription>
          </DialogHeader>

          {reviewError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{reviewError}</span>
            </div>
          )}

          <div className="space-y-3 py-2">
            {(reviewAction === 'REJECT' || reviewAction === 'REQUEST_REUPLOAD') && (
              <div className="space-y-1.5">
                <Label htmlFor="reviewReason" className="text-xs font-semibold">
                  Reason for {reviewAction === 'REJECT' ? 'Rejection' : 'Re-upload'} *
                </Label>
                <textarea
                  id="reviewReason"
                  rows={3}
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  placeholder="e.g. Image is blurry or corners are cropped. Please upload a clear original."
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="text-[11px] text-slate-400">
                  This note will be displayed directly to the customer on their KYC dashboard.
                </p>
              </div>
            )}

            {reviewAction === 'APPROVE' && (
              <p className="text-xs text-slate-600">
                Are you sure you want to mark this document as verified and approved?
              </p>
            )}
          </div>

          <DialogFooter className="flex space-x-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReviewModalOpen(false)}
              disabled={isSubmittingReview}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitReview}
              disabled={isSubmittingReview}
              variant={reviewAction === 'REJECT' ? 'destructive' : 'default'}
            >
              {isSubmittingReview ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              <span>Confirm {reviewAction.replace('_', ' ')}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Additional Document Dialog */}
      <Dialog open={requestModalOpen} onOpenChange={setRequestModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Additional Document</DialogTitle>
            <DialogDescription className="text-xs">
              Specify the document requirement to be fulfilled by the customer.
            </DialogDescription>
          </DialogHeader>

          {requestError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{requestError}</span>
            </div>
          )}

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="requestDocType" className="text-xs">Document Type</Label>
              <select
                id="requestDocType"
                value={requestDocType}
                onChange={(e) => setRequestDocType(e.target.value)}
                className="w-full flex h-9 rounded-md border border-input bg-background px-3 py-1.5 text-xs"
              >
                <option value="BANK_STATEMENT">Bank Statement</option>
                <option value="INCOME_PROOF">Income Proof (Salary slip / ITR)</option>
                <option value="PAN">PAN Card</option>
                <option value="AADHAAR_FRONT">Aadhaar Front</option>
                <option value="AADHAAR_BACK">Aadhaar Back</option>
                <option value="OTHER">Other Specific Document</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="requestTitle" className="text-xs">Title *</Label>
              <Input
                id="requestTitle"
                value={requestTitle}
                onChange={(e) => setRequestTitle(e.target.value)}
                placeholder="e.g. Latest 3-month salary account statement"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="requestDescription" className="text-xs">Instructions for Customer</Label>
              <textarea
                id="requestDescription"
                rows={3}
                value={requestDescription}
                onChange={(e) => setRequestDescription(e.target.value)}
                placeholder="e.g. Statement must show employer salary credit with bank stamp."
                className="w-full rounded-md border border-input bg-background p-2.5 text-xs ring-offset-background"
              />
            </div>
          </div>

          <DialogFooter className="flex space-x-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRequestModalOpen(false)}
              disabled={isSubmittingRequest}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitRequestDocument}
              disabled={isSubmittingRequest || !requestTitle.trim()}
            >
              {isSubmittingRequest ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              <span>Send Document Request</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
