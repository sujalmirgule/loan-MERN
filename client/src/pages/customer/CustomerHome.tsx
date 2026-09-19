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
} from 'lucide-react';

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
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
  }>;
}

export const CustomerHome: React.FC = () => {
  const { data, isLoading, isError, refetch } = useQuery<DashboardResponse>({
    queryKey: ['customer-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get(API_ENDPOINTS.DASHBOARD.CUSTOMER);
      return res.data;
    },
    refetchInterval: 15000,
  });

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
        return <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">KYC Approved</Badge>;
      case 'UNDER_REVIEW':
        return <Badge className="bg-amber-600 text-white hover:bg-amber-700">Under Review</Badge>;
      case 'REUPLOAD_REQUIRED':
        return <Badge className="bg-orange-600 text-white hover:bg-orange-700">Re-upload Required</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-600 text-white hover:bg-red-700">KYC Rejected</Badge>;
      default:
        return <Badge variant="secondary">KYC Pending</Badge>;
    }
  };

  const getLoanStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-emerald-600 text-white">Approved</Badge>;
      case 'OFFER_PENDING_CUSTOMER':
        return <Badge className="bg-purple-600 text-white">Offer Received</Badge>;
      case 'DOCUMENTS_REQUIRED':
        return <Badge className="bg-orange-600 text-white">Docs Required</Badge>;
      case 'ON_HOLD':
        return <Badge className="bg-yellow-600 text-white">On Hold</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-600 text-white">Declined</Badge>;
      default:
        return <Badge className="bg-blue-600 text-white">In Review</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Greeting & Quick Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {getGreeting()}, {customer.fullName}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Registered Borrower: <span className="font-mono font-medium">+91 {customer.mobile}</span> | Aadhaar: <span className="font-mono">{customer.aadhaarMasked}</span>
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {getKycBadge(kycSummary.status)}
          <span className="text-xs text-slate-500 hidden sm:inline">|</span>
          <Badge variant="outline" className="text-xs bg-white text-slate-700 border-slate-300">
            Account Active
          </Badge>
        </div>
      </div>

      {/* 2. Top Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* KYC Status Card */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Identity & Verification</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <CardTitle className="text-base">KYC Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span>Verification Checklist</span>
                <span className="text-emerald-700 font-bold">{kycSummary.progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${kycSummary.progressPercent}%` }}
                />
              </div>
            </div>

            <p className="text-xs text-slate-600">
              {kycSummary.status === 'APPROVED'
                ? 'Your identity documents have been fully verified and approved.'
                : kycSummary.status === 'UNDER_REVIEW'
                ? 'Your submitted identity documents are currently under underwriting review.'
                : `${kycSummary.documentsUploaded} documents uploaded. ${kycSummary.requiredMissing.length} mandatory documents pending.`}
            </p>

            <Link to="/customer/kyc">
              <Button size="sm" variant={kycSummary.status === 'APPROVED' ? 'outline' : 'default'} className="w-full text-xs h-8">
                {kycSummary.status === 'APPROVED' ? 'View KYC Documents' : 'Complete KYC Verification'}
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Active Loan Card */}
        <Card className="md:col-span-2 shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Loan Summary</span>
              {loanSummary && getLoanStatusBadge(loanSummary.status)}
            </div>
            <CardTitle className="text-base">
              {loanSummary ? `Application ${loanSummary.applicationNumber}` : 'No Active Loan Application'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loanSummary ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block mb-0.5">Requested Amount</span>
                    <span className="text-sm font-bold text-slate-900">
                      ₹{loanSummary.requestedAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200">
                    <span className="text-emerald-700 block mb-0.5 font-medium">Sanctioned Amount</span>
                    <span className="text-sm font-bold text-emerald-950">
                      {loanSummary.approvedAmount ? `₹${loanSummary.approvedAmount.toLocaleString('en-IN')}` : 'Under Review'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block mb-0.5">Tenure</span>
                    <span className="text-sm font-bold text-slate-900">{loanSummary.tenureMonths} Months</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block mb-0.5">Estimated Monthly EMI</span>
                    <span className="text-sm font-bold text-slate-900">
                      {loanSummary.estimatedEmi ? `₹${loanSummary.estimatedEmi.toLocaleString('en-IN')}` : 'TBD'}
                    </span>
                  </div>
                </div>

                {/* Critical Action Banner */}
                {loanSummary.status === 'APPROVED' && !loanSummary.agreementAccepted && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <FileSignature className="w-5 h-5 text-emerald-700 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-emerald-900">Loan Approved! Agreement Ready for Signature</p>
                        <p className="text-[11px] text-emerald-700">Please review and electronically accept your agreement to initiate disbursement.</p>
                      </div>
                    </div>
                    <Link to={`/customer/agreement/${loanSummary.id}`}>
                      <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8 whitespace-nowrap">
                        Sign Agreement
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                )}

                {loanSummary.paymentStatus === 'PAYMENT_REQUIRED' && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <CreditCard className="w-5 h-5 text-amber-700 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-amber-900">Verification Payment Required</p>
                        <p className="text-[11px] text-amber-700">Submit your nominal verification reference/UTR to expedite loan underwriting.</p>
                      </div>
                    </div>
                    <Link to={`/customer/payment/${loanSummary.id}`}>
                      <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 whitespace-nowrap">
                        Submit Payment UTR
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                )}

                {loanSummary.isDisbursed && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                      <div>
                        <p className="text-xs font-bold text-emerald-900">Loan Disbursed Successfully</p>
                        <p className="text-[11px] text-emerald-700">Funds have been released to your verified bank account.</p>
                      </div>
                    </div>
                    <Link to={`/customer/loans/${loanSummary.id}`}>
                      <Button variant="outline" size="sm" className="text-xs h-8 border-emerald-300 text-emerald-800">
                        View Details
                      </Button>
                    </Link>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-1">
                  <Link to={`/customer/loans/${loanSummary.id}`}>
                    <Button variant="outline" size="sm" className="text-xs h-8">
                      View Loan Details & Status
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center space-y-3">
                <p className="text-xs text-slate-500">You do not have any open loan applications right now.</p>
                <Link to="/customer/apply">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9">
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
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center space-x-2">
            <Clock className="w-4 h-4 text-primary" />
            <span>Borrower Journey & Loan Lifecycle</span>
          </CardTitle>
          <CardDescription>Live progress of your loan from application to bank disbursement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="hidden md:flex items-center justify-between relative z-10">
              {timeline.map((item, idx) => (
                <div key={item.step} className="flex flex-col items-center text-center max-w-[110px]">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-2 transition-all ${
                      item.completed
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : item.current
                        ? 'bg-amber-500 text-white ring-4 ring-amber-100 animate-pulse'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {item.completed ? '✓' : idx + 1}
                  </div>
                  <span className={`text-xs font-medium ${item.completed || item.current ? 'text-slate-900' : 'text-slate-400'}`}>
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
                        ? 'bg-emerald-600 text-white'
                        : item.current
                        ? 'bg-amber-500 text-white ring-2 ring-amber-200'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {item.completed ? '✓' : idx + 1}
                  </div>
                  <span className={`text-xs font-medium ${item.completed || item.current ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                    {item.title}
                  </span>
                  {item.current && <Badge className="text-[10px] h-4 bg-amber-100 text-amber-800 border-amber-300">Current</Badge>}
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
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Link
              to="/customer/apply"
              className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-primary hover:shadow-sm transition-all group flex flex-col items-center text-center"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <IndianRupee className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-900">Apply for Loan</span>
              <span className="text-[10px] text-slate-500 mt-0.5">Quick application</span>
            </Link>

            <Link
              to="/customer/kyc"
              className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-primary hover:shadow-sm transition-all group flex flex-col items-center text-center"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-900">KYC Verification</span>
              <span className="text-[10px] text-slate-500 mt-0.5">Checklist & uploads</span>
            </Link>

            <Link
              to="/customer/documents"
              className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-primary hover:shadow-sm transition-all group flex flex-col items-center text-center"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-900">My Documents</span>
              <span className="text-[10px] text-slate-500 mt-0.5">All files & history</span>
            </Link>

            <Link
              to="/customer/loans"
              className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-primary hover:shadow-sm transition-all group flex flex-col items-center text-center"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-900">Loan History</span>
              <span className="text-[10px] text-slate-500 mt-0.5">View all requests</span>
            </Link>

            {loanSummary && (
              <Link
                to={`/customer/payment/${loanSummary.id}`}
                className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-primary hover:shadow-sm transition-all group flex flex-col items-center text-center"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <CreditCard className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-900">Pay Processing Fee</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Submit UTR</span>
              </Link>
            )}

            <Link
              to="/customer/support"
              className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-primary hover:shadow-sm transition-all group flex flex-col items-center text-center"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <HelpCircle className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-900">Borrower Support</span>
              <span className="text-[10px] text-slate-500 mt-0.5">FAQ & tickets</span>
            </Link>
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Alerts & Updates</h2>
            <Link to="/customer/notifications" className="text-xs text-primary font-medium hover:underline flex items-center">
              View all
              <Send className="w-3 h-3 ml-1" />
            </Link>
          </div>

          <Card className="shadow-sm border-slate-200 divide-y divide-slate-100">
            {notifications && notifications.length > 0 ? (
              notifications.map((notif) => (
                <div key={notif.id} className="p-3 text-xs flex items-start space-x-2 hover:bg-slate-50 transition-colors">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${notif.isRead ? 'bg-slate-300' : 'bg-emerald-600'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{notif.title}</p>
                    <p className="text-slate-600 line-clamp-2 text-[11px] mt-0.5">{notif.message}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
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
              <div className="p-6 text-center text-xs text-slate-400">
                <Bell className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                No unread notifications
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
