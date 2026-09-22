import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';

interface PendingLoanRecord {
  id: string;
  applicationNumber: string;
  accountNumber?: string;
  loanType?: string;
  requestedAmount: number;
  approvedAmount?: number;
  status: string;
  createdAt: string;
  customer: {
    id: string;
    fullName: string;
    mobile: string;
    email: string;
    state?: string;
    kycStatus?: string;
  };
}

export const AdminPendingLoansPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'ALL' | 'NEW' | 'UNDER_REVIEW'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLoan, setSelectedLoan] = useState<PendingLoanRecord | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminRemark, setAdminRemark] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Success result modal
  interface ApprovedSuccessData {
    customerName: string;
    applicationNumber: string;
    loanId: string;
    approvedAmount: number;
    emi: number;
  }
  const [approvedResult, setApprovedResult] = useState<ApprovedSuccessData | null>(null);

  // Enhanced approve modal state
  const [approvedAmount, setApprovedAmount] = useState('');
  const [interestRate, setInterestRate] = useState('12');
  const [tenureMonths, setTenureMonths] = useState('12');
  const [manualEmi, setManualEmi] = useState<string>('');
  const [processingFee, setProcessingFee] = useState('1250');
  const [insurance, setInsurance] = useState('0');
  const [disbursementDate, setDisbursementDate] = useState('');

  // Auto-calculate EMI
  const calculatedEmi = (() => {
    const P = parseFloat(approvedAmount) || 0;
    const r = (parseFloat(interestRate) / 100) / 12;
    const n = parseInt(tenureMonths) || 12;
    if (P <= 0 || r <= 0) return Math.round(P / n);
    return Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  })();
  const emi = manualEmi ? parseInt(manualEmi) || calculatedEmi : calculatedEmi;
  const isEmiOverridden = !!manualEmi && parseInt(manualEmi) !== calculatedEmi;
  const totalPayable = emi * (parseInt(tenureMonths) || 12);
  const totalInterest = Math.max(0, totalPayable - (parseFloat(approvedAmount) || 0));

  // Fetch pending applications
  const { data: loans, refetch } = useQuery<PendingLoanRecord[]>({
    queryKey: ['adminPendingLoans'],
    queryFn: async () => {
      const res = await api.get(`${API_ENDPOINTS.ADMIN_LOANS.LIST}?status=PENDING`);
      const list = res.data?.data || res.data?.applications || res.data || [];
      return Array.isArray(list) ? list : [];
    },
  });

  const allLoans = loans || [];
  const newLoans = allLoans.filter((l) => l.status === 'SUBMITTED' || l.status === 'NEW');
  const underReviewLoans = allLoans.filter(
    (l) => l.status === 'UNDER_REVIEW' || l.status === 'DOCUMENTS_REQUIRED'
  );

  const displayedLoans = (activeTab === 'ALL'
    ? allLoans
    : activeTab === 'NEW'
    ? newLoans
    : underReviewLoans
  ).filter((l) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      l.applicationNumber.toLowerCase().includes(term) ||
      l.customer.fullName.toLowerCase().includes(term) ||
      l.customer.mobile.includes(term)
    );
  });

  const openApproveModal = (loan: PendingLoanRecord) => {
    setSelectedLoan(loan);
    setApprovedAmount(String(loan.requestedAmount));
    setInterestRate('12');
    setTenureMonths('12');
    setManualEmi('');
    setProcessingFee('1250');
    setInsurance('0');
    setDisbursementDate('');
    setAdminRemark('');
    setShowApproveModal(true);
  };

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async (loanId: string) => {
      return api.post(API_ENDPOINTS.ADMIN_LOANS.APPROVE(loanId), {
        approvedAmount: parseFloat(approvedAmount) || selectedLoan?.requestedAmount,
        interestRate: parseFloat(interestRate),
        tenureMonths: parseInt(tenureMonths),
        finalEmi: emi,
        processingFeeAmount: parseFloat(processingFee) || 0,
        insuranceAmount: parseFloat(insurance) || 0,
        totalPayable,
        disbursementDate: disbursementDate || undefined,
        remarks: adminRemark || 'Approved by Underwriting Officer',
      });
    },
    onSuccess: () => {
      const current = selectedLoan;
      setShowApproveModal(false);
      setApprovedResult({
        customerName: current?.customer.fullName || 'Customer',
        applicationNumber: current?.applicationNumber || '',
        loanId: current?.id || '',
        approvedAmount: parseFloat(approvedAmount) || current?.requestedAmount || 0,
        emi,
      });
      setSelectedLoan(null);
      setAdminRemark('');
      queryClient.invalidateQueries({ queryKey: ['adminPendingLoans'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      refetch();
    },
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async (loanId: string) => {
      return api.post(API_ENDPOINTS.ADMIN_LOANS.REJECT(loanId), {
        rejectionReason: rejectionReason || 'Does not meet underwriting requirements.',
        reason: rejectionReason || 'Does not meet underwriting requirements.',
        adminRemark: adminRemark || undefined,
      });
    },
    onSuccess: () => {
      setActionSuccess(`Loan application #${selectedLoan?.applicationNumber} rejected.`);
      setShowRejectModal(false);
      setSelectedLoan(null);
      setRejectionReason('');
      setAdminRemark('');
      queryClient.invalidateQueries({ queryKey: ['adminPendingLoans'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      refetch();
    },
  });


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
      case 'NEW':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-primary border border-primary/30">New</span>;
      case 'UNDER_REVIEW':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-warning/20 text-warning border border-warning/30">Under Review</span>;
      case 'DOCUMENTS_REQUIRED':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">Documents</span>;
      case 'APPROVED':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-success/20 text-success border border-success/30">Approved</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-surface-elevated text-text-secondary">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb (Screen 7 Reference) */}
      <div className="flex items-center space-x-2 text-xs text-text-secondary">
        <Link to="/admin/dashboard" className="hover:text-text-primary transition">Dashboard</Link>
        <span>›</span>
        <Link to="/admin/applications" className="hover:text-text-primary transition">Loans</Link>
        <span>›</span>
        <span className="text-text-primary font-semibold">Pending</span>
      </div>

      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Pending Loan Applications</h1>
          <p className="text-xs text-text-secondary">Review, underwrite and action loan requests requiring attention.</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm" className="border-border text-text-secondary text-xs h-9">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-success/10 border border-success/30 text-success text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Filter Tabs (Screen 7 Reference: All 12, New 5, Under Review 4) */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'ALL'
              ? 'bg-primary text-background text-text-primary shadow-md'
              : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
          }`}
        >
          <span>All</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-950 text-primary font-extrabold">
            {allLoans.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('NEW')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'NEW'
              ? 'bg-primary text-background text-text-primary shadow-md'
              : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
          }`}
        >
          <span>New</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-surface-elevated text-text-secondary font-extrabold">
            {newLoans.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('UNDER_REVIEW')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'UNDER_REVIEW'
              ? 'bg-primary text-background text-text-primary shadow-md'
              : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
          }`}
        >
          <span>Under Review</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-surface-elevated text-text-secondary font-extrabold">
            {underReviewLoans.length}
          </span>
        </button>
      </div>

      {/* Search Bar (Screen 7 Reference) */}
      <div className="relative">
        <Search className="w-4 h-4 text-text-secondary absolute left-3.5 top-3" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, mobile or application ID..."
          className="bg-surface border-border text-text-primary pl-10 h-10 text-xs rounded-xl focus:border-primary"
        />
      </div>

      {/* Table Card (Screen 7 Reference) */}
      <Card className="bg-surface border-border rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-text-secondary">
            <thead className="bg-surface-elevated/60 text-[11px] uppercase tracking-wider text-text-secondary font-semibold border-b border-border">
              <tr>
                <th className="py-3 px-4">Application ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4">Loan Type</th>
                <th className="py-3 px-4 text-right">Requested Amt</th>
                <th className="py-3 px-4 text-center">KYC Status</th>
                <th className="py-3 px-4 text-center">Loan Status</th>
                <th className="py-3 px-4 text-center">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {displayedLoans.map((item) => {
                const isKycOk = item.customer?.kycStatus === 'APPROVED' || item.customer?.kycStatus === 'VERIFIED';
                return (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/admin/loans/${item.id}`)}
                    className="hover:bg-surface-elevated/40 cursor-pointer transition"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-text-primary">
                      #{item.applicationNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary text-background/20 text-primary font-bold text-xs flex items-center justify-center">
                          {item.customer.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-text-primary text-xs">{item.customer.fullName}</div>
                          <div className="text-[11px] text-text-secondary font-mono">+91 {item.customer.mobile}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary">
                      {item.customer.state || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary font-medium">
                      {item.loanType || 'Personal Loan'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-text-primary text-sm">
                      ₹{item.requestedAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const kyc = (item.customer.kycStatus || 'PENDING').toUpperCase();
                        if (isKycOk) {
                          return (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/20 text-success border border-success/30">
                              Verified
                            </span>
                          );
                        }
                        if (kyc === 'REJECTED') {
                          return (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger/20 text-danger border border-danger/30">
                              Rejected
                            </span>
                          );
                        }
                        return (
                          <Link
                            to={`/admin/kyc`}
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning/20 text-warning border border-warning/30 hover:underline"
                          >
                            Pending KYC
                          </Link>
                        );
                      })()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="py-3.5 px-4 text-center text-text-secondary text-[11px]">
                      {new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/admin/loans/${item.id}`)}
                          className="h-7 px-2 border-border bg-surface-elevated text-text-secondary hover:text-text-primary text-[11px] rounded-lg"
                        >
                          Review
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openApproveModal(item)}
                          disabled={!isKycOk}
                          title={!isKycOk ? 'Customer KYC must be verified first' : 'Approve loan'}
                          className="h-7 px-2.5 bg-success text-background hover:brightness-110 disabled:bg-surface-elevated disabled:text-text-secondary disabled:cursor-not-allowed text-text-primary font-bold text-[11px] rounded-lg"
                        >
                          ✓ Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedLoan(item);
                            setShowRejectModal(true);
                          }}
                          className="h-7 px-2 border-danger/40 text-danger hover:bg-danger/10 text-[11px] rounded-lg"
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {displayedLoans.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-text-secondary">
                    No pending loan applications matching current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Confirmation Modal: Approve Loan — Full Financial Fields */}
      {showApproveModal && selectedLoan && (
        <div className="fixed inset-0 z-50 bg-surface-elevated/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div>
              <h3 className="font-bold text-base text-text-primary">Approve Loan Application</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Review terms and finalize loan sanction parameters
              </p>
            </div>

            {/* Read-only details */}
            <div className="p-3 bg-surface-elevated/60 rounded-xl border border-border/50 text-xs">
              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">Application Overview (Read-Only)</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <span className="text-[10px] text-text-secondary block">Customer Name</span>
                  <span className="font-semibold text-text-primary">{selectedLoan.customer.fullName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-secondary block">Application ID</span>
                  <span className="font-mono text-text-primary">{selectedLoan.applicationNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-secondary block">Requested Amount</span>
                  <span className="font-bold text-success">₹{selectedLoan.requestedAmount.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-secondary block">Loan Type</span>
                  <span className="text-text-primary">{selectedLoan.loanType || 'Personal Loan'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-secondary block">KYC Status</span>
                  <span className={`font-semibold ${
                    selectedLoan.customer.kycStatus === 'APPROVED' || selectedLoan.customer.kycStatus === 'VERIFIED'
                      ? 'text-success'
                      : 'text-warning'
                  }`}>
                    {selectedLoan.customer.kycStatus || 'PENDING'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-text-secondary block">Mobile</span>
                  <span className="text-text-primary">+91 {selectedLoan.customer.mobile}</span>
                </div>
              </div>
            </div>

            {/* KYC Gate Notice */}
            {!(selectedLoan.customer.kycStatus === 'APPROVED' || selectedLoan.customer.kycStatus === 'VERIFIED') && (
              <div className="p-3 bg-warning/15 border border-warning/30 rounded-xl text-warning text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-warning" />
                <div>
                  <p className="font-semibold">KYC Verification Gate</p>
                  <p className="text-[11px] text-amber-200/80">
                    Customer KYC status is &quot;{selectedLoan.customer.kycStatus || 'PENDING'}&quot;. Customer identity must be verified and approved in the KYC module before a loan can be sanctioned.
                  </p>
                </div>
              </div>
            )}

            {/* Editable Financial Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Approved Amount (₹) *</label>
                <Input
                  type="number"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value)}
                  placeholder={String(selectedLoan.requestedAmount)}
                  className="bg-surface-elevated border-border text-text-primary text-xs h-9 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Interest Rate (% p.a.) *</label>
                <Input
                  type="number"
                  step="0.1"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="bg-surface-elevated border-border text-text-primary text-xs h-9 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Tenure (Months) *</label>
                <Input
                  type="number"
                  value={tenureMonths}
                  onChange={(e) => setTenureMonths(e.target.value)}
                  className="bg-surface-elevated border-border text-text-primary text-xs h-9 rounded-lg"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-text-secondary uppercase">Monthly EMI (₹)</label>
                  {isEmiOverridden && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-warning/20 text-warning font-semibold">
                      Manual Override
                    </span>
                  )}
                </div>
                <Input
                  type="number"
                  value={manualEmi || String(calculatedEmi)}
                  onChange={(e) => setManualEmi(e.target.value)}
                  placeholder={String(calculatedEmi)}
                  className="bg-surface-elevated border-border text-text-primary text-xs h-9 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Processing Fee (₹)</label>
                <Input
                  type="number"
                  value={processingFee}
                  onChange={(e) => setProcessingFee(e.target.value)}
                  className="bg-surface-elevated border-border text-text-primary text-xs h-9 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Insurance (₹)</label>
                <Input
                  type="number"
                  value={insurance}
                  onChange={(e) => setInsurance(e.target.value)}
                  className="bg-surface-elevated border-border text-text-primary text-xs h-9 rounded-lg"
                />
              </div>
            </div>

            {/* Disbursement Date */}
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Expected Disbursement Date</label>
              <Input
                type="date"
                value={disbursementDate}
                onChange={(e) => setDisbursementDate(e.target.value)}
                className="bg-surface-elevated border-border text-text-primary text-xs h-9 rounded-lg"
              />
            </div>

            {/* Financial Summary */}
            <div className="p-3 bg-surface-elevated/80 rounded-xl border border-border space-y-2">
              <p className="text-[11px] font-bold text-success uppercase tracking-wider">Financial Summary</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="text-center p-2 bg-surface-elevated/80 rounded-lg">
                  <p className="text-[10px] text-text-secondary">Approved Amount</p>
                  <p className="text-xs font-extrabold text-text-primary">₹{(parseFloat(approvedAmount) || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="text-center p-2 bg-surface-elevated/80 rounded-lg">
                  <p className="text-[10px] text-text-secondary">Monthly EMI</p>
                  <p className="text-xs font-extrabold text-text-primary">₹{emi.toLocaleString('en-IN')}</p>
                </div>
                <div className="text-center p-2 bg-surface-elevated/80 rounded-lg">
                  <p className="text-[10px] text-text-secondary">Total Interest</p>
                  <p className="text-xs font-extrabold text-warning">₹{totalInterest.toLocaleString('en-IN')}</p>
                </div>
                <div className="text-center p-2 bg-surface-elevated/80 rounded-lg">
                  <p className="text-[10px] text-text-secondary">Total Payable</p>
                  <p className="text-xs font-extrabold text-success">₹{totalPayable.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>

            {/* Admin Remark */}
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Admin Remark</label>
              <Input
                value={adminRemark}
                onChange={(e) => setAdminRemark(e.target.value)}
                placeholder="e.g. Risk criteria met, verified applicant identity and income"
                className="bg-surface-elevated border-border text-text-primary text-xs h-9 rounded-lg"
              />
            </div>

            <div className="flex space-x-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setShowApproveModal(false)}
                className="flex-1 h-9 border-border text-text-secondary text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={() => approveMutation.mutate(selectedLoan.id)}
                disabled={
                  approveMutation.isPending ||
                  !approvedAmount ||
                  !(selectedLoan.customer.kycStatus === 'APPROVED' || selectedLoan.customer.kycStatus === 'VERIFIED')
                }
                className="flex-1 h-9 bg-success text-background hover:brightness-110 text-text-primary font-bold text-xs rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {approveMutation.isPending ? 'Approving Loan...' : 'Approve Loan'}
              </Button>
            </div>

            {approveMutation.isError && (
              <p className="text-xs text-danger text-center">
                {(approveMutation.error as any)?.response?.data?.message || 'Error approving loan. Please verify customer KYC is approved.'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal: Reject Loan */}
      {showRejectModal && selectedLoan && (
        <div className="fixed inset-0 z-50 bg-surface-elevated/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div>
              <h3 className="font-bold text-sm text-text-primary">Reject Loan Application</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                #{selectedLoan.applicationNumber} — {selectedLoan.customer.fullName}
              </p>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">
                Reason *
              </label>
              <Input
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Inadequate income documentation or CIBIL score"
                className="bg-surface-elevated border-border text-text-primary text-xs h-9 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">
                Admin Remark
              </label>
              <Input
                value={adminRemark}
                onChange={(e) => setAdminRemark(e.target.value)}
                placeholder="Optional internal notes"
                className="bg-surface-elevated border-border text-text-primary text-xs h-9 rounded-lg"
              />
            </div>
            <div className="flex space-x-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowRejectModal(false)}
                className="flex-1 h-9 border-border text-text-secondary text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={() => rejectMutation.mutate(selectedLoan.id)}
                disabled={rejectMutation.isPending || !rejectionReason.trim()}
                className="flex-1 h-9 bg-red-600 hover:bg-red-700 text-text-primary font-bold text-xs rounded-xl"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal: Loan Approved Successfully */}
      {approvedResult && (
        <div className="fixed inset-0 z-50 bg-surface-elevated/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-success/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-success/20 text-success mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-text-primary">Loan Approved Successfully</h3>
              <p className="text-xs text-text-secondary mt-1">
                Application #{approvedResult.applicationNumber} has been officially sanctioned.
              </p>
            </div>

            <div className="p-3 bg-surface-elevated/80 rounded-xl border border-border text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-text-secondary">Customer</span>
                <span className="font-semibold text-text-primary">{approvedResult.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Loan ID</span>
                <span className="font-mono text-text-primary">#{approvedResult.applicationNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Approved Amount</span>
                <span className="font-bold text-success">₹{approvedResult.approvedAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Monthly EMI</span>
                <span className="font-bold text-text-primary">₹{approvedResult.emi.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/admin/loans/${approvedResult.loanId}`)}
                className="text-xs h-9 border-border text-text-primary"
              >
                View Loan
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/approval-letter/${approvedResult.loanId}`)}
                className="text-xs h-9 border-emerald-600 text-success hover:bg-emerald-950/30"
              >
                Approval Letter
              </Button>
              <Button
                onClick={() => setApprovedResult(null)}
                className="text-xs h-9 bg-slate-700 hover:bg-slate-600 text-text-primary"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
