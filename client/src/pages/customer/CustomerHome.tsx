import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  CreditCard,
  Upload,
  ArrowRight,
  Clock,
  Bell,
  HelpCircle,
  FileSignature,
  IndianRupee,
  RefreshCw,
  Send,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Download,
  Eye,
  Receipt,
} from 'lucide-react';

import { useBrandTitle } from '@/hooks/useBrandTitle';

interface DashboardResponse {
  customer: {
    id: string;
    fullName: string;
    mobile: string;
    email: string;
    aadhaarMasked: string;
    kycStatus: string;
    status: string;
  };
  kycSummary: {
    status: string;
    progressPercent: number;
    documentsUploaded: number;
    requiredMissing: string[];
  };
  loanSummary: {
    id: string;
    applicationNumber: string;
    requestedAmount: number;
    approvedAmount: number | null;
    tenureMonths: number;
    estimatedEmi: number;
    status: string;
    paymentStatus: string;
    rejectionReason?: string;
    holdReason?: string;
    docRequestReason?: string;
    hasAgreement: boolean;
    agreementAccepted: boolean;
    isDisbursed: boolean;
    disbursementAmount: number | null;
  } | null;
  timeline: Array<{
    step: string;
    title: string;
    completed: boolean;
    current: boolean;
  }>;
  invoices?: Array<{
    id: string;
    invoiceNumber: string;
    chargeName: string;
    amount: number;
    taxAmount: number;
    totalAmount: number;
    status: string;
    chargeId?: string;
    issuedAt: string;
  }>;
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
  }>;
}

export const CustomerHome: React.FC = () => {
  useBrandTitle('Dashboard');
  const { data, isLoading, isError, refetch } = useQuery<DashboardResponse>({
    queryKey: ['customer-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get(API_ENDPOINTS.DASHBOARD.CUSTOMER);
      return res.data;
    },
    refetchInterval: 1500,
  });

  const { data: customerInvoices } = useQuery({
    queryKey: ['customer-invoices'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/customer/invoices');
        return res.data?.data || res.data || [];
      } catch {
        return [];
      }
    },
    refetchInterval: 2000,
  });

  const invoices = (data?.invoices && data.invoices.length > 0) ? data.invoices : (customerInvoices || []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-44 bg-slate-200 rounded-xl md:col-span-2" />
          <div className="h-44 bg-slate-200 rounded-xl" />
        </div>
        <div className="h-64 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
        <h3 className="text-base font-semibold text-red-900">Failed to load dashboard data</h3>
        <p className="text-xs text-red-700 mt-1 mb-4">We encountered an issue connecting to the financial services API.</p>
        <Button onClick={() => refetch()} size="sm" variant="outline" className="border-red-300">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Retry Loading
        </Button>
      </Card>
    );
  }

  const { customer, kycSummary, loanSummary, timeline, notifications } = data;

  const getKycBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">KYC Approved</Badge>;
      case 'UNDER_REVIEW':
        return <Badge className="bg-blue-50 text-blue-700 border border-blue-200 font-bold">Under Review</Badge>;
      case 'REUPLOAD_REQUIRED':
        return <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-bold">Re-upload Required</Badge>;
      case 'REJECTED':
        return <Badge className="bg-rose-50 text-rose-700 border border-rose-200 font-bold">KYC Rejected</Badge>;
      default:
        return <Badge variant="secondary" className="font-semibold">KYC Pending</Badge>;
    }
  };

  const getLoanStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">Approved</Badge>;
      case 'OFFER_PENDING_CUSTOMER':
        return <Badge className="bg-purple-50 text-purple-700 border border-purple-200 font-bold">Offer Received</Badge>;
      case 'DOCUMENTS_REQUIRED':
        return <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-bold">Docs Required</Badge>;
      case 'ON_HOLD':
        return <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-bold">On Hold</Badge>;
      case 'REJECTED':
        return <Badge className="bg-rose-50 text-rose-700 border border-rose-200 font-bold">Declined</Badge>;
      default:
        return <Badge className="bg-blue-50 text-blue-700 border border-blue-200 font-bold">In Review</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Greeting & Quick Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[#D9E6F2]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1F3A]">
            {getGreeting()}, {customer.fullName}!
          </h1>
          <p className="text-xs sm:text-sm text-[#52657A] mt-0.5">
            Registered Borrower: <span className="font-mono font-semibold text-[#0B1F3A]">+91 {customer.mobile}</span> | Aadhaar: <span className="font-mono text-[#0B1F3A]">{customer.aadhaarMasked}</span>
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {getKycBadge(kycSummary.status)}
          <span className="text-xs text-[#CBDDE9] hidden sm:inline">|</span>
          <Badge variant="outline" className="text-xs bg-white text-[#334155] border-[#CBDDE9] font-semibold">
            Account Active
          </Badge>
        </div>
      </div>

      {/* 2. Top Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* KYC Status Card */}
        <Card className="shadow-xs border-[#D9E6F2] bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Identity & Verification</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <CardTitle className="text-base font-bold text-[#0B1F3A]">KYC Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-[#334155]">Verification Checklist</span>
                <span className="text-emerald-700 font-bold">{kycSummary.progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-[#F0F6FC] rounded-full overflow-hidden border border-[#D9E6F2]/50">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${kycSummary.progressPercent}%` }}
                />
              </div>
            </div>

            <p className="text-xs text-[#52657A] font-medium leading-relaxed">
              {kycSummary.status === 'APPROVED'
                ? 'Your identity documents have been fully verified and approved.'
                : kycSummary.status === 'UNDER_REVIEW'
                ? 'Your submitted identity documents are currently under underwriting review.'
                : `${kycSummary.documentsUploaded} documents uploaded. ${kycSummary.requiredMissing.length} mandatory documents pending.`}
            </p>

            <Link to="/customer/kyc">
              <Button size="sm" variant={kycSummary.status === 'APPROVED' ? 'outline' : 'default'} className="w-full text-xs h-9 font-semibold">
                {kycSummary.status === 'APPROVED' ? 'View KYC Documents' : 'Complete KYC Verification'}
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Active Loan Card */}
        <Card className="md:col-span-2 shadow-xs border-[#D9E6F2] bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Active Loan Summary</span>
              {loanSummary && getLoanStatusBadge(loanSummary.status)}
            </div>
            <CardTitle className="text-base font-bold text-[#0B1F3A]">
              {loanSummary ? `Application ${loanSummary.applicationNumber}` : 'No Active Loan Application'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loanSummary ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-[#F7FAFC] rounded-xl border border-[#D9E6F2]">
                  <div>
                    <span className="text-[11px] text-[#64748B] uppercase font-bold tracking-wider block">Requested</span>
                    <span className="text-base font-bold text-[#0B1F3A] font-mono">
                      ₹{loanSummary.requestedAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#64748B] uppercase font-bold tracking-wider block">Sanctioned</span>
                    <span className="text-base font-bold text-emerald-700 font-mono">
                      {loanSummary.approvedAmount ? `₹${loanSummary.approvedAmount.toLocaleString('en-IN')}` : 'Under Review'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#64748B] uppercase font-bold tracking-wider block">Tenure</span>
                    <span className="text-base font-bold text-[#0B1F3A]">
                      {loanSummary.tenureMonths} Months
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#64748B] uppercase font-bold tracking-wider block">Est. EMI</span>
                    <span className="text-base font-bold text-[#2563EB] font-mono">
                      {loanSummary.estimatedEmi ? `₹${loanSummary.estimatedEmi.toLocaleString('en-IN')}` : 'TBD'}
                    </span>
                  </div>
                </div>

                {/* Critical Action Banner */}
                {loanSummary.status === 'APPROVED' && !loanSummary.agreementAccepted && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center space-x-2.5">
                      <FileSignature className="w-5 h-5 text-emerald-700 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-emerald-900">Loan Approved! Agreement Ready for Signature</p>
                        <p className="text-[11px] text-emerald-700 font-medium">Please review and electronically accept your agreement to initiate disbursement.</p>
                      </div>
                    </div>
                    <Link to={`/customer/agreement/${loanSummary.id}`}>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-4 rounded-xl font-bold whitespace-nowrap">
                        Sign Agreement
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                )}

                {loanSummary.paymentStatus === 'PAYMENT_REQUIRED' && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center space-x-2.5">
                      <CreditCard className="w-5 h-5 text-amber-700 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-amber-900">Verification Payment Required</p>
                        <p className="text-[11px] text-amber-700 font-medium">Submit your nominal verification reference/UTR to expedite loan underwriting.</p>
                      </div>
                    </div>
                    <Link to={`/customer/payment/${loanSummary.id}`}>
                      <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-9 px-4 rounded-xl font-bold whitespace-nowrap">
                        Submit Payment UTR
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                )}

                {loanSummary.isDisbursed && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between shadow-xs">
                    <div className="flex items-center space-x-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-emerald-900">Loan Disbursed Successfully</p>
                        <p className="text-[11px] text-emerald-700 font-medium">Funds have been released to your verified bank account.</p>
                      </div>
                    </div>
                    <Link to={`/customer/loans/${loanSummary.id}`}>
                      <Button variant="outline" size="sm" className="text-xs h-9 px-4 border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-bold rounded-xl">
                        View Details
                      </Button>
                    </Link>
                  </div>
                )}

                {/* Approval Letter Ready Banner */}
                {loanSummary.status === 'APPROVED' && (
                  <div className="p-3.5 bg-[#F0F6FC] border border-[#CBDDE9] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center space-x-2.5">
                      <ShieldCheck className="w-5 h-5 text-[#2563EB] shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-[#0B1F3A]">Official Approval Letter Ready</p>
                        <p className="text-[11px] text-[#52657A] font-medium">Official sanction letter with authorized verification seal is ready for download.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const res = await apiClient.get(`/customer/loans/${loanSummary.id}/approval-letter/pdf`, { responseType: 'blob' });
                            const blob = new Blob([res.data], { type: 'application/pdf' });
                            const url = window.URL.createObjectURL(blob);
                            window.open(url, '_blank');
                          } catch {
                            alert('Could not open approval letter.');
                          }
                        }}
                        className="text-xs h-9 px-3.5 border-[#CBDDE9] text-[#0B1F3A] hover:bg-white font-semibold rounded-xl"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1 text-[#2563EB]" />
                        View Letter
                      </Button>
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            const res = await apiClient.get(`/customer/loans/${loanSummary.id}/approval-letter/pdf?download=true`, { responseType: 'blob' });
                            const blob = new Blob([res.data], { type: 'application/pdf' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `Approval_Letter_${loanSummary.applicationNumber}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                          } catch {
                            alert('Could not download approval letter.');
                          }
                        }}
                        className="text-xs h-9 px-3.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-xl shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        Download PDF
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-1">
                  <Link to={`/customer/documents`}>
                    <Button variant="outline" size="sm" className="text-xs h-9 px-4 border-[#CBDDE9] text-[#0B1F3A] hover:bg-[#EFF6FF] hover:border-[#2563EB] font-semibold rounded-xl">
                      <FileText className="w-3.5 h-3.5 mr-1 text-[#2563EB]" />
                      Document Center
                    </Button>
                  </Link>
                  <Link to={`/customer/loans/${loanSummary.id}`}>
                    <Button variant="outline" size="sm" className="text-xs h-9 px-4 border-[#CBDDE9] text-[#0B1F3A] hover:bg-[#EFF6FF] hover:border-[#2563EB] font-semibold rounded-xl">
                      View Loan Details & Status
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center space-y-3">
                <p className="text-xs text-[#52657A] font-medium">You do not have any open loan applications right now.</p>
                <Link to="/customer/apply">
                  <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs h-10 px-5 rounded-xl font-bold shadow-xs">
                    <IndianRupee className="w-4 h-4 mr-1.5" />
                    Apply for a New Loan Now
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3. Real Dynamic Loan Lifecycle Timeline */}
      <Card className="shadow-xs border-[#D9E6F2] bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-[#0B1F3A] flex items-center space-x-2">
            <Clock className="w-4 h-4 text-[#2563EB]" />
            <span>Borrower Journey & Loan Lifecycle</span>
          </CardTitle>
          <CardDescription className="text-xs text-[#64748B]">Live progress of your loan from application to bank disbursement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative py-2">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-6 left-8 right-8 h-0.5 bg-[#D9E6F2] z-0" />

            <div className="hidden md:flex items-center justify-between relative z-10">
              {timeline.map((item, idx) => (
                <div key={item.step} className="flex flex-col items-center text-center max-w-[110px]">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-2 transition-all ${
                      item.completed
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : item.current
                        ? 'bg-[#2563EB] text-white ring-4 ring-blue-100 font-bold'
                        : 'bg-[#F0F6FC] text-[#64748B] border border-[#D9E6F2]'
                    }`}
                  >
                    {item.completed ? '✓' : idx + 1}
                  </div>
                  <span className={`text-xs font-semibold ${item.completed || item.current ? 'text-[#0B1F3A]' : 'text-[#64748B]'}`}>
                    {item.title}
                  </span>
                </div>
              ))}
            </div>

            {/* Mobile Vertical Timeline */}
            <div className="md:hidden space-y-3">
              {timeline.map((item, idx) => (
                <div key={item.step} className="flex items-center space-x-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      item.completed
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : item.current
                        ? 'bg-[#2563EB] text-white ring-2 ring-blue-200'
                        : 'bg-[#F0F6FC] text-[#64748B] border border-[#D9E6F2]'
                    }`}
                  >
                    {item.completed ? '✓' : idx + 1}
                  </div>
                  <span className={`text-xs font-semibold ${item.completed || item.current ? 'text-[#0B1F3A]' : 'text-[#64748B]'}`}>
                    {item.title}
                  </span>
                  {item.current && <Badge className="text-[10px] h-4 bg-blue-50 text-blue-700 border-blue-200 font-bold">Current</Badge>}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Quick Actions & Notifications Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Quick Actions */}
        <div className="md:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Link
              to="/customer/apply"
              className="p-3.5 rounded-xl bg-surface border border-border hover:border-primary hover:shadow-sm transition-all group flex flex-col items-center text-center"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <IndianRupee className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-text-primary">Apply for Loan</span>
              <span className="text-[10px] text-text-secondary mt-0.5">Quick application</span>
            </Link>

            <Link
              to="/customer/kyc"
              className="p-3.5 rounded-xl bg-surface border border-border hover:border-primary hover:shadow-sm transition-all group flex flex-col items-center text-center"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-text-primary">KYC Verification</span>
              <span className="text-[10px] text-text-secondary mt-0.5">Checklist & uploads</span>
            </Link>

            <Link
              to="/customer/documents"
              className="p-3.5 rounded-xl bg-surface border border-border hover:border-primary hover:shadow-sm transition-all group flex flex-col items-center text-center"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-text-primary">My Documents</span>
              <span className="text-[10px] text-text-secondary mt-0.5">All files & history</span>
            </Link>

            <Link
              to="/customer/loans"
              className="p-3.5 rounded-xl bg-surface border border-border hover:border-primary hover:shadow-sm transition-all group flex flex-col items-center text-center"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-text-primary">Loan History</span>
              <span className="text-[10px] text-text-secondary mt-0.5">View all requests</span>
            </Link>

            {loanSummary && (
              <Link
                to={`/customer/payment/${loanSummary.id}`}
                className="p-3.5 rounded-xl bg-surface border border-border hover:border-primary hover:shadow-sm transition-all group flex flex-col items-center text-center"
              >
                <div className="w-10 h-10 rounded-lg bg-warning/10 text-warning flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <CreditCard className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-text-primary">Pay Processing Fee</span>
                <span className="text-[10px] text-text-secondary mt-0.5">Submit UTR</span>
              </Link>
            )}

            <Link
              to="/customer/support"
              className="p-3.5 rounded-xl bg-surface border border-border hover:border-primary hover:shadow-sm transition-all group flex flex-col items-center text-center"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <HelpCircle className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-text-primary">Borrower Support</span>
              <span className="text-[10px] text-text-secondary mt-0.5">FAQ & tickets</span>
            </Link>
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Alerts & Updates</h2>
            <Link to="/customer/notifications" className="text-xs text-primary font-medium hover:underline flex items-center">
              View all
              <Send className="w-3 h-3 ml-1" />
            </Link>
          </div>

          <Card className="shadow-sm border-border bg-surface divide-y divide-border">
            {notifications && notifications.length > 0 ? (
              notifications.map((notif) => (
                <div key={notif.id} className="p-3 text-xs flex items-start space-x-2 hover:bg-surface-elevated transition-colors">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${notif.isRead ? 'bg-surface-elevated' : 'bg-success text-background'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary truncate">{notif.title}</p>
                    <p className="text-text-secondary line-clamp-2 text-[11px] mt-0.5">{notif.message}</p>
                    <span className="text-[10px] text-text-secondary mt-1 block">
                      {new Date(notif.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-text-secondary">
                <Bell className="w-6 h-6 text-text-secondary mx-auto mb-1.5" />
                No unread notifications
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* 5. Payment & Invoice History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              <span>Payment & Invoice History</span>
            </h2>
            <p className="text-xs text-text-secondary">Official tax invoices for all verified fees and charges</p>
          </div>
          <Link to="/customer/documents" className="text-xs text-primary font-medium hover:underline flex items-center">
            All Documents
            <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </div>

        {invoices && invoices.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {invoices.map((inv: any) => (
              <Card key={inv.id} className="p-4 bg-surface border-border flex flex-col justify-between hover:shadow-sm transition-shadow">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs text-text-primary">{inv.chargeName || 'Fee Invoice'}</span>
                    <Badge className="bg-success text-background text-[10px] font-bold">PAID</Badge>
                  </div>
                  <p className="text-[11px] font-mono text-primary">Invoice #{inv.invoiceNumber}</p>
                  <div className="text-xs flex justify-between pt-1 border-t border-border">
                    <span className="text-text-secondary">Amount Paid:</span>
                    <strong className="text-success font-mono font-bold">₹{(inv.totalAmount || inv.amount || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="text-[10px] text-text-secondary">
                    Date: {inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString('en-IN') : 'Recent'}
                  </div>
                </div>
                <div className="flex gap-2 pt-3 mt-2 border-t border-border">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`/api/customer/invoices/${inv.id}/pdf`, '_blank')}
                    className="flex-1 h-7 text-[11px]"
                  >
                    <Eye className="w-3 h-3 mr-1" /> View
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = `/api/customer/invoices/${inv.id}/pdf?download=true`;
                      link.download = `Invoice-${inv.invoiceNumber}.pdf`;
                      link.click();
                    }}
                    className="flex-1 h-7 text-[11px] bg-success text-background hover:bg-success/90 font-semibold"
                  >
                    <Download className="w-3 h-3 mr-1" /> Download
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-6 text-center bg-surface border-border">
            <Receipt className="w-8 h-8 text-text-secondary mx-auto mb-2 opacity-50" />
            <p className="text-xs text-text-secondary">No invoices issued yet. Invoices appear automatically upon payment verification.</p>
          </Card>
        )}
      </div>
    </div>
  );
};
