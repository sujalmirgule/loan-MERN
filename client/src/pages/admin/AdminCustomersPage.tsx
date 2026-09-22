import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Download,
  Calendar,
  Filter,
  RotateCcw,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  MoreVertical,
  FileText,
  FileSignature,
  Send,
  History,
  AlertCircle,
  Check,
} from 'lucide-react';

interface CustomerRecord {
  id: string;
  fullName: string;
  mobile: string;
  email: string;
  address: string;
  state: string;
  city: string;
  monthlyIncome: number;
  kycStatus: string;
  accountStatus: string;
  loanStatus: string;
  paymentStatus: string;
  latestLoan?: {
    id: string;
    applicationNumber: string;
    loanType: string;
    requestedAmount: number;
    approvedAmount?: number;
    status: string;
    submittedAt: string;
  } | null;
  latestPayment?: {
    status: string;
    amount: number;
    transactionRef?: string;
    receiptNumber?: string;
    paymentDate: string;
  } | null;
  whatsappStatus: 'SENT' | 'DELIVERED' | 'FAILED' | 'NOT_SENT';
  latestWhatsApp?: {
    status: string;
    sentAt: string | null;
    failedAt: string | null;
  } | null;
  pendingSince: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CustomersListResponse {
  data: CustomerRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface WhatsAppHistoryRecord {
  id: string;
  phone: string;
  message: string;
  status: string;
  providerMessageId?: string;
  failureReason?: string;
  sentAt?: string;
  failedAt?: string;
  createdAt: string;
  admin?: {
    fullName: string;
    email: string;
  };
}

export const AdminCustomersPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [domainFilter, setDomainFilter] = useState('ALL');
  const [datePreset, setDatePreset] = useState('ALL');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [appliedFromDate, setAppliedFromDate] = useState('');
  const [appliedToDate, setAppliedToDate] = useState('');

  // Row Action Dropdown state
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  // WhatsApp Modal state
  const [selectedCustomerForWhatsApp, setSelectedCustomerForWhatsApp] = useState<CustomerRecord | null>(null);
  const [whatsAppMessageText, setWhatsAppMessageText] = useState('');
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  // WhatsApp History Modal state
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<CustomerRecord | null>(null);
  const [historyRecords, setHistoryRecords] = useState<WhatsAppHistoryRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Export & Download loading states
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  // Global inline feedback message
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-clear feedback after 5 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Load distinct states dynamically from backend
  const { data: statesList = [] } = useQuery<string[]>({
    queryKey: ['admin-customer-states'],
    queryFn: async () => {
      const res = await apiClient.get(API_ENDPOINTS.CUSTOMERS.STATES);
      return res.data || [];
    },
  });

  // Load domains for the domain filter dropdown
  const { data: domainsList = [] } = useQuery<Array<{ id: string; domainName: string; isActive: boolean }>>(
    {
      queryKey: ['adminDomains-filter'],
      queryFn: async () => {
        const res = await apiClient.get(API_ENDPOINTS.DOMAINS.LIST);
        const list = res.data?.data || res.data || [];
        return Array.isArray(list) ? list : [];
      },
    }
  );

  // Load customers with real server-side filters & pagination
  const { data, isLoading, isFetching, refetch } = useQuery<CustomersListResponse>({
    queryKey: ['admin-customers', page, search, status, stateFilter, appliedFromDate, appliedToDate, domainFilter],
    queryFn: async () => {
      const res = await apiClient.get(API_ENDPOINTS.CUSTOMERS.LIST, {
        params: {
          page,
          limit: 10,
          search: search.trim() || undefined,
          status: status !== 'ALL' ? status : undefined,
          state: stateFilter !== 'ALL' ? stateFilter : undefined,
          fromDate: appliedFromDate || undefined,
          toDate: appliedToDate || undefined,
          domainId: domainFilter !== 'ALL' ? domainFilter : undefined,
        },
      });
      return res;
    },
    refetchInterval: 1500,
  });

  const customers = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };

  // Handle Preset Date Selection
  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    setPage(1);
    const today = new Date();
    const formatYmd = (d: Date) => d.toISOString().split('T')[0];

    if (preset === 'TODAY') {
      const d = formatYmd(today);
      setAppliedFromDate(d);
      setAppliedToDate(d);
    } else if (preset === 'YESTERDAY') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const d = formatYmd(y);
      setAppliedFromDate(d);
      setAppliedToDate(d);
    } else if (preset === 'LAST_7_DAYS') {
      const past7 = new Date(today);
      past7.setDate(past7.getDate() - 6);
      setAppliedFromDate(formatYmd(past7));
      setAppliedToDate(formatYmd(today));
    } else if (preset === 'LAST_30_DAYS') {
      const past30 = new Date(today);
      past30.setDate(past30.getDate() - 29);
      setAppliedFromDate(formatYmd(past30));
      setAppliedToDate(formatYmd(today));
    } else if (preset === 'CUSTOM') {
      // Keep custom inputs for user to click Apply
    } else {
      // ALL
      setAppliedFromDate('');
      setAppliedToDate('');
      setCustomFrom('');
      setCustomTo('');
    }
  };

  // Apply Custom Date Range
  const handleApplyCustomDates = () => {
    if (!customFrom && !customTo) {
      setFeedback({ type: 'error', message: 'Please select at least a From Date or To Date.' });
      return;
    }
    setAppliedFromDate(customFrom);
    setAppliedToDate(customTo);
    setPage(1);
  };

  // Reset all filters to default
  const handleResetFilters = () => {
    setSearch('');
    setStatus('ALL');
    setStateFilter('ALL');
    setDomainFilter('ALL');
    setDatePreset('ALL');
    setCustomFrom('');
    setCustomTo('');
    setAppliedFromDate('');
    setAppliedToDate('');
    setPage(1);
  };

  // WhatsApp Message Composer Helper
  const openWhatsAppModal = (customer: CustomerRecord) => {
    const loanRef = customer.latestLoan?.applicationNumber || 'Application';
    const defaultMsg = `Hello ${customer.fullName},\n\nYour loan application ${loanRef} is currently pending approval.\n\nWe will update you once the application has been reviewed.\n\nThank you,\nZero Booth Financial`;
    setWhatsAppMessageText(defaultMsg);
    setSelectedCustomerForWhatsApp(customer);
    setOpenActionMenuId(null);
  };

  // Submit WhatsApp Pending Message
  const handleSendWhatsApp = async () => {
    if (!selectedCustomerForWhatsApp) return;
    setIsSendingWhatsApp(true);
    try {
      const res = await apiClient.post(
        API_ENDPOINTS.CUSTOMERS.WHATSAPP_PENDING(selectedCustomerForWhatsApp.id),
        { customMessage: whatsAppMessageText }
      );
      if (res.success === false) {
        setFeedback({
          type: 'error',
          message: res.message || 'WhatsApp message failed to deliver.',
        });
      } else {
        setFeedback({
          type: 'success',
          message: res.message || `WhatsApp message dispatched to ${selectedCustomerForWhatsApp.fullName}.`,
        });
        setSelectedCustomerForWhatsApp(null);
        refetch();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send WhatsApp message';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  // Open WhatsApp History Modal
  const openWhatsAppHistory = async (customer: CustomerRecord) => {
    setSelectedCustomerForHistory(customer);
    setOpenActionMenuId(null);
    setIsLoadingHistory(true);
    try {
      const res = await apiClient.get(API_ENDPOINTS.CUSTOMERS.WHATSAPP_HISTORY(customer.id));
      setHistoryRecords(res.data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load message history';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Export Filtered CSV (Real Backend Stream)
  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    try {
      const res = await apiClient.get(API_ENDPOINTS.CUSTOMERS.EXPORT, {
        params: {
          search: search.trim() || undefined,
          status: status !== 'ALL' ? status : undefined,
          state: stateFilter !== 'ALL' ? stateFilter : undefined,
          fromDate: appliedFromDate || undefined,
          toDate: appliedToDate || undefined,
        },
        responseType: 'blob',
      });

      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setFeedback({ type: 'success', message: 'CSV export downloaded successfully.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to export CSV';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Download Invoice PDF
  const handleDownloadInvoice = async (customer: CustomerRecord) => {
    setDownloadingDocId(customer.id);
    setOpenActionMenuId(null);
    try {
      const res = await apiClient.get(API_ENDPOINTS.CUSTOMERS.INVOICE_PDF(customer.id), {
        responseType: 'blob',
      });

      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${customer.fullName.replace(/[^a-zA-Z0-9]/g, '_')}_${customer.id.slice(-6)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setFeedback({ type: 'success', message: 'Tax Invoice downloaded successfully.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate invoice PDF';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setDownloadingDocId(null);
    }
  };

  // Download Sanction / Approval Letter PDF
  const handleDownloadApprovalLetter = async (customer: CustomerRecord) => {
    setDownloadingDocId(customer.id);
    setOpenActionMenuId(null);
    try {
      const res = await apiClient.get(API_ENDPOINTS.CUSTOMERS.APPROVAL_LETTER_PDF(customer.id), {
        responseType: 'blob',
      });

      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Approval_Letter_${customer.fullName.replace(/[^a-zA-Z0-9]/g, '_')}_${customer.latestLoan?.applicationNumber || customer.id.slice(-6)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setFeedback({ type: 'success', message: 'Sanction / Approval Letter downloaded.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate approval letter PDF';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setDownloadingDocId(null);
    }
  };

  // Status Badges
  const getStatusBadge = (s: string) => {
    switch (s?.toUpperCase()) {
      case 'APPROVED':
        return <Badge className="bg-success text-background text-text-primary text-[10px]">Approved</Badge>;
      case 'UNDER_REVIEW':
        return <Badge className="bg-warning text-background text-text-primary text-[10px]">In Review</Badge>;
      case 'PENDING':
      case 'PENDING_APPROVAL':
      case 'SUBMITTED':
        return <Badge className="bg-amber-500 text-text-primary text-[10px]">Pending Approval</Badge>;
      case 'DISBURSED':
        return <Badge className="bg-primary text-background text-text-primary text-[10px]">Disbursed</Badge>;
      case 'REUPLOAD_REQUIRED':
      case 'DOCUMENTS_REQUIRED':
        return <Badge className="bg-orange-600 text-text-primary text-[10px]">Docs Req</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-600 text-text-primary text-[10px]">Rejected</Badge>;
      case 'ACTIVE':
        return <Badge className="bg-emerald-700 text-text-primary text-[10px]">Active</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{s || 'N/A'}</Badge>;
    }
  };

  // WhatsApp Indicator
  const getWhatsAppBadge = (customer: CustomerRecord) => {
    const ws = customer.whatsappStatus;
    if (ws === 'SENT') {
      return (
        <button
          onClick={() => openWhatsAppHistory(customer)}
          title="Click to view message log"
          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors"
        >
          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Sent
        </button>
      );
    }
    if (ws === 'DELIVERED') {
      return (
        <button
          onClick={() => openWhatsAppHistory(customer)}
          title="Click to view message log"
          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
        >
          <Check className="w-3 h-3 mr-1 text-blue-600" /> Delivered
        </button>
      );
    }
    if (ws === 'FAILED') {
      return (
        <button
          onClick={() => openWhatsAppHistory(customer)}
          title="Click to view failure details"
          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
        >
          <XCircle className="w-3 h-3 mr-1 text-red-600" /> Failed
        </button>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
        Not Sent
      </span>
    );
  };

  const isPendingSection = status === 'PENDING_APPROVAL';

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text-primary flex items-center space-x-2">
            <Users className="w-6 h-6 text-success" />
            <span>Borrower Directory & Customer Records</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary">
            Comprehensive registry of registered borrowers, verification states, credit applications, and communications.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            disabled={isExportingCsv}
            className="bg-surface-elevated border-border text-text-primary hover:bg-surface-elevated hover:brightness-110 text-xs h-8"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-success" />
            {isExportingCsv ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="bg-surface-elevated border-border text-text-primary hover:bg-surface-elevated hover:brightness-110 text-xs h-8"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Inline Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
            feedback.type === 'success'
              ? 'bg-success/10 border-success/30 text-success'
              : 'bg-danger/10 border-danger/30 text-danger'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-danger shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-text-secondary hover:text-text-primary font-bold ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Container Card */}
      <Card className="bg-surface-elevated border border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col space-y-3">
            {/* Header & Section Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <CardTitle className="text-base text-text-primary">
                  {isPendingSection
                    ? `Pending Approval Queue (${pagination.total})`
                    : `All Registered Borrowers (${pagination.total})`}
                </CardTitle>

                {/* Quick Toggle for Requirement 4: Pending Approval Section */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
                  <button
                    onClick={() => {
                      setStatus('ALL');
                      setPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      status !== 'PENDING_APPROVAL'
                        ? 'bg-white text-slate-900 font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Borrowers
                  </button>
                  <button
                    onClick={() => {
                      setStatus('PENDING_APPROVAL');
                      setPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                      status === 'PENDING_APPROVAL'
                        ? 'bg-amber-500 text-text-primary font-semibold shadow-xs'
                        : 'text-amber-700 hover:text-amber-900 font-medium'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    Pending Approval
                  </button>
                </div>
              </div>

              {/* Reset button if any filter applied */}
              {(search || status !== 'ALL' || stateFilter !== 'ALL' || domainFilter !== 'ALL' || datePreset !== 'ALL') && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleResetFilters}
                  className="text-xs h-7 text-text-secondary hover:text-slate-800 self-start sm:self-auto"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset Filters
                </Button>
              )}
            </div>

            {/* Filter Controls Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
              {/* Search Customer Input */}
              <div className="relative lg:col-span-2">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-text-secondary" />
                <Input
                  placeholder="Search customer, mobile, email..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs h-8 pl-8 w-full bg-white"
                />
              </div>

              {/* Date Filter Control with Presets */}
              <div className="flex items-center space-x-1.5">
                <select
                  aria-label="Filter by registration/application date"
                  value={datePreset}
                  onChange={(e) => handleDatePresetChange(e.target.value)}
                  className="text-xs h-8 px-2.5 w-full rounded-md border border-input bg-white text-slate-800 shadow-xs focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="ALL">Date: All Time</option>
                  <option value="TODAY">Today</option>
                  <option value="YESTERDAY">Yesterday</option>
                  <option value="LAST_7_DAYS">Last 7 Days</option>
                  <option value="LAST_30_DAYS">Last 30 Days</option>
                  <option value="CUSTOM">Custom Date Range...</option>
                </select>
              </div>

              {/* State Filter Dropdown (Loaded dynamically from DB) */}
              <div className="flex items-center space-x-1.5">
                <select
                  aria-label="Filter by state"
                  value={stateFilter}
                  onChange={(e) => {
                    setStateFilter(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs h-8 px-2.5 w-full rounded-md border border-input bg-white text-slate-800 shadow-xs focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="ALL">State: All States</option>
                  {statesList.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter Dropdown */}
              <div className="flex items-center space-x-1.5">
                <select
                  aria-label="Filter by account and loan status"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs h-8 px-2.5 w-full rounded-md border border-input bg-white text-slate-800 shadow-xs focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="ALL">Status: All Statuses</option>
                  <option value="PENDING_APPROVAL">Pending Approval</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="DISBURSED">Disbursed</option>
                  <option value="ACTIVE">Active</option>
                </select>
              </div>

              {/* Domain / Website Filter Dropdown */}
              {domainsList.length > 0 && (
                <div className="flex items-center space-x-1.5">
                  <select
                    aria-label="Filter by originating domain"
                    value={domainFilter}
                    onChange={(e) => {
                      setDomainFilter(e.target.value);
                      setPage(1);
                    }}
                    className="text-xs h-8 px-2.5 w-full rounded-md border border-input bg-white text-slate-800 shadow-xs focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="ALL">Domain: All Websites</option>
                    {domainsList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.domainName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Requirement 1: Custom Date Range Picker Bar (Shown when Custom is selected) */}
            {datePreset === 'CUSTOM' && (
              <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs mt-1">
                <div className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-text-secondary" />
                  <span className="text-slate-600 font-medium">From:</span>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="h-7 px-2 text-xs border border-slate-300 rounded bg-white"
                  />
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-slate-600 font-medium">To:</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="h-7 px-2 text-xs border border-slate-300 rounded bg-white"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleApplyCustomDates}
                  className="h-7 px-3 text-xs bg-success text-background text-text-primary hover:brightness-110"
                >
                  Apply Dates
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCustomFrom('');
                    setCustomTo('');
                    setAppliedFromDate('');
                    setAppliedToDate('');
                    setDatePreset('ALL');
                    setPage(1);
                  }}
                  className="h-7 px-2.5 text-xs text-slate-600"
                >
                  Clear
                </Button>
                {appliedFromDate && (
                  <span className="text-[11px] text-emerald-700 font-medium ml-auto">
                    Active: {appliedFromDate} to {appliedToDate || 'Today'}
                  </span>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        {/* Customer Table Container */}
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs text-text-secondary">
            <thead className="bg-surface text-text-secondary font-bold uppercase tracking-wider text-[10px] border-b border-border">
              <tr>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Mobile</th>
                <th className="py-3 px-4">Loan / App ID</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Loan Type & Amount</th>
                <th className="py-3 px-4">Application Date</th>
                <th className="py-3 px-4">Pending Since</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4">WhatsApp</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1D3047]/60">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={10} className="py-3.5 px-4 h-11 bg-surface-elevated" />
                  </tr>
                ))
              ) : customers.length > 0 ? (
                customers.map((c) => {
                  const hasLoan = Boolean(c.latestLoan?.id);
                  const isLoanApproved = c.latestLoan?.status === 'APPROVED' || c.loanStatus === 'APPROVED';
                  const hasPayment = Boolean(c.latestPayment || c.paymentStatus === 'PAID' || c.paymentStatus === 'VERIFIED');

                  return (
                    <tr key={c.id} className="hover:bg-surface-elevated hover:brightness-110/50 transition-colors">
                      {/* Customer Name & Email */}
                      <td className="py-3 px-4">
                        <Link
                          to={`/admin/customers/${c.id}`}
                          className="font-semibold text-text-primary hover:text-primary transition-colors block"
                        >
                          {c.fullName}
                        </Link>
                        <span className="text-[11px] text-text-secondary block truncate max-w-[160px]">
                          {c.email}
                        </span>
                      </td>

                      {/* Mobile */}
                      <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                        +91 {c.mobile}
                      </td>

                      {/* Loan / Application ID */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {c.latestLoan?.applicationNumber ? (
                          <Link
                            to={`/admin/loans/${c.latestLoan.id}`}
                            className="font-mono font-medium text-emerald-700 hover:underline"
                          >
                            {c.latestLoan.applicationNumber}
                          </Link>
                        ) : (
                          <span className="text-text-secondary font-mono text-[11px]">N/A</span>
                        )}
                      </td>

                      {/* Location (State & City) */}
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        {c.city ? `${c.city}, ` : ''}{c.state || 'N/A'}
                      </td>

                      {/* Loan Type & Requested Amount */}
                      <td className="py-3 px-4">
                        {c.latestLoan ? (
                          <div>
                            <span className="text-slate-900 font-bold block">
                              ₹{c.latestLoan.requestedAmount.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[11px] text-text-secondary">
                              {c.latestLoan.loanType}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-slate-900 font-medium block">
                              ₹{c.monthlyIncome.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[11px] text-text-secondary">Reported Income</span>
                          </div>
                        )}
                      </td>

                      {/* Application Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        {c.latestLoan?.submittedAt ? (
                          new Date(c.latestLoan.submittedAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        ) : (
                          <span className="text-text-secondary text-[11px]">
                            {new Date(c.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })} (Reg)
                          </span>
                        )}
                      </td>

                      {/* Pending Since */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {c.pendingSince ? (
                          <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px]">
                            {new Date(c.pendingSince).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </span>
                        ) : (
                          <span className="text-text-secondary text-[11px]">—</span>
                        )}
                      </td>

                      {/* Current Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(c.latestLoan?.status || c.kycStatus || c.accountStatus)}
                      </td>

                      {/* WhatsApp Status Indicator */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getWhatsAppBadge(c)}
                      </td>

                      {/* Requirement 11: Contextual Actions Menu */}
                      <td className="py-3 px-4 text-right whitespace-nowrap relative">
                        <div className="flex items-center justify-end space-x-1">
                          <Link to={`/admin/customers/${c.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2 text-slate-700 hover:text-emerald-700"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              360 View
                            </Button>
                          </Link>

                          {/* More Options Dropdown Trigger */}
                          <div className="relative inline-block text-left">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setOpenActionMenuId(openActionMenuId === c.id ? null : c.id)
                              }
                              className="h-7 w-7 p-0 border-slate-200"
                              title="More Customer Actions"
                            >
                              <MoreVertical className="w-3.5 h-3.5 text-slate-600" />
                            </Button>

                            {/* Dropdown Menu Popup */}
                            {openActionMenuId === c.id && (
                              <div
                                ref={actionMenuRef}
                                className="absolute right-0 mt-1 w-52 bg-white rounded-lg shadow-lg border border-slate-200 z-30 py-1 text-left animate-in fade-in zoom-in-95"
                              >
                                <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] uppercase font-bold text-text-secondary">
                                  Actions: {c.fullName}
                                </div>

                                <Link
                                  to={`/admin/customers/${c.id}`}
                                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  onClick={() => setOpenActionMenuId(null)}
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-text-secondary" />
                                  View Customer (360°)
                                </Link>

                                {hasLoan && (
                                  <Link
                                    to={`/admin/loans/${c.latestLoan!.id}`}
                                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                    onClick={() => setOpenActionMenuId(null)}
                                  >
                                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                                    View Loan Application
                                  </Link>
                                )}

                                <button
                                  type="button"
                                  onClick={() => openWhatsAppModal(c)}
                                  className="w-full text-left px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 font-medium"
                                >
                                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                                  Send WhatsApp Message
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openWhatsAppHistory(c)}
                                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <History className="w-3.5 h-3.5 text-text-secondary" />
                                  View WhatsApp History
                                </button>

                                {isLoanApproved && (
                                  <button
                                    type="button"
                                    disabled={downloadingDocId === c.id}
                                    onClick={() => handleDownloadApprovalLetter(c)}
                                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <FileSignature className="w-3.5 h-3.5 text-blue-600" />
                                    {downloadingDocId === c.id ? 'Generating...' : 'Download Sanction Letter'}
                                  </button>
                                )}

                                {hasPayment && (
                                  <button
                                    type="button"
                                    disabled={downloadingDocId === c.id}
                                    onClick={() => handleDownloadInvoice(c)}
                                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <Download className="w-3.5 h-3.5 text-purple-600" />
                                    {downloadingDocId === c.id ? 'Generating...' : 'Download Tax Invoice'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-text-secondary">
                    <Filter className="w-8 h-8 mx-auto mb-2 text-text-secondary" />
                    No borrower records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>

        {/* Pagination Footer (Resets to page 1 on filter changes) */}
        {pagination.totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-text-secondary">
            <span>
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} borrowers)
            </span>
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="h-7 px-2.5"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="h-7 px-2.5"
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Requirement 5: WhatsApp Preview & Confirmation Modal */}
      <Dialog
        open={Boolean(selectedCustomerForWhatsApp)}
        onOpenChange={(open) => {
          if (!open) setSelectedCustomerForWhatsApp(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              Send WhatsApp Update
            </DialogTitle>
            <DialogDescription className="text-xs text-text-secondary">
              Send verified application status notification directly to the borrower's registered WhatsApp number.
            </DialogDescription>
          </DialogHeader>

          {selectedCustomerForWhatsApp && (
            <div className="space-y-4 text-xs py-1">
              {/* Recipient Details Card */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-text-secondary font-medium">Borrower:</span>
                  <span className="font-bold text-slate-900">{selectedCustomerForWhatsApp.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary font-medium">WhatsApp Mobile:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    +91 {selectedCustomerForWhatsApp.mobile}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary font-medium">Application Ref:</span>
                  <span className="font-mono text-slate-800">
                    {selectedCustomerForWhatsApp.latestLoan?.applicationNumber || 'In Progress'}
                  </span>
                </div>
                {selectedCustomerForWhatsApp.pendingSince && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary font-medium">Pending Review Since:</span>
                    <span className="text-amber-800 font-medium">
                      {new Date(selectedCustomerForWhatsApp.pendingSince).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              {/* Message Composer / Preview */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Message Content (Dynamic Template Preview):
                </label>
                <textarea
                  rows={5}
                  value={whatsAppMessageText}
                  onChange={(e) => setWhatsAppMessageText(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:border-success font-sans leading-relaxed"
                  placeholder="Type message content..."
                />
                <p className="text-[11px] text-text-secondary mt-1">
                  Variables supported: <code>{'{{customerName}}'}</code>, <code>{'{{loanId}}'}</code>, <code>{'{{companyName}}'}</code>.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCustomerForWhatsApp(null)}
              disabled={isSendingWhatsApp}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSendWhatsApp}
              disabled={isSendingWhatsApp}
              className="text-xs bg-success text-background hover:brightness-110 text-text-primary font-semibold"
            >
              {isSendingWhatsApp ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Sending via Gateway...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Send WhatsApp
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Requirement 6: WhatsApp Message History Modal */}
      <Dialog
        open={Boolean(selectedCustomerForHistory)}
        onOpenChange={(open) => {
          if (!open) setSelectedCustomerForHistory(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <History className="w-5 h-5 text-emerald-600" />
              WhatsApp Communication History
            </DialogTitle>
            <DialogDescription className="text-xs text-text-secondary">
              Audit log of WhatsApp notifications dispatched to{' '}
              <strong className="text-slate-800">{selectedCustomerForHistory?.fullName}</strong> (
              +91 {selectedCustomerForHistory?.mobile}).
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-80 overflow-y-auto space-y-3 py-1 text-xs">
            {isLoadingHistory ? (
              <div className="p-6 text-center text-text-secondary">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                Loading dispatch logs...
              </div>
            ) : historyRecords.length > 0 ? (
              historyRecords.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {item.status === 'SENT' ? (
                        <Badge className="bg-success text-background text-text-primary text-[10px]">SENT</Badge>
                      ) : item.status === 'DELIVERED' ? (
                        <Badge className="bg-primary text-background text-text-primary text-[10px]">DELIVERED</Badge>
                      ) : (
                        <Badge className="bg-red-600 text-text-primary text-[10px]">FAILED</Badge>
                      )}
                      <span className="text-text-secondary text-[11px]">•</span>
                      <span className="text-text-secondary text-[11px] font-mono">
                        {new Date(item.sentAt || item.createdAt).toLocaleString('en-IN')}
                      </span>
                    </div>
                    {item.admin && (
                      <span className="text-[11px] text-slate-600">
                        By: <strong>{item.admin.fullName}</strong>
                      </span>
                    )}
                  </div>

                  <p className="text-slate-800 bg-white p-2.5 rounded border border-slate-100 whitespace-pre-wrap font-sans text-xs">
                    {item.message}
                  </p>

                  {item.failureReason && (
                    <div className="text-[11px] text-red-600 bg-red-50 p-1.5 rounded border border-red-200">
                      Reason: {item.failureReason}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-text-secondary">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-text-secondary" />
                No WhatsApp messages have been sent to this borrower yet.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCustomerForHistory(null)}
              className="text-xs"
            >
              Close
            </Button>
            {selectedCustomerForHistory && (
              <Button
                size="sm"
                onClick={() => {
                  const target = selectedCustomerForHistory;
                  setSelectedCustomerForHistory(null);
                  openWhatsAppModal(target);
                }}
                className="text-xs bg-success text-background hover:brightness-110 text-text-primary"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                Send New Message
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
