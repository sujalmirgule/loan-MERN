import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { loanApi, CustomerLoanApplication } from '@/api/loanApi';
import { LoanStatusBadge } from '@/components/LoanStatusBadge';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  FileQuestion,
  Info,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useBrandTitle } from '@/hooks/useBrandTitle';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { CustomerLoanDocumentsSection } from '@/components/customer/CustomerLoanDocumentsSection';

export const CustomerLoanDetailPage: React.FC = () => {
  useBrandTitle('Loan Details');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: response,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['customerLoanDetail', id],
    queryFn: () => loanApi.getCustomerApplicationById(id || ''),
    enabled: Boolean(id),
  });

  const { data: docsData } = useQuery({
    queryKey: ['customerDocs'],
    queryFn: async () => {
      try {
        const res = await apiClient.get(API_ENDPOINTS.CUSTOMER_DOCS.LIST);
        return res.data?.data || { documents: [], kycStatus: 'NOT_SUBMITTED' };
      } catch {
        return { documents: [], kycStatus: 'NOT_SUBMITTED' };
      }
    },
  });

  const { data: chargesData } = useQuery({
    queryKey: ['customerCharges'],
    queryFn: async () => {
      try {
        const res = await apiClient.get(API_ENDPOINTS.CUSTOMER_CHARGES.LIST);
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  const documents = docsData?.documents || [];
  const kycStatus = docsData?.kycStatus || docsData?.customer?.kycStatus || 'NOT_SUBMITTED';
  const charges = chargesData || [];

  const acceptMutation = useMutation({
    mutationFn: () => loanApi.acceptOffer(id || ''),
    onSuccess: () => {
      setAcceptDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['customerLoanDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['customerLoans'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to accept offer';
      setActionError(msg);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => loanApi.rejectOffer(id || ''),
    onSuccess: () => {
      setRejectDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['customerLoanDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['customerLoans'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to reject offer';
      setActionError(msg);
    },
  });

  const rawData = response?.data;
  const app: CustomerLoanApplication | undefined =
    (rawData && 'applicationNumber' in (rawData as unknown as Record<string, unknown>)
      ? (rawData as unknown as CustomerLoanApplication)
      : (rawData as { data?: CustomerLoanApplication })?.data) ||
    (response && 'applicationNumber' in (response as unknown as Record<string, unknown>)
      ? (response as unknown as CustomerLoanApplication)
      : (response as any)?.application || (response as any)?.data);

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-text-secondary">Loading application details...</p>
      </div>
    );
  }

  if (isError || !app) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <Card className="border-danger/20 bg-danger/10">
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <Info className="w-8 h-8 text-danger mx-auto" />
            <h3 className="font-semibold text-danger">Application Not Found</h3>
            <p className="text-sm text-danger">
              The loan application could not be loaded or you may not have access to view it.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate('/customer/loans')}>
              Back to My Applications
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Button & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/customer/loans')}
          className="text-text-secondary hover:text-text-primary self-start p-0"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Applications
        </Button>
        <div className="flex items-center space-x-2">
          <LoanStatusBadge status={app.status} />
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
          {actionError}
        </div>
      )}

      {/* Offer Available Action Banner */}
      {app.status === 'OFFER_PENDING_CUSTOMER' && app.proposedAmount && (
        <Card className="border-primary/30 bg-primary/5 shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-primary/20">
            <div className="flex items-center space-x-2 text-primary">
              <Sparkles className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg font-bold">Modified Loan Offer Available</CardTitle>
            </div>
            <CardDescription className="text-text-secondary">
              Our underwriters have reviewed your application and proposed an adjusted loan amount.
              Please review and accept or reject this offer.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-lg bg-surface border border-border space-y-1">
                <span className="text-xs text-text-secondary font-medium">Your Requested Amount</span>
                <p className="text-xl font-bold text-text-primary line-through">
                  ₹{app.requestedAmount.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-primary/10 border border-primary/30 space-y-1">
                <span className="text-xs text-primary font-semibold uppercase tracking-wider">
                  Proposed Offer Amount
                </span>
                <p className="text-2xl font-extrabold text-primary">
                  ₹{app.proposedAmount.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={() => setAcceptDialogOpen(true)}
                className="bg-success text-background hover:brightness-110 text-text-primary flex-1"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Accept Offer
              </Button>
              <Button
                variant="outline"
                onClick={() => setRejectDialogOpen(true)}
                className="border-border text-text-primary hover:bg-danger/10 hover:text-danger flex-1"
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Reject Offer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents Required Banner */}
      {app.status === 'DOCUMENTS_REQUIRED' && (
        <Card className="border-warning/30 bg-warning/10">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <FileQuestion className="w-6 h-6 text-warning shrink-0" />
              <div>
                <p className="font-semibold text-sm text-warning">
                  Additional Verification Documents Required
                </p>
                <p className="text-xs text-warning">
                  {app.docRequestReason || 'Please upload the requested verification documents to continue underwriting review.'}
                </p>
              </div>
            </div>
            <Link to="/customer/documents">
              <Button size="sm" className="bg-warning hover:bg-warning/90 text-background text-xs shrink-0 font-bold">
                Upload Documents
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* On Hold Message */}
      {app.status === 'ON_HOLD' && app.holdReason && (
        <div className="p-4 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm flex items-start space-x-2.5">
          <Info className="w-4 h-4 mt-0.5 text-warning shrink-0" />
          <div>
            <span className="font-semibold">Application On Hold:</span> {app.holdReason}
          </div>
        </div>
      )}

      {/* Rejection Message */}
      {app.status === 'REJECTED' && app.rejectionReason && (
        <div className="p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm flex items-start space-x-2.5">
          <XCircle className="w-4 h-4 mt-0.5 text-danger shrink-0" />
          <div>
            <span className="font-semibold">Rejection Reason:</span> {app.rejectionReason}
          </div>
        </div>
      )}

      {/* Main Particulars Card */}
      <Card className="shadow-sm border-border bg-surface">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-text-secondary font-mono">Reference Number</span>
              <CardTitle className="text-xl font-bold text-text-primary">
                {app.applicationNumber}
              </CardTitle>
            </div>
            <div className="text-right">
              <span className="text-xs text-text-secondary">Submitted On</span>
              <p className="text-sm font-medium text-text-primary">
                {new Date(app.submittedAt || app.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-5 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-lg bg-surface-elevated border border-border">
              <span className="text-xs text-text-secondary font-medium">Requested Amount</span>
              <p className="text-xl font-bold text-text-primary mt-0.5">
                ₹{app.requestedAmount.toLocaleString('en-IN')}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-surface-elevated border border-border">
              <span className="text-xs text-text-secondary font-medium">Tenure</span>
              <div className="flex items-center space-x-1 mt-0.5">
                <Clock className="w-4 h-4 text-text-secondary" />
                <p className="text-lg font-bold text-text-primary">{app.tenureMonths} Months</p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-surface-elevated border border-border">
              <span className="text-xs text-text-secondary font-medium">Current Status</span>
              <div className="mt-1">
                <LoanStatusBadge status={app.status} />
              </div>
            </div>
          </div>

          {/* Offer Results if accepted or rejected */}
          {app.status === 'OFFER_ACCEPTED' && app.acceptedAmount && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-primary text-sm space-y-1">
              <div className="flex items-center space-x-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>You accepted the modified offer of ₹{app.acceptedAmount.toLocaleString('en-IN')}.</span>
              </div>
              <p className="text-xs text-primary/80">
                Our underwriting team will proceed with the final agreement in the next phase.
              </p>
            </div>
          )}

          {app.status === 'OFFER_REJECTED' && (
            <div className="p-4 rounded-lg bg-surface-elevated border border-border text-text-primary text-sm space-y-1">
              <div className="flex items-center space-x-1.5 font-semibold">
                <XCircle className="w-4 h-4 text-text-secondary" />
                <span>You declined the modified offer.</span>
              </div>
              <p className="text-xs text-text-secondary">
                Your original application history of ₹{app.requestedAmount.toLocaleString('en-IN')} remains preserved on file.
              </p>
            </div>
          )}

          {/* Purpose */}
          <div className="space-y-1.5 pt-2 border-t border-border/50">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Stated Loan Purpose
            </span>
            <p className="text-sm text-text-primary bg-surface-elevated p-3.5 rounded-lg border border-border leading-relaxed">
              {app.purpose}
            </p>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 text-xs text-text-secondary pt-2 border-t border-border/50">
            <div className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-text-secondary" />
              <span>Created: {new Date(app.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-1.5 justify-end">
              <Clock className="w-3.5 h-3.5 text-text-secondary" />
              <span>Last Updated: {new Date(app.updatedAt).toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loan Documents & Verification Stage Gate */}
      <CustomerLoanDocumentsSection
        loan={app}
        documents={documents}
        kycStatus={kycStatus}
        charges={charges}
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: ['customerLoanDetail', id] });
          queryClient.invalidateQueries({ queryKey: ['customerDocs'] });
          queryClient.invalidateQueries({ queryKey: ['customerCharges'] });
        }}
        isCompact={false}
      />

      {/* Confirmation Dialog: Accept Offer */}
      <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Modified Loan Offer?</DialogTitle>
            <DialogDescription>
              You are about to accept the modified loan amount of ₹
              {app.proposedAmount?.toLocaleString('en-IN')} for a duration of {app.tenureMonths}{' '}
              months. Once confirmed, this amount will become your accepted loan amount.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setAcceptDialogOpen(false)}
              disabled={acceptMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending}
              className="bg-success text-background hover:brightness-110 text-text-primary"
            >
              {acceptMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : (
                'Yes, Accept Offer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog: Reject Offer */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Modified Loan Offer?</DialogTitle>
            <DialogDescription>
              Are you sure you wish to reject the proposed amount of ₹
              {app.proposedAmount?.toLocaleString('en-IN')}? Your original request and application
              history will be retained with status marked as Offer Rejected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectMutation.mutate()}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Declining...
                </>
              ) : (
                'Yes, Decline Offer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
