import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  loanApi,
  AdminLoanApplicationListItem,
  BulkWhatsAppResponse,
} from '@/api/loanApi';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { LoanStatusBadge } from '@/components/LoanStatusBadge';
import {
  Search,
  Filter,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  Loader2,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Mail,
  Send,
  X,
  CheckSquare,
  Square,
  Users,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { DataManagementModal, ManagementActionType } from '@/components/admin/DataManagementModal';
import { BulkActionBar } from '@/components/admin/BulkActionBar';


export const AdminLoansPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialStatus = searchParams.get('status') || '';
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>(initialStatus);
  const [dateFilter, setDateFilter] = useState<string>('');
  const [stateFilter, setStateFilter] = useState<string>('');
  const [loanType, setLoanType] = useState<string>('');

  // Selection state for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Bulk WhatsApp Modal state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkMessage, setBulkMessage] = useState(
    'Hello {{customerName}},\n\nYour loan application #{{applicationId}} for {{amount}} is currently {{loanStatus}}.\n\nThank you,\n{{companyName}}'
  );
  const [bulkTemplateName, setBulkTemplateName] = useState('APPLICATION_STATUS_UPDATE');
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [bulkCampaignResult, setBulkCampaignResult] = useState<BulkWhatsAppResponse['data'] | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Bulk Email Modal state
  const [isBulkEmailModalOpen, setIsBulkEmailModalOpen] = useState(false);
  const [bulkEmailSubject, setBulkEmailSubject] = useState(
    'Update regarding your Loan Application #{{applicationId}}'
  );
  const [bulkEmailMessage, setBulkEmailMessage] = useState(
    'Dear {{customerName}},\n\nWe would like to inform you that your loan application #{{applicationId}} for ₹{{amount}} is currently under the status: {{loanStatus}}.\n\nIf you have any queries or need further assistance, please feel free to reach out.\n\nWarm regards,\nSupport Team\n{{companyName}}'
  );
  const [bulkEmailTemplateName, setBulkEmailTemplateName] = useState('APPLICATION_STATUS_UPDATE');
  const [isSendingBulkEmail, setIsSendingBulkEmail] = useState(false);
  const [bulkEmailError, setBulkEmailError] = useState<string | null>(null);
  const [bulkEmailCampaignResult, setBulkEmailCampaignResult] = useState<any>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Safe Data Management Modal State
  const [mgmtModalState, setMgmtModalState] = useState<{
    isOpen: boolean;
    actionType: ManagementActionType;
    title: string;
    description: string;
    itemCount: number;
    itemNames: string[];
    warningMessage?: string;
    requireTypedConfirmation?: boolean;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    actionType: 'DELETE',
    title: '',
    description: '',
    itemCount: 0,
    itemNames: [],
    onConfirm: async () => {},
  });


  // Dynamically load distinct states
  const { data: statesData = [] } = useQuery<string[]>({
    queryKey: ['admin-customer-states'],
    queryFn: async () => {
      const res = await apiClient.get(API_ENDPOINTS.CUSTOMERS.STATES);
      return Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
    },
  });

  const statesList: string[] = Array.isArray(statesData)
    ? statesData
    : Array.isArray((statesData as any)?.data)
    ? (statesData as any).data
    : [];

  const {
    data: response,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      'adminLoanApplications',
      page,
      pageSize,
      search,
      status,
      dateFilter,
      stateFilter,
      loanType,
    ],
    queryFn: () =>
      loanApi.getAdminApplications({
        page,
        pageSize,
        search: search || undefined,
        status: status || undefined,
        dateFilter: dateFilter || undefined,
        state: stateFilter || undefined,
        loanType: loanType || undefined,
      }),
    refetchInterval: 1500,
  });

  const rawData = response?.data;
  const applications: AdminLoanApplicationListItem[] =
    (Array.isArray(rawData) ? rawData : null) ||
    (Array.isArray((rawData as any)?.applications) ? (rawData as any).applications : null) ||
    (Array.isArray((rawData as any)?.data) ? (rawData as any).data : null) ||
    (Array.isArray((response as any)?.applications) ? (response as any).applications : null) ||
    (Array.isArray((response as any)?.data) ? (response as any).data : null) ||
    (Array.isArray(response) ? (response as any) : null) ||
    [];

  const pagination =
    response?.pagination ||
    (rawData as any)?.pagination ||
    (response as any)?.data?.pagination || {
      page: 1,
      pageSize: 10,
      total: applications.length,
      totalPages: Math.max(1, Math.ceil(applications.length / pageSize)),
    };

  const counts =
    response?.counts ||
    (rawData as any)?.counts ||
    (response as any)?.data?.counts || {
      all: pagination.total || applications.length,
      pending: 0,
      approved: 0,
      rejected: 0,
    };

  const handleStatusTabChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(1);
    setSelectedIds([]);
    if (newStatus) {
      setSearchParams({ status: newStatus });
    } else {
      setSearchParams({});
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
    setSelectedIds([]);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatus('');
    setDateFilter('');
    setStateFilter('');
    setLoanType('');
    setPage(1);
    setSelectedIds([]);
    setSearchParams({});
  };

  // Clear selection on any filter change
  React.useEffect(() => {
    setSelectedIds([]);
  }, [search, status, dateFilter, stateFilter, loanType, page]);

  // Selection Handlers
  const isAllSelected =
    applications.length > 0 &&
    applications.every((app) => selectedIds.includes(app.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const currentPageIds = new Set(applications.map((app) => app.id));
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.has(id)));
    } else {
      const newIds = new Set([...selectedIds, ...applications.map((app) => app.id)]);
      setSelectedIds(Array.from(newIds));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedApplications = applications.filter((app) =>
    selectedIds.includes(app.id)
  );

  // Safe Data Management Action Handlers
  const handleBulkArchive = () => {
    setMgmtModalState({
      isOpen: true,
      actionType: 'ARCHIVE',
      title: 'Bulk Archive Loan Applications',
      description: `Archive ${selectedIds.length} selected loan application(s). Historical audit trail will be retained.`,
      itemCount: selectedIds.length,
      itemNames: selectedApplications.map((a) => `#${a.applicationNumber} - ${a.customerName}`).slice(0, 5),
      warningMessage: 'Archiving soft-cancels active processing for selected applications while preserving compliance history.',
      onConfirm: async () => {
        const res = await apiClient.post(API_ENDPOINTS.ADMIN_LOANS.BULK_ARCHIVE, { applicationIds: selectedIds });
        setFeedback({ type: 'success', message: res.message || `Successfully archived ${res.count || selectedIds.length} loan application(s).` });
        setSelectedIds([]);
        refetch();
      },
    });
  };

  const handleBulkRestore = () => {
    setMgmtModalState({
      isOpen: true,
      actionType: 'RESTORE',
      title: 'Bulk Restore Loan Applications',
      description: `Restore ${selectedIds.length} selected archived/cancelled loan application(s) back into active review status.`,
      itemCount: selectedIds.length,
      itemNames: selectedApplications.map((a) => `#${a.applicationNumber} - ${a.customerName}`).slice(0, 5),
      warningMessage: 'Restoring applications will place them back into active review status.',
      onConfirm: async () => {
        const res = await apiClient.post(API_ENDPOINTS.ADMIN_LOANS.BULK_RESTORE, { applicationIds: selectedIds });
        setFeedback({ type: 'success', message: res.message || `Successfully restored ${res.count || selectedIds.length} loan application(s).` });
        setSelectedIds([]);
        refetch();
      },
    });
  };

  const handleBulkDelete = () => {
    setMgmtModalState({
      isOpen: true,
      actionType: 'DELETE',
      title: 'Permanently Delete Selected Applications',
      description: `Attempt permanent deletion of ${selectedIds.length} selected loan application(s).`,
      itemCount: selectedIds.length,
      itemNames: selectedApplications.map((a) => `#${a.applicationNumber} - ${a.customerName}`).slice(0, 5),
      requireTypedConfirmation: true,
      warningMessage: 'CRITICAL SECURITY RULE: Applications that are APPROVED, ACTIVE, or DISBURSED or linked to paid payments CANNOT be hard-deleted due to financial audit standards. Foreign-key protection will automatically soft-archive/cancel them instead.',
      onConfirm: async () => {
        const res = await apiClient.post(API_ENDPOINTS.ADMIN_LOANS.BULK_DELETE, { applicationIds: selectedIds });
        setFeedback({ type: 'success', message: res.message || `Processed deletion for selected applications.` });
        setSelectedIds([]);
        refetch();
      },
    });
  };

  const handleSingleDelete = (app: AdminLoanApplicationListItem) => {
    setMgmtModalState({
      isOpen: true,
      actionType: 'DELETE',
      title: `Delete Application #${app.applicationNumber}`,
      description: `Requesting deletion for loan application #${app.applicationNumber} (${app.customerName}).`,
      itemCount: 1,
      itemNames: [`#${app.applicationNumber} - ${app.customerName}`],
      requireTypedConfirmation: true,
      warningMessage: ['APPROVED', 'ACTIVE', 'DISBURSED'].includes((app.status || '').toUpperCase())
        ? 'NOTE: This loan application is active/approved. Database foreign-key safety blocks raw SQL deletion and will soft-archive/cancel the application instead.'
        : 'This action is permanent for unapproved draft applications.',
      onConfirm: async () => {
        const res = await apiClient.delete(API_ENDPOINTS.ADMIN_LOANS.DELETE(app.id));
        setFeedback({ type: 'success', message: res.message || 'Application processed successfully.' });
        refetch();
      },
    });
  };


  const handleOpenBulkModal = () => {
    setBulkCampaignResult(null);
    setBulkError(null);
    setIsBulkModalOpen(true);
  };

  const handleDispatchBulkWhatsApp = async () => {
    if (selectedIds.length === 0) return;
    setIsSendingBulk(true);
    setBulkError(null);

    try {
      const res = await loanApi.sendBulkWhatsAppApplications({
        applicationIds: selectedIds,
        message: bulkMessage.trim(),
        templateName: bulkTemplateName,
      });

      if (res.data) {
        setBulkCampaignResult(res.data);
      } else {
        setBulkCampaignResult({
          total: selectedIds.length,
          sentCount: selectedIds.length,
          failedCount: 0,
          results: [],
        });
      }
    } catch (err: unknown) {
      setBulkError(err instanceof Error ? err.message : 'Failed to dispatch bulk WhatsApp campaign.');
    } finally {
      setIsSendingBulk(false);
    }
  };

  const handleTemplateSelect = (tmpl: string) => {
    setBulkTemplateName(tmpl);
    if (tmpl === 'APPLICATION_STATUS_UPDATE') {
      setBulkMessage('Hello {{customerName}},\n\nYour loan application #{{applicationId}} for {{amount}} is currently {{loanStatus}}.\n\nThank you,\n{{companyName}}');
    } else if (tmpl === 'KYC_REMINDER') {
      setBulkMessage('Dear {{customerName}},\n\nKindly complete your KYC document verification for loan application #{{applicationId}} to expedite approval.\n\nSupport Team,\n{{companyName}}');
    } else if (tmpl === 'APPROVAL_ALERT') {
      setBulkMessage('Congratulations {{customerName}}!\n\nYour loan application #{{applicationId}} has been APPROVED for {{amount}}.\n\nPlease sign in to accept your agreement.\n{{companyName}}');
    }
  };

  const handleOpenBulkEmailModal = () => {
    setBulkEmailCampaignResult(null);
    setBulkEmailError(null);
    setIsBulkEmailModalOpen(true);
  };

  const handleDispatchBulkEmail = async () => {
    if (selectedIds.length === 0) return;
    setIsSendingBulkEmail(true);
    setBulkEmailError(null);

    try {
      const res = await loanApi.sendBulkEmailApplications({
        applicationIds: selectedIds,
        subject: bulkEmailSubject.trim(),
        message: bulkEmailMessage.trim(),
        templateName: bulkEmailTemplateName,
      });

      if (res.data) {
        setBulkEmailCampaignResult(res.data);
      } else {
        setBulkEmailCampaignResult({
          total: selectedIds.length,
          sentCount: selectedIds.length,
          failedCount: 0,
          results: [],
        });
      }
    } catch (err: unknown) {
      setBulkEmailError(err instanceof Error ? err.message : 'Failed to dispatch bulk Email campaign.');
    } finally {
      setIsSendingBulkEmail(false);
    }
  };

  const handleEmailTemplateSelect = (tmpl: string) => {
    setBulkEmailTemplateName(tmpl);
    if (tmpl === 'APPLICATION_STATUS_UPDATE') {
      setBulkEmailSubject('Update regarding your Loan Application #{{applicationId}}');
      setBulkEmailMessage('Dear {{customerName}},\n\nWe would like to inform you that your loan application #{{applicationId}} for ₹{{amount}} is currently under the status: {{loanStatus}}.\n\nIf you have any queries or need further assistance, please feel free to reach out.\n\nWarm regards,\nSupport Team\n{{companyName}}');
    } else if (tmpl === 'KYC_REMINDER') {
      setBulkEmailSubject('Action Required: Complete KYC for Application #{{applicationId}}');
      setBulkEmailMessage('Dear {{customerName}},\n\nKindly complete your pending KYC document submission for loan application #{{applicationId}} at your earliest convenience to proceed with your sanction.\n\nPlease visit the borrower portal to upload your documents.\n\nBest regards,\nVerification Team\n{{companyName}}');
    } else if (tmpl === 'APPROVAL_ALERT') {
      setBulkEmailSubject('Congratulations! Loan Application #{{applicationId}} Sanctioned');
      setBulkEmailMessage('Dear {{customerName}},\n\nGreat news! Your loan application #{{applicationId}} for ₹{{amount}} has been officially APPROVED and SANCTIONED.\n\nPlease log in to review and sign your digital loan agreement to initiate disbursement.\n\nWarm regards,\nCredit & Disbursal Team\n{{companyName}}');
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">
            Loan Applications Underwriting
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Conduct credit reviews, verify borrower records, and dispatch WhatsApp notifications.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="self-start sm:self-auto text-xs bg-surface-elevated border-border text-text-primary hover:bg-surface-elevated hover:brightness-110 h-9"
        >
          {isFetching ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 mr-1.5" />}
          Refresh
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => handleStatusTabChange('')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            status === ''
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <span>All Applications</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
            status === '' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {counts.all ?? pagination.total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleStatusTabChange('PENDING')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            status === 'PENDING'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
            status === 'PENDING' ? 'bg-white text-blue-700 font-extrabold' : 'bg-blue-100 text-blue-800'
          }`}>
            {counts.pending}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleStatusTabChange('APPROVED')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            status === 'APPROVED'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Approved</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
            status === 'APPROVED' ? 'bg-white text-emerald-700 font-extrabold' : 'bg-emerald-100 text-emerald-800'
          }`}>
            {counts.approved}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleStatusTabChange('REJECTED')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            status === 'REJECTED'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Rejected</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
            status === 'REJECTED' ? 'bg-white text-rose-700 font-extrabold' : 'bg-rose-100 text-rose-800'
          }`}>
            {counts.rejected}
          </span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center justify-between font-medium text-xs ${
          feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="bg-surface-elevated border border-border shadow-sm">
        <CardContent className="p-4 space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-text-secondary absolute left-3 top-2.5" />
              <Input
                placeholder="Search by Application #, Borrower Name, Mobile, Email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 text-xs bg-surface border-border text-text-primary h-9 placeholder-[#8FA3BA]/60"
              />
            </div>
            <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 text-text-primary text-xs h-9 font-bold px-4">
              Search
            </Button>
          </form>

          {/* Combined Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-border">
            {/* Loan Type Filter */}
            <div>
              <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                Loan Type
              </label>
              <select
                value={loanType}
                onChange={(e) => {
                  setLoanType(e.target.value);
                  setPage(1);
                  setSelectedIds([]);
                }}
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All Loan Types</option>
                <option value="Personal Loan">Personal Loan</option>
                <option value="Business Loan">Business Loan</option>
                <option value="Home Loan">Home Loan</option>
                <option value="Education Loan">Education Loan</option>
                <option value="Gold Loan">Gold Loan</option>
                <option value="Vehicle Loan">Vehicle Loan</option>
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                Submission Date
              </label>
              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setPage(1);
                  setSelectedIds([]);
                }}
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All Time</option>
                <option value="TODAY">Today</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="LAST_7_DAYS">Last 7 Days</option>
                <option value="LAST_30_DAYS">Last 30 Days</option>
              </select>
            </div>

            {/* State Filter */}
            <div>
              <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                State
              </label>
              <select
                value={stateFilter}
                onChange={(e) => {
                  setStateFilter(e.target.value);
                  setPage(1);
                  setSelectedIds([]);
                }}
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring overflow-y-auto"
              >
                <option value="">All States</option>
                {statesList.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Filters */}
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="w-full h-9 text-xs text-slate-600 hover:text-slate-900 border-dashed"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action Sticky Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={applications.length}
        onClearSelection={() => setSelectedIds([])}
        onArchiveSelected={handleBulkArchive}
        archiveLabel="Archive Selected"
        onRestoreSelected={handleBulkRestore}
        restoreLabel="Restore Selected"
        onDeleteSelected={handleBulkDelete}
        deleteLabel="Delete Selected"
        customActions={[
          {
            label: 'Send WhatsApp',
            icon: <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />,
            onClick: handleOpenBulkModal,
          },
          {
            label: 'Send Email',
            icon: <Mail className="w-3.5 h-3.5 text-blue-400" />,
            onClick: handleOpenBulkEmailModal,
          },
        ]}
      />

      {/* Applications Data Table */}
      <Card className="bg-surface-elevated border border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-semibold text-text-primary">
              Applications ({pagination.total})
            </CardTitle>
          </div>
          <span className="text-xs text-text-secondary">
            Page {pagination.page} of {pagination.totalPages}
          </span>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-text-secondary">Loading underwriting records...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Filter className="w-10 h-10 text-text-secondary/40 mx-auto" />
              <h3 className="font-semibold text-text-primary">
                {status === 'PENDING'
                  ? 'No pending applications found.'
                  : status === 'APPROVED'
                  ? 'No approved applications found.'
                  : status === 'REJECTED'
                  ? 'No rejected applications found.'
                  : 'No applications found'}
              </h3>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                No loan records match your current criteria. Try selecting another tab or resetting filters.
              </p>
              <Button variant="outline" size="sm" onClick={handleResetFilters} className="text-xs mt-2 border-border text-text-secondary">
                Reset All Filters
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-surface border-b border-border">
                    <TableRow className="border-b border-border">
                      <TableHead className="w-10 text-center">
                        <button
                          type="button"
                          onClick={handleToggleSelectAll}
                          className="text-slate-600 hover:text-slate-900 transition flex items-center justify-center"
                          title={isAllSelected ? 'Deselect all' : 'Select all filtered'}
                        >
                          {isAllSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="text-xs text-text-secondary font-bold uppercase">Application #</TableHead>
                      <TableHead className="text-xs text-text-secondary font-bold uppercase">Borrower Name</TableHead>
                      <TableHead className="text-xs text-text-secondary font-bold uppercase">State</TableHead>
                      <TableHead className="text-xs text-text-secondary font-bold uppercase">Loan Type</TableHead>
                      <TableHead className="text-xs text-text-secondary font-bold uppercase">Requested</TableHead>
                      <TableHead className="text-xs text-text-secondary font-bold uppercase">Tenure</TableHead>
                      <TableHead className="text-xs text-text-secondary font-bold uppercase">KYC Status</TableHead>
                      <TableHead className="text-xs text-text-secondary font-bold uppercase">Loan Status</TableHead>
                      <TableHead className="text-xs text-text-secondary font-bold uppercase">Submitted</TableHead>
                      <TableHead className="text-xs text-text-secondary font-bold uppercase text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((app: AdminLoanApplicationListItem) => {
                      const isSelected = selectedIds.includes(app.id);
                      return (
                        <TableRow
                          key={app.id}
                          className={`hover:bg-slate-50/80 transition ${
                            isSelected ? 'bg-blue-50/60' : ''
                          }`}
                        >
                          <TableCell className="w-10 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSelectRow(app.id)}
                              className="text-slate-600 hover:text-slate-900 transition flex items-center justify-center mx-auto"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell className="font-mono text-xs font-semibold text-slate-700">
                            {app.applicationNumber}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs font-semibold text-slate-900">
                              {app.customerName}
                            </div>
                            <div className="text-[11px] text-text-secondary font-mono">
                              +91 {app.mobile}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {app.state}
                          </TableCell>
                          <TableCell className="text-xs text-slate-700 font-medium">
                            {app.loanType || 'Personal Loan'}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-slate-900">
                            ₹{app.requestedAmount.toLocaleString('en-IN')}
                            {app.proposedAmount && (
                              <span className="block text-[10px] text-emerald-700 font-normal">
                                Offer: ₹{app.proposedAmount.toLocaleString('en-IN')}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {app.tenureMonths} Mo.
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const st = (app.kycStatus || 'PENDING').toUpperCase();
                              if (st === 'APPROVED' || st === 'VERIFIED') {
                                return (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Verified
                                  </span>
                                );
                              }
                              if (st === 'REJECTED') {
                                return (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Rejected
                                  </span>
                                );
                              }
                              if (st === 'REUPLOAD_REQUIRED' || st === 'CORRECTION_REQUIRED') {
                                return (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Correction
                                  </span>
                                );
                              }
                              return (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Pending
                                </span>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <LoanStatusBadge status={app.status} />
                          </TableCell>
                          <TableCell className="text-xs text-text-secondary">
                            {new Date(app.submittedAt || app.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/admin/loans/${app.id}`)}
                                className="h-8 text-xs font-medium"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                Review
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSingleDelete(app)}
                                className="h-8 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                title="Delete or Archive Application"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List */}
              <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3">
                {applications.map((app: AdminLoanApplicationListItem) => {
                  const isSelected = selectedIds.includes(app.id);
                  return (
                    <div
                      key={app.id}
                      className={`p-3.5 rounded-xl border border-slate-200 space-y-2.5 shadow-sm transition ${
                        isSelected ? 'bg-blue-50/70 border-blue-300' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectRow(app.id)}
                          className="flex items-center gap-2 text-xs font-semibold text-slate-800"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                          <span className="font-mono">{app.applicationNumber}</span>
                        </button>
                        <LoanStatusBadge status={app.status} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-900">{app.customerName}</h4>
                        <p className="text-xs text-text-secondary font-mono">+91 {app.mobile}</p>
                      </div>
                      <div className="flex items-center justify-between text-xs py-1 border-y border-slate-100">
                        <span className="text-slate-600 font-medium">{app.loanType || 'Personal Loan'}</span>
                        <div>
                          {app.kycStatus === 'APPROVED' ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              KYC: Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              KYC: {app.kycStatus || 'Pending'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                        <div>
                          <span className="text-[10px] text-text-secondary block">Requested</span>
                          <span className="font-bold text-slate-900">
                            ₹{app.requestedAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-text-secondary block">Tenure</span>
                          <span>{app.tenureMonths} Months</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-text-secondary pt-1">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-text-secondary" />
                          <span>{app.state}</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => navigate(`/admin/loans/${app.id}`)}
                          className="h-7 text-xs bg-surface hover:bg-surface-elevated text-text-primary"
                        >
                          Review
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>
                Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                {pagination.total} entries
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => {
                    setPage((p) => Math.max(p - 1, 1));
                    setSelectedIds([]);
                  }}
                  className="h-8 px-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-medium">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => {
                    setPage((p) => p + 1);
                    setSelectedIds([]);
                  }}
                  className="h-8 px-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk WhatsApp Campaign Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Send WhatsApp Campaign
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dispatch personalized WhatsApp messages to {selectedIds.length} borrower(s)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bulkError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{bulkError}</span>
              </div>
            )}

            {bulkCampaignResult ? (
              /* Campaign Outcome View */
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    WhatsApp Campaign Completed
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase block">Total</span>
                      <span className="text-lg font-extrabold text-slate-900">{bulkCampaignResult.total}</span>
                    </div>
                    <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                      <span className="text-[10px] font-semibold text-emerald-700 uppercase block">Sent</span>
                      <span className="text-lg font-extrabold text-emerald-700">{bulkCampaignResult.sentCount}</span>
                    </div>
                    <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
                      <span className="text-[10px] font-semibold text-rose-700 uppercase block">Failed</span>
                      <span className="text-lg font-extrabold text-rose-700">{bulkCampaignResult.failedCount}</span>
                    </div>
                  </div>
                </div>

                {bulkCampaignResult.results && bulkCampaignResult.results.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Delivery Log Breakdown
                    </h5>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {bulkCampaignResult.results.map((r, i) => (
                        <div
                          key={i}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                            r.success
                              ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                              : 'bg-rose-50/50 border-rose-200 text-rose-900'
                          }`}
                        >
                          <div>
                            <span className="font-semibold">{r.customerName}</span>
                            <span className="text-[11px] opacity-75 font-mono ml-2">({r.recipient})</span>
                            {r.error && (
                              <p className="text-[11px] text-rose-600 mt-0.5">{r.error}</p>
                            )}
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.success ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'
                          }`}>
                            {r.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={() => {
                      setIsBulkModalOpen(false);
                      setSelectedIds([]);
                    }}
                    className="bg-slate-900 hover:bg-black text-white text-xs font-bold px-6 py-2 rounded-xl"
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              /* Campaign Compose Form */
              <div className="space-y-4">
                {/* Recipients preview */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase block mb-1.5">
                    Recipients ({selectedApplications.length})
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                    {selectedApplications.map((app) => (
                      <span
                        key={app.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700"
                      >
                        <Users className="w-3 h-3 text-slate-400" />
                        {app.customerName} (+91 {app.mobile})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Template Selector */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase block mb-1">
                    Message Template
                  </label>
                  <select
                    value={bulkTemplateName}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full text-xs h-9 rounded-xl border border-slate-300 bg-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="APPLICATION_STATUS_UPDATE">Application Status Update (Default)</option>
                    <option value="KYC_REMINDER">KYC Verification Reminder</option>
                    <option value="APPROVAL_ALERT">Loan Sanction & Approval Alert</option>
                    <option value="CUSTOM">Custom Free-form Message</option>
                  </select>
                </div>

                {/* Message Body */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 uppercase">
                      Message Content
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Dynamic placeholders supported
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={bulkMessage}
                    onChange={(e) => setBulkMessage(e.target.value)}
                    placeholder="Enter message template..."
                    className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono leading-relaxed"
                  />
                  <div className="flex flex-wrap gap-1 mt-1 text-[10px] text-slate-500">
                    <span>Variables:</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded font-mono">{'{{customerName}}'}</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded font-mono">{'{{applicationId}}'}</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded font-mono">{'{{loanStatus}}'}</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded font-mono">{'{{amount}}'}</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded font-mono">{'{{companyName}}'}</span>
                  </div>
                </div>

                {/* Confirmation Notice */}
                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>
                    You are about to dispatch a WhatsApp notification to <strong>{selectedIds.length}</strong> selected customer(s). Messages will be sent through your configured WhatsApp Gateway.
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBulkModalOpen(false)}
                    disabled={isSendingBulk}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDispatchBulkWhatsApp}
                    disabled={isSendingBulk || !bulkMessage.trim()}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-2"
                  >
                    {isSendingBulk ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Dispatching to {selectedIds.length} Customers...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Send to {selectedIds.length} Customers
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Email Campaign Modal */}
      {isBulkEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Send Email Campaign
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dispatch personalized SMTP emails to {selectedIds.length} borrower(s)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkEmailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bulkEmailError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{bulkEmailError}</span>
              </div>
            )}

            {bulkEmailCampaignResult ? (
              /* Campaign Outcome View */
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    Email Campaign Completed
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase block">Total</span>
                      <span className="text-lg font-extrabold text-slate-900">{bulkEmailCampaignResult.total}</span>
                    </div>
                    <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200">
                      <span className="text-[10px] font-semibold text-blue-700 uppercase block">Sent</span>
                      <span className="text-lg font-extrabold text-blue-700">{bulkEmailCampaignResult.sentCount}</span>
                    </div>
                    <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
                      <span className="text-[10px] font-semibold text-rose-700 uppercase block">Failed</span>
                      <span className="text-lg font-extrabold text-rose-700">{bulkEmailCampaignResult.failedCount}</span>
                    </div>
                  </div>
                </div>

                {bulkEmailCampaignResult.results && bulkEmailCampaignResult.results.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Email Delivery Log Breakdown
                    </h5>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {bulkEmailCampaignResult.results.map((r: any, i: number) => (
                        <div
                          key={i}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                            r.success
                              ? 'bg-blue-50/50 border-blue-200 text-blue-900'
                              : 'bg-rose-50/50 border-rose-200 text-rose-900'
                          }`}
                        >
                          <div>
                            <span className="font-semibold">{r.customerName}</span>
                            <span className="text-[11px] opacity-75 font-mono ml-2">({r.recipient})</span>
                            {r.error && (
                              <p className="text-[11px] text-rose-600 mt-0.5">{r.error}</p>
                            )}
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.success ? 'bg-blue-200 text-blue-800' : 'bg-rose-200 text-rose-800'
                          }`}>
                            {r.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={() => {
                      setIsBulkEmailModalOpen(false);
                      setSelectedIds([]);
                    }}
                    className="bg-slate-900 hover:bg-black text-white text-xs font-bold px-6 py-2 rounded-xl"
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              /* Email Campaign Compose Form */
              <div className="space-y-4">
                {/* Recipients preview */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase block mb-1.5">
                    Email Recipients ({selectedApplications.length})
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                    {selectedApplications.map((app) => (
                      <span
                        key={app.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700"
                      >
                        <Users className="w-3 h-3 text-slate-400" />
                        {app.customerName} ({app.email})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Template Selector */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase block mb-1">
                    Email Template
                  </label>
                  <select
                    value={bulkEmailTemplateName}
                    onChange={(e) => handleEmailTemplateSelect(e.target.value)}
                    className="w-full text-xs h-9 rounded-xl border border-slate-300 bg-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="APPLICATION_STATUS_UPDATE">Application Status Update (Default)</option>
                    <option value="KYC_REMINDER">KYC Verification Reminder</option>
                    <option value="APPROVAL_ALERT">Loan Sanction & Approval Alert</option>
                    <option value="CUSTOM">Custom Free-form Email</option>
                  </select>
                </div>

                {/* Email Subject Line */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase block mb-1">
                    Subject Line
                  </label>
                  <Input
                    type="text"
                    value={bulkEmailSubject}
                    onChange={(e) => setBulkEmailSubject(e.target.value)}
                    placeholder="Enter email subject line..."
                    className="w-full text-xs border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Email Body */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 uppercase">
                      Email Body Content
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Dynamic placeholders supported
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={bulkEmailMessage}
                    onChange={(e) => setBulkEmailMessage(e.target.value)}
                    placeholder="Enter email message content..."
                    className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono leading-relaxed"
                  />
                  <div className="flex flex-wrap gap-1 mt-1 text-[10px] text-slate-500">
                    <span>Variables:</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded font-mono">{'{{customerName}}'}</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded font-mono">{'{{applicationId}}'}</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded font-mono">{'{{loanStatus}}'}</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded font-mono">{'{{amount}}'}</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded font-mono">{'{{companyName}}'}</span>
                  </div>
                </div>

                {/* Confirmation Notice */}
                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>
                    You are about to dispatch an email notification to <strong>{selectedIds.length}</strong> selected borrower(s). Emails will be sent through your configured SMTP Server.
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBulkEmailModalOpen(false)}
                    disabled={isSendingBulkEmail}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDispatchBulkEmail}
                    disabled={isSendingBulkEmail || !bulkEmailMessage.trim() || !bulkEmailSubject.trim()}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-2"
                  >
                    {isSendingBulkEmail ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Dispatching Emails to {selectedIds.length} Borrowers...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Send Emails to {selectedIds.length} Borrowers
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data Management Confirmation Modal */}
      <DataManagementModal
        isOpen={mgmtModalState.isOpen}
        onClose={() => setMgmtModalState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={mgmtModalState.onConfirm}
        actionType={mgmtModalState.actionType}
        title={mgmtModalState.title}
        description={mgmtModalState.description}
        itemCount={mgmtModalState.itemCount}
        itemNames={mgmtModalState.itemNames}
        warningMessage={mgmtModalState.warningMessage}
        requireTypedConfirmation={mgmtModalState.requireTypedConfirmation}
        confirmTextRequired="DELETE"
      />
    </div>
  );
};
