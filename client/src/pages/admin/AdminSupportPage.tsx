import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { adminService } from '@/services/adminService';
import {
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Mail,
  Send,
  History,
  FileText,
  Settings as SettingsIcon,
  Smartphone,
  Check,
  Eye,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CustomerItem {
  customerId: string;
  customerName: string;
  email: string;
  mobile: string;
  state: string;
  city: string;
  applicationId: string;
  loanId: string;
  loanStatus: string;
  kycStatus: string;
  paymentStatus: string;
  lastUpdated: string;
}

interface CommHistoryItem {
  id: string;
  channel?: string;
  customerId: string;
  customerName: string;
  recipient: string;
  recipientEmail?: string;
  mobile?: string;
  applicationNumber: string;
  subject?: string;
  message: string;
  templateName?: string;
  status: string;
  failureReason?: string;
  sentAt?: string;
  createdAt: string;
}

const BUILTIN_TEMPLATES = [
  {
    id: 'KYC_PENDING',
    name: 'KYC Pending',
    category: 'KYC',
    subject: 'Action Required: Complete Your KYC Verification - {{companyName}}',
    body: 'Dear {{customerName}}, your loan application {{applicationId}} is pending KYC verification. Please upload your PAN and Aadhaar documents on the portal to proceed.',
  },
  {
    id: 'KYC_VERIFIED',
    name: 'KYC Verified',
    category: 'KYC',
    subject: 'KYC Verification Successful - {{applicationId}}',
    body: 'Dear {{customerName}}, your KYC documents for loan application {{applicationId}} have been verified. Your application is now in underwriting review.',
  },
  {
    id: 'KYC_REJECTED',
    name: 'KYC Rejected',
    category: 'KYC',
    subject: 'Action Required: KYC Verification Update - {{applicationId}}',
    body: 'Dear {{customerName}}, your KYC document upload could not be verified. Please log into your portal to view remarks and submit valid clear document copies.',
  },
  {
    id: 'PAYMENT_SUCCESSFUL',
    name: 'Payment Successful',
    category: 'Payment',
    subject: 'Payment Verified & Official Invoice Generated - {{applicationId}}',
    body: 'Dear {{customerName}}, we have received and verified your payment of ₹{{amount}} for {{chargeType}} (UTR: {{utr}}). Your GST tax invoice is ready for download.',
  },
  {
    id: 'PAYMENT_PENDING',
    name: 'Payment Pending',
    category: 'Payment',
    subject: 'Payment Due for Loan Application {{applicationId}}',
    body: 'Dear {{customerName}}, an approved charge of ₹{{amount}} for {{chargeType}} is pending for application {{applicationId}}. Please complete payment via UPI on your dashboard.',
  },
  {
    id: 'LOAN_UNDER_REVIEW',
    name: 'Loan Under Review',
    category: 'Loan',
    subject: 'Underwriting Review in Progress - {{applicationId}}',
    body: 'Dear {{customerName}}, your loan application {{applicationId}} for ₹{{amount}} is under comprehensive credit assessment. We will update you shortly.',
  },
  {
    id: 'LOAN_APPROVED',
    name: 'Loan Approved',
    category: 'Loan',
    subject: 'Congratulations! Your Loan Application {{applicationId}} is Sanctioned',
    body: 'Dear {{customerName}}, we are pleased to inform you that your loan application {{applicationId}} has been approved for ₹{{amount}}. Download your Sanction Letter on the portal.',
  },
  {
    id: 'LOAN_REJECTED',
    name: 'Loan Rejected',
    category: 'Loan',
    subject: 'Update Regarding Your Loan Application {{applicationId}}',
    body: 'Dear {{customerName}}, after careful credit evaluation of application {{applicationId}}, we regret that we are unable to sanction your loan request at this time.',
  },
  {
    id: 'SPECIFIC_CHARGE',
    name: 'Specific Charge',
    category: 'Charge',
    subject: 'Charge Notice: {{chargeType}} Due for Application {{applicationId}}',
    body: 'Dear {{customerName}}, an administrative fee of ₹{{amount}} has been billed for {{chargeType}}. Please review the invoice and complete UPI payment.',
  },
  {
    id: 'INVOICE_AVAILABLE',
    name: 'Invoice Available',
    category: 'Billing',
    subject: 'Tax Invoice Available - {{applicationId}}',
    body: 'Dear {{customerName}}, your GST Tax Invoice for the verified fee payment is available. You can download the PDF copy from your customer dashboard.',
  },
  {
    id: 'GENERAL_UPDATE',
    name: 'General Update',
    category: 'General',
    subject: 'Important Update on Your Account - {{companyName}}',
    body: 'Dear {{customerName}}, this is an update regarding your account with {{companyName}}. Please log in to your borrower portal to review your status.',
  },
];

export const AdminSupportPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') || 'whatsapp') as
    | 'whatsapp'
    | 'email'
    | 'history'
    | 'templates'
    | 'settings';

  const [activeTab, setActiveTab] = useState(currentTab);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && ['whatsapp', 'email', 'history', 'templates', 'settings'].includes(t)) {
      setActiveTab(t as any);
    }
  }, [searchParams]);

  const setTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Customers Queue State
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Composer State
  const [selectedTemplateId, setSelectedTemplateId] = useState('LOAN_UNDER_REVIEW');
  const [customSubject, setCustomSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // History State
  const [historyItems, setHistoryItems] = useState<CommHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyChannelFilter, setHistoryChannelFilter] = useState('ALL');

  // Feedback Alert
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showAlert = (type: 'success' | 'error', text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 5000);
  };

  // Load Customers
  const loadCustomers = useCallback(async () => {
    setIsLoadingCustomers(true);
    try {
      const res = await adminService.getCommunicationCustomers({
        search: customerSearch.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      const data = res.data?.data || res.data || [];
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showAlert('error', err?.message || 'Failed to load customers');
    } finally {
      setIsLoadingCustomers(false);
    }
  }, [customerSearch, statusFilter]);

  // Load History
  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await adminService.getCommunicationHistory({
        channel: historyChannelFilter !== 'ALL' ? historyChannelFilter : undefined,
      });
      const list = res.data || res || [];
      setHistoryItems(Array.isArray(list) ? list : []);
    } catch (err: any) {
      console.error('History load error:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [historyChannelFilter]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  // Template change handler
  useEffect(() => {
    const t = BUILTIN_TEMPLATES.find((x) => x.id === selectedTemplateId);
    if (t) {
      setCustomSubject(t.subject);
      setCustomMessage(t.body);
    }
  }, [selectedTemplateId]);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    if (selectedIds.length === customers.length && customers.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(customers.map((c) => c.customerId));
    }
  };

  // Live Preview Interpolation
  const sampleCustomer = useMemo(() => {
    if (selectedIds.length > 0) {
      return customers.find((c) => selectedIds.includes(c.customerId)) || customers[0];
    }
    return customers[0] || {
      customerName: 'Rahul Sharma',
      applicationId: 'LA-2026-9081',
      mobile: '9876543210',
      email: 'rahul.sharma@example.com',
      loanStatus: 'APPROVED',
      amount: 250000,
      chargeType: 'Processing Fee',
      utr: 'UTR9876123450',
    };
  }, [selectedIds, customers]);

  const resolvedPreview = useMemo(() => {
    const vars: Record<string, string> = {
      customerName: sampleCustomer?.customerName || 'Rahul Sharma',
      applicationId: sampleCustomer?.applicationId || 'LA-2026-9081',
      mobile: sampleCustomer?.mobile || '9876543210',
      email: sampleCustomer?.email || 'customer@example.com',
      amount: '1,250',
      chargeType: 'Processing Fee',
      utr: 'UTR7829104829',
      companyName: 'Loan Approve FinTech',
    };

    const replaceVars = (text: string) =>
      text.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (_, k) => vars[k] || `[${k}]`);

    return {
      subject: replaceVars(customSubject),
      body: replaceVars(customMessage),
    };
  }, [customSubject, customMessage, sampleCustomer]);

  // Send WhatsApp Action
  const handleSendWhatsApp = async () => {
    if (selectedIds.length === 0) {
      showAlert('error', 'Please select at least one customer.');
      return;
    }
    if (!customMessage.trim()) {
      showAlert('error', 'Message body is required.');
      return;
    }

    setIsSending(true);
    try {
      const res = await adminService.sendBulkWhatsApp({
        customerIds: selectedIds,
        message: customMessage.trim(),
        templateId: selectedTemplateId,
      });
      if (res.success === false) {
        showAlert('error', res.message || 'WhatsApp delivery failed. Check provider credentials in Settings.');
      } else {
        showAlert('success', res.message || `Dispatched WhatsApp messages to ${selectedIds.length} customer(s).`);
        setSelectedIds([]);
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'WhatsApp dispatch failed. Check provider credentials in Settings.');
    } finally {
      setIsSending(false);
    }
  };

  // Send Email Action
  const handleSendEmail = async () => {
    if (selectedIds.length === 0) {
      showAlert('error', 'Please select at least one customer.');
      return;
    }
    if (!customSubject.trim() || !customMessage.trim()) {
      showAlert('error', 'Both subject and message body are required.');
      return;
    }

    setIsSending(true);
    try {
      const res = await adminService.sendCustomerEmail({
        customerIds: selectedIds,
        subject: customSubject.trim(),
        message: customMessage.trim(),
        templateId: selectedTemplateId,
      });
      if (res.success === false) {
        showAlert('error', res.message || 'Email delivery failed. Verify SMTP connection in Settings.');
      } else {
        showAlert('success', res.message || `Dispatched email to ${selectedIds.length} recipient(s).`);
        setSelectedIds([]);
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Email dispatch failed. Verify SMTP connection in Settings.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-xs text-text-secondary">
        <Link to="/admin/dashboard" className="hover:text-text-primary transition-colors">Dashboard</Link>
        <span>›</span>
        <span className="text-text-primary font-semibold">Communication Center</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            <span>Communication Center</span>
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Filter-first omnichannel dispatch for borrower notifications, WhatsApp messages, and official emails.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              loadCustomers();
              if (activeTab === 'history') loadHistory();
            }}
            disabled={isLoadingCustomers}
            className="bg-surface-elevated border-border text-text-primary hover:bg-surface-elevated hover:brightness-110 text-xs h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoadingCustomers ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alertMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between shadow-sm animate-in fade-in ${
            alertMsg.type === 'success'
              ? 'bg-success/10 border-success/30 text-success'
              : 'bg-danger/10 border-danger/30 text-danger'
          }`}
        >
          <div className="flex items-center space-x-2">
            {alertMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{alertMsg.text}</span>
          </div>
          <button onClick={() => setAlertMsg(null)} className="text-text-secondary hover:text-text-primary">
            ✕
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto text-xs font-semibold">
        {[
          { id: 'whatsapp', label: 'WhatsApp', icon: Smartphone },
          { id: 'email', label: 'Customer Email', icon: Mail },
          { id: 'history', label: 'History', icon: History },
          { id: 'templates', label: 'Templates', icon: FileText },
          { id: 'settings', label: 'Settings', icon: SettingsIcon },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-primary text-text-primary shadow-md shadow-primary/20'
                  : 'bg-surface-elevated text-text-secondary hover:text-text-primary hover:bg-surface-elevated hover:brightness-110'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB 1 & 2: WHATSAPP OR CUSTOMER EMAIL (Filter-first Architecture) ──────── */}
      {(activeTab === 'whatsapp' || activeTab === 'email') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Customer Filter & Selection (7 cols) */}
          <Card className="lg:col-span-7 bg-surface-elevated border border-border shadow-sm flex flex-col">
            <div className="p-4 border-b border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-text-primary">
                    Step 1: Filter & Select Borrowers
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Selected: <strong className="text-success">{selectedIds.length}</strong> of {customers.length}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSelectAllFiltered}
                  className="bg-surface border-border text-text-primary hover:bg-surface-elevated hover:brightness-110 text-xs h-7.5"
                >
                  {selectedIds.length === customers.length && customers.length > 0 ? 'Deselect All' : 'Select All Filtered'}
                </Button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <Input
                    placeholder="Search name, phone, loan ID..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="bg-surface border-border text-text-primary pl-8 h-8 rounded-lg text-xs"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 bg-surface border border-border rounded-lg text-text-primary h-8 text-xs focus:outline-none focus:border-primary"
                >
                  <option value="ALL">All Application Statuses</option>
                  <option value="KYC_PENDING">KYC Pending</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="PAYMENT_PENDING">Payment Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>

            {/* Customers List */}
            <div className="overflow-y-auto max-h-[460px] divide-y divide-[#1D3047]/60">
              {isLoadingCustomers ? (
                <div className="p-8 text-center text-xs text-text-secondary">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
                  Filtering borrower list...
                </div>
              ) : customers.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-secondary">
                  No customers found matching filter.
                </div>
              ) : (
                customers.map((c) => {
                  const isSelected = selectedIds.includes(c.customerId);
                  return (
                    <div
                      key={c.customerId}
                      onClick={() => handleToggleSelect(c.customerId)}
                      className={`p-3 flex items-center justify-between hover:bg-surface-elevated hover:brightness-110/50 cursor-pointer transition-colors text-xs ${
                        isSelected ? 'bg-surface-elevated hover:brightness-110/70' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <button
                          type="button"
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                            isSelected
                              ? 'bg-primary border-primary text-text-primary'
                              : 'border-[#8FA3BA]/50 text-transparent'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <div className="truncate">
                          <p className="font-semibold text-text-primary truncate">{c.customerName}</p>
                          <p className="text-[11px] text-text-secondary font-mono">
                            {c.mobile} · {c.email}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-3">
                        <span className="font-mono text-[11px] text-success block">
                          {c.applicationId !== '—' ? c.applicationId : 'No App'}
                        </span>
                        <span className="text-[10px] text-text-secondary">{c.state || 'India'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Right: Template & Dispatch Composer (5 cols) */}
          <Card className="lg:col-span-5 bg-surface-elevated border border-border shadow-sm flex flex-col">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-bold text-text-primary">
                Step 2: Template & Message Preview
              </h3>
              <p className="text-xs text-text-secondary">
                Channel: <strong className="text-primary uppercase">{activeTab}</strong>
              </p>
            </div>

            <CardContent className="p-4 space-y-4 flex-1 flex flex-col">
              {/* Template Selector */}
              <div>
                <Label className="text-xs font-semibold text-text-secondary">Select Standard Template *</Label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-xs focus:outline-none focus:border-primary"
                >
                  {BUILTIN_TEMPLATES.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      [{tmpl.category}] {tmpl.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Email Subject (if email tab) */}
              {activeTab === 'email' && (
                <div>
                  <Label className="text-xs font-semibold text-text-secondary">Email Subject *</Label>
                  <Input
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    className="bg-surface border-border text-text-primary text-xs mt-1"
                  />
                </div>
              )}

              {/* Message Body */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs font-semibold text-text-secondary">Message Body *</Label>
                  <span className="text-[10px] text-text-secondary">Variables enabled</span>
                </div>
                <textarea
                  rows={5}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full p-2.5 bg-surface border border-border rounded-lg text-text-primary text-xs font-mono focus:outline-none focus:border-primary resize-none"
                />
              </div>

              {/* Live Preview Box */}
              <div className="p-3 bg-surface border border-border rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-text-secondary border-b border-border/60 pb-1.5">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-success" />
                    Live Borrower Preview
                  </span>
                  <span className="text-primary">{sampleCustomer?.customerName}</span>
                </div>
                {activeTab === 'email' && (
                  <p className="text-[11px] font-semibold text-text-primary">
                    Subject: {resolvedPreview.subject}
                  </p>
                )}
                <p className="text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap font-sans">
                  {resolvedPreview.body}
                </p>
              </div>

              {/* Dispatch Action Button */}
              <div className="pt-2">
                {activeTab === 'whatsapp' ? (
                  <Button
                    onClick={handleSendWhatsApp}
                    disabled={isSending || selectedIds.length === 0}
                    className="w-full h-10 bg-success hover:bg-success/90 text-[#07111F] font-bold text-xs rounded-lg flex items-center justify-center gap-2 shadow-md shadow-[#22C7A9]/20"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>Send WhatsApp ({selectedIds.length} recipients)</span>
                  </Button>
                ) : (
                  <Button
                    onClick={handleSendEmail}
                    disabled={isSending || selectedIds.length === 0}
                    className="w-full h-10 bg-primary hover:bg-primary/90 text-text-primary font-bold text-xs rounded-lg flex items-center justify-center gap-2 shadow-md shadow-primary/20"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    <span>Send Email ({selectedIds.length} recipients)</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB 3: HISTORY ────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <Card className="bg-surface-elevated border border-border shadow-sm">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-text-primary">Dispatched Communication Log</h3>
              <p className="text-xs text-text-secondary">Complete audit log of outbound emails and WhatsApp alerts</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={historyChannelFilter}
                onChange={(e) => setHistoryChannelFilter(e.target.value)}
                className="px-3 bg-surface border border-border rounded-lg text-text-primary text-xs h-8"
              >
                <option value="ALL">All Channels</option>
                <option value="EMAIL">Email Only</option>
                <option value="WHATSAPP">WhatsApp Only</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-text-secondary">
              <thead className="bg-surface text-text-secondary uppercase tracking-wider text-[10px] font-bold border-b border-border">
                <tr>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Borrower</th>
                  <th className="px-4 py-3">Destination</th>
                  <th className="px-4 py-3">Template / Subject</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Dispatched At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1D3047]/60">
                {isLoadingHistory ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-text-secondary">
                      Loading history log...
                    </td>
                  </tr>
                ) : historyItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-text-secondary">
                      No dispatched communications found.
                    </td>
                  </tr>
                ) : (
                  historyItems.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-elevated hover:brightness-110/50">
                      <td className="px-4 py-3">
                        <span className="font-bold text-primary">
                          {item.channel || (item.recipientEmail ? 'EMAIL' : 'WHATSAPP')}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-text-primary">
                        {item.customerName || 'Customer'}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {item.recipient || item.recipientEmail || item.mobile || '—'}
                      </td>
                      <td className="px-4 py-3 text-text-primary max-w-xs truncate">
                        {item.templateName || item.subject || 'Standard Notification'}
                      </td>
                      <td className="px-4 py-3">
                        {item.status === 'SENT' || item.status === 'DELIVERED' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {item.status}
                          </span>
                        ) : item.failureReason?.includes('Development') || item.failureReason?.includes('Not Sent') ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200" title={item.failureReason}>
                            DEV TEST
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200" title={item.failureReason || 'Failed'}>
                            {item.status || 'FAILED'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString('en-IN') : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── TAB 4: TEMPLATES ──────────────────────────────────────────────── */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {BUILTIN_TEMPLATES.map((tmpl) => (
            <Card key={tmpl.id} className="bg-surface-elevated border border-border shadow-sm flex flex-col">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-text-primary">{tmpl.name}</h4>
                  <span className="text-[10px] text-primary font-semibold">{tmpl.category}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedTemplateId(tmpl.id);
                    setTab('whatsapp');
                  }}
                  className="h-7 text-xs text-success hover:bg-surface-elevated"
                >
                  Use Template
                </Button>
              </div>
              <CardContent className="p-4 space-y-2 flex-1 flex flex-col justify-between text-xs">
                <div>
                  <p className="text-[11px] font-semibold text-text-secondary">Subject:</p>
                  <p className="text-text-primary font-mono text-[11px] truncate mb-2">{tmpl.subject}</p>
                  <p className="text-[11px] font-semibold text-text-secondary">Content:</p>
                  <p className="text-text-secondary text-[11px] line-clamp-3 leading-relaxed">{tmpl.body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── TAB 5: SETTINGS ───────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Email Settings Box */}
          <Card className="bg-surface-elevated border border-border shadow-sm p-5 space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-border">
              <div className="p-2 bg-primary/10 text-primary rounded-lg border border-primary/20">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">SMTP Email Gateway</h3>
                <p className="text-xs text-text-secondary">Configure host, port, credentials & test connection</p>
              </div>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Manage authoritative SMTP credentials for sanction letters, loan approval agreements, and billing invoices.
            </p>
            <Link to="/admin/settings/email">
              <Button className="w-full bg-primary hover:bg-primary/90 text-text-primary font-bold text-xs h-9">
                Configure SMTP Gateway
              </Button>
            </Link>
          </Card>

          {/* WhatsApp Settings Box */}
          <Card className="bg-surface-elevated border border-border shadow-sm p-5 space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-border">
              <div className="p-2 bg-success/10 text-success rounded-lg border border-success/20">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">WhatsApp Business Cloud API</h3>
                <p className="text-xs text-text-secondary">Configure Meta access token, phone ID & templates</p>
              </div>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Manage Meta Cloud API integration token, Webhook verify tokens, and test message dispatch.
            </p>
            <Link to="/admin/settings/whatsapp">
              <Button className="w-full bg-success hover:bg-success/90 text-[#07111F] font-bold text-xs h-9">
                Configure WhatsApp Provider
              </Button>
            </Link>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminSupportPage;
