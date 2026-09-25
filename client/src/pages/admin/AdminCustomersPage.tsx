import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { adminService } from '@/services/adminService';
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
  Ban,
  UserCheck,
  Mail,
  CheckSquare,
  Trash2,
} from 'lucide-react';
import { DataManagementModal, ManagementActionType } from '@/components/admin/DataManagementModal';
import { BulkActionBar } from '@/components/admin/BulkActionBar';


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
  status: string;
  isActive?: boolean;
  isDeleted?: boolean;
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

  // Row selection state (supports multi-page unpaginated selection)
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [selectedCustomersMap, setSelectedCustomersMap] = useState<Record<string, CustomerRecord>>({});
  const [isLoadingSelectAllMatching, setIsLoadingSelectAllMatching] = useState(false);

  // Row Action Dropdown state
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  // Single Customer WhatsApp Modal state
  const [selectedCustomerForWhatsApp, setSelectedCustomerForWhatsApp] = useState<CustomerRecord | null>(null);
  const [whatsAppMessageText, setWhatsAppMessageText] = useState('');
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  // Bulk WhatsApp Modal state
  const [isBulkWhatsAppOpen, setIsBulkWhatsAppOpen] = useState(false);
  const [bulkWhatsAppMessage, setBulkWhatsAppMessage] = useState(
    'Hello {{customerName}},\n\nYour loan application {{applicationId}} is currently {{loanStatus}}.\n\nThank you,\n{{companyName}}'
  );
  const [isSendingBulkWhatsApp, setIsSendingBulkWhatsApp] = useState(false);

  // Bulk Email Modal state
  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false);
  const [bulkEmailSubject, setBulkEmailSubject] = useState('Important Update Regarding Your Loan Application');
  const [bulkEmailMessage, setBulkEmailMessage] = useState(
    'Dear {{customerName}},\n\nThis is an update regarding your loan application {{applicationId}}.\n\nCurrent Status: {{loanStatus}}\nLoan Amount: ₹{{loanAmount}}\n\nPlease contact our desk if you have any questions.\n\nWarm regards,\n{{companyName}} Team'
  );
  const [isSendingBulkEmail, setIsSendingBulkEmail] = useState(false);

  // Campaign Results Summary Modal
  const [campaignResult, setCampaignResult] = useState<{
    type: 'WhatsApp' | 'Email';
    total: number;
    sentCount: number;
    failedCount: number;
    results: Array<{
      customerId?: string;
      customerName?: string;
      recipient?: string;
      phone?: string;
      status: string;
      success?: boolean;
      error?: string;
      failureReason?: string;
    }>;
  } | null>(null);

  // Customer Deactivation & Reactivation Modal state
  const [customerToDeactivate, setCustomerToDeactivate] = useState<CustomerRecord | null>(null);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [isDeactivating, setIsDeactivating] = useState(false);

  const [customerToReactivate, setCustomerToReactivate] = useState<CustomerRecord | null>(null);
  const [isReactivating, setIsReactivating] = useState(false);

  // WhatsApp History Modal state
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<CustomerRecord | null>(null);
  const [historyRecords, setHistoryRecords] = useState<WhatsAppHistoryRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Export & Download loading states
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  // Safe Data Management Modal state
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

  // Global inline feedback message
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);


  // Selection safety: Reset selection when search, filter, or page changes
  useEffect(() => {
    setSelectedCustomerIds([]);
    setSelectedCustomersMap({});
  }, [search, status, stateFilter, domainFilter, datePreset, appliedFromDate, appliedToDate, page]);

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
    refetchInterval: 3000,
  });

  const customers = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };

  // Selectable customers (strictly excluding deactivated)
  const selectableCustomers = customers.filter(
    (c) => c.accountStatus !== 'DEACTIVATED' && c.status !== 'DEACTIVATED' && c.isActive !== false
  );
  const isAllSelected =
    selectableCustomers.length > 0 && selectableCustomers.every((c) => selectedCustomerIds.includes(c.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const pageIds = selectableCustomers.map((c) => c.id);
      setSelectedCustomerIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      const pageIds = selectableCustomers.map((c) => c.id);
      const newMap: Record<string, CustomerRecord> = { ...selectedCustomersMap };
      selectableCustomers.forEach((c) => {
        newMap[c.id] = c;
      });
      setSelectedCustomersMap(newMap);
      setSelectedCustomerIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleCustomerRow = (customer: CustomerRecord) => {
    const customerId = customer.id;
    if (selectedCustomerIds.includes(customerId)) {
      setSelectedCustomerIds((prev) => prev.filter((id) => id !== customerId));
    } else {
      setSelectedCustomersMap((prev) => ({ ...prev, [customerId]: customer }));
      setSelectedCustomerIds((prev) => [...prev, customerId]);
    }
  };

  // Select All Matching across all pages (unpaginated)
  const handleSelectAllMatching = async () => {
    setIsLoadingSelectAllMatching(true);
    try {
      const res = await adminService.getAllMatchingCustomers({
        search: search.trim() || undefined,
        status: status !== 'ALL' ? status : undefined,
        state: stateFilter !== 'ALL' ? stateFilter : undefined,
        fromDate: appliedFromDate || undefined,
        toDate: appliedToDate || undefined,
        domainId: domainFilter !== 'ALL' ? domainFilter : undefined,
      });
      const allMatching = res.data || [];
      const newMap: Record<string, CustomerRecord> = { ...selectedCustomersMap };
      allMatching.forEach((c) => {
        newMap[c.id] = c;
      });
      setSelectedCustomersMap(newMap);
      setSelectedCustomerIds(allMatching.map((c) => c.id));
      setFeedback({
        type: 'success',
        message: `Selected all ${allMatching.length} matching customers across all pages.`,
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: 'Failed to select all matching customers.',
      });
    } finally {
      setIsLoadingSelectAllMatching(false);
    }
  };

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
    setSelectedCustomerIds([]);
    setPage(1);
  };

  // Single Customer WhatsApp Helper
  const openWhatsAppModal = (customer: CustomerRecord) => {
    const loanRef = customer.latestLoan?.applicationNumber || 'Application';
    const defaultMsg = `Hello ${customer.fullName},\n\nYour loan application ${loanRef} is currently pending approval.\n\nWe will update you once the application has been reviewed.\n\nThank you,\nLoan Approve Financial Services`;
    setWhatsAppMessageText(defaultMsg);
    setSelectedCustomerForWhatsApp(customer);
    setOpenActionMenuId(null);
  };

  // Single Customer WhatsApp Dispatch
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

  // Bulk WhatsApp Dispatch
  const handleSendBulkWhatsApp = async () => {
    if (selectedCustomerIds.length === 0) return;
    setIsSendingBulkWhatsApp(true);
    try {
      const res = await adminService.bulkSendWhatsApp({
        customerIds: selectedCustomerIds,
        message: bulkWhatsAppMessage,
      });

      const data = res.data;
      setCampaignResult({
        type: 'WhatsApp',
        total: data.total || selectedCustomerIds.length,
        sentCount: data.sentCount || 0,
        failedCount: data.failedCount || 0,
        results: data.results || [],
      });

      setIsBulkWhatsAppOpen(false);
      setSelectedCustomerIds([]);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to dispatch bulk WhatsApp messages';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsSendingBulkWhatsApp(false);
    }
  };

  // Bulk Email Dispatch
  const handleSendBulkEmail = async () => {
    if (selectedCustomerIds.length === 0) return;
    setIsSendingBulkEmail(true);
    try {
      const res = await adminService.bulkSendEmail({
        customerIds: selectedCustomerIds,
        subject: bulkEmailSubject,
        message: bulkEmailMessage,
      });

      const data = res.data;
      setCampaignResult({
        type: 'Email',
        total: data.total || selectedCustomerIds.length,
        sentCount: data.sentCount || 0,
        failedCount: data.failedCount || 0,
        results: data.results || [],
      });

      setIsBulkEmailOpen(false);
      setSelectedCustomerIds([]);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to dispatch bulk emails';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsSendingBulkEmail(false);
    }
  };

  // Deactivate Customer Dispatch
  const handleDeactivateCustomer = async () => {
    if (!customerToDeactivate) return;
    setIsDeactivating(true);
    try {
      const res = await adminService.deactivateCustomer(customerToDeactivate.id, deactivateReason);
      setFeedback({
        type: 'success',
        message: res.message || `Customer ${customerToDeactivate.fullName} has been deactivated.`,
      });
      setCustomerToDeactivate(null);
      setDeactivateReason('');
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to deactivate customer account';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsDeactivating(false);
    }
  };

  // Reactivate Customer Dispatch
  const handleReactivateCustomer = async () => {
    if (!customerToReactivate) return;
    setIsReactivating(true);
    try {
      const res = await adminService.reactivateCustomer(customerToReactivate.id);
      setFeedback({
        type: 'success',
        message: res.message || `Customer ${customerToReactivate.fullName} has been reactivated.`,
      });
      setCustomerToReactivate(null);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reactivate customer account';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsReactivating(false);
    }
  };

  // Safe Bulk & Single Data Management Handlers
  const handleBulkDeactivatePrompt = () => {
    const selectedObjs = selectedCustomerIds
      .map((id) => selectedCustomersMap[id] || customers.find((c) => c.id === id))
      .filter(Boolean);
    const names = selectedObjs.map((c) => c!.fullName);

    setMgmtModalState({
      isOpen: true,
      actionType: 'DEACTIVATE',
      title: 'Bulk Deactivate Customers',
      description: `Deactivate account access for ${selectedCustomerIds.length} selected customer(s). KYC, loans, and financial histories will be preserved for compliance.`,
      itemCount: selectedCustomerIds.length,
      itemNames: names.slice(0, 5),
      warningMessage: 'Deactivating customer accounts will block their mobile app login while keeping financial compliance records intact.',
      onConfirm: async () => {
        const res = await apiClient.post(API_ENDPOINTS.CUSTOMERS.BULK_DEACTIVATE, {
          customerIds: selectedCustomerIds,
        });
        setFeedback({
          type: 'success',
          message: res.message || `Successfully deactivated ${res.count || selectedCustomerIds.length} customer account(s).`,
        });
        setSelectedCustomerIds([]);
        refetch();
      },
    });
  };

  const handleBulkReactivatePrompt = () => {
    const selectedObjs = selectedCustomerIds
      .map((id) => selectedCustomersMap[id] || customers.find((c) => c.id === id))
      .filter(Boolean);
    const names = selectedObjs.map((c) => c!.fullName);

    setMgmtModalState({
      isOpen: true,
      actionType: 'REACTIVATE',
      title: 'Bulk Reactivate Customers',
      description: `Reactivate account access for ${selectedCustomerIds.length} selected customer(s).`,
      itemCount: selectedCustomerIds.length,
      itemNames: names.slice(0, 5),
      warningMessage: 'Reactivating accounts will restore active login privileges and application submission capabilities.',
      onConfirm: async () => {
        const res = await apiClient.post(API_ENDPOINTS.CUSTOMERS.BULK_REACTIVATE, {
          customerIds: selectedCustomerIds,
        });
        setFeedback({
          type: 'success',
          message: res.message || `Successfully reactivated ${res.count || selectedCustomerIds.length} customer account(s).`,
        });
        setSelectedCustomerIds([]);
        refetch();
      },
    });
  };

  const handleBulkDeletePrompt = () => {
    const selectedObjs = selectedCustomerIds
      .map((id) => selectedCustomersMap[id] || customers.find((c) => c.id === id))
      .filter(Boolean);
    const names = selectedObjs.map((c) => c!.fullName);

    setMgmtModalState({
      isOpen: true,
      actionType: 'DELETE',
      title: 'Permanently Delete Selected Customers',
      description: `Permanently delete ${selectedCustomerIds.length} selected customer record(s) from the system.`,
      itemCount: selectedCustomerIds.length,
      itemNames: names.slice(0, 5),
      requireTypedConfirmation: true,
      warningMessage: 'CRITICAL SECURITY NOTICE: Customers with active loans, approved applications, or verified payment histories CANNOT be permanently deleted due to database foreign-key constraints. Safe records will be removed; linked financial records will be soft-deactivated instead.',
      onConfirm: async () => {
        const res = await apiClient.post(API_ENDPOINTS.CUSTOMERS.BULK_DELETE, {
          customerIds: selectedCustomerIds,
        });
        setFeedback({
          type: 'success',
          message: res.message || `Successfully processed bulk deletion of customer records.`,
        });
        setSelectedCustomerIds([]);
        refetch();
      },
    });
  };

  const openDeleteModalForCustomer = (customer: CustomerRecord) => {
    setMgmtModalState({
      isOpen: true,
      actionType: 'DELETE',
      title: `Delete Customer Record: ${customer.fullName}`,
      description: `Requesting permanent removal of customer profile and associated unlinked records for ${customer.fullName} (${customer.email}).`,
      itemCount: 1,
      itemNames: [`${customer.fullName} (${customer.email})`],
      requireTypedConfirmation: true,
      warningMessage: customer.latestLoan || customer.latestPayment
        ? 'NOTE: This customer has associated loan or payment records. Foreign key safety rules will block raw SQL deletion and archive/soft-deactivate the customer profile instead.'
        : 'This action is permanent and cannot be undone.',
      onConfirm: async () => {
        const res = await apiClient.delete(API_ENDPOINTS.CUSTOMERS.DELETE(customer.id));
        setFeedback({
          type: 'success',
          message: res.message || `Customer record processing completed.`,
        });
        refetch();
      },
    });
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

  // Export Filtered CSV
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
  const getStatusBadge = (c: CustomerRecord) => {
    if (c.accountStatus === 'DEACTIVATED' || c.status === 'DEACTIVATED' || c.isActive === false) {
      return (
        <Badge variant="destructive" className="bg-rose-50 text-rose-700 border-rose-200 font-bold text-[10px]">
          DEACTIVATED
        </Badge>
      );
    }

    const s = c.latestLoan?.status || c.kycStatus || c.accountStatus;
    switch (s?.toUpperCase()) {
      case 'APPROVED':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px]">Approved</Badge>;
      case 'UNDER_REVIEW':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-bold text-[10px]">In Review</Badge>;
      case 'PENDING':
      case 'PENDING_APPROVAL':
      case 'SUBMITTED':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-bold text-[10px]">Pending Approval</Badge>;
      case 'DISBURSED':
        return <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-bold text-[10px]">Disbursed</Badge>;
      case 'REUPLOAD_REQUIRED':
      case 'DOCUMENTS_REQUIRED':
        return <Badge className="bg-orange-50 text-orange-700 border-orange-200 font-bold text-[10px]">Docs Req</Badge>;
      case 'REJECTED':
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200 font-bold text-[10px]">Rejected</Badge>;
      case 'ACTIVE':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px]">Active</Badge>;
      default:
        return <Badge variant="secondary" className="font-semibold text-[10px]">{s || 'N/A'}</Badge>;
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

  // Selected customer objects & names for composers (resolved across all pages)
  const selectedCustomerObjects = selectedCustomerIds
    .map((id) => selectedCustomersMap[id] || customers.find((c) => c.id === id))
    .filter((c): c is CustomerRecord => Boolean(c));

  const selectedCustomerNames = selectedCustomerObjects.map((c) => c.fullName);

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] flex items-center space-x-2">
            <Users className="w-6 h-6 text-[#2563EB]" />
            <span>Borrower Directory & Customer Records</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] font-medium mt-0.5">
            Comprehensive registry of registered borrowers, verification states, credit applications, and communications.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            disabled={isExportingCsv}
            className="border-[#D6E4F5] bg-white text-[#0F172A] hover:bg-[#EFF6FF] text-xs h-8 font-semibold"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            {isExportingCsv ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border-[#D6E4F5] bg-white text-[#0F172A] hover:bg-[#EFF6FF] text-xs h-8 font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Inline Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between transition-all font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-500 hover:text-slate-800 font-bold ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Bulk Action Floating Bar */}
      <BulkActionBar
        selectedCount={selectedCustomerIds.length}
        totalCount={selectableCustomers.length}
        onClearSelection={() => setSelectedCustomerIds([])}
        onArchiveSelected={handleBulkDeactivatePrompt}
        archiveLabel="Deactivate Selected"
        onRestoreSelected={handleBulkReactivatePrompt}
        restoreLabel="Reactivate Selected"
        onDeleteSelected={handleBulkDeletePrompt}
        deleteLabel="Delete Selected"
      />

      {/* Main Container Card */}
      <Card className="bg-white border border-[#D6E4F5] shadow-xs">
        <CardHeader className="pb-3 border-b border-[#D6E4F5]">
          <div className="flex flex-col space-y-3">
            {/* Header & Status Filter Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle className="text-base font-bold text-[#0F172A]">
                  {isPendingSection
                    ? `Pending Approval Queue (${pagination.total})`
                    : status === 'ACTIVE'
                    ? `Active Borrowers (${pagination.total})`
                    : status === 'DEACTIVATED'
                    ? `Deactivated Borrowers (${pagination.total})`
                    : `All Registered Borrowers (${pagination.total})`}
                </CardTitle>

                {/* Status Filter Tabs */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs gap-1 border border-slate-200">
                  <button
                    onClick={() => {
                      setStatus('ALL');
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded-lg transition-colors font-semibold ${
                      status === 'ALL'
                        ? 'bg-white text-[#0F172A] shadow-xs font-bold'
                        : 'text-slate-600 hover:text-[#0F172A]'
                    }`}
                  >
                    All Borrowers
                  </button>
                  <button
                    onClick={() => {
                      setStatus('PENDING_APPROVAL');
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 font-semibold ${
                      status === 'PENDING_APPROVAL'
                        ? 'bg-amber-500 text-white shadow-xs font-bold'
                        : 'text-amber-700 hover:text-amber-900'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    Pending Approval
                  </button>
                  <button
                    onClick={() => {
                      setStatus('ACTIVE');
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded-lg transition-colors font-semibold ${
                      status === 'ACTIVE'
                        ? 'bg-emerald-600 text-white shadow-xs font-bold'
                        : 'text-emerald-700 hover:text-emerald-900'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => {
                      setStatus('DEACTIVATED');
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded-lg transition-colors font-semibold ${
                      status === 'DEACTIVATED'
                        ? 'bg-rose-600 text-white shadow-xs font-bold'
                        : 'text-rose-700 hover:text-rose-900'
                    }`}
                  >
                    Deactivated
                  </button>
                </div>

                {/* Quick Select All Matching Button */}
                {pagination.total > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSelectAllMatching}
                    disabled={isLoadingSelectAllMatching}
                    className="h-8 text-xs font-bold border-[#CBDDE9] bg-white hover:bg-[#EFF6FF] text-[#2563EB] shadow-xs flex items-center gap-1.5"
                  >
                    {isLoadingSelectAllMatching ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckSquare className="w-3.5 h-3.5" />
                    )}
                    {status === 'PENDING_APPROVAL'
                      ? `Select All Pending (${pagination.total})`
                      : `Select All Matching (${pagination.total})`}
                  </Button>
                )}
              </div>

              {/* Reset button if any filter applied */}
              {(search || status !== 'ALL' || stateFilter !== 'ALL' || domainFilter !== 'ALL' || datePreset !== 'ALL') && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleResetFilters}
                  className="text-xs h-7 text-[#64748B] hover:text-[#0F172A] font-semibold self-start sm:self-auto"
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
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#64748B]" />
                <Input
                  placeholder="Search customer, mobile, email..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs h-8 pl-8 w-full bg-white font-medium"
                />
              </div>

              {/* Date Filter Control with Presets */}
              <div className="flex items-center space-x-1.5">
                <select
                  aria-label="Filter by registration/application date"
                  value={datePreset}
                  onChange={(e) => handleDatePresetChange(e.target.value)}
                  className="text-xs h-8 px-2.5 w-full rounded-xl border border-[#CBDDE9] bg-white text-[#0F172A] font-semibold shadow-xs focus:ring-1 focus:ring-[#2563EB]"
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
                  className="text-xs h-8 px-2.5 w-full rounded-xl border border-[#CBDDE9] bg-white text-[#0F172A] font-semibold shadow-xs focus:ring-1 focus:ring-[#2563EB]"
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
                  className="text-xs h-8 px-2.5 w-full rounded-xl border border-[#CBDDE9] bg-white text-[#0F172A] font-semibold shadow-xs focus:ring-1 focus:ring-[#2563EB]"
                >
                  <option value="ALL">Status: All Statuses</option>
                  <option value="PENDING_APPROVAL">Pending Approval</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="DISBURSED">Disbursed</option>
                  <option value="ACTIVE">Active</option>
                  <option value="DEACTIVATED">Deactivated</option>
                </select>
              </div>
            </div>

            {/* Custom Date Range Picker Bar */}
            {datePreset === 'CUSTOM' && (
              <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs mt-1">
                <div className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                  <span className="text-slate-700 font-semibold">From:</span>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="h-7 px-2 text-xs border border-slate-300 rounded bg-white font-medium"
                  />
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-slate-700 font-semibold">To:</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="h-7 px-2 text-xs border border-slate-300 rounded bg-white font-medium"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleApplyCustomDates}
                  className="h-7 px-3 text-xs bg-[#2563EB] text-white hover:bg-[#1D4ED8] font-semibold"
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
                  className="h-7 px-2.5 text-xs text-slate-600 font-medium"
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        {/* Customer Table Container */}
        <CardContent className="p-0 overflow-x-auto">
          {/* Select All Matching Banner across pagination */}
          {selectedCustomerIds.length > 0 && pagination.total > selectableCustomers.length && (
            <div className="bg-[#EFF6FF] border-b border-[#BFDBFE] px-4 py-2.5 text-xs text-[#1E3A8A] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#2563EB]" />
                <span>
                  {selectedCustomerIds.length === pagination.total ? (
                    <>All <strong>{pagination.total}</strong> {status === 'PENDING_APPROVAL' ? 'pending' : 'matching'} customers across all pages are currently selected.</>
                  ) : (
                    <>
                      <strong>{selectedCustomerIds.length}</strong> customer{selectedCustomerIds.length > 1 ? 's' : ''} on this page selected.{' '}
                      Would you like to select all <strong>{pagination.total}</strong> {status === 'PENDING_APPROVAL' ? 'pending' : 'matching'} customers?
                    </>
                  )}
                </span>
              </div>
              {selectedCustomerIds.length !== pagination.total && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSelectAllMatching}
                  disabled={isLoadingSelectAllMatching}
                  className="h-7 text-xs bg-white text-[#2563EB] border-[#93C5FD] hover:bg-[#DBEAFE] font-bold shadow-xs flex items-center gap-1.5"
                >
                  {isLoadingSelectAllMatching ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckSquare className="w-3.5 h-3.5" />
                  )}
                  {status === 'PENDING_APPROVAL'
                    ? `Select All Pending (${pagination.total})`
                    : `Select All Matching (${pagination.total})`}
                </Button>
              )}
            </div>
          )}

          <table className="w-full text-left text-xs text-[#334155]">
            <thead className="bg-[#F7FAFF] text-[#334155] font-bold uppercase tracking-wider text-[11px] border-b border-[#D6E4F5]">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    disabled={selectableCustomers.length === 0}
                    title="Select All on this page"
                    className="w-4 h-4 rounded border-[#CBDDE9] text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4 font-bold">Customer Name</th>
                <th className="py-3 px-4 font-bold">Mobile</th>
                <th className="py-3 px-4 font-bold">Loan / App ID</th>
                <th className="py-3 px-4 font-bold">Location</th>
                <th className="py-3 px-4 font-bold">Loan Type & Amount</th>
                <th className="py-3 px-4 font-bold">Application Date</th>
                <th className="py-3 px-4 font-bold">Pending Since</th>
                <th className="py-3 px-4 font-bold">Current Status</th>
                <th className="py-3 px-4 font-bold">WhatsApp</th>
                <th className="py-3 px-4 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D6E4F5]/70">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={11} className="py-3.5 px-4 h-11 bg-slate-50" />
                  </tr>
                ))
              ) : customers.length > 0 ? (
                customers.map((c) => {
                  const hasLoan = Boolean(c.latestLoan?.id);
                  const isLoanApproved = c.latestLoan?.status === 'APPROVED';
                  const hasPayment = Boolean(c.latestPayment);
                  const isDeactivated = c.accountStatus === 'DEACTIVATED' || c.status === 'DEACTIVATED' || c.isActive === false;
                  const isSelected = selectedCustomerIds.includes(c.id);

                  return (
                    <tr
                      key={c.id}
                      className={`transition-colors duration-150 ${
                        isSelected
                          ? 'bg-[#EFF6FF]'
                          : isDeactivated
                          ? 'bg-rose-50/40 opacity-80 hover:bg-rose-50/70'
                          : 'hover:bg-[#F7FAFF]'
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isDeactivated}
                          onChange={() => handleToggleCustomerRow(c)}
                          title={isDeactivated ? 'Deactivated accounts cannot be selected' : `Select ${c.fullName}`}
                          className={`w-4 h-4 rounded border-[#CBDDE9] text-[#2563EB] focus:ring-[#2563EB] ${
                            isDeactivated ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
                          }`}
                        />
                      </td>

                      {/* Customer Name */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <Link
                            to={`/admin/customers/${c.id}`}
                            className="font-bold text-[#0F172A] hover:text-[#2563EB] hover:underline"
                          >
                            {c.fullName}
                          </Link>
                          <span className="text-[11px] text-[#64748B] font-medium">{c.email}</span>
                        </div>
                      </td>

                      {/* Mobile */}
                      <td className="py-3 px-4 font-mono font-semibold text-[#0F172A] whitespace-nowrap">
                        +91 {c.mobile}
                      </td>

                      {/* Loan / Application ID */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {c.latestLoan?.applicationNumber ? (
                          <Link
                            to={`/admin/loans/${c.latestLoan.id}`}
                            className="font-mono font-bold text-[#2563EB] hover:underline"
                          >
                            {c.latestLoan.applicationNumber}
                          </Link>
                        ) : (
                          <span className="text-[#64748B] font-mono text-[11px]">N/A</span>
                        )}
                      </td>

                      {/* Location (State & City) */}
                      <td className="py-3 px-4 text-[#334155] font-medium whitespace-nowrap">
                        {c.city ? `${c.city}, ` : ''}{c.state || 'N/A'}
                      </td>

                      {/* Loan Type & Requested Amount */}
                      <td className="py-3 px-4">
                        {c.latestLoan ? (
                          <div>
                            <span className="text-[#0F172A] font-bold block">
                              ₹{c.latestLoan.requestedAmount.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[11px] text-[#64748B] font-medium">
                              {c.latestLoan.loanType}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-[#0F172A] font-semibold block">
                              ₹{c.monthlyIncome.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[11px] text-[#64748B] font-medium">Reported Income</span>
                          </div>
                        )}
                      </td>

                      {/* Application Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-[#334155] font-medium">
                        {c.latestLoan?.submittedAt ? (
                          new Date(c.latestLoan.submittedAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        ) : (
                          <span className="text-[#64748B] text-[11px]">
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
                          <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-[11px] border border-amber-200">
                            {new Date(c.pendingSince).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </span>
                        ) : (
                          <span className="text-[#64748B] text-[11px] font-medium">—</span>
                        )}
                      </td>

                      {/* Current Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(c)}
                      </td>

                      {/* WhatsApp Status Indicator */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getWhatsAppBadge(c)}
                      </td>

                      {/* Contextual Actions Menu */}
                      <td className="py-3 px-4 text-right whitespace-nowrap relative">
                        <div className="flex items-center justify-end space-x-1">
                          <Link to={`/admin/customers/${c.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2 text-[#0F172A] hover:text-[#2563EB] font-semibold"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              360 View
                            </Button>
                          </Link>

                          {/* 3-Dot More Options Dropdown */}
                          <div className="relative inline-block text-left">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setOpenActionMenuId(openActionMenuId === c.id ? null : c.id)
                              }
                              className="h-7 w-7 p-0 border-[#D6E4F5]"
                              title="More Customer Actions"
                            >
                              <MoreVertical className="w-3.5 h-3.5 text-[#64748B]" />
                            </Button>

                            {/* Dropdown Popup */}
                            {openActionMenuId === c.id && (
                              <div
                                ref={actionMenuRef}
                                className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-[#D6E4F5] z-30 py-1.5 text-left animate-in fade-in zoom-in-95"
                              >
                                <div className="px-3 py-1 border-b border-slate-100 text-[10px] uppercase font-bold text-[#64748B]">
                                  Actions: {c.fullName}
                                </div>

                                <Link
                                  to={`/admin/customers/${c.id}`}
                                  className="w-full text-left px-3 py-1.5 text-xs text-[#0F172A] hover:bg-[#EFF6FF] flex items-center gap-2 font-medium"
                                  onClick={() => setOpenActionMenuId(null)}
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-[#2563EB]" />
                                  View Customer (360°)
                                </Link>

                                {hasLoan && (
                                  <Link
                                    to={`/admin/loans/${c.latestLoan!.id}`}
                                    className="w-full text-left px-3 py-1.5 text-xs text-[#0F172A] hover:bg-[#EFF6FF] flex items-center gap-2 font-medium"
                                    onClick={() => setOpenActionMenuId(null)}
                                  >
                                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                                    View Loan Application
                                  </Link>
                                )}

                                {!isDeactivated && (
                                  <button
                                    type="button"
                                    onClick={() => openWhatsAppModal(c)}
                                    className="w-full text-left px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 font-semibold"
                                  >
                                    <Send className="w-3.5 h-3.5 text-emerald-600" />
                                    Send WhatsApp
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => openWhatsAppHistory(c)}
                                  className="w-full text-left px-3 py-1.5 text-xs text-[#334155] hover:bg-slate-50 flex items-center gap-2 font-medium"
                                >
                                  <History className="w-3.5 h-3.5 text-[#64748B]" />
                                  WhatsApp History
                                </button>

                                {isLoanApproved && (
                                  <button
                                    type="button"
                                    disabled={downloadingDocId === c.id}
                                    onClick={() => handleDownloadApprovalLetter(c)}
                                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                                  >
                                    <FileSignature className="w-3.5 h-3.5 text-blue-600" />
                                    {downloadingDocId === c.id ? 'Generating...' : 'Sanction Letter'}
                                  </button>
                                )}

                                {hasPayment && (
                                  <button
                                    type="button"
                                    disabled={downloadingDocId === c.id}
                                    onClick={() => handleDownloadInvoice(c)}
                                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                                  >
                                    <Download className="w-3.5 h-3.5 text-purple-600" />
                                    {downloadingDocId === c.id ? 'Generating...' : 'Tax Invoice'}
                                  </button>
                                )}

                                <div className="border-t border-slate-100 my-1" />

                                {/* Deactivate / Reactivate Account Option */}
                                {isDeactivated ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCustomerToReactivate(c);
                                      setOpenActionMenuId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 font-semibold"
                                  >
                                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    Reactivate Account
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCustomerToDeactivate(c);
                                      setOpenActionMenuId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 flex items-center gap-2 font-semibold"
                                  >
                                    <Ban className="w-3.5 h-3.5 text-red-600" />
                                    Deactivate Account
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    openDeleteModalForCustomer(c);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 flex items-center gap-2 font-semibold border-t border-slate-100 mt-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                  Delete Record
                                </button>
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
                  <td colSpan={11} className="py-10 text-center text-[#64748B] font-medium">
                    <Filter className="w-8 h-8 mx-auto mb-2 text-[#64748B]" />
                    No borrower records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-3 border-t border-[#D6E4F5] flex items-center justify-between text-xs text-[#64748B] font-semibold">
            <span>
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} borrowers)
            </span>
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="h-7 px-2.5 font-semibold"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="h-7 px-2.5 font-semibold"
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── STICKY BULK SELECTION ACTION BAR ── */}
      {selectedCustomerIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 bg-[#0F172A] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-[#334155] animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-xs font-bold">
              {selectedCustomerIds.length}
            </span>
            <span className="text-xs font-bold text-slate-200">
              {selectedCustomerIds.length === 1 ? '1 Customer Selected' : `${selectedCustomerIds.length} Customers Selected`}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <Button
            size="sm"
            onClick={() => setIsBulkWhatsAppOpen(true)}
            className="h-8 px-3.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-xs"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Send WhatsApp
          </Button>

          <Button
            size="sm"
            onClick={() => setIsBulkEmailOpen(true)}
            className="h-8 px-3.5 text-xs bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold flex items-center gap-1.5 shadow-xs"
          >
            <Mail className="w-3.5 h-3.5" />
            Send Email
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedCustomerIds([])}
            className="h-8 px-2 text-xs text-slate-400 hover:text-white font-semibold"
          >
            Clear Selection
          </Button>
        </div>
      )}

      {/* ── INLINE BULK WHATSAPP COMPOSER MODAL ── */}
      <Dialog open={isBulkWhatsAppOpen} onOpenChange={setIsBulkWhatsAppOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0F172A]">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              Compose Bulk WhatsApp Message
            </DialogTitle>
            <DialogDescription className="text-xs text-[#64748B]">
              Dispatch custom personalized WhatsApp messages to selected customers via configured WA Bridge Server-to-Server Gateway.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1 text-xs">
            {/* Selected Recipients Chips */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0F172A]">
                  Selected Recipients ({selectedCustomerIds.length})
                </span>
                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Active & Verified Mobile
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                {selectedCustomerNames.map((name, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white border border-slate-200 text-[#0F172A] shadow-2xs"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>

            {/* Variable Insertion Chips */}
            <div>
              <label className="font-bold text-[#0F172A] block mb-1.5">
                Available Dynamic Variables (Click to Insert):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['{{customerName}}', '{{applicationId}}', '{{loanAmount}}', '{{loanStatus}}', '{{companyName}}'].map(
                  (tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setBulkWhatsAppMessage((prev) => `${prev} ${tag}`)}
                      className="px-2.5 py-1 text-[11px] font-mono font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#D6E4F5] rounded-lg hover:bg-[#2563EB] hover:text-white transition-colors"
                    >
                      {tag}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Message Body Input */}
            <div>
              <label className="font-bold text-[#0F172A] block mb-1">
                Message Content:
              </label>
              <textarea
                rows={6}
                value={bulkWhatsAppMessage}
                onChange={(e) => setBulkWhatsAppMessage(e.target.value)}
                placeholder="Type personalized message body here..."
                className="w-full p-3 rounded-xl border border-[#CBDDE9] bg-white text-xs text-[#0F172A] font-medium focus:ring-2 focus:ring-[#2563EB] focus:border-transparent leading-relaxed"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkWhatsAppOpen(false)}
              disabled={isSendingBulkWhatsApp}
              className="font-semibold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSendBulkWhatsApp}
              disabled={isSendingBulkWhatsApp || !bulkWhatsAppMessage.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {isSendingBulkWhatsApp ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Dispatching to {selectedCustomerIds.length} Customers...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Send WhatsApp ({selectedCustomerIds.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── INLINE BULK EMAIL COMPOSER MODAL ── */}
      <Dialog open={isBulkEmailOpen} onOpenChange={setIsBulkEmailOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0F172A]">
              <Mail className="w-5 h-5 text-[#2563EB]" />
              Compose Bulk Email Message
            </DialogTitle>
            <DialogDescription className="text-xs text-[#64748B]">
              Dispatch custom emails to selected customers via the active SMTP configuration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1 text-xs">
            {/* Selected Recipients Chips */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0F172A]">
                  Selected Recipients ({selectedCustomerIds.length})
                </span>
                <span className="text-[11px] text-[#2563EB] font-semibold bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#D6E4F5]">
                  Active Customer Accounts
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                {selectedCustomerNames.map((name, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white border border-slate-200 text-[#0F172A] shadow-2xs"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>

            {/* Email Subject */}
            <div>
              <label className="font-bold text-[#0F172A] block mb-1">
                Email Subject:
              </label>
              <Input
                value={bulkEmailSubject}
                onChange={(e) => setBulkEmailSubject(e.target.value)}
                placeholder="Enter email subject line..."
                className="text-xs font-semibold h-9"
              />
            </div>

            {/* Variable Helper Tags */}
            <div>
              <label className="font-bold text-[#0F172A] block mb-1.5">
                Available Dynamic Variables (Click to Insert):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['{{customerName}}', '{{applicationId}}', '{{loanAmount}}', '{{loanStatus}}', '{{companyName}}'].map(
                  (tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setBulkEmailMessage((prev) => `${prev} ${tag}`)}
                      className="px-2.5 py-1 text-[11px] font-mono font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#D6E4F5] rounded-lg hover:bg-[#2563EB] hover:text-white transition-colors"
                    >
                      {tag}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Message Body */}
            <div>
              <label className="font-bold text-[#0F172A] block mb-1">
                Message Body:
              </label>
              <textarea
                rows={6}
                value={bulkEmailMessage}
                onChange={(e) => setBulkEmailMessage(e.target.value)}
                placeholder="Type personalized email message body..."
                className="w-full p-3 rounded-xl border border-[#CBDDE9] bg-white text-xs text-[#0F172A] font-medium focus:ring-2 focus:ring-[#2563EB] focus:border-transparent leading-relaxed"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkEmailOpen(false)}
              disabled={isSendingBulkEmail}
              className="font-semibold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSendBulkEmail}
              disabled={isSendingBulkEmail || !bulkEmailSubject.trim() || !bulkEmailMessage.trim()}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold"
            >
              {isSendingBulkEmail ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Dispatching Emails...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Send Email ({selectedCustomerIds.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CAMPAIGN RESULTS SUMMARY MODAL ── */}
      <Dialog
        open={Boolean(campaignResult)}
        onOpenChange={(open) => {
          if (!open) {
            setCampaignResult(null);
            setSelectedCustomerIds([]);
            setSelectedCustomersMap({});
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0F172A]">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              {campaignResult?.type} Dispatch Summary
            </DialogTitle>
            <DialogDescription className="text-xs text-[#64748B]">
              Per-recipient delivery report from the authoritative communication provider.
            </DialogDescription>
          </DialogHeader>

          {campaignResult && (
            <div className="space-y-4 py-1 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-[11px] text-[#64748B] font-bold block uppercase">Total</span>
                  <span className="text-lg font-bold text-[#0F172A]">{campaignResult.total}</span>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <span className="text-[11px] text-emerald-800 font-bold block uppercase">Sent</span>
                  <span className="text-lg font-bold text-emerald-700">{campaignResult.sentCount}</span>
                </div>
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-center">
                  <span className="text-[11px] text-red-800 font-bold block uppercase">Failed</span>
                  <span className="text-lg font-bold text-red-700">{campaignResult.failedCount}</span>
                </div>
              </div>

              {/* Per-recipient breakdown list */}
              <div className="max-h-60 overflow-y-auto space-y-2">
                {campaignResult.results.map((r, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-[#0F172A]">
                        {r.customerName || r.recipient || r.customerId}
                      </span>
                      {r.phone && <span className="text-[11px] font-mono text-[#64748B]">{r.phone}</span>}
                      {r.error && <span className="text-[11px] text-red-600 font-medium">{r.error}</span>}
                    </div>
                    <div>
                      {r.status === 'SENT' || r.success ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px]">
                          SENT
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200 font-bold text-[10px]">
                          FAILED
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              size="sm"
              onClick={() => {
                setCampaignResult(null);
                setSelectedCustomerIds([]);
                setSelectedCustomersMap({});
              }}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold"
            >
              Close Summary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DEACTIVATE ACCOUNT CONFIRMATION MODAL ── */}
      <Dialog
        open={Boolean(customerToDeactivate)}
        onOpenChange={(open) => {
          if (!open) {
            setCustomerToDeactivate(null);
            setDeactivateReason('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md border-red-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700 font-bold">
              <Ban className="w-5 h-5 text-red-600" />
              Deactivate Customer Account?
            </DialogTitle>
            <DialogDescription className="text-xs text-[#475569]">
              This is a soft-deactivation. The customer will be blocked from logging in. All historical loan, KYC, payment, and audit records will remain preserved.
            </DialogDescription>
          </DialogHeader>

          {customerToDeactivate && (
            <div className="space-y-3 py-1 text-xs">
              <div className="p-3.5 rounded-xl bg-red-50/60 border border-red-200 space-y-1.5 text-slate-800 font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-600">Customer Name:</span>
                  <span className="font-bold text-slate-900">{customerToDeactivate.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Customer ID:</span>
                  <span className="font-mono text-slate-800">{customerToDeactivate.id.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Registered Mobile:</span>
                  <span className="font-mono font-bold text-slate-900">+91 {customerToDeactivate.mobile}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Email Address:</span>
                  <span className="text-slate-900 font-semibold">{customerToDeactivate.email}</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Reason for Deactivation (Optional):
                </label>
                <Input
                  value={deactivateReason}
                  onChange={(e) => setDeactivateReason(e.target.value)}
                  placeholder="e.g. Administrative request, compliance flag, suspicious activity"
                  className="text-xs font-medium"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCustomerToDeactivate(null);
                setDeactivateReason('');
              }}
              disabled={isDeactivating}
              className="font-semibold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeactivateCustomer}
              disabled={isDeactivating}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {isDeactivating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Deactivating...
                </>
              ) : (
                'Deactivate Account'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── REACTIVATE ACCOUNT CONFIRMATION MODAL ── */}
      <Dialog
        open={Boolean(customerToReactivate)}
        onOpenChange={(open) => {
          if (!open) setCustomerToReactivate(null);
        }}
      >
        <DialogContent className="sm:max-w-md border-emerald-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-800 font-bold">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              Reactivate Customer Account?
            </DialogTitle>
            <DialogDescription className="text-xs text-[#475569]">
              This will restore login access for this customer. All existing records remain intact.
            </DialogDescription>
          </DialogHeader>

          {customerToReactivate && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1.5 text-xs text-slate-800 font-medium">
              <div className="flex justify-between">
                <span className="text-slate-600">Customer:</span>
                <span className="font-bold text-slate-900">{customerToReactivate.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Mobile:</span>
                <span className="font-mono font-bold text-slate-900">+91 {customerToReactivate.mobile}</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCustomerToReactivate(null)}
              disabled={isReactivating}
              className="font-semibold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleReactivateCustomer}
              disabled={isReactivating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {isReactivating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Reactivating...
                </>
              ) : (
                'Reactivate Account'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Customer WhatsApp Modal */}
      <Dialog
        open={Boolean(selectedCustomerForWhatsApp)}
        onOpenChange={(open) => {
          if (!open) setSelectedCustomerForWhatsApp(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 font-bold">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              Send WhatsApp Update
            </DialogTitle>
            <DialogDescription className="text-xs text-[#64748B]">
              Send verified application status notification directly to the borrower's registered WhatsApp number.
            </DialogDescription>
          </DialogHeader>

          {selectedCustomerForWhatsApp && (
            <div className="space-y-4 text-xs py-1">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 font-medium">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Borrower:</span>
                  <span className="font-bold text-[#0F172A]">{selectedCustomerForWhatsApp.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">WhatsApp Mobile:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    +91 {selectedCustomerForWhatsApp.mobile}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Application Ref:</span>
                  <span className="font-mono text-[#0F172A] font-semibold">
                    {selectedCustomerForWhatsApp.latestLoan?.applicationNumber || 'In Progress'}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#0F172A] block mb-1">
                  Message Content:
                </label>
                <textarea
                  rows={5}
                  value={whatsAppMessageText}
                  onChange={(e) => setWhatsAppMessageText(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#CBDDE9] text-xs text-[#0F172A] font-medium focus:ring-1 focus:ring-emerald-500 font-sans leading-relaxed"
                  placeholder="Type message content..."
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCustomerForWhatsApp(null)}
              disabled={isSendingWhatsApp}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSendWhatsApp}
              disabled={isSendingWhatsApp}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
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

      {/* WhatsApp Message History Modal */}
      <Dialog
        open={Boolean(selectedCustomerForHistory)}
        onOpenChange={(open) => {
          if (!open) setSelectedCustomerForHistory(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 font-bold">
              <History className="w-5 h-5 text-emerald-600" />
              WhatsApp Communication History
            </DialogTitle>
            <DialogDescription className="text-xs text-[#64748B]">
              Audit log of WhatsApp notifications dispatched to{' '}
              <strong className="text-slate-800">{selectedCustomerForHistory?.fullName}</strong> (
              +91 {selectedCustomerForHistory?.mobile}).
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-80 overflow-y-auto space-y-3 py-1 text-xs">
            {isLoadingHistory ? (
              <div className="p-6 text-center text-[#64748B]">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                Loading dispatch logs...
              </div>
            ) : historyRecords.length > 0 ? (
              historyRecords.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2 font-medium"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {item.status === 'SENT' ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px]">SENT</Badge>
                      ) : item.status === 'DELIVERED' ? (
                        <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-bold text-[10px]">DELIVERED</Badge>
                      ) : (
                        <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200 font-bold text-[10px]">FAILED</Badge>
                      )}
                      <span className="text-[#64748B] text-[11px]">•</span>
                      <span className="text-[#64748B] text-[11px] font-mono">
                        {new Date(item.sentAt || item.createdAt).toLocaleString('en-IN')}
                      </span>
                    </div>
                    {item.admin && (
                      <span className="text-[11px] text-[#64748B]">
                        By: <strong className="text-[#0F172A]">{item.admin.fullName}</strong>
                      </span>
                    )}
                  </div>

                  <p className="text-[#0F172A] bg-white p-2.5 rounded-lg border border-slate-100 whitespace-pre-wrap font-sans text-xs">
                    {item.message}
                  </p>

                  {item.failureReason && (
                    <div className="text-[11px] text-red-600 bg-red-50 p-1.5 rounded-lg border border-red-200">
                      Reason: {item.failureReason}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-[#64748B]">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-[#64748B]" />
                No WhatsApp messages have been sent to this borrower yet.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCustomerForHistory(null)}
              className="text-xs font-semibold"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Safe Data Management System Confirmation Modal */}
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
