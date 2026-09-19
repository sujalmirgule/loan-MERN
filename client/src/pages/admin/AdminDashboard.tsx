import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  AlertCircle,
  CreditCard,
  Send,
  Search,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Building,
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
} from 'recharts';

interface AdminDashboardData {
  kpis: {
    totalCustomers: number;
    kycPending: number;
    kycApproved: number;
    kycRejected: number;
    totalLoanApplications: number;
    loansUnderReview: number;
    approvedLoans: number;
    rejectedLoans: number;
    paymentPending: number;
    paymentVerified: number;
    totalDisbursed: number;
    activeLoans: number;
  };
  funnel: Array<{
    step: string;
    count: number;
    percentage: number;
  }>;
  trackingTable: Array<{
    customerId: string;
    fullName: string;
    mobile: string;
    email: string;
    state: string;
    city: string;
    signupStatus: string;
    kycStatus: string;
    loanStatus: string;
    applicationNumber: string | null;
    loanId: string | null;
    paymentStatus: string;
    lastActivity: string;
  }>;
}

const FUNNEL_COLORS = ['#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#059669'];

export const AdminDashboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [kycFilter, setKycFilter] = useState('ALL');
  const [loanFilter, setLoanFilter] = useState('ALL');

  const { data, isLoading, isError, refetch } = useQuery<AdminDashboardData>({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get(API_ENDPOINTS.DASHBOARD.ADMIN);
      return res.data;
    },
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-xl" />
          ))}
        </div>
        <div className="h-72 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
        <h3 className="text-base font-semibold text-red-900">Failed to load admin analytics</h3>
        <p className="text-xs text-red-700 mt-1 mb-4">Could not retrieve aggregated platform metrics.</p>
        <Button onClick={() => refetch()} size="sm" variant="outline" className="border-red-300">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Retry
        </Button>
      </Card>
    );
  }

  const { kpis, funnel, trackingTable } = data;

  // Filter tracking table locally for instant responsive UX
  const filteredTracking = trackingTable.filter((item) => {
    const matchesSearch =
      !searchTerm.trim() ||
      item.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.mobile.includes(searchTerm) ||
      item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.applicationNumber && item.applicationNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesKyc = kycFilter === 'ALL' || item.kycStatus === kycFilter;
    const matchesLoan = loanFilter === 'ALL' || item.loanStatus === loanFilter;

    return matchesSearch && matchesKyc && matchesLoan;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'PAID':
        return <Badge className="bg-emerald-600 text-white text-[10px]">Approved</Badge>;
      case 'UNDER_REVIEW':
      case 'UNDER_VERIFICATION':
        return <Badge className="bg-amber-600 text-white text-[10px]">In Review</Badge>;
      case 'PAYMENT_REQUIRED':
        return <Badge className="bg-blue-600 text-white text-[10px]">Pay Req</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-600 text-white text-[10px]">Rejected</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2">
            <Building className="w-6 h-6 text-emerald-600" />
            <span>Executive Command Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Real-time fintech underwriting telemetry, borrower lifecycle funnel, and verification pipeline.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs h-8">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh Telemetry
          </Button>
        </div>
      </div>

      {/* 2. Top 12 Dynamic KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Customers */}
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Borrowers</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{kpis.totalCustomers}</p>
            <span className="text-[10px] text-slate-400">Registered Accounts</span>
          </CardContent>
        </Card>

        {/* KYC Pending */}
        <Card className="shadow-sm border-amber-200 bg-amber-50/30">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between text-amber-700 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">KYC In Queue</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-amber-950">{kpis.kycPending}</p>
            <span className="text-[10px] text-amber-700">Awaiting Verification</span>
          </CardContent>
        </Card>

        {/* KYC Approved */}
        <Card className="shadow-sm border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">KYC Approved</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-950">{kpis.kycApproved}</p>
            <span className="text-[10px] text-emerald-700">Verified Profiles</span>
          </CardContent>
        </Card>

        {/* KYC Rejected */}
        <Card className="shadow-sm border-red-200 bg-red-50/30">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between text-red-700 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">KYC Rejected</span>
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-red-950">{kpis.kycRejected}</p>
            <span className="text-[10px] text-red-700">Documentation Failed</span>
          </CardContent>
        </Card>

        {/* Total Loan Applications */}
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Loans</span>
              <FileSpreadsheet className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{kpis.totalLoanApplications}</p>
            <span className="text-[10px] text-slate-400">Applications Filed</span>
          </CardContent>
        </Card>

        {/* Loans Under Review */}
        <Card className="shadow-sm border-amber-200 bg-amber-50/30">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between text-amber-700 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Loans In Review</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-amber-950">{kpis.loansUnderReview}</p>
            <span className="text-[10px] text-amber-700">Underwriting Active</span>
          </CardContent>
        </Card>

        {/* Approved Loans */}
        <Card className="shadow-sm border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Loans Approved</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-950">{kpis.approvedLoans}</p>
            <span className="text-[10px] text-emerald-700">Sanctioned</span>
          </CardContent>
        </Card>

        {/* Rejected Loans */}
        <Card className="shadow-sm border-red-200 bg-red-50/30">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between text-red-700 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Loans Declined</span>
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-red-950">{kpis.rejectedLoans}</p>
            <span className="text-[10px] text-red-700">Underwriting Rejected</span>
          </CardContent>
        </Card>

        {/* Payment Pending */}
        <Card className="shadow-sm border-amber-200 bg-amber-50/30">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between text-amber-700 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">UTR Pending</span>
              <CreditCard className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-amber-950">{kpis.paymentPending}</p>
            <span className="text-[10px] text-amber-700">Requires UTR Verification</span>
          </CardContent>
        </Card>

        {/* Payment Verified */}
        <Card className="shadow-sm border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Payments Verified</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-950">{kpis.paymentVerified}</p>
            <span className="text-[10px] text-emerald-700">Verified & Auto-Approved</span>
          </CardContent>
        </Card>

        {/* Total Disbursed */}
        <Card className="shadow-sm border-emerald-300 bg-emerald-100/40">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between text-emerald-800 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Disbursed</span>
              <Send className="w-4 h-4 text-emerald-700" />
            </div>
            <p className="text-lg sm:text-xl font-extrabold text-emerald-950 truncate">
              ₹{kpis.totalDisbursed.toLocaleString('en-IN')}
            </p>
            <span className="text-[10px] text-emerald-800">Capital Released</span>
          </CardContent>
        </Card>

        {/* Active Loans */}
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Active Portfolio</span>
              <Building className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{kpis.activeLoans}</p>
            <span className="text-[10px] text-slate-400">Live Active Loans</span>
          </CardContent>
        </Card>
      </div>

      {/* 3. Customer Progress Funnel Visualizer */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center space-x-2">
            <span>Customer Conversion & Approval Funnel</span>
          </CardTitle>
          <CardDescription>
            Live borrower conversion rate across registration, verification, payment verification, and disbursement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} margin={{ top: 15, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="step" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip
                  formatter={(value: number, _name: string, item) => [
                    `${value} borrowers (${item.payload.percentage}%)`,
                    'Count',
                  ]}
                  contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {funnel.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 4. Real-time Signup / KYC / Payment Tracking Table */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <CardTitle className="text-base">Borrower Progress Pipeline</CardTitle>
              <CardDescription>Integrated status oversight tracking signup, KYC, payments, and loan approval</CardDescription>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  placeholder="Search name, mobile, app no..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-xs h-8 pl-8 w-44 sm:w-56"
                />
              </div>

              <select
                aria-label="Filter by KYC status"
                value={kycFilter}
                onChange={(e) => setKycFilter(e.target.value)}
                className="text-xs h-8 px-2 rounded-md border border-input bg-background"
              >
                <option value="ALL">All KYC</option>
                <option value="PENDING">KYC Pending</option>
                <option value="UNDER_REVIEW">KYC Review</option>
                <option value="APPROVED">KYC Approved</option>
                <option value="REJECTED">KYC Rejected</option>
              </select>

              <select
                aria-label="Filter by loan status"
                value={loanFilter}
                onChange={(e) => setLoanFilter(e.target.value)}
                className="text-xs h-8 px-2 rounded-md border border-input bg-background"
              >
                <option value="ALL">All Loans</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Borrower</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3">KYC Status</th>
                <th className="py-2.5 px-3">Loan Application</th>
                <th className="py-2.5 px-3">Payment Status</th>
                <th className="py-2.5 px-3">Last Activity</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTracking.length > 0 ? (
                filteredTracking.map((row) => (
                  <tr key={row.customerId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{row.fullName}</div>
                      <div className="text-[11px] font-mono text-slate-500">+91 {row.mobile}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {row.city}, {row.state}
                    </td>
                    <td className="py-2.5 px-3">{getStatusBadge(row.kycStatus)}</td>
                    <td className="py-2.5 px-3">
                      {row.applicationNumber ? (
                        <div>
                          <span className="font-mono text-slate-800 font-medium">{row.applicationNumber}</span>
                          <div className="mt-0.5">{getStatusBadge(row.loanStatus)}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No Loan Application</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">{getStatusBadge(row.paymentStatus)}</td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      {new Date(row.lastActivity).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Link to={`/admin/customers/${row.customerId}`}>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" title="Customer 360 View">
                            <ExternalLink className="w-3.5 h-3.5 mr-1" />
                            360 Profile
                          </Button>
                        </Link>
                        {row.loanId && (
                          <Link to={`/admin/loans/${row.loanId}`}>
                            <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]">
                              Loan
                            </Button>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No borrower records match your active search and filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};
