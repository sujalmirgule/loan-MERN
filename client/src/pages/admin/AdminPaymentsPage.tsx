import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CreditCard,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface PaymentItem {
  id: string;
  loanId: string;
  applicationNumber: string;
  customerId: string;
  customerName: string;
  mobile: string;
  email: string;
  amount: number;
  utr: string;
  receiptNumber: string;
  paymentMethod: string;
  status: string;
  rejectionReason?: string;
  notes?: string;
  submittedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

interface PaymentsResponse {
  data: PaymentItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const AdminPaymentsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Selected payment for verify/reject dialog
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [dialogMode, setDialogMode] = useState<'VERIFY' | 'REJECT' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery<PaymentsResponse>({
    queryKey: ['admin-payments', page, statusFilter, search],
    queryFn: async () => {
      const res = await apiClient.get(API_ENDPOINTS.PAYMENTS.ADMIN_LIST, {
        params: {
          page,
          limit: 10,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          search: search.trim() || undefined,
        },
      });
      return res;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      return apiClient.post(API_ENDPOINTS.PAYMENTS.VERIFY(paymentId));
    },
    onSuccess: () => {
      setDialogMode(null);
      setSelectedPayment(null);
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || 'Failed to verify payment.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: string; reason: string }) => {
      return apiClient.post(API_ENDPOINTS.PAYMENTS.REJECT(paymentId), {
        rejectionReason: reason,
      });
    },
    onSuccess: () => {
      setDialogMode(null);
      setSelectedPayment(null);
      setRejectReason('');
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || 'Failed to reject payment.');
    },
  });

  const payments = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-emerald-600 text-white text-[10px]">PAID ✓</Badge>;
      case 'UNDER_VERIFICATION':
        return <Badge className="bg-amber-600 text-white text-[10px] animate-pulse">Under Verification</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-600 text-white text-[10px]">Rejected</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2">
            <CreditCard className="w-6 h-6 text-emerald-600" />
            <span>Verification Payments & UTR Queue</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Inspect borrower UTR references and execute automated loan approval transitions.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs h-8">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh Queue
        </Button>
      </div>

      {/* Filter Tabs & Search */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-1.5 overflow-x-auto text-xs font-medium">
              {[
                { key: 'ALL', label: 'All Transactions' },
                { key: 'UNDER_VERIFICATION', label: 'Pending Verification' },
                { key: 'PAID', label: 'Verified & Paid' },
                { key: 'REJECTED', label: 'Rejected' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setStatusFilter(tab.key);
                    setPage(1);
                  }}
                  className={`py-1.5 px-3 rounded-md transition-colors ${
                    statusFilter === tab.key
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <Input
                placeholder="Search UTR, name, mobile, app no..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="text-xs h-8 pl-8 w-56 sm:w-64"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Borrower Details</th>
                <th className="py-3 px-4">Application ID</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">UTR Reference</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Submitted Date</th>
                <th className="py-3 px-4">Verified By</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={9} className="py-3 px-4 h-10 bg-slate-50" />
                  </tr>
                ))
              ) : payments.length > 0 ? (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{p.customerName}</div>
                      <div className="text-[11px] font-mono text-slate-500">+91 {p.mobile}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      <Link to={`/admin/loans/${p.loanId}`} className="hover:underline text-primary">
                        {p.applicationNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">₹{p.amount}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-semibold text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {p.utr}
                      </span>
                    </td>
                    <td className="py-3 px-4">{p.paymentMethod}</td>
                    <td className="py-3 px-4">{getStatusBadge(p.status)}</td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(p.submittedAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{p.verifiedBy || '—'}</td>
                    <td className="py-3 px-4 text-right">
                      {p.status === 'UNDER_VERIFICATION' && (
                        <div className="flex items-center justify-end space-x-1.5">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedPayment(p);
                              setDialogMode('VERIFY');
                              setErrorMessage(null);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-2"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Verify Payment
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedPayment(p);
                              setDialogMode('REJECT');
                              setRejectReason('');
                              setErrorMessage(null);
                            }}
                            className="text-xs h-7 px-2"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                      {p.status === 'PAID' && (
                        <span className="text-[11px] text-emerald-700 font-medium">Approved & Executed</span>
                      )}
                      {p.status === 'REJECTED' && (
                        <span className="text-[11px] text-red-600 truncate max-w-xs block" title={p.rejectionReason}>
                          {p.rejectionReason}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No payment submissions match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
            </span>
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="h-7 px-2"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="h-7 px-2"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Verification Confirmation Modal */}
      {dialogMode === 'VERIFY' && selectedPayment && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full shadow-lg border-emerald-300">
            <CardHeader className="pb-3 bg-emerald-50/50 border-b border-emerald-100">
              <CardTitle className="text-base flex items-center space-x-2 text-emerald-950">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Verify Payment & Auto-Approve Loan</span>
              </CardTitle>
              <CardDescription>
                Confirm incoming verification deposit of ₹{selectedPayment.amount} for UTR{' '}
                <strong className="font-mono">{selectedPayment.utr}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              {errorMessage && (
                <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-800 flex items-center space-x-1.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-lg space-y-1.5 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Borrower:</span>
                  <span className="font-semibold text-slate-900">{selectedPayment.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mobile:</span>
                  <span className="font-mono font-medium text-slate-900">+91 {selectedPayment.mobile}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Application Number:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedPayment.applicationNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">UTR / Ref:</span>
                  <span className="font-mono font-bold text-emerald-800">{selectedPayment.utr}</span>
                </div>
              </div>

              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded text-blue-900 text-[11px] leading-relaxed">
                <strong>Automated Business Operation:</strong> Verifying this payment will atomically transition the loan
                to <strong>APPROVED</strong>, generate the <strong>Master Loan Agreement</strong>, construct the{' '}
                <strong>EMI Schedule</strong>, check the <strong>One Approved Loan Policy</strong>, and notify the borrower.
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDialogMode(null)}
                  disabled={verifyMutation.isPending}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => verifyMutation.mutate(selectedPayment.id)}
                  disabled={verifyMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3"
                >
                  {verifyMutation.isPending ? 'Verifying & Approving...' : 'Confirm Verification & Auto-Approve'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rejection Modal */}
      {dialogMode === 'REJECT' && selectedPayment && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full shadow-lg border-red-300">
            <CardHeader className="pb-3 bg-red-50/50 border-b border-red-100">
              <CardTitle className="text-base flex items-center space-x-2 text-red-950">
                <XCircle className="w-5 h-5 text-red-600" />
                <span>Reject Payment Reference</span>
              </CardTitle>
              <CardDescription>
                State mandatory business reason for rejecting UTR <strong className="font-mono">{selectedPayment.utr}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              {errorMessage && (
                <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-800 flex items-center space-x-1.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Mandatory Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Transaction reference not found in bank statement, amount mismatch..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-input bg-background"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDialogMode(null)}
                  disabled={rejectMutation.isPending}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() =>
                    rejectMutation.mutate({
                      paymentId: selectedPayment.id,
                      reason: rejectReason.trim(),
                    })
                  }
                  disabled={rejectMutation.isPending || !rejectReason.trim()}
                  className="text-xs h-8 px-3"
                >
                  {rejectMutation.isPending ? 'Rejecting...' : 'Reject Payment Reference'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
