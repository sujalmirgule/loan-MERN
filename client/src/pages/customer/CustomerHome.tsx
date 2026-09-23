import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  FileText,
  CreditCard,
  Upload,
  ArrowRight,
  Clock,
  HelpCircle,
  FileSignature,
  IndianRupee,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Download,
  Eye,
  Receipt,
  Phone,
  Mail,
  Loader2,
  Landmark,
  User,
  AlertTriangle,
  FolderOpen,
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
    interestRate?: number;
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
    taxAmount?: number;
    totalAmount: number;
    status: string;
    chargeId?: string;
    issuedAt: string;
    transactionRef?: string;
    utr?: string;
  }>;
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
  }>;
}

interface CustomerChargeItem {
  id: string;
  name: string;
  amount: number;
  status: 'PENDING' | 'UNDER_VERIFICATION' | 'PAID' | 'FAILED' | 'CANCELLED';
  remark?: string | null;
  dueDate?: string | null;
  paidAt?: string | null;
  transactionRef?: string | null;
  loanId?: string | null;
  createdAt: string;
}

interface CustomerDocItem {
  id: string;
  documentType: string;
  fileName: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'REUPLOAD_REQUIRED';
  uploadedAt: string;
}

interface CustomerFullProfile {
  id: string;
  fullName: string;
  fatherName?: string;
  gender?: string;
  dob?: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode?: string;
  monthlyIncome: number;
  aadhaarMasked: string;
  panMasked?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankBranch?: string;
  bankAccountType?: string;
  kycStatus: string;
  status: string;
  createdAt: string;
}

// Normalizes charge names (including all TDS/TSD variations) for clean UI presentation
export const normalizeChargeName = (name: string): string => {
  if (!name) return 'Application Fee';
  const trimmed = name.trim();
  if (/tds|tsd/i.test(trimmed)) {
    return 'TSD/TDS Charges';
  }
  return trimmed;
};

export const CustomerHome: React.FC = () => {
  useBrandTitle('Dashboard');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Apply Eligibility Modals State
  const [eligibilityState, setEligibilityState] = useState<'NONE' | 'KYC_REQUIRED' | 'DOCS_REQUIRED'>('NONE');
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applyAmount, setApplyAmount] = useState<number>(100000);
  const [applyTenure, setApplyTenure] = useState<number>(12);
  const [applyPurpose, setApplyPurpose] = useState<string>('Business & Financial Development');
  const [isSubmittingLoan, setIsSubmittingLoan] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Invoice Preview State
  const [invoicePreviewOpen, setInvoicePreviewOpen] = useState(false);
  const [invoicePreviewUrl, setInvoicePreviewUrl] = useState<string | null>(null);
  const [invoicePreviewTitle, setInvoicePreviewTitle] = useState('');
  const [invoicePreviewLoading, setInvoicePreviewLoading] = useState(false);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);

  // 1. Fetch Customer Dashboard Overview
  const { data, isLoading, isError, refetch } = useQuery<DashboardResponse>({
    queryKey: ['customer-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get(API_ENDPOINTS.DASHBOARD.CUSTOMER);
      return res.data;
    },
    refetchInterval: 2000,
  });

  // 2. Fetch Customer Full Profile (for Customer Info and Bank Details)
  const { data: profileData } = useQuery<CustomerFullProfile>({
    queryKey: ['customerProfileDetail'],
    queryFn: async () => {
      try {
        const res = await apiClient.get(API_ENDPOINTS.CUSTOMERS.PROFILE);
        return res.data?.data?.profile || res.data?.profile || res.data?.data || res.data;
      } catch {
        return null as any;
      }
    },
    refetchInterval: 3000,
  });

  // 3. Fetch Customer Charges (Direct Charges API)
  const { data: customerChargesData } = useQuery<any>({
    queryKey: ['customerChargesList'],
    queryFn: async () => {
      try {
        const res = await apiClient.get(API_ENDPOINTS.CUSTOMER_CHARGES.LIST);
        return res.data?.data || res.data || [];
      } catch {
        return [];
      }
    },
    refetchInterval: 2000,
  });

  const customerCharges: CustomerChargeItem[] =
    (Array.isArray(customerChargesData) ? customerChargesData : null) ||
    (Array.isArray((customerChargesData as any)?.data) ? (customerChargesData as any).data : null) ||
    [];

  // 4. Fetch Customer Invoices
  const { data: customerInvoicesData } = useQuery<any>({
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

  const customerInvoices: any[] =
    (Array.isArray(customerInvoicesData) ? customerInvoicesData : null) ||
    (Array.isArray((customerInvoicesData as any)?.data) ? (customerInvoicesData as any).data : null) ||
    [];

  // 5. Fetch Customer Documents to verify 4/4 status
  const { data: customerDocsDataRaw } = useQuery<any>({
    queryKey: ['customer-documents-summary'],
    queryFn: async () => {
      try {
        const res = await apiClient.get(API_ENDPOINTS.CUSTOMER_DOCS.LIST);
        return res.data?.data || res.data || { documents: [] };
      } catch {
        return { documents: [] };
      }
    },
    refetchInterval: 2500,
  });

  const uploadedDocsList: CustomerDocItem[] =
    (Array.isArray(customerDocsDataRaw?.documents) ? customerDocsDataRaw.documents : null) ||
    (Array.isArray((customerDocsDataRaw as any)?.data?.documents) ? (customerDocsDataRaw as any).data.documents : null) ||
    (Array.isArray(customerDocsDataRaw) ? customerDocsDataRaw : null) ||
    (Array.isArray((customerDocsDataRaw as any)?.data) ? (customerDocsDataRaw as any).data : null) ||
    [];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse max-w-6xl mx-auto pb-12">
        <div className="h-10 bg-slate-200 rounded w-1/3" />
        <div className="h-48 bg-slate-200 rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-[#D6E4F5] bg-red-50/40 p-8 text-center max-w-2xl mx-auto my-12 rounded-3xl shadow-xs">
        <AlertCircle className="w-10 h-10 text-[#DC2626] mx-auto mb-3" />
        <h3 className="text-lg font-bold text-[#0F172A]">Failed to load dashboard data</h3>
        <p className="text-xs text-[#64748B] mt-1 mb-5">We encountered an issue connecting to the financial services API.</p>
        <Button onClick={() => refetch()} size="sm" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold h-10 px-5 rounded-xl shadow-xs">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry Connection
        </Button>
      </Card>
    );
  }

  const { customer, kycSummary, loanSummary, timeline } = data;

  const distinctDocTypes = new Set(uploadedDocsList.map((d) => d.documentType));
  const uploadedCount = ['PAN', 'BANK_STATEMENT', 'INCOME_PROOF', 'OTHER'].filter((t) => distinctDocTypes.has(t)).length;
  const allDocsReady = uploadedCount >= 3; // 3 mandatory (PAN, Bank, Income) or 4 total
  const isKycApproved = (customer.kycStatus === 'APPROVED' || customer.kycStatus === 'VERIFIED' || kycSummary.status === 'APPROVED' || kycSummary.status === 'VERIFIED');

  // Filter charges
  const pendingCharges = customerCharges.filter(
    (c) => c.status === 'PENDING' || c.status === 'UNDER_VERIFICATION' || (c.status === 'PAID' && !c.paidAt)
  );
  const paidCharges = customerCharges.filter((c) => c.status === 'PAID');

  // Combined Invoices list (prioritize /customer/invoices then dashboard.invoices)
  const invoicesList = (customerInvoices && customerInvoices.length > 0)
    ? customerInvoices
    : (data?.invoices && data.invoices.length > 0)
    ? data.invoices
    : [];

  // Check TDS/TSD status
  const hasTdsPaid = customerCharges.some((c) => /tds|tsd/i.test(c.name) && c.status === 'PAID');
  const hasTdsPending = customerCharges.some((c) => /tds|tsd/i.test(c.name) && (c.status === 'PENDING' || c.status === 'UNDER_VERIFICATION'));

  // Handler for Primary "Apply for Loan" CTA with 3-State Stage Verification
  const handleApplyClick = () => {
    if (!isKycApproved) {
      setEligibilityState('KYC_REQUIRED');
      return;
    }
    if (!allDocsReady) {
      setEligibilityState('DOCS_REQUIRED');
      return;
    }
    setEligibilityState('NONE');
    setApplyModalOpen(true);
  };

  // KYC Badge renderer
  const getKycBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'VERIFIED':
        return <Badge className="bg-emerald-50 text-[#16A34A] border border-emerald-200 font-bold px-2.5 py-0.5">KYC Approved ✓</Badge>;
      case 'UNDER_REVIEW':
        return <Badge className="bg-[#EFF6FF] text-[#2563EB] border border-[#D6E4F5] font-bold px-2.5 py-0.5">KYC Under Review</Badge>;
      case 'REUPLOAD_REQUIRED':
        return <Badge className="bg-amber-50 text-[#F59E0B] border border-amber-200 font-bold px-2.5 py-0.5">KYC Re-upload Required</Badge>;
      case 'REJECTED':
        return <Badge className="bg-rose-50 text-[#DC2626] border border-rose-200 font-bold px-2.5 py-0.5">KYC Rejected</Badge>;
      default:
        return <Badge className="bg-slate-100 text-[#64748B] border border-slate-200 font-semibold px-2.5 py-0.5">KYC Pending</Badge>;
    }
  };

  // Loan Status Badge renderer
  const getLoanStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-emerald-50 text-[#16A34A] border border-emerald-200 font-bold px-3 py-1">Sanctioned & Approved ✓</Badge>;
      case 'OFFER_PENDING_CUSTOMER':
        return <Badge className="bg-purple-50 text-purple-700 border border-purple-200 font-bold px-3 py-1">Offer Ready</Badge>;
      case 'DOCUMENTS_REQUIRED':
        return <Badge className="bg-amber-50 text-[#F59E0B] border border-amber-200 font-bold px-3 py-1">Documents Required</Badge>;
      case 'ON_HOLD':
        return <Badge className="bg-amber-50 text-[#F59E0B] border border-amber-200 font-bold px-3 py-1">On Underwriting Hold</Badge>;
      case 'REJECTED':
        return <Badge className="bg-rose-50 text-[#DC2626] border border-rose-200 font-bold px-3 py-1">Application Declined</Badge>;
      default:
        return <Badge className="bg-[#EFF6FF] text-[#2563EB] border border-[#D6E4F5] font-bold px-3 py-1">In Underwriting Review</Badge>;
    }
  };

  // Handlers for Invoice
  const handleViewInvoice = async (invoiceIdOrChargeId: string, title = 'Tax Invoice') => {
    try {
      setInvoicePreviewLoading(true);
      setInvoicePreviewTitle(title);
      setInvoicePreviewOpen(true);
      const res = await apiClient.get(
        API_ENDPOINTS.CUSTOMER_CHARGES.INVOICE(invoiceIdOrChargeId, false),
        { responseType: 'blob' }
      );
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      setInvoicePreviewUrl(url);
    } catch {
      try {
        const res = await apiClient.get(`/customer/invoices/${invoiceIdOrChargeId}/pdf`, { responseType: 'blob' });
        const blob = new Blob([res.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        setInvoicePreviewUrl(url);
      } catch {
        alert('Could not render invoice preview. Please use Download Invoice.');
        setInvoicePreviewOpen(false);
      }
    } finally {
      setInvoicePreviewLoading(false);
    }
  };

  const handleDownloadInvoice = async (invoiceIdOrChargeId: string, invoiceNumberOrName: string) => {
    try {
      setDownloadingInvoiceId(invoiceIdOrChargeId);
      let res;
      try {
        res = await apiClient.get(
          API_ENDPOINTS.CUSTOMER_CHARGES.INVOICE(invoiceIdOrChargeId, true),
          { responseType: 'blob' }
        );
      } catch {
        res = await apiClient.get(`/customer/invoices/${invoiceIdOrChargeId}/pdf?download=true`, { responseType: 'blob' });
      }
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${invoiceNumberOrName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      alert('Unable to download invoice PDF. Please try again.');
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  // Apply For Loan directly from Dashboard (Using Existing POST /customer/loan-applications)
  const handleApplyLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingLoan(true);
    setApplyError(null);

    try {
      await apiClient.post(API_ENDPOINTS.LOANS.CUSTOMER_APPLY, {
        amount: Number(applyAmount),
        tenureMonths: Number(applyTenure),
        purpose: applyPurpose,
      });

      setApplyModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['customer-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['customerLoans'] });
      queryClient.invalidateQueries({ queryKey: ['adminLoanApplications'] });
      queryClient.invalidateQueries({ queryKey: ['adminLoanApprovalOps'] });
      refetch();
    } catch (err: any) {
      setApplyError(err.response?.data?.message || 'Failed to submit loan application. Please try again.');
    } finally {
      setIsSubmittingLoan(false);
    }
  };

  const customerName = profileData?.fullName || customer.fullName;
  const fatherName = profileData?.fatherName || '—';
  const mobileNumber = profileData?.mobile || customer.mobile;
  const emailAddress = profileData?.email || customer.email;
  const gender = profileData?.gender || '—';
  const dob = profileData?.dob || '—';
  const address = profileData?.address || (customer as any).address || '—';
  const city = profileData?.city || (customer as any).city || '—';
  const state = profileData?.state || (customer as any).state || '—';
  const pincode = profileData?.pincode || '—';
  const bankName = profileData?.bankName || 'HDFC Bank';
  const bankAccountHolder = profileData?.fullName || customer.fullName;
  const bankAccountNumber = profileData?.bankAccountNumber
    ? `•••• •••• ${profileData.bankAccountNumber.slice(-4)}`
    : '•••• •••• 7192';
  const bankIfsc = profileData?.bankIfsc || 'HDFC0001234';
  const bankBranch = profileData?.bankBranch || 'Main Branch';
  const bankAccountType = profileData?.bankAccountType || 'Savings Account';

  // Sanctioned Loan Derived Values
  const sanctionedAmount = loanSummary?.approvedAmount || loanSummary?.requestedAmount || 0;
  const interestRateValue = loanSummary?.interestRate || 8.5;
  const monthlyEmiValue = loanSummary?.estimatedEmi || (sanctionedAmount > 0 ? Math.round(sanctionedAmount / (loanSummary?.tenureMonths || 12)) : 0);
  const tenureValue = loanSummary?.tenureMonths || 12;
  const totalPayableValue = monthlyEmiValue * tenureValue;
  const totalInterestValue = Math.max(0, totalPayableValue - sanctionedAmount);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 text-[#0F172A]">
      {/* ========================================================================= */}
      {/* 1. CUSTOMER / LOAN HERO                                                   */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {/* Top Greeting Bar with Prominent Apply CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-[#D6E4F5]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F2A5F]">
              {getGreeting()}, {customerName}!
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
              Registered Borrower: <span className="font-mono font-semibold text-[#0F172A]">+91 {mobileNumber}</span> | Aadhaar: <span className="font-mono text-[#0F172A]">{customer.aadhaarMasked}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {getKycBadge(customer.kycStatus || kycSummary.status)}
            <Badge variant="outline" className="text-xs bg-white text-[#0F172A] border-[#D6E4F5] font-semibold">
              Account Active
            </Badge>
            {/* Prominent Fintech Apply for Loan CTA */}
            {!loanSummary && (
              <Button
                data-testid="hero-apply-loan-btn"
                onClick={handleApplyClick}
                className="w-full sm:w-auto h-11 px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md flex items-center justify-center gap-2 transition active:scale-[0.98]"
              >
                <IndianRupee className="w-4 h-4" />
                <span>Apply for Loan</span>
              </Button>
            )}
          </div>
        </div>

        {/* Hero Customer / Loan Card */}
        <Card className="bg-white border-[#D6E4F5] rounded-3xl shadow-xs overflow-hidden">
          <CardHeader className="p-5 sm:p-6 pb-4 border-b border-[#D6E4F5]/60 bg-[#F7FAFF]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wider block mb-0.5">
                  LOAN ACCOUNT & PORTAL SUMMARY
                </span>
                <CardTitle className="text-xl sm:text-2xl font-black text-[#0F2A5F]">
                  {loanSummary ? `Application #${loanSummary.applicationNumber}` : `Customer ID #${customer.id.slice(0, 8).toUpperCase()}`}
                </CardTitle>
              </div>
              {loanSummary ? (
                <div className="shrink-0">
                  {getLoanStatusBadge(loanSummary.status)}
                </div>
              ) : (
                <Button
                  data-testid="card-apply-loan-btn"
                  onClick={handleApplyClick}
                  className="w-full sm:w-auto h-11 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md flex items-center justify-center gap-2"
                >
                  <IndianRupee className="w-4 h-4" />
                  <span>Apply for New Loan</span>
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-5 sm:p-6 space-y-4">
            {/* 5 Financial Metric Cards in Hero */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4 bg-[#F7FAFF] rounded-2xl border border-[#D6E4F5]">
              <div className="space-y-1">
                <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider block">Loan Type</span>
                <span className="text-base sm:text-lg font-bold text-[#0F172A] block">Personal Loan</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider block">Requested Amount</span>
                <span className="text-base sm:text-lg font-black text-[#0F172A] font-mono block">
                  {loanSummary ? `₹${loanSummary.requestedAmount.toLocaleString('en-IN')}` : '—'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-[#16A34A] uppercase font-bold tracking-wider block">Sanctioned Amount</span>
                <span className="text-base sm:text-lg font-black text-[#16A34A] font-mono block">
                  {loanSummary?.approvedAmount ? `₹${loanSummary.approvedAmount.toLocaleString('en-IN')}` : loanSummary ? 'Under Review' : '—'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-[#2563EB] uppercase font-bold tracking-wider block">Monthly EMI</span>
                <span className="text-base sm:text-lg font-black text-[#2563EB] font-mono block">
                  {loanSummary?.estimatedEmi ? `₹${loanSummary.estimatedEmi.toLocaleString('en-IN')}` : loanSummary ? 'Under Review' : '—'}
                </span>
              </div>
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider block">Interest Benchmark</span>
                <span className="text-base sm:text-lg font-black text-[#0F172A] block">
                  {loanSummary ? `${interestRateValue}% p.a.` : '8.5% p.a.'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 2. LOAN OVERVIEW / FINANCING SUMMARY                                      */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <span className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wider block">
              LOAN OVERVIEW
            </span>
            <h2 className="text-base sm:text-lg font-bold text-[#0F2A5F] flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-[#2563EB]" />
              <span>Complete Financial Terms & Repayment Overview</span>
            </h2>
            <p className="text-xs text-[#64748B]">Structured financial particulars of active loan facility</p>
          </div>
        </div>

        {loanSummary ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-[#D6E4F5] shadow-xs space-y-1">
              <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider block">Loan Requested</span>
              <span className="text-lg sm:text-xl font-black text-[#0F172A] font-mono block">
                ₹{loanSummary.requestedAmount.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-[#64748B]">Borrower applied amount</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#D6E4F5] shadow-xs space-y-1">
              <span className="text-[10px] text-[#16A34A] font-bold uppercase tracking-wider block">Sanctioned Amount</span>
              <span className="text-lg sm:text-xl font-black text-[#16A34A] font-mono block">
                {loanSummary.approvedAmount ? `₹${loanSummary.approvedAmount.toLocaleString('en-IN')}` : 'Under Review'}
              </span>
              <span className="text-[10px] text-[#64748B]">Approved credit ceiling</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#D6E4F5] shadow-xs space-y-1">
              <span className="text-[10px] text-[#2563EB] font-bold uppercase tracking-wider block">Monthly EMI</span>
              <span className="text-lg sm:text-xl font-black text-[#2563EB] font-mono block">
                {loanSummary.estimatedEmi ? `₹${loanSummary.estimatedEmi.toLocaleString('en-IN')}` : 'Under Review'}
              </span>
              <span className="text-[10px] text-[#64748B]">Monthly installment</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#D6E4F5] shadow-xs space-y-1">
              <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider block">Interest Rate</span>
              <span className="text-lg sm:text-xl font-black text-[#0F172A] block">
                {interestRateValue}% p.a.
              </span>
              <span className="text-[10px] text-[#64748B]">Floating benchmark</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#D6E4F5] shadow-xs space-y-1">
              <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider block">Tenure</span>
              <span className="text-lg sm:text-xl font-black text-[#0F172A] block">
                {tenureValue} Months
              </span>
              <span className="text-[10px] text-[#64748B]">Repayment duration</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#D6E4F5] shadow-xs space-y-1">
              <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider block">Total Interest</span>
              <span className="text-lg sm:text-xl font-black text-amber-700 font-mono block">
                {loanSummary.estimatedEmi ? `₹${totalInterestValue.toLocaleString('en-IN')}` : 'Under Review'}
              </span>
              <span className="text-[10px] text-[#64748B]">Cumulative interest</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#D6E4F5] shadow-xs space-y-1">
              <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider block">Total Payable</span>
              <span className="text-lg sm:text-xl font-black text-[#0F172A] font-mono block">
                {loanSummary.estimatedEmi ? `₹${totalPayableValue.toLocaleString('en-IN')}` : 'Under Review'}
              </span>
              <span className="text-[10px] text-[#64748B]">Principal + Interest</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#D6E4F5] shadow-xs space-y-1">
              <span className="text-[10px] text-[#16A34A] font-bold uppercase tracking-wider block">Disbursement Status</span>
              <span className="text-sm font-black text-[#16A34A] block">
                {loanSummary.isDisbursed
                  ? `Disbursed ₹${(loanSummary.disbursementAmount || sanctionedAmount).toLocaleString('en-IN')}`
                  : loanSummary.status === 'APPROVED'
                  ? 'Sanctioned • Ready'
                  : 'Underwriting Pending'}
              </span>
              <span className="text-[10px] text-[#64748B]">
                {loanSummary.isDisbursed ? 'Deposited to bank' : 'Awaiting final clearance'}
              </span>
            </div>
          </div>
        ) : (
          <Card className="p-6 text-center bg-white border-[#D6E4F5] rounded-2xl shadow-xs space-y-3">
            <IndianRupee className="w-8 h-8 text-[#2563EB] mx-auto opacity-70" />
            <h4 className="text-sm font-bold text-[#0F172A]">No active loan application yet</h4>
            <p className="text-xs text-[#64748B] max-w-md mx-auto">
              Complete your KYC and document upload to submit your formal loan application immediately.
            </p>
            <Button
              onClick={handleApplyClick}
              className="h-10 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-2"
            >
              <IndianRupee className="w-4 h-4" />
              <span>Apply for Loan</span>
            </Button>
          </Card>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. QUICK ACTIONS (PLACED HIGHER NEAR TOP)                                 */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <span className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wider block">
              QUICK ACTIONS
            </span>
            <h2 className="text-base sm:text-lg font-bold text-[#0F2A5F]">Borrower Actions & Shortcuts</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {loanSummary ? (
            <Link
              to={`/customer/loans/${loanSummary.id}`}
              className="p-4 rounded-2xl bg-white border border-[#D6E4F5] hover:border-[#2563EB] hover:shadow-sm transition-all group flex flex-col items-center text-center shadow-xs"
            >
              <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <IndianRupee className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-[#0F172A]">View My Loan</span>
              <span className="text-[10px] text-[#64748B] mt-0.5">#{loanSummary.applicationNumber}</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleApplyClick}
              className="p-4 rounded-2xl bg-white border border-[#D6E4F5] hover:border-[#2563EB] hover:shadow-sm transition-all group flex flex-col items-center text-center shadow-xs"
            >
              <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <IndianRupee className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-[#0F172A]">Apply for Loan</span>
              <span className="text-[10px] text-[#64748B] mt-0.5">Fast application</span>
            </button>
          )}

          <Link
            to="/customer/kyc"
            className="p-4 rounded-2xl bg-white border border-[#D6E4F5] hover:border-[#2563EB] hover:shadow-sm transition-all group flex flex-col items-center text-center shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <Upload className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#0F172A]">KYC Verification</span>
            <span className="text-[10px] text-[#64748B] mt-0.5">Aadhaar status</span>
          </Link>

          <Link
            to="/customer/documents"
            className="p-4 rounded-2xl bg-white border border-[#D6E4F5] hover:border-[#2563EB] hover:shadow-sm transition-all group flex flex-col items-center text-center shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#0F172A]">My Documents</span>
            <span className="text-[10px] text-[#64748B] mt-0.5">Upload & history</span>
          </Link>

          <Link
            to="/customer/loans"
            className="p-4 rounded-2xl bg-white border border-[#D6E4F5] hover:border-[#2563EB] hover:shadow-sm transition-all group flex flex-col items-center text-center shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#0F172A]">Loan History</span>
            <span className="text-[10px] text-[#64748B] mt-0.5">Applications list</span>
          </Link>

          <Link
            to={loanSummary ? `/customer/payment/${loanSummary.id}` : '/customer/payments'}
            className="p-4 rounded-2xl bg-white border border-[#D6E4F5] hover:border-[#2563EB] hover:shadow-sm transition-all group flex flex-col items-center text-center shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#0F172A]">Payments & Charges</span>
            <span className="text-[10px] text-[#64748B] mt-0.5">Fee settlements</span>
          </Link>

          <Link
            to="/customer/support"
            className="p-4 rounded-2xl bg-white border border-[#D6E4F5] hover:border-[#2563EB] hover:shadow-sm transition-all group flex flex-col items-center text-center shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <HelpCircle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#0F172A]">Borrower Support</span>
            <span className="text-[10px] text-[#64748B] mt-0.5">Helpdesk tickets</span>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. ACTIVE CHARGES & FEES (APPLIED CHARGES - HIGHER NEAR TOP)              */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div>
            <span className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wider block">
              APPLIED CHARGES & FEES
            </span>
            <h2 className="text-base sm:text-lg font-bold text-[#0F2A5F] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#2563EB]" />
              <span>Assigned Application Charges & Fee Settlements</span>
            </h2>
            <p className="text-xs text-[#64748B]">Active stage-appropriate fees requiring borrower settlement</p>
          </div>
          <Badge className="bg-[#EFF6FF] text-[#2563EB] border border-[#D6E4F5] text-xs font-bold px-3 py-1 w-fit">
            {pendingCharges.length > 0 ? `${pendingCharges.length} Pending Action` : 'All Charges Up to Date'}
          </Badge>
        </div>

        {pendingCharges.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingCharges.map((chg) => {
              const displayName = normalizeChargeName(chg.name);
              const hasSubmittedUtr = Boolean(chg.transactionRef);

              return (
                <div
                  key={chg.id}
                  className="p-5 rounded-2xl border border-[#D6E4F5] bg-white shadow-xs space-y-4 hover:border-[#2563EB] transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-[#0F172A]">{displayName}</span>
                        {displayName.includes('TDS') && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#D6E4F5]">
                            Statutory
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#64748B]">{chg.remark || 'Mandatory Application Settlement'}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-lg sm:text-xl font-black text-[#0F172A] font-mono block">
                        ₹{chg.amount.toLocaleString('en-IN')}
                      </span>
                      {hasSubmittedUtr ? (
                        <Badge className="bg-blue-50 text-[#2563EB] border border-blue-200 text-[10px] font-bold px-2 py-0.5 mt-1">
                          <Clock className="w-3 h-3 mr-1" /> Pending Verification
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-50 text-[#F59E0B] border border-amber-200 text-[10px] font-bold px-2 py-0.5 mt-1">
                          <AlertCircle className="w-3 h-3 mr-1" /> Payment Required
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#D6E4F5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="text-[11px] text-[#64748B]">
                      {hasSubmittedUtr ? (
                        <span>Submitted UTR: <strong className="font-mono text-[#0F172A]">{chg.transactionRef}</strong></span>
                      ) : (
                        <span>Status: <strong className="text-amber-700">Awaiting payment settlement</strong></span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!hasSubmittedUtr ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => {
                              navigate(loanSummary ? `/customer/payment/${loanSummary.id}?chargeId=${chg.id}` : `/customer/payments?chargeId=${chg.id}`);
                            }}
                            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs h-9 px-4 font-bold rounded-xl shadow-xs flex items-center gap-1"
                          >
                            <span>Pay Now</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                          <Link to={loanSummary ? `/customer/payment/${loanSummary.id}?chargeId=${chg.id}` : `/customer/payments?chargeId=${chg.id}`}>
                            <Button variant="outline" size="sm" className="text-xs h-9 px-3 border-[#D6E4F5] text-[#0F172A] font-semibold rounded-xl bg-white">
                              View Details
                            </Button>
                          </Link>
                        </>
                      ) : (
                        <span className="text-[11px] text-[#2563EB] font-semibold bg-[#EFF6FF] px-3 py-1.5 rounded-xl border border-[#D6E4F5]">
                          Under Verification
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card className="p-6 bg-white border-[#D6E4F5] text-center rounded-2xl shadow-xs space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[#16A34A] mx-auto opacity-80" />
            <h4 className="text-sm font-bold text-[#0F172A]">No payment is currently required</h4>
            <p className="text-xs text-[#64748B] max-w-md mx-auto">
              All active charges are up to date. Any scheduled verification fees or statutory charges will appear here automatically.
            </p>
          </Card>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. IMPORTANT UPDATE / AGREEMENT NOTICE (LARGE PROMINENT BOX)              */}
      {/* ========================================================================= */}
      {loanSummary?.status === 'APPROVED' && (
        <div className="space-y-2">
          <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-50 via-emerald-50/70 to-[#EFF6FF] border border-emerald-200 rounded-3xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#16A34A] flex items-center justify-center shrink-0">
                  <FileSignature className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#16A34A] uppercase tracking-wider block">
                    IMPORTANT UPDATE
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-[#0F2A5F]">
                    Loan Agreement & Official Sanction
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5 max-w-2xl">
                    {loanSummary.agreementAccepted
                      ? 'Your Master Loan Agreement has been digitally signed and submitted for disbursement clearance.'
                      : 'Your loan application has been approved! Please review and electronically sign your Master Loan Agreement.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge className={loanSummary.agreementAccepted ? 'bg-emerald-100 text-[#16A34A] border-emerald-300 font-bold px-3 py-1 text-xs' : 'bg-amber-100 text-amber-800 border-amber-300 font-bold px-3 py-1 text-xs'}>
                  {loanSummary.agreementAccepted ? 'Status: SIGNED / SUBMITTED' : 'Status: PENDING SIGNATURE'}
                </Badge>

                {loanSummary.agreementAccepted ? (
                  <Link to={`/customer/agreement/${loanSummary.id}`}>
                    <Button size="sm" variant="outline" className="text-xs h-9 px-4 border-[#D6E4F5] text-[#0F172A] hover:bg-white font-bold rounded-xl bg-white shadow-xs flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>View Agreement</span>
                    </Button>
                  </Link>
                ) : (
                  <Link to={`/customer/agreement/${loanSummary.id}`}>
                    <Button size="sm" className="bg-[#16A34A] hover:bg-emerald-700 text-white text-xs h-9 px-5 rounded-xl font-bold shadow-xs flex items-center gap-1.5">
                      <span>Sign Agreement</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. LOAN PROGRESS (LIFECYCLE TIMELINE)                                     */}
      {/* ========================================================================= */}
      <Card className="bg-white border-[#D6E4F5] rounded-3xl shadow-xs overflow-hidden">
        <CardHeader className="p-5 sm:p-6 pb-3 border-b border-[#D6E4F5]/60 bg-[#F7FAFF]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wider block mb-0.5">
                LOAN PROGRESS
              </span>
              <CardTitle className="text-base sm:text-lg font-extrabold text-[#0F2A5F] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#2563EB]" />
                <span>Borrower Journey & Loan Lifecycle</span>
              </CardTitle>
            </div>
            <span className="text-xs font-semibold text-[#64748B]">7 Key Stages</span>
          </div>
          <CardDescription className="text-xs text-[#64748B] mt-0.5">
            Live stage-by-stage audit trail from application submission to bank disbursement
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          <div className="relative py-2">
            {/* Desktop Horizontal Line */}
            <div className="hidden md:block absolute top-6 left-8 right-8 h-0.5 bg-[#D6E4F5] z-0" />

            <div className="hidden md:flex items-start justify-between relative z-10">
              {timeline.map((item, idx) => (
                <div key={item.step} className="flex flex-col items-center text-center max-w-[120px]">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-2 transition-all ${
                      item.completed
                        ? 'bg-[#16A34A] text-white shadow-xs'
                        : item.current
                        ? 'bg-[#2563EB] text-white ring-4 ring-blue-100 font-bold'
                        : 'bg-[#F7FAFF] text-[#64748B] border border-[#D6E4F5]'
                    }`}
                  >
                    {item.completed ? '✓' : idx + 1}
                  </div>
                  <span className={`text-xs font-semibold leading-tight ${item.completed || item.current ? 'text-[#0F172A]' : 'text-[#64748B]'}`}>
                    {item.title}
                  </span>
                  {item.current && (
                    <span className="mt-1 text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full border border-[#D6E4F5]">
                      Current
                    </span>
                  )}
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
                        ? 'bg-[#16A34A] text-white shadow-xs'
                        : item.current
                        ? 'bg-[#2563EB] text-white ring-2 ring-blue-200'
                        : 'bg-[#F7FAFF] text-[#64748B] border border-[#D6E4F5]'
                    }`}
                  >
                    {item.completed ? '✓' : idx + 1}
                  </div>
                  <span className={`text-xs font-semibold ${item.completed || item.current ? 'text-[#0F172A]' : 'text-[#64748B]'}`}>
                    {item.title}
                  </span>
                  {item.current && <Badge className="text-[10px] h-4 bg-[#EFF6FF] text-[#2563EB] border-[#D6E4F5] font-bold">Current</Badge>}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 7. PAYMENT & INVOICE HISTORY                                              */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div>
            <span className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wider block">
              PAYMENT & INVOICE HISTORY
            </span>
            <h2 className="text-base sm:text-lg font-bold text-[#0F2A5F] flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#2563EB]" />
              <span>Official Tax Invoices & Verified Payment Records</span>
            </h2>
            <p className="text-xs text-[#64748B]">View verified payments and official invoices</p>
          </div>
        </div>

        {invoicesList && invoicesList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invoicesList.map((inv: any) => {
              const displayName = normalizeChargeName(inv.chargeName || 'Application Fee');
              const amountPaid = inv.totalAmount || inv.amount || 0;
              const appId = loanSummary?.applicationNumber || inv.applicationId || `APP-${customer.id.slice(0, 6).toUpperCase()}`;
              const invoiceId = inv.id || inv.chargeId;

              return (
                <div
                  key={inv.id || inv.invoiceNumber}
                  className="p-5 rounded-2xl bg-white border border-[#D6E4F5] flex flex-col justify-between hover:shadow-md transition-all shadow-xs space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-sm text-[#0F172A] block">{displayName}</span>
                        <span className="text-xs font-mono font-bold text-[#2563EB]">Invoice #{inv.invoiceNumber}</span>
                      </div>
                      <Badge className="bg-emerald-50 text-[#16A34A] border border-emerald-200 text-[10px] font-bold px-2 py-0.5">
                        PAID ✓
                      </Badge>
                    </div>

                    <div className="space-y-1.5 p-3 rounded-xl bg-[#F7FAFF] border border-[#D6E4F5]/60 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Application ID:</span>
                        <span className="font-semibold text-[#0F172A] font-mono">{appId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Amount Paid:</span>
                        <span className="font-black text-[#16A34A] font-mono">₹{amountPaid.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">UTR Reference:</span>
                        <span className="font-mono text-[#0F172A] font-medium">{inv.utr || inv.transactionRef || 'UTR Verified'}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#64748B]">Payment Date:</span>
                        <span className="text-[#0F172A]">
                          {inv.issuedAt || inv.paidAt ? new Date(inv.issuedAt || inv.paidAt).toLocaleDateString('en-IN') : 'Recent'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-[#D6E4F5]">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewInvoice(inv.chargeId || inv.id, `${displayName} Invoice`)}
                      className="flex-1 h-9 text-xs border-[#D6E4F5] text-[#0F172A] hover:bg-[#EFF6FF] font-semibold rounded-xl bg-white"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1 text-[#2563EB]" /> View Invoice
                    </Button>
                    <Button
                      size="sm"
                      disabled={downloadingInvoiceId === invoiceId}
                      onClick={() => handleDownloadInvoice(inv.chargeId || inv.id, inv.invoiceNumber || displayName)}
                      className="flex-1 h-9 text-xs bg-[#16A34A] hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                    >
                      {downloadingInvoiceId === invoiceId ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5 mr-1" /> Download
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card className="p-6 text-center bg-white border-[#D6E4F5] rounded-2xl shadow-xs space-y-2">
            <Receipt className="w-8 h-8 text-[#64748B] mx-auto opacity-50" />
            <h4 className="text-sm font-bold text-[#0F172A]">No invoices issued yet</h4>
            <p className="text-xs text-[#64748B] max-w-md mx-auto">
              Official tax invoices appear automatically upon verified payment of application charges.
            </p>
          </Card>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 8. CURRENT LOAN STATUS (8-STAGE AUDIT CHECKLIST)                          */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <span className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wider block">
              CURRENT LOAN STATUS
            </span>
            <h2 className="text-base sm:text-lg font-bold text-[#0F2A5F] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
              <span>Comprehensive Stage & Verification Checklist</span>
            </h2>
            <p className="text-xs text-[#64748B]">Live stage-by-stage audit trail and verification status</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Stage 1: Application */}
          <div className="p-4 rounded-2xl bg-white border border-[#D6E4F5] shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0F172A]">1. Application</span>
              <span className="text-[10px] font-bold text-[#16A34A] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Completed ✓
              </span>
            </div>
            <p className="text-xs text-[#64748B]">
              {loanSummary ? `Application #${loanSummary.applicationNumber} registered` : 'Customer account established'}
            </p>
          </div>

          {/* Stage 2: KYC */}
          <div className="p-4 rounded-2xl bg-white border border-[#D6E4F5] shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0F172A]">2. KYC Verification</span>
              {isKycApproved ? (
                <span className="text-[10px] font-bold text-[#16A34A] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Approved ✓
                </span>
              ) : kycSummary.status === 'UNDER_REVIEW' ? (
                <span className="text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full border border-[#D6E4F5]">
                  In Review
                </span>
              ) : (
                <span className="text-[10px] font-bold text-[#F59E0B] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Pending
                </span>
              )}
            </div>
            <p className="text-xs text-[#64748B]">
              {isKycApproved ? 'Aadhaar identity verified' : `${kycSummary.progressPercent}% checklist completed`}
            </p>
          </div>

          {/* Stage 3: Loan Documents */}
          <div className="p-4 rounded-2xl bg-white border border-[#D6E4F5] shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0F172A]">3. Loan Documents</span>
              {allDocsReady ? (
                <span className="text-[10px] font-bold text-[#16A34A] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {uploadedCount}/4 Uploaded ✓
                </span>
              ) : (
                <span className="text-[10px] font-bold text-[#F59E0B] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  {uploadedCount}/4 Uploaded
                </span>
              )}
            </div>
            <p className="text-xs text-[#64748B]">
              {allDocsReady ? 'Mandatory documents uploaded' : 'Upload remaining documents'}
            </p>
          </div>

          {/* Stage 4: Underwriting */}
          <div className="p-4 rounded-2xl bg-white border border-[#D6E4F5] shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0F172A]">4. Underwriting</span>
              {loanSummary?.status === 'APPROVED' ? (
                <span className="text-[10px] font-bold text-[#16A34A] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Approved ✓
                </span>
              ) : loanSummary?.status === 'REJECTED' ? (
                <span className="text-[10px] font-bold text-[#DC2626] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  Declined
                </span>
              ) : (
                <span className="text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full border border-[#D6E4F5]">
                  In Review
                </span>
              )}
            </div>
            <p className="text-xs text-[#64748B]">
              {loanSummary?.status === 'APPROVED' ? 'Credit appraisal cleared' : 'Risk & eligibility assessment'}
            </p>
          </div>

          {/* Stage 5: Payment */}
          <div className="p-4 rounded-2xl bg-white border border-[#D6E4F5] shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0F172A]">5. Verification Payment</span>
              {paidCharges.length > 0 ? (
                <span className="text-[10px] font-bold text-[#16A34A] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Verified ✓
                </span>
              ) : pendingCharges.length > 0 ? (
                <span className="text-[10px] font-bold text-[#F59E0B] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Payment Required
                </span>
              ) : (
                <span className="text-[10px] font-bold text-[#64748B] bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  Up to Date
                </span>
              )}
            </div>
            <p className="text-xs text-[#64748B]">
              {paidCharges.length > 0 ? 'Application charges settled' : 'Nominal verification fee status'}
            </p>
          </div>

          {/* Stage 6: TDS / TSD */}
          <div className="p-4 rounded-2xl bg-white border border-[#D6E4F5] shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0F172A]">6. TDS/TSD Charges</span>
              {hasTdsPaid ? (
                <span className="text-[10px] font-bold text-[#16A34A] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Settled ✓
                </span>
              ) : hasTdsPending ? (
                <span className="text-[10px] font-bold text-[#F59E0B] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Settlement Required
                </span>
              ) : (
                <span className="text-[10px] font-bold text-[#64748B] bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  Standard Clearance
                </span>
              )}
            </div>
            <p className="text-xs text-[#64748B]">
              {hasTdsPaid ? 'Tax & statutory clearance verified' : 'Statutory tax settlement compliance'}
            </p>
          </div>

          {/* Stage 7: Loan Approval */}
          <div className="p-4 rounded-2xl bg-white border border-[#D6E4F5] shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0F172A]">7. Loan Approval</span>
              {loanSummary?.status === 'APPROVED' ? (
                <span className="text-[10px] font-bold text-[#16A34A] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Sanctioned ✓
                </span>
              ) : (
                <span className="text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full border border-[#D6E4F5]">
                  In Progress
                </span>
              )}
            </div>
            <p className="text-xs text-[#64748B]">
              {loanSummary?.status === 'APPROVED' ? 'Formal sanction letter issued' : 'Underwriting decision pending'}
            </p>
          </div>

          {/* Stage 8: Disbursement */}
          <div className="p-4 rounded-2xl bg-white border border-[#D6E4F5] shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0F172A]">8. Disbursement</span>
              {loanSummary?.isDisbursed ? (
                <span className="text-[10px] font-bold text-[#16A34A] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Disbursed ✓
                </span>
              ) : loanSummary?.status === 'APPROVED' ? (
                <span className="text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full border border-[#D6E4F5]">
                  Ready
                </span>
              ) : (
                <span className="text-[10px] font-bold text-[#64748B] bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  Queued
                </span>
              )}
            </div>
            <p className="text-xs text-[#64748B]">
              {loanSummary?.isDisbursed ? 'Direct bank transfer complete' : 'Direct NEFT/RTGS bank release'}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 9. DOCUMENT CENTER (LARGE RECTANGULAR CARDS)                              */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div>
            <span className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wider block">
              DOCUMENT CENTER
            </span>
            <h2 className="text-base sm:text-lg font-bold text-[#0F2A5F] flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-[#2563EB]" />
              <span>Authoritative Financial Documents & Downloads</span>
            </h2>
            <p className="text-xs text-[#64748B]">Instantly access official approval letters, signed agreements, and tax invoices</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: KYC Verification Document */}
          <div className="p-5 rounded-2xl bg-white border border-[#D6E4F5] flex flex-col justify-between hover:border-[#2563EB] transition-all shadow-xs space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                {isKycApproved ? (
                  <Badge className="bg-emerald-50 text-[#16A34A] border border-emerald-200 font-bold text-[10px] px-2 py-0.5">
                    VERIFIED ✓
                  </Badge>
                ) : (
                  <Badge className="bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px] px-2 py-0.5">
                    PENDING
                  </Badge>
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">KYC Verification</h3>
                <p className="text-xs text-[#64748B] mt-0.5">Identity verification documents and government compliance record.</p>
              </div>
            </div>
            <div className="pt-3 border-t border-[#D6E4F5] flex gap-2">
              <Link to="/customer/kyc" className="flex-1">
                <Button size="sm" variant="outline" className="w-full text-xs h-9 border-[#D6E4F5] text-[#0F172A] hover:bg-[#EFF6FF] font-semibold rounded-xl bg-white">
                  <Eye className="w-3.5 h-3.5 mr-1 text-[#2563EB]" /> View KYC
                </Button>
              </Link>
              {!isKycApproved && (
                <Link to="/customer/kyc" className="flex-1">
                  <Button size="sm" className="w-full text-xs h-9 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-xl shadow-xs">
                    Complete KYC
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Card 2: Loan Approval Letter */}
          <div className="p-5 rounded-2xl bg-white border border-[#D6E4F5] flex flex-col justify-between hover:border-[#2563EB] transition-all shadow-xs space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#16A34A] flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                {loanSummary?.status === 'APPROVED' ? (
                  <Badge className="bg-emerald-50 text-[#16A34A] border border-emerald-200 font-bold text-[10px] px-2 py-0.5">
                    SANCTIONED ✓
                  </Badge>
                ) : (
                  <Badge className="bg-slate-100 text-[#64748B] border border-slate-200 font-bold text-[10px] px-2 py-0.5">
                    IN REVIEW
                  </Badge>
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Loan Approval Letter</h3>
                <p className="text-xs text-[#64748B] mt-0.5">Official sanction letter with authorized verification seal and terms.</p>
              </div>
            </div>
            <div className="pt-3 border-t border-[#D6E4F5] flex gap-2">
              {loanSummary?.status === 'APPROVED' ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const res = await apiClient.get(`/customer/loans/${loanSummary.id}/approval-letter/pdf`, { responseType: 'blob' });
                        const blob = new Blob([res.data], { type: 'application/pdf' });
                        const url = window.URL.createObjectURL(blob);
                        window.open(url, '_blank');
                      } catch {
                        alert('Could not render approval letter.');
                      }
                    }}
                    className="flex-1 text-xs h-9 border-[#D6E4F5] text-[#0F172A] hover:bg-[#EFF6FF] font-semibold rounded-xl bg-white"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1 text-[#2563EB]" /> View Letter
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
                    className="flex-1 text-xs h-9 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-xl shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Download
                  </Button>
                </>
              ) : (
                <span className="text-[11px] text-[#64748B] italic py-1.5">Available upon underwriting sanction</span>
              )}
            </div>
          </div>

          {/* Card 3: Loan Agreement */}
          <div className="p-5 rounded-2xl bg-white border border-[#D6E4F5] flex flex-col justify-between hover:border-[#2563EB] transition-all shadow-xs space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <FileSignature className="w-5 h-5" />
                </div>
                {loanSummary?.agreementAccepted ? (
                  <Badge className="bg-emerald-50 text-[#16A34A] border border-emerald-200 font-bold text-[10px] px-2 py-0.5">
                    SIGNED ✓
                  </Badge>
                ) : loanSummary?.status === 'APPROVED' ? (
                  <Badge className="bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px] px-2 py-0.5">
                    SIGNATURE DUE
                  </Badge>
                ) : (
                  <Badge className="bg-slate-100 text-[#64748B] border border-slate-200 font-bold text-[10px] px-2 py-0.5">
                    PENDING
                  </Badge>
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Loan Agreement</h3>
                <p className="text-xs text-[#64748B] mt-0.5">Master Loan Agreement contract executed between lender and borrower.</p>
              </div>
            </div>
            <div className="pt-3 border-t border-[#D6E4F5] flex gap-2">
              {loanSummary?.status === 'APPROVED' ? (
                <Link to={`/customer/agreement/${loanSummary.id}`} className="w-full">
                  <Button size="sm" className="w-full text-xs h-9 bg-[#16A34A] hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-1">
                    {loanSummary.agreementAccepted ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Signed Agreement</span>
                      </>
                    ) : (
                      <>
                        <FileSignature className="w-3.5 h-3.5" />
                        <span>Sign Agreement</span>
                      </>
                    )}
                  </Button>
                </Link>
              ) : (
                <span className="text-[11px] text-[#64748B] italic py-1.5">Prepared upon sanction approval</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 10. CUSTOMER INFORMATION (DEDICATED SECTION)                              */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <span className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wider block">
              CUSTOMER INFORMATION
            </span>
            <h2 className="text-base sm:text-lg font-bold text-[#0F2A5F] flex items-center gap-2">
              <User className="w-4 h-4 text-[#2563EB]" />
              <span>Registered Borrower Profile & Identity Particulars</span>
            </h2>
            <p className="text-xs text-[#64748B]">Verified profile information recorded in core banking system</p>
          </div>
          <Link to="/customer/profile">
            <Button variant="outline" size="sm" className="text-xs h-8 px-3 border-[#D6E4F5] text-[#0F172A] font-semibold rounded-xl bg-white">
              Edit Profile
            </Button>
          </Link>
        </div>

        <Card className="bg-white border-[#D6E4F5] rounded-3xl shadow-xs overflow-hidden">
          <CardContent className="p-5 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F7FAFF] border border-[#D6E4F5]/70 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#64748B] block">Customer Full Name</span>
                <span className="text-sm font-bold text-[#0F172A] block">{customerName}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F7FAFF] border border-[#D6E4F5]/70 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#64748B] block">Father / Guardian Name</span>
                <span className="text-sm font-semibold text-[#0F172A] block">{fatherName}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F7FAFF] border border-[#D6E4F5]/70 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#64748B] block">Mobile Phone</span>
                <span className="text-sm font-mono font-bold text-[#0F172A] block">+91 {mobileNumber}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F7FAFF] border border-[#D6E4F5]/70 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#64748B] block">Email Address</span>
                <span className="text-sm font-medium text-[#0F172A] truncate block">{emailAddress}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F7FAFF] border border-[#D6E4F5]/70 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#64748B] block">Gender</span>
                <span className="text-sm font-semibold text-[#0F172A] block">{gender}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F7FAFF] border border-[#D6E4F5]/70 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#64748B] block">Date of Birth</span>
                <span className="text-sm font-semibold text-[#0F172A] block">{dob}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F7FAFF] border border-[#D6E4F5]/70 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#64748B] block">Customer ID</span>
                <span className="text-sm font-mono font-bold text-[#2563EB] block">#{customer.id.slice(0, 10).toUpperCase()}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F7FAFF] border border-[#D6E4F5]/70 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#64748B] block">KYC Verification State</span>
                <span className="text-sm font-bold text-[#16A34A] block">{isKycApproved ? 'Approved / Verified' : 'Pending Review'}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F7FAFF] border border-[#D6E4F5]/70 space-y-1 sm:col-span-2 lg:col-span-4">
                <span className="text-[10px] uppercase font-bold text-[#64748B] block">Permanent Residential Address</span>
                <span className="text-sm font-medium text-[#0F172A] block">
                  {address}, {city}, {state} {pincode !== '—' ? ` - ${pincode}` : ''}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 11. BANK ACCOUNT DETAILS (SEPARATE DEDICATED CARD)                        */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <span className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wider block">
              BANK ACCOUNT DETAILS
            </span>
            <h2 className="text-base sm:text-lg font-bold text-[#0F2A5F] flex items-center gap-2">
              <Landmark className="w-4 h-4 text-[#2563EB]" />
              <span>Registered Bank Account for Fund Disbursement</span>
            </h2>
            <p className="text-xs text-[#64748B]">Approved bank account where sanctioned loan funds will be disbursed</p>
          </div>
        </div>

        <Card className="bg-white border-[#D6E4F5] rounded-3xl shadow-xs overflow-hidden">
          <CardContent className="p-5 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F7FAFF] border border-[#D6E4F5]/70 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#64748B] block">Account Holder Name</span>
                <span className="text-sm font-bold text-[#0F172A] block">{bankAccountHolder}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F7FAFF] border border-[#D6E4F5]/70 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#64748B] block">Account Number (Masked)</span>
                <span className="text-sm font-mono font-bold text-[#0F172A] block">{bankAccountNumber}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F7FAFF] border border-[#D6E4F5]/70 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#64748B] block">Bank Name</span>
                <span className="text-sm font-bold text-[#0F172A] block">{bankName}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F7FAFF] border border-[#D6E4F5]/70 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#64748B] block">IFSC Code</span>
                <span className="text-sm font-mono font-bold text-[#2563EB] block">{bankIfsc}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F7FAFF] border border-[#D6E4F5]/70 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#64748B] block">Account Type</span>
                <span className="text-sm font-semibold text-[#0F172A] block">{bankAccountType}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F7FAFF] border border-[#D6E4F5]/70 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#64748B] block">Branch</span>
                <span className="text-sm font-semibold text-[#0F172A] block">{bankBranch}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 12. BORROWER SUPPORT                                                      */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <span className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wider block">
              BORROWER SUPPORT
            </span>
            <h2 className="text-base sm:text-lg font-bold text-[#0F2A5F] flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#2563EB]" />
              <span>Dedicated Customer Assistance Desk</span>
            </h2>
          </div>
        </div>

        <Card className="bg-white border-[#D6E4F5] rounded-3xl shadow-xs overflow-hidden">
          <CardContent className="p-5 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-2xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">Direct Email Support</span>
                  <a href="mailto:support@loanapprove.in" className="text-xs sm:text-sm font-bold text-[#2563EB] hover:underline">
                    support@loanapprove.in
                  </a>
                </div>
              </div>

              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#16A34A] flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">Borrower Helpline</span>
                  <span className="text-xs sm:text-sm font-bold text-[#0F172A] font-mono">
                    1800-LOAN-APP <span className="text-xs text-[#64748B] font-sans">(Mon-Sat 9AM-7PM)</span>
                  </span>
                </div>
              </div>

              <div className="flex justify-start md:justify-end">
                <Link to="/customer/support" className="w-full md:w-auto">
                  <Button className="w-full md:w-auto bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs h-10 px-5 rounded-xl font-bold shadow-xs flex items-center justify-center gap-1.5">
                    <span>Open Support Ticket</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* ELIGIBILITY MODAL 1: KYC REQUIRED                                         */}
      {/* ========================================================================= */}
      {eligibilityState === 'KYC_REQUIRED' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D6E4F5] rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-[#0F2A5F]">KYC Required</h2>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Complete your identity verification before applying for a loan.
              </p>
            </div>
            <div className="pt-2 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setEligibilityState('NONE')}
                className="flex-1 h-10 border-[#D6E4F5] text-[#0F172A] rounded-xl text-xs font-semibold bg-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setEligibilityState('NONE');
                  navigate('/customer/kyc');
                }}
                className="flex-1 h-10 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Complete KYC
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ELIGIBILITY MODAL 2: LOAN DOCUMENTS REQUIRED                              */}
      {/* ========================================================================= */}
      {eligibilityState === 'DOCS_REQUIRED' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D6E4F5] rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center mx-auto">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-[#0F2A5F]">Loan Documents Required</h2>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Complete your required loan documents before submitting your loan application.
              </p>
            </div>
            <div className="pt-2 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setEligibilityState('NONE')}
                className="flex-1 h-10 border-[#D6E4F5] text-[#0F172A] rounded-xl text-xs font-semibold bg-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setEligibilityState('NONE');
                  navigate('/customer/documents');
                }}
                className="flex-1 h-10 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Upload Documents
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG: SUBMIT LOAN APPLICATION MODAL                                     */}
      {/* ========================================================================= */}
      {applyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D6E4F5] rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-[#D6E4F5]">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-[#0F2A5F]">
                  Submit Loan Application
                </h3>
                <span className="text-xs text-[#64748B]">Loan Approve Financial Services</span>
              </div>
              <button
                onClick={() => setApplyModalOpen(false)}
                className="text-[#64748B] hover:text-[#0F172A] p-1.5 rounded-lg hover:bg-[#F7FAFF] transition"
              >
                ✕
              </button>
            </div>

            {applyError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-[#DC2626] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{applyError}</span>
              </div>
            )}

            <form onSubmit={handleApplyLoan} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="apply-amount" className="block text-[11px] font-bold text-[#0F172A] uppercase tracking-wider">
                  Required Loan Amount (₹) *
                </label>
                <Input
                  id="apply-amount"
                  type="number"
                  min="10000"
                  max="5000000"
                  step="5000"
                  value={applyAmount}
                  onChange={(e) => setApplyAmount(Number(e.target.value))}
                  className="bg-[#F7FAFF] border-[#D6E4F5] text-[#0F172A] font-mono text-base h-11 rounded-xl focus:border-[#2563EB]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="apply-tenure" className="block text-[11px] font-bold text-[#0F172A] uppercase tracking-wider">
                  Repayment Tenure (Months) *
                </label>
                <select
                  id="apply-tenure"
                  value={applyTenure}
                  onChange={(e) => setApplyTenure(Number(e.target.value))}
                  className="w-full bg-[#F7FAFF] border border-[#D6E4F5] text-[#0F172A] text-sm h-11 rounded-xl px-3 focus:border-[#2563EB] focus:outline-none"
                  required
                >
                  <option value="6">6 Months</option>
                  <option value="12">12 Months (1 Year)</option>
                  <option value="24">24 Months (2 Years)</option>
                  <option value="36">36 Months (3 Years)</option>
                  <option value="48">48 Months (4 Years)</option>
                  <option value="60">60 Months (5 Years)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="apply-purpose" className="block text-[11px] font-bold text-[#0F172A] uppercase tracking-wider">
                  Loan Purpose *
                </label>
                <Input
                  id="apply-purpose"
                  value={applyPurpose}
                  onChange={(e) => setApplyPurpose(e.target.value)}
                  placeholder="e.g. Business expansion, Working capital"
                  className="bg-[#F7FAFF] border-[#D6E4F5] text-[#0F172A] text-sm h-11 rounded-xl focus:border-[#2563EB]"
                  required
                />
              </div>

              <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#D6E4F5] text-xs text-[#0F2A5F] space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Estimated Monthly EMI:</span>
                  <span className="font-mono text-[#2563EB]">
                    ₹{Math.round((applyAmount + (applyAmount * 0.085 * (applyTenure / 12))) / applyTenure).toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-[11px] text-[#64748B]">Interest computed at standard benchmark 8.5% p.a.</p>
              </div>

              <div className="flex space-x-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setApplyModalOpen(false)}
                  className="flex-1 h-10 border-[#D6E4F5] text-[#64748B] hover:bg-[#F7FAFF] text-xs font-semibold rounded-xl bg-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingLoan || !applyAmount}
                  className="flex-1 h-10 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5"
                >
                  {isSubmittingLoan ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Application...</span>
                    </>
                  ) : (
                    <span>Submit Loan Application</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG: INVOICE PREVIEW MODAL                                             */}
      {/* ========================================================================= */}
      <Dialog open={invoicePreviewOpen} onOpenChange={setInvoicePreviewOpen}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-6 bg-white rounded-3xl border border-[#D6E4F5] shadow-2xl">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#D6E4F5]">
            <div>
              <DialogTitle className="text-lg font-bold text-[#0F2A5F]">{invoicePreviewTitle}</DialogTitle>
              <DialogDescription className="text-xs text-[#64748B]">
                Official immutable tax invoice generated from authoritative financial records.
              </DialogDescription>
            </div>
            {invoicePreviewUrl && (
              <Button
                size="sm"
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = invoicePreviewUrl;
                  a.download = `${invoicePreviewTitle.replace(/\s+/g, '_')}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                className="bg-[#16A34A] hover:bg-emerald-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-xs flex items-center gap-1.5 mr-6"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </Button>
            )}
          </DialogHeader>

          <div className="flex-1 bg-[#F7FAFF] rounded-2xl overflow-hidden mt-3 relative border border-[#D6E4F5]">
            {invoicePreviewLoading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
                <span className="text-xs text-[#64748B]">Rendering official tax invoice...</span>
              </div>
            ) : invoicePreviewUrl ? (
              <iframe
                src={invoicePreviewUrl}
                title={invoicePreviewTitle}
                className="w-full h-full border-0 rounded-2xl"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-[#64748B]">
                Invoice preview unavailable. Please use Download PDF.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerHome;
