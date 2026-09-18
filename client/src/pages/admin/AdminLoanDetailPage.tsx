import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { loanApi, AdminLoanApplicationDetail } from '@/api/loanApi';
import { LoanStatusBadge } from '@/components/LoanStatusBadge';
import {
  ArrowLeft,
  User,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Edit3,
  FileQuestion,
  Loader2,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

export const AdminLoanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Dialog States
  const [startReviewOpen, setStartReviewOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [modifyAmountOpen, setModifyAmountOpen] = useState(false);
  const [proposedAmountInput, setProposedAmountInput] = useState('');
  const [requestDocsOpen, setRequestDocsOpen] = useState(false);
  const [docType, setDocType] = useState('BANK_STATEMENT');
  const [docTitle, setDocTitle] = useState('');
  const [docDesc, setDocDesc] = useState('');
  const [holdOpen, setHoldOpen] = useState(false);
  const [holdReason, setHoldReason] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: response,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['adminLoanDetail', id],
    queryFn: () => loanApi.getAdminApplicationById(id || ''),
    enabled: Boolean(id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['adminLoanDetail', id] });
    queryClient.invalidateQueries({ queryKey: ['adminLoanApplications'] });
  };

  // Mutations
  const reviewMutation = useMutation({
    mutationFn: () => loanApi.startReview(id || ''),
    onSuccess: () => {
      setStartReviewOpen(false);
      invalidate();
    },
    onError: (err: unknown) => {
      setActionError(err instanceof Error ? err.message : 'Failed to start review');
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => loanApi.approveApplication(id || ''),
    onSuccess: () => {
      setApproveOpen(false);
      invalidate();
    },
    onError: (err: unknown) => {
      setActionError(err instanceof Error ? err.message : 'Failed to approve application');
    },
  });

  const modifyMutation = useMutation({
    mutationFn: () =>
      loanApi.modifyAmount(id || '', { proposedAmount: Number(proposedAmountInput) }),
    onSuccess: () => {
      setModifyAmountOpen(false);
      setProposedAmountInput('');
      invalidate();
    },
    onError: (err: unknown) => {
      setActionError(err instanceof Error ? err.message : 'Failed to modify amount');
    },
  });

  const requestDocsMutation = useMutation({
    mutationFn: () =>
      loanApi.requestDocuments(id || '', {
        documentType: docType,
        title: docTitle,
        description: docDesc,
      }),
    onSuccess: () => {
      setRequestDocsOpen(false);
      setDocTitle('');
      setDocDesc('');
      invalidate();
    },
    onError: (err: unknown) => {
      setActionError(err instanceof Error ? err.message : 'Failed to request documents');
    },
  });

  const holdMutation = useMutation({
    mutationFn: () => loanApi.putOnHold(id || '', { holdReason }),
    onSuccess: () => {
      setHoldOpen(false);
      setHoldReason('');
      invalidate();
    },
    onError: (err: unknown) => {
      setActionError(err instanceof Error ? err.message : 'Failed to put on hold');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => loanApi.rejectApplication(id || '', { rejectionReason }),
    onSuccess: () => {
      setRejectOpen(false);
      setRejectionReason('');
      invalidate();
    },
    onError: (err: unknown) => {
      setActionError(err instanceof Error ? err.message : 'Failed to reject application');
    },
  });

  const rawData = response?.data;
  const app: AdminLoanApplicationDetail | undefined =
    rawData && 'applicationNumber' in (rawData as unknown as Record<string, unknown>)
      ? (rawData as unknown as AdminLoanApplicationDetail)
      : (rawData as { data?: AdminLoanApplicationDetail })?.data;

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-slate-700 animate-spin" />
        <p className="text-sm text-slate-500">Loading underwriting file...</p>
      </div>
    );
  }

  if (isError || !app) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
            <h3 className="font-semibold text-red-900">Application File Not Found</h3>
            <p className="text-sm text-red-700">
              The specified loan record could not be loaded from the registry.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/loans')}>
              Back to Loan List
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header & Back */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin/loans')}
          className="text-slate-600 hover:text-slate-900 self-start p-0"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Loan Underwriting Registry
        </Button>
        <div className="flex items-center space-x-2">
          <LoanStatusBadge status={app.status} />
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {actionError}
        </div>
      )}

      {/* Action Command Bar for Underwriter */}
      <Card className="border-slate-800 bg-slate-900 text-white shadow-md">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs text-slate-400 font-mono">Underwriting Workflow Action</span>
            <h3 className="text-sm font-semibold text-white">
              Current File State: {app.status.replace(/_/g, ' ')}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* SUBMITTED State: Start Review */}
            {app.status === 'SUBMITTED' && (
              <Button
                size="sm"
                onClick={() => setStartReviewOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              >
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                Start Review
              </Button>
            )}

            {/* Resuming Review from Hold or Docs Required */}
            {(app.status === 'ON_HOLD' || app.status === 'DOCUMENTS_REQUIRED') && (
              <Button
                size="sm"
                onClick={() => setStartReviewOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
              >
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                Resume Underwriting Review
              </Button>
            )}

            {/* UNDER_REVIEW State Actions */}
            {app.status === 'UNDER_REVIEW' && (
              <>
                <Button
                  size="sm"
                  onClick={() => setApproveOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Approve
                </Button>

                <Button
                  size="sm"
                  onClick={() => {
                    setProposedAmountInput(String(app.requestedAmount));
                    setModifyAmountOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                  Modify Amount
                </Button>

                <Button
                  size="sm"
                  onClick={() => setRequestDocsOpen(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white text-xs"
                >
                  <FileQuestion className="w-3.5 h-3.5 mr-1.5" />
                  Request Documents
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setHoldOpen(true)}
                  className="border-slate-600 bg-slate-800 text-amber-300 hover:bg-slate-700 hover:text-amber-200 text-xs"
                >
                  <PauseCircle className="w-3.5 h-3.5 mr-1.5" />
                  Hold
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRejectOpen(true)}
                  className="border-slate-600 bg-slate-800 text-rose-300 hover:bg-slate-700 hover:text-rose-200 text-xs"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                  Reject
                </Button>
              </>
            )}

            {app.status === 'OFFER_PENDING_CUSTOMER' && (
              <span className="text-xs text-amber-300 font-medium">
                Offer of ₹{app.proposedAmount?.toLocaleString('en-IN')} pending customer decision.
              </span>
            )}
            {app.status === 'OFFER_ACCEPTED' && (
              <span className="text-xs text-emerald-400 font-medium">
                Offer Accepted: ₹{app.acceptedAmount?.toLocaleString('en-IN')}
              </span>
            )}
            {app.status === 'OFFER_REJECTED' && (
              <span className="text-xs text-slate-400 font-medium">
                Offer declined by customer. Original request preserved.
              </span>
            )}
            {app.status === 'APPROVED' && (
              <span className="text-xs text-emerald-400 font-medium">
                Approved in Loan Workflow (Amount: ₹{app.approvedAmount?.toLocaleString('en-IN')})
              </span>
            )}
            {app.status === 'REJECTED' && (
              <span className="text-xs text-rose-400 font-medium">
                Application Rejected: {app.rejectionReason}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Underwriting Particulars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Loan Application Particulars */}
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-mono">Loan Application</span>
                  <CardTitle className="text-lg font-bold text-slate-900">
                    {app.applicationNumber}
                  </CardTitle>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500">Submission Date</span>
                  <p className="text-xs font-semibold text-slate-800">
                    {new Date(app.submittedAt || app.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500">Requested Amount</span>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">
                    ₹{app.requestedAmount.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500">Tenure</span>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">
                    {app.tenureMonths} Months
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500">Proposed / Approved</span>
                  <p className="text-xl font-bold text-emerald-800 mt-0.5">
                    {app.approvedAmount
                      ? `₹${app.approvedAmount.toLocaleString('en-IN')}`
                      : app.proposedAmount
                      ? `₹${app.proposedAmount.toLocaleString('en-IN')}`
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Purpose */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Borrower Stated Purpose
                </span>
                <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {app.purpose}
                </p>
              </div>

              {/* Audit Details */}
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 block">Underwriter Assigned</span>
                  <span className="font-semibold text-slate-700">
                    {app.reviewedBy || 'Pending assignment'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Review Timestamp</span>
                  <span>{app.reviewedAt ? new Date(app.reviewedAt).toLocaleString() : '—'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Document Requests History */}
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold">
                Associated Document Requests ({app.documentRequests?.length || 0})
              </CardTitle>
              <CardDescription>
                Verification items requested from borrower during underwriting.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-3">
              {app.documentRequests && app.documentRequests.length > 0 ? (
                <div className="space-y-2.5">
                  {app.documentRequests.map((docReq: AdminLoanApplicationDetail['documentRequests'][number]) => (
                    <div
                      key={docReq.id}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-900">{docReq.title}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {docReq.documentType}
                          </Badge>
                        </div>
                        {docReq.description && (
                          <p className="text-slate-500">{docReq.description}</p>
                        )}
                        <span className="text-[10px] text-slate-400 block">
                          Requested on {new Date(docReq.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <Badge
                        variant={docReq.status === 'FULFILLED' ? 'success' : 'secondary'}
                        className="text-[10px]"
                      >
                        {docReq.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No additional documents have been requested for this loan file.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Borrower Profile & KYC Summary */}
        <div className="space-y-6">
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-slate-600" />
                  <CardTitle className="text-base font-semibold">Borrower Profile</CardTitle>
                </div>
                <Link
                  to={`/admin/kyc/${app.customer.id}`}
                  className="text-xs text-emerald-700 hover:underline flex items-center font-medium"
                >
                  KYC Console
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 block">Full Legal Name</span>
                <span className="font-bold text-sm text-slate-900">{app.customer.fullName}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block">Mobile Phone</span>
                  <span className="font-mono font-semibold text-slate-800">
                    +91 {app.customer.mobile}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Monthly Income</span>
                  <span className="font-semibold text-slate-800">
                    ₹{app.customer.monthlyIncome?.toLocaleString('en-IN') || '—'}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">Email Address</span>
                <span className="font-medium text-slate-800 break-all">{app.customer.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Residential Address</span>
                <span className="font-medium text-slate-800">
                  {app.customer.address}, {app.customer.city}, {app.customer.state}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Aadhaar (Cryptographically Masked)</span>
                <span className="font-mono font-bold text-slate-800">
                  {app.customer.aadhaarMasked}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-slate-500 font-medium">KYC Verification State</span>
                <Badge
                  variant={app.customer.kycStatus === 'APPROVED' ? 'success' : 'secondary'}
                  className="text-[11px]"
                >
                  {app.customer.kycStatus}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Start Review Dialog */}
      <Dialog open={startReviewOpen} onOpenChange={setStartReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Underwriting Review</DialogTitle>
            <DialogDescription>
              Assign this loan application #{app.applicationNumber} to yourself and move status to
              UNDER_REVIEW.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStartReviewOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => reviewMutation.mutate()}
              disabled={reviewMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Confirm Start Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Application Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Loan Application</DialogTitle>
            <DialogDescription>
              Confirm approval of loan #{app.applicationNumber} for ₹
              {(app.proposedAmount || app.requestedAmount).toLocaleString('en-IN')}. This confirms
              the underwriting decision in the loan workflow.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Approve Loan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modify Amount Dialog */}
      <Dialog open={modifyAmountOpen} onOpenChange={setModifyAmountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modify Loan Amount (Underwriter Offer)</DialogTitle>
            <DialogDescription>
              Propose a different loan amount to the customer. Original requested amount (₹
              {app.requestedAmount.toLocaleString('en-IN')}) will be preserved. The application will
              transition to OFFER_PENDING_CUSTOMER.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="proposedAmount">Proposed Loan Amount (₹)</Label>
            <Input
              id="proposedAmount"
              type="number"
              value={proposedAmountInput}
              onChange={(e) => setProposedAmountInput(e.target.value)}
              placeholder="e.g. 150000"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModifyAmountOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => modifyMutation.mutate()}
              disabled={modifyMutation.isPending || !proposedAmountInput}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Submit Modified Offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Documents Dialog */}
      <Dialog open={requestDocsOpen} onOpenChange={setRequestDocsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Additional KYC / Income Documents</DialogTitle>
            <DialogDescription>
              Create a document requirement linked to this application. The borrower will see it in
              their documents portal. Status will move to DOCUMENTS_REQUIRED.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label htmlFor="docType">Document Type</Label>
              <select
                id="docType"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-2.5 py-1.5"
              >
                <option value="BANK_STATEMENT">Bank Statement</option>
                <option value="INCOME_PROOF">Income Proof (Salary Slip/ITR)</option>
                <option value="PAN">PAN Card</option>
                <option value="AADHAAR_FRONT">Aadhaar Card Front</option>
                <option value="AADHAAR_BACK">Aadhaar Card Back</option>
                <option value="OTHER">Other Specific Verification</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="docTitle">Requirement Title</Label>
              <Input
                id="docTitle"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g. Last 6 Months Bank Statement"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="docDesc">Instructions for Borrower</Label>
              <Input
                id="docDesc"
                value={docDesc}
                onChange={(e) => setDocDesc(e.target.value)}
                placeholder="e.g. Please upload PDF showing salary credits"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDocsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => requestDocsMutation.mutate()}
              disabled={requestDocsMutation.isPending || !docTitle}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Send Request to Borrower
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hold Dialog */}
      <Dialog open={holdOpen} onOpenChange={setHoldOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Place Application On Hold</DialogTitle>
            <DialogDescription>
              Underwriting review will be paused. A mandatory reason is required for internal audit
              and customer status tracking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="holdReason">Mandatory Hold Reason</Label>
            <Input
              id="holdReason"
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              placeholder="e.g. Awaiting verification of employer contact"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHoldOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => holdMutation.mutate()}
              disabled={holdMutation.isPending || !holdReason.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Confirm Hold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Loan Application</DialogTitle>
            <DialogDescription>
              Mark application #{app.applicationNumber} as REJECTED. A mandatory rejection reason is
              required and will be audited.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="rejectionReason">Mandatory Rejection Reason</Label>
            <Input
              id="rejectionReason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Insufficient disposable income for requested tenure"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectMutation.mutate()}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
