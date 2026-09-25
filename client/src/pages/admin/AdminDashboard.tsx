import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService, DashboardResponse, DashboardKPIs } from '@/services/adminService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  AlertCircle,
  Search,
  RefreshCw,
  ExternalLink,
  Filter,
  IndianRupee,
  Eye,
  Loader2,
  TrendingUp,
  CreditCard,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie,
} from 'recharts';

interface Filters {
  dateRange: string;
  dateFrom: string;
  dateTo: string;
  state: string;
  loanType: string;
  status: string;
}

interface RecentApp {
  id: string;
  applicationNumber: string;
  customerName: string;
  customerId: string;
  mobile: string;
  state: string;
  city?: string;
  loanType: string;
  requestedAmount: number;
  approvedAmount?: number;
  status: string;
  submittedAt: string;
}

const INDIAN_STATES = [
  'All States',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

const LOAN_TYPES = ['All Types', 'Personal Loan', 'Business Loan', 'Salary Loan', 'Education Loan'];
const LOAN_STATUSES = ['All Statuses', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED'];

const fmt = (n: number) => (n || 0).toLocaleString('en-IN');
const fmtCurr = (n: number) => `₹${fmt(Math.round(n || 0))}`;

// Status Badge Component
function getStatusBadge(status: string) {
  switch (status) {
    case 'PENDING':
    case 'SUBMITTED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          ● PENDING
        </span>
      );
    case 'UNDER_REVIEW':
    case 'DOCUMENTS_REQUIRED':
    case 'ON_HOLD':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          ● UNDER REVIEW
        </span>
      );
    case 'APPROVED':
    case 'OFFER_ACCEPTED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          ✓ APPROVED
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          ✕ REJECTED
        </span>
      );
    case 'DISBURSED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#155EEF] border border-blue-200">
          ✓ DISBURSED
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F4F8FF] text-[#64748B] border border-[#D7E3F5]">
          {status}
        </span>
      );
  }
}

// ─── KPI Card Component ────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  comparison,
  trend,
  icon: Icon,
  accentColor = 'gold',
  link,
}: {
  label: string;
  value: string | number;
  comparison: string;
  trend?: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor?: 'gold' | 'mint' | 'amber' | 'red';
  link?: string;
}) {
  const iconContainerClass =
    accentColor === 'gold'
      ? 'bg-[#FEF9E7] border-[#E6CF7A] text-[#B8860B]'
      : accentColor === 'mint'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
      : accentColor === 'amber'
      ? 'bg-amber-50 border-amber-200 text-amber-700'
      : accentColor === 'red'
      ? 'bg-rose-50 border-rose-200 text-rose-700'
      : 'bg-[#E8F1FF] border-[#D7E3F5] text-[#155EEF]';

  const content = (
    <Card className="bg-white border border-[#D7E3F5] rounded-2xl hover:border-[#155EEF]/50 transition-all duration-200 shadow-sm group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">{label}</p>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-[#07152F]">{value}</p>
          </div>
          <div className={`p-2.5 rounded-xl border shrink-0 group-hover:scale-105 transition-transform ${iconContainerClass}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-3.5 flex items-center justify-between text-xs pt-3 border-t border-[#E8F1FF]">
          <span className="text-[#64748B] flex items-center gap-1 font-semibold">
            {trend && <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />}
            {comparison}
          </span>
          {link && (
            <span className="text-[#94A3B8] group-hover:text-[#155EEF] group-hover:translate-x-0.5 transition-all flex items-center font-bold">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return link ? <Link to={link}>{content}</Link> : content;
}

// ─── Approve Modal ────────────────────────────────────────────────────────────
function ApproveModal({
  loan,
  open,
  onClose,
  onApproved,
}: {
  loan: RecentApp | null;
  open: boolean;
  onClose: () => void;
  onApproved: () => void;
}) {
  const [approvedAmount, setApprovedAmount] = useState('');
  const [interestRate, setInterestRate] = useState('12');
  const [tenure, setTenure] = useState('12');
  const [processingFee, setProcessingFee] = useState('1250');
  const [adminRemark, setAdminRemark] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (loan) {
      setApprovedAmount(String(loan.requestedAmount || ''));
      setError('');
    }
  }, [loan]);

  const calcEmi = () => {
    const P = Number(approvedAmount) || 0;
    const r = (Number(interestRate) || 0) / 12 / 100;
    const n = Number(tenure) || 1;
    if (r === 0) return Math.round(P / n);
    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return Math.round(emi);
  };

  const emi = calcEmi();
  const totalPayable = emi * Number(tenure) + Number(processingFee);

  const handleApprove = async () => {
    if (!loan) return;
    setIsApproving(true);
    setError('');
    try {
      await adminService.approveLoan(loan.id, {
        approvedAmount: Number(approvedAmount),
        interestRate: Number(interestRate),
        tenureMonths: Number(tenure),
        finalEmi: emi,
        processingFeeAmount: Number(processingFee),
        insuranceAmount: 0,
        totalPayable,
        remarks: adminRemark || 'Loan approved via Admin Console',
      });
      onApproved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to approve loan application.');
    } finally {
      setIsApproving(false);
    }
  };

  if (!loan) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white border border-[#D7E3F5] text-[#07152F]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#07152F] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Approve Loan Application
          </DialogTitle>
          <DialogDescription className="text-xs text-[#64748B]">
            {loan.applicationNumber} — {loan.customerName} ({loan.state})
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4 py-2 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#64748B]">Approved Amount (₹) *</Label>
              <Input
                type="number"
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(e.target.value)}
                className="bg-[#F4F8FF] border-[#D7E3F5] text-[#07152F] mt-1 focus:bg-white"
              />
            </div>
            <div>
              <Label className="text-[#64748B]">Interest Rate (% p.a.) *</Label>
              <Input
                type="number"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="bg-[#F4F8FF] border-[#D7E3F5] text-[#07152F] mt-1 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#64748B]">Tenure (Months) *</Label>
              <Input
                type="number"
                value={tenure}
                onChange={(e) => setTenure(e.target.value)}
                className="bg-[#F4F8FF] border-[#D7E3F5] text-[#07152F] mt-1 focus:bg-white"
              />
            </div>
            <div>
              <Label className="text-[#64748B]">Processing Fee (₹)</Label>
              <Input
                type="number"
                value={processingFee}
                onChange={(e) => setProcessingFee(e.target.value)}
                className="bg-[#F4F8FF] border-[#D7E3F5] text-[#07152F] mt-1 focus:bg-white"
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#F4F8FF] border border-[#D7E3F5] grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[#64748B]">Calculated Monthly EMI:</span>
              <p className="text-sm font-bold text-emerald-600">{fmtCurr(emi)}</p>
            </div>
            <div>
              <span className="text-[#64748B]">Total Repayment:</span>
              <p className="text-sm font-bold text-[#07152F]">{fmtCurr(totalPayable)}</p>
            </div>
          </div>

          <div>
            <Label className="text-[#64748B]">Admin Underwriting Remarks</Label>
            <Input
              value={adminRemark}
              onChange={(e) => setAdminRemark(e.target.value)}
              placeholder="Underwriting note..."
              className="bg-[#F4F8FF] border-[#D7E3F5] text-[#07152F] mt-1 focus:bg-white"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isApproving}
            className="border-[#D7E3F5] text-[#64748B] hover:bg-[#F4F8FF] hover:text-[#07152F]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isApproving || !approvedAmount}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            {isApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Approve Loan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reject Modal ─────────────────────────────────────────────────────────────
function RejectModal({
  loan,
  open,
  onClose,
  onRejected,
}: {
  loan: RecentApp | null;
  open: boolean;
  onClose: () => void;
  onRejected: () => void;
}) {
  const [reason, setReason] = useState('');
  const [remark, setRemark] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState('');

  const handleReject = async () => {
    if (!loan || !reason.trim()) return;
    setIsRejecting(true);
    setError('');
    try {
      await adminService.rejectLoan(loan.id, {
        reason: reason.trim(),
        remarks: remark,
      });
      onRejected();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to reject loan application.');
    } finally {
      setIsRejecting(false);
    }
  };

  if (!loan) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white border border-[#D7E3F5] text-[#07152F]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-[#07152F]">
            <XCircle className="w-5 h-5 text-rose-600" />
            Reject Loan Application
          </DialogTitle>
          <DialogDescription className="text-xs text-[#64748B]">
            {loan.applicationNumber} — {loan.customerName}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
            {error}
          </div>
        )}

        <div className="space-y-3 text-xs">
          <div>
            <Label className="text-[#64748B]">Rejection Reason *</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-[#F4F8FF] border-[#D7E3F5] text-[#07152F] mt-1 focus:bg-white"
              placeholder="e.g. CIBIL score below criteria, income insufficient"
            />
          </div>
          <div>
            <Label className="text-[#64748B]">Additional Admin Remark (Optional)</Label>
            <Input
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="bg-[#F4F8FF] border-[#D7E3F5] text-[#07152F] mt-1 focus:bg-white"
              placeholder="Internal file notes"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isRejecting}
            className="border-[#D7E3F5] text-[#64748B] hover:bg-[#F4F8FF] hover:text-[#07152F]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleReject}
            disabled={isRejecting || !reason.trim()}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
          >
            {isRejecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Confirm Rejection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Admin Dashboard Component ──────────────────────────────────────────
export const AdminDashboard: React.FC = () => {
  const queryClient = useQueryClient();

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    dateRange: '',
    dateFrom: '',
    dateTo: '',
    state: '',
    loanType: '',
    status: '',
  });
  const [appliedFilters, setAppliedFilters] = useState<Filters>(filters);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [approveModal, setApproveModal] = useState<{ open: boolean; loan: RecentApp | null }>({
    open: false,
    loan: null,
  });
  const [rejectModal, setRejectModal] = useState<{ open: boolean; loan: RecentApp | null }>({
    open: false,
    loan: null,
  });

  // Calculate dynamic greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning, Admin';
    if (hour < 17) return 'Good afternoon, Admin';
    return 'Good evening, Admin';
  };

  // Convert filters to query params
  const apiParams: Record<string, string> = {};
  if (appliedFilters.dateFrom) apiParams.dateFrom = appliedFilters.dateFrom;
  if (appliedFilters.dateTo) apiParams.dateTo = appliedFilters.dateTo;
  if (appliedFilters.state && appliedFilters.state !== 'All States') apiParams.state = appliedFilters.state;
  if (appliedFilters.loanType && appliedFilters.loanType !== 'All Types') apiParams.loanType = appliedFilters.loanType;
  if (appliedFilters.status && appliedFilters.status !== 'All Statuses') apiParams.status = appliedFilters.status;

  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-dashboard', appliedFilters],
    queryFn: () => adminService.getDashboard(apiParams),
    staleTime: 5000,
    retry: 2,
    refetchInterval: (query) => (query.state.status === 'error' ? false : 10000),
  });

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    const empty: Filters = { dateRange: '', dateFrom: '', dateTo: '', state: '', loanType: '', status: '' };
    setFilters(empty);
    setAppliedFilters(empty);
    setShowFilters(false);
  };

  const onActionDone = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    refetch();
  };

  // Extract dashboard data defensively regardless of API response wrapping
  const dashboardPayload: DashboardResponse | null = (data as any)?.kpis
    ? (data as DashboardResponse)
    : (data as any)?.data?.kpis
    ? ((data as any).data as DashboardResponse)
    : data || null;

  const isInitialLoading = isPending && !dashboardPayload;

  if (isInitialLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-surface-elevated rounded-lg w-1/3 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-surface-elevated rounded-xl border border-border animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-surface-elevated rounded-xl border border-border animate-pulse" />
          <div className="h-72 bg-surface-elevated rounded-xl border border-border animate-pulse" />
        </div>
      </div>
    );
  }

  if (isError || !dashboardPayload || !dashboardPayload.kpis) {
    return (
      <div className="p-8 bg-surface-elevated border border-danger/30 rounded-xl text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-danger mx-auto" />
        <div>
          <h3 className="text-base font-bold text-text-primary">Failed to Load Dashboard Data</h3>
          <p className="text-xs text-text-secondary mt-1">
            {error instanceof Error ? error.message : 'Unable to communicate with the lending server.'}
          </p>
        </div>
        <Button
          onClick={() => refetch()}
          size="sm"
          className="bg-primary hover:bg-primary/90 text-text-primary gap-2 font-bold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Connection
        </Button>
      </div>
    );
  }

  const kpis: DashboardKPIs = dashboardPayload.kpis;
  const applicationTrend = dashboardPayload.applicationTrend || [];
  const statusDistribution = dashboardPayload.statusDistribution || [];
  const recentApplications = dashboardPayload.recentApplications || [];

  // Filter recent applications by table search
  const filteredRecent = recentApplications.filter((a: any) => {
    if (!searchTerm.trim()) return true;
    const t = searchTerm.toLowerCase();
    return (
      (a.customerName || '').toLowerCase().includes(t) ||
      (a.mobile || '').includes(t) ||
      (a.applicationNumber || '').toLowerCase().includes(t) ||
      (a.state || '').toLowerCase().includes(t)
    );
  });

  // Recharts custom colors
  const statusDonutColors = ['#155EEF', '#0B2147', '#10B981', '#EF4444', '#94A3B8'];

  return (
    <div className="space-y-6 pb-12">
      {/* ── Dashboard Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#FEF9E7] border border-[#E6CF7A] text-[#B8860B] text-[11px] font-semibold mb-2 tracking-wide uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B8860B] animate-pulse" />
            Executive Portfolio Command
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#07152F] tracking-tight">
            {getGreeting()}
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 font-medium">
            Financial operations, underwriting pipeline, and capital overview for today.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`bg-white border-[#D7E3F5] text-[#07152F] hover:bg-[#F4F8FF] text-xs h-9 ${
              Object.values(appliedFilters).filter(Boolean).length > 0 ? 'border-[#155EEF] text-[#155EEF]' : ''
            }`}
          >
            <Filter className="w-3.5 h-3.5 mr-1.5 text-[#155EEF]" />
            Filters
            {Object.values(appliedFilters).filter(Boolean).length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-[#155EEF] text-white font-bold">
                {Object.values(appliedFilters).filter(Boolean).length}
              </span>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="bg-white border-[#D7E3F5] text-[#07152F] hover:bg-[#F4F8FF] text-xs h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Filters Expandable Bar ───────────────────────────────────────── */}
      {showFilters && (
        <Card className="bg-surface-elevated border border-border shadow-xl animate-in fade-in duration-150">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              <div>
                <Label className="text-text-secondary">State</Label>
                <select
                  value={filters.state}
                  onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st === 'All States' ? '' : st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-text-secondary">Loan Type</Label>
                <select
                  value={filters.loanType}
                  onChange={(e) => setFilters({ ...filters, loanType: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                >
                  {LOAN_TYPES.map((lt) => (
                    <option key={lt} value={lt === 'All Types' ? '' : lt}>
                      {lt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-text-secondary">Status</Label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                >
                  {LOAN_STATUSES.map((st) => (
                    <option key={st} value={st === 'All Statuses' ? '' : st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-text-secondary">From Date</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="bg-surface border-border text-text-primary mt-1 h-9"
                />
              </div>

              <div>
                <Label className="text-text-secondary">To Date</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="bg-surface border-border text-text-primary mt-1 h-9"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="border-border text-text-secondary hover:bg-surface-elevated hover:brightness-110 text-xs h-8"
              >
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleApplyFilters}
                className="bg-primary hover:bg-primary/90 text-text-primary text-xs h-8 font-bold"
              >
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 6 KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <KpiCard
          label="Total Customers"
          value={fmt(kpis.totalCustomers)}
          comparison="Registered borrowers"
          icon={Users}
          accentColor="gold"
          link="/admin/customers"
        />
        <KpiCard
          label="Loan Applications"
          value={fmt(kpis.totalLoanApplications)}
          comparison="All active requests"
          trend="up"
          icon={FileSpreadsheet}
          accentColor="gold"
          link="/admin/loans"
        />
        <KpiCard
          label="Pending Review"
          value={fmt(kpis.loansUnderReview)}
          comparison="Requires underwriting"
          icon={Clock}
          accentColor="amber"
          link="/admin/loans/pending"
        />
        <KpiCard
          label="Approved Loans"
          value={fmt(kpis.approvedLoans)}
          comparison="Sanctioned deals"
          icon={CheckCircle2}
          accentColor="mint"
          link="/admin/loans/approved"
        />
        <KpiCard
          label="Disbursed Amount"
          value={fmtCurr(kpis.totalDisbursed || 0)}
          comparison="Capital released"
          icon={IndianRupee}
          accentColor="mint"
          link="/admin/disbursements"
        />
        <KpiCard
          label="Pending Payments"
          value={fmt(kpis.paymentPending)}
          comparison="UTR verifications"
          icon={CreditCard}
          accentColor="amber"
          link="/admin/payments?status=PENDING"
        />
      </div>

      {/* ── Charts Grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Loan Applications Trend (Area/Line chart) */}
        <Card className="lg:col-span-2 bg-white border border-[#D7E3F5] rounded-2xl shadow-sm">
          <div className="p-4 sm:p-5 border-b border-[#D7E3F5] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#07152F]">Loan Applications Trend</h3>
              <p className="text-xs text-[#64748B]">Application volume and approval velocity</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-[#64748B]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#155EEF]" /> Applications
              </span>
              <span className="flex items-center gap-1.5 text-[#64748B]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" /> Approved
              </span>
            </div>
          </div>
          <CardContent className="p-4 sm:p-5">
            <div className="h-64 w-full">
              {applicationTrend.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-[#64748B]">
                  No trend data available for current period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={applicationTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(d) => (typeof d === 'string' ? d.slice(5) : d)}
                    />
                    <YAxis stroke="#64748B" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#D7E3F5',
                        borderRadius: '10px',
                        color: '#07152F',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px rgba(7,21,47,0.08)',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="applications"
                      stroke="#155EEF"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#155EEF' }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="approved"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#10B981' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loan Status Distribution (Donut Chart) */}
        <Card className="bg-white border border-[#D7E3F5] rounded-2xl shadow-sm flex flex-col">
          <div className="p-4 sm:p-5 border-b border-[#D7E3F5]">
            <h3 className="text-sm font-bold text-[#07152F]">Loan Status Distribution</h3>
            <p className="text-xs text-[#64748B]">Pipeline allocation breakdown</p>
          </div>
          <CardContent className="p-4 sm:p-5 flex-1 flex flex-col justify-center">
            <div className="h-52 w-full">
              {statusDistribution.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-[#64748B]">
                  No status distribution records
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {statusDistribution.map((_: any, idx: number) => (
                        <Cell key={`cell-${idx}`} fill={statusDonutColors[idx % statusDonutColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#D7E3F5',
                        borderRadius: '10px',
                        color: '#07152F',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px rgba(7,21,47,0.08)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Donut Legend */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs border-t border-[#E8F1FF] pt-3">
              {statusDistribution.slice(0, 4).map((item: any, idx: number) => (
                <div key={item.status} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#64748B] truncate">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: statusDonutColors[idx % statusDonutColors.length] }}
                    />
                    <span className="truncate">{item.status.replace(/_/g, ' ')}</span>
                  </span>
                  <span className="font-bold text-[#07152F] font-mono">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Disbursement Overview & Operational Metrics ──────────────────── */}
      <Card className="bg-white border border-[#D7E3F5] rounded-2xl shadow-sm">
        <div className="p-4 sm:p-5 border-b border-[#D7E3F5] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-[#07152F]">Disbursement & Lending Overview</h3>
            <p className="text-xs text-[#64748B]">
              Capital deployed: <span className="text-emerald-600 font-bold">{fmtCurr(kpis.totalDisbursed)}</span> across approved applications
            </p>
          </div>
          <Link
            to="/admin/disbursements"
            className="text-xs font-semibold text-[#155EEF] hover:text-[#123B8E] flex items-center gap-1 transition-colors"
          >
            <span>View All Disbursements</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
        <CardContent className="p-4 sm:p-5">
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={applicationTrend.slice(-14)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} tickFormatter={(d) => (typeof d === 'string' ? d.slice(5) : d)} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#D7E3F5',
                    borderRadius: '10px',
                    color: '#07152F',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(7,21,47,0.08)',
                  }}
                />
                <Bar dataKey="approved" name="Approved Deals" fill="#155EEF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── Application Table ────────────────────────────────────────────── */}
      <Card className="bg-white border border-[#D7E3F5] rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#D7E3F5] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#07152F]">Recent Loan Applications</h3>
            <p className="text-xs text-[#64748B]">Operational review and decision queue</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <Input
                placeholder="Filter applications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 bg-[#F4F8FF] border-[#D7E3F5] text-[#07152F] text-xs h-8.5 rounded-lg placeholder-[#94A3B8] focus:border-[#155EEF] focus:bg-white"
              />
            </div>
            <Link
              to="/admin/loans"
              className="text-xs font-semibold text-[#155EEF] hover:text-[#123B8E] whitespace-nowrap transition-colors"
            >
              View All ({kpis.totalLoanApplications})
            </Link>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#64748B]">
            <thead className="bg-[#F4F8FF] text-[#64748B] uppercase tracking-wider text-[10px] font-bold border-b border-[#D7E3F5]">
              <tr>
                <th className="px-4 py-3">Application ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Loan Type</th>
                <th className="px-4 py-3">Requested Amount</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Applied Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8F1FF] bg-white">
              {filteredRecent.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-xs text-[#64748B]">
                    No loan applications matching the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredRecent.map((app: any) => (
                  <tr key={app.id} className="hover:bg-[#F4F8FF] transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-[#07152F]">
                      <Link to={`/admin/loans/${app.id}`} className="hover:text-[#155EEF] transition-colors">
                        {app.applicationNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-[#07152F]">{app.customerName}</p>
                        <p className="text-[11px] text-[#64748B] font-mono">{app.mobile}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#07152F]">{app.loanType}</td>
                    <td className="px-4 py-3 font-mono font-bold text-[#07152F]">
                      {fmtCurr(app.requestedAmount)}
                    </td>
                    <td className="px-4 py-3">{app.state || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {app.submittedAt
                        ? new Date(app.submittedAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(app.status)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link to={`/admin/loans/${app.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-[#64748B] hover:text-[#07152F] hover:bg-[#E8F1FF]"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View
                          </Button>
                        </Link>

                        {/* Underwriting Action Buttons */}
                        {['PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_REQUIRED'].includes(app.status) && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => setApproveModal({ open: true, loan: app })}
                              className="h-7 px-2.5 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-300 font-semibold rounded-md transition-colors"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => setRejectModal({ open: true, loan: app })}
                              className="h-7 px-2.5 text-xs bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-300 font-semibold rounded-md transition-colors"
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <ApproveModal
        loan={approveModal.loan}
        open={approveModal.open}
        onClose={() => setApproveModal({ open: false, loan: null })}
        onApproved={onActionDone}
      />
      <RejectModal
        loan={rejectModal.loan}
        open={rejectModal.open}
        onClose={() => setRejectModal({ open: false, loan: null })}
        onRejected={onActionDone}
      />
    </div>
  );
};

export default AdminDashboard;
