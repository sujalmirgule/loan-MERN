import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  QrCode,
  Landmark,
  ExternalLink,
  Lock,
  Download,
  Eye,
  Loader2,
  Clock,
  ArrowRight,
  Sparkles,
  Receipt,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

import { useBranding } from '@/contexts/BrandingContext';
import { useBrandTitle } from '@/hooks/useBrandTitle';
import { normalizeChargeName } from './CustomerHome';

interface PaymentOptionsData {
  feeAmount: number;
  feeType: string;
  paymentMethods?: {
    upi: boolean;
    bankTransfer: boolean;
    merchantVpa: boolean;
  };
  upi: {
    enabled: boolean;
    primaryUpiId: string;
    merchantName?: string;
    apps: Array<{ name: string; id: string }>;
    qrCodeUrl?: string;
    merchantVpa?: {
      enabled: boolean;
      vpa: string;
    };
  };
  bank: {
    enabled: boolean;
    accountHolder: string;
    accountNumber: string;
    bankName: string;
    ifsc: string;
    branch: string;
  };
  paymentLinks: Array<{ id: string; title: string; url: string; description?: string }>;
}

export const CustomerPaymentPage: React.FC = () => {
  const { branding } = useBranding();
  useBrandTitle('Charges & Payments');
  const { loanId } = useParams<{ loanId?: string }>();
  const queryClient = useQueryClient();

  const [selectedMethod, setSelectedMethod] = useState<'UPI' | 'QR' | 'MERCHANT_VPA' | 'BANK' | 'LINK'>('UPI');
  const [utrNumber, setUtrNumber] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUtrModal, setShowUtrModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [searchParams] = useSearchParams();
  const chargeIdParam = searchParams.get('chargeId');
  const [selectedChargeId, setSelectedChargeId] = useState<string | null>(chargeIdParam);

  // Per-charge download states
  const [downloadingChargeId, setDownloadingChargeId] = useState<string | null>(null);
  const [downloadErrorChargeId, setDownloadErrorChargeId] = useState<string | null>(null);

  // Invoice Preview State
  const [invoicePreviewOpen, setInvoicePreviewOpen] = useState(false);
  const [invoicePreviewUrl, setInvoicePreviewUrl] = useState<string | null>(null);
  const [invoicePreviewTitle, setInvoicePreviewTitle] = useState('');
  const [invoicePreviewLoading, setInvoicePreviewLoading] = useState(false);

  // Fetch active payment options
  const { data: options } = useQuery<PaymentOptionsData>({
    queryKey: ['activePaymentOptions'],
    queryFn: async () => {
      const res = await apiClient.get(API_ENDPOINTS.ACTIVE_PAYMENT_OPTIONS);
      return res.data?.data || res.data;
    },
    refetchInterval: 1500,
  });

  // Calculate active payment rails
  const upiActive = Boolean(options?.paymentMethods?.upi ?? options?.upi?.enabled ?? true);
  const bankActive = Boolean(options?.paymentMethods?.bankTransfer ?? options?.bank?.enabled ?? true);
  const merchantVpaActive = Boolean(options?.paymentMethods?.merchantVpa ?? options?.upi?.merchantVpa?.enabled ?? false);
  const linksActive = Boolean(options?.paymentLinks && options.paymentLinks.length > 0);
  const hasAnyPaymentMethod = upiActive || bankActive || merchantVpaActive || linksActive;

  // Auto-select first available payment method when options change
  useEffect(() => {
    if (options) {
      const isUpi = options.paymentMethods?.upi ?? options.upi?.enabled ?? true;
      const isVpa = options.paymentMethods?.merchantVpa ?? options.upi?.merchantVpa?.enabled ?? false;
      const isBank = options.paymentMethods?.bankTransfer ?? options.bank?.enabled ?? true;
      const isLink = Boolean(options.paymentLinks && options.paymentLinks.length > 0);

      if ((selectedMethod === 'UPI' || selectedMethod === 'QR') && !isUpi) {
        if (isVpa) setSelectedMethod('MERCHANT_VPA');
        else if (isBank) setSelectedMethod('BANK');
        else if (isLink) setSelectedMethod('LINK');
      } else if (selectedMethod === 'MERCHANT_VPA' && !isVpa) {
        if (isUpi) setSelectedMethod('UPI');
        else if (isBank) setSelectedMethod('BANK');
        else if (isLink) setSelectedMethod('LINK');
      } else if (selectedMethod === 'BANK' && !isBank) {
        if (isUpi) setSelectedMethod('UPI');
        else if (isVpa) setSelectedMethod('MERCHANT_VPA');
        else if (isLink) setSelectedMethod('LINK');
      } else if (selectedMethod === 'LINK' && !isLink) {
        if (isUpi) setSelectedMethod('UPI');
        else if (isVpa) setSelectedMethod('MERCHANT_VPA');
        else if (isBank) setSelectedMethod('BANK');
      }
    }
  }, [options, selectedMethod]);

  // Fetch customer profile to check KYC status
  const { data: customerProfile } = useQuery({
    queryKey: ['customerProfileForPayments'],
    queryFn: async () => {
      try {
        const res = await apiClient.get(API_ENDPOINTS.CUSTOMERS.PROFILE);
        return res.data?.data?.profile || res.data?.profile || res.data;
      } catch {
        return null;
      }
    },
    refetchInterval: 1500,
  });

  const kycStatus = customerProfile?.kycStatus;
  const isKycApproved = kycStatus === 'APPROVED' || kycStatus === 'VERIFIED';
  const isPreKyc = !isKycApproved;

  // Fetch loan payment status if loanId is present
  const { data: paymentReq, refetch: refetchPayment } = useQuery({
    queryKey: ['paymentReq', loanId],
    queryFn: async () => {
      if (!loanId || loanId === 'undefined') return null;
      const res = await apiClient.get(API_ENDPOINTS.PAYMENTS.CUSTOMER_REQUIREMENT(loanId));
      return res.data?.data || res.data;
    },
    refetchInterval: 1500,
  });

  // Fetch specific customer charges for this application/customer
  const { data: customerCharges = [], refetch: refetchCharges } = useQuery({
    queryKey: ['customerChargesList', loanId],
    queryFn: async () => {
      const res = await apiClient.get(
        loanId && loanId !== 'undefined'
          ? API_ENDPOINTS.CUSTOMER_CHARGES.BY_APPLICATION(loanId)
          : API_ENDPOINTS.CUSTOMER_CHARGES.LIST
      );
      return res.data?.data || res.data || [];
    },
    refetchInterval: 1500,
  });

  useEffect(() => {
    if (chargeIdParam) {
      setSelectedChargeId(chargeIdParam);
    }
  }, [chargeIdParam]);

  const pendingCharges = customerCharges.filter((c: any) => c.status === 'PENDING' || c.status === 'UNDER_VERIFICATION');
  const paidCharges = customerCharges.filter((c: any) => c.status === 'PAID');

  // If no charge is currently selected, pick the first pending charge
  useEffect(() => {
    if (!selectedChargeId && pendingCharges.length > 0) {
      const firstPending = pendingCharges.find((c: any) => !c.transactionRef) || pendingCharges[0];
      if (firstPending) {
        setSelectedChargeId(firstPending.id);
      }
    }
  }, [pendingCharges, selectedChargeId]);

  const activeSpecificCharge = customerCharges.find((c: any) => c.id === selectedChargeId) || pendingCharges[0];

  const fee = activeSpecificCharge
    ? activeSpecificCharge.amount
    : (options?.feeAmount && !isPreKyc ? options.feeAmount : 0);
  const rawFeeName = activeSpecificCharge ? activeSpecificCharge.name : '';
  const feeName = normalizeChargeName(rawFeeName);

  const pendingChargesCount = pendingCharges.length;
  const paidChargesCount = paidCharges.length;
  const totalPendingAmount = pendingCharges.reduce((acc: number, c: any) => acc + c.amount, 0);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleViewInvoice = async (chg: any) => {
    const displayName = normalizeChargeName(chg.name);
    try {
      setInvoicePreviewLoading(true);
      setInvoicePreviewTitle(`${displayName} Invoice`);
      setInvoicePreviewOpen(true);
      const res = await apiClient.get(
        API_ENDPOINTS.CUSTOMER_CHARGES.INVOICE(chg.id, false),
        { responseType: 'blob' }
      );
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      setInvoicePreviewUrl(url);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to preview invoice PDF.');
      setInvoicePreviewOpen(false);
    } finally {
      setInvoicePreviewLoading(false);
    }
  };

  const handleDownloadInvoice = async (chg: any) => {
    const displayName = normalizeChargeName(chg.name);
    try {
      setDownloadingChargeId(chg.id);
      setDownloadErrorChargeId(null);
      setErrorMsg(null);
      const res = await apiClient.get(
        API_ENDPOINTS.CUSTOMER_CHARGES.INVOICE(chg.id, true),
        { responseType: 'blob' }
      );
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${displayName.replace(/\s+/g, '_')}_${chg.id.slice(0, 6)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setDownloadErrorChargeId(chg.id);
      setErrorMsg(err.response?.data?.message || 'Unable to download invoice');
    } finally {
      setDownloadingChargeId(null);
    }
  };

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrNumber.trim()) {
      setErrorMsg('Please enter a valid 12-digit UTR or transaction reference number.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (selectedChargeId && activeSpecificCharge) {
        await apiClient.post(API_ENDPOINTS.CUSTOMER_CHARGES.SUBMIT_UTR(selectedChargeId), {
          utr: utrNumber.trim(),
          paymentMethod: selectedMethod,
          notes: `Customer settlement for ${activeSpecificCharge.name} via ${selectedMethod}`,
        });
        refetchCharges();
      } else {
        const targetLoanId = loanId || paymentReq?.loanId || 'LN20260906142729';
        await apiClient.post(API_ENDPOINTS.PAYMENTS.SUBMIT_UTR(targetLoanId), {
          utr: utrNumber.trim(),
          paymentMethod: selectedMethod,
          notes: `Customer fee settlement via ${selectedMethod}`,
        });
        refetchPayment();
      }

      setSuccessMsg('Payment reference submitted successfully! Your charge is now Under Verification.');
      setShowUtrModal(false);
      setUtrNumber('');
      queryClient.invalidateQueries({ queryKey: ['customer-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['customerChargesList'] });
      queryClient.invalidateQueries({ queryKey: ['customer-invoices'] });
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit payment UTR');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12 text-[#0F172A]">
      {/* ── TOP HERO BANNER ────────────────────────────────────────────── */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#D6E4F5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#EFF6FF] text-[#2563EB] border border-[#D6E4F5]">
              Charges & Payments
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2A5F] tracking-tight">
            Fee Settlements & Tax Invoices
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 leading-relaxed max-w-2xl">
            Review authorized application charges, complete secure fee settlements, and download official, immutable PDF tax invoices.
          </p>
        </div>

        {/* Financial Summary Box */}
        <div className="flex items-center gap-4 shrink-0 bg-[#F7FAFF] p-4 rounded-2xl border border-[#D6E4F5]">
          <div className="text-right">
            <span className="text-[10px] text-[#64748B] uppercase tracking-wider block font-bold">
              Outstanding Charges
            </span>
            <span className="text-xl font-black text-[#0F172A] font-mono">
              ₹{totalPendingAmount.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="h-9 w-px bg-[#D6E4F5]" />
          <div className="text-right">
            <span className="text-[10px] text-[#16A34A] uppercase tracking-wider block font-bold">
              Verified Invoices
            </span>
            <span className="text-xl font-black text-[#16A34A] font-mono">
              {paidChargesCount} Paid
            </span>
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start space-x-2.5 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
          <span className="font-semibold leading-relaxed">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-[#DC2626] flex items-start space-x-2.5 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
          <span className="font-semibold leading-relaxed">{errorMsg}</span>
        </div>
      )}

      {/* ── SECTION: CHARGES & PAYMENTS ───────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#0F2A5F] flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#2563EB]" />
              <span>Assigned Application Charges</span>
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Each charge is processed independently with its own authoritative receipt and tax invoice.
            </p>
          </div>
          <Badge className="bg-[#EFF6FF] text-[#2563EB] border border-[#D6E4F5] text-xs font-bold px-3 py-1">
            {customerCharges.length > 0 ? `${customerCharges.length} Charges Total` : 'No Active Charges'}
          </Badge>
        </div>

        {/* STAGE-AWARE EMPTY STATE: When no charges are currently active for the customer */}
        {customerCharges.length === 0 ? (
          <Card className="bg-white border-[#D6E4F5] rounded-3xl shadow-xs overflow-hidden p-8 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
              {!isKycApproved ? (
                <ShieldCheck className="w-8 h-8" />
              ) : (
                <Receipt className="w-8 h-8" />
              )}
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-lg font-extrabold text-[#0F2A5F]">
                {!isKycApproved ? 'No Payment Required Currently' : 'No payment is currently required.'}
              </h3>
              <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                {!isKycApproved
                  ? 'Payments will appear here when a charge becomes active. Please complete your KYC verification first.'
                  : 'Payments will appear here when a charge becomes active.'}
              </p>
            </div>
            {!isKycApproved && (
              <div className="pt-2">
                <Link to="/customer/kyc">
                  <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs h-10 px-6 rounded-xl shadow-xs inline-flex items-center gap-2">
                    <span>Complete KYC</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        ) : (
          /* List of customer charges: Active + Paid sections */
          <div className="space-y-6">
            {/* 1. CURRENT PAYMENT */}
            {pendingCharges.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold text-[#0F2A5F] uppercase tracking-wider">
                    CURRENT PAYMENT
                  </h3>
                </div>
                {pendingCharges.map((chg: any) => {
                  const isSelected = selectedChargeId === chg.id;
                  const hasSubmittedUtr = Boolean(chg.transactionRef);
                  const displayName = normalizeChargeName(chg.name);

                  return (
                    <div
                      key={chg.id}
                      className={`p-5 sm:p-6 rounded-2xl border transition-all bg-white shadow-xs ${
                        isSelected
                          ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20 shadow-md'
                          : 'border-[#D6E4F5] hover:border-[#CBDDE9]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <span className="text-base font-bold text-[#0F172A]">{displayName}</span>
                            {isSelected && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#D6E4F5]">
                                Selected for Settlement
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#64748B]">
                            {chg.remark || 'Official Application Processing Fee'}
                          </p>
                        </div>

                        <div className="flex items-center sm:text-right justify-between sm:justify-end gap-3">
                          <span className="text-xl font-black text-[#0F172A] font-mono">
                            ₹{chg.amount.toLocaleString('en-IN')}
                          </span>

                          {hasSubmittedUtr ? (
                            <Badge className="bg-blue-50 text-[#2563EB] border border-blue-200 text-xs font-bold px-2.5 py-1">
                              <Clock className="w-3.5 h-3.5 mr-1 text-[#2563EB]" /> Pending Verification
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-50 text-[#F59E0B] border border-amber-200 text-xs font-bold px-2.5 py-1">
                              <AlertCircle className="w-3.5 h-3.5 mr-1 text-[#F59E0B]" /> Payment Required
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3.5 border-t border-[#D6E4F5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="text-[11px] text-[#64748B] flex items-center gap-2">
                          {chg.dueDate ? (
                            <span>Due Date: <strong>{new Date(chg.dueDate).toLocaleDateString('en-IN')}</strong></span>
                          ) : (
                            <span>Settlement: <strong>Immediate settlement required</strong></span>
                          )}
                          {chg.transactionRef && (
                            <>
                              <span>•</span>
                              <span className="font-mono">UTR: <strong>{chg.transactionRef}</strong></span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {!hasSubmittedUtr ? (
                            <Button
                              size="sm"
                              onClick={async () => {
                                setSelectedChargeId(chg.id);
                                try {
                                  await apiClient.post('/customer/payments/upi', {
                                    chargeId: chg.id,
                                    loanId: chg.loanId || undefined,
                                  });
                                } catch {
                                  // Ignore if already initiated
                                }
                                setShowUtrModal(true);
                              }}
                              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs h-9 px-4 font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                            >
                              <span>Pay Now</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                          ) : (
                            <span className="text-xs text-[#2563EB] font-semibold bg-[#EFF6FF] px-3 py-1.5 rounded-xl border border-[#D6E4F5]">
                              Payment reference under underwriting verification
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* STAGE 3 CALLOUT: KYC Charge Paid, Loan Documents Pending Upload */}
            {pendingCharges.length === 0 && paidCharges.length > 0 && !customerCharges.some((c: any) => c.name.toLowerCase().includes('processing')) && (
              <Card className="bg-[#F0FDF4] border-emerald-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#16A34A] flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-emerald-950">Your KYC verification is complete!</h3>
                    <p className="text-xs text-emerald-800 mt-1">
                      Please upload your loan application documents (PAN Card, etc.) to proceed with processing.
                    </p>
                  </div>
                </div>
                <Link to="/customer/documents">
                  <Button className="bg-[#16A34A] hover:bg-emerald-700 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-xs shrink-0 flex items-center gap-1.5">
                    <span>Upload Loan Documents</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </Card>
            )}

            {/* STAGE 5 CALLOUT: All Charges Settled */}
            {pendingCharges.length === 0 && paidCharges.length > 0 && customerCharges.some((c: any) => c.name.toLowerCase().includes('processing')) && (
              <Card className="bg-[#F0FDF4] border-emerald-200 rounded-3xl p-6 text-center space-y-2">
                <div className="inline-flex p-3 rounded-full bg-emerald-100 text-[#16A34A] mb-1">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-emerald-950">All Application Charges Settled</h3>
                <p className="text-xs text-emerald-800 max-w-lg mx-auto">
                  All required application fees have been settled and verified. Your loan application is now queued for underwriting appraisal and sanction.
                </p>
              </Card>
            )}

            {/* 2. PAID CHARGES & TAX INVOICES */}
            {paidCharges.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold text-[#0F2A5F] uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                    <span>PAID PAYMENTS ({paidCharges.length})</span>
                  </h3>
                  <span className="text-xs text-[#64748B]">1 Charge = 1 Verified Invoice</span>
                </div>
                {paidCharges.map((chg: any) => {
                  const displayName = normalizeChargeName(chg.name);

                  return (
                    <div
                      key={chg.id}
                      className="p-5 sm:p-6 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <span className="text-base font-bold text-[#0F172A]">{displayName}</span>
                            <Badge className="bg-emerald-50 text-[#16A34A] border border-emerald-200 text-xs font-bold px-2.5 py-0.5">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-[#16A34A]" /> Paid ✓
                            </Badge>
                          </div>
                          <p className="text-xs text-[#64748B]">
                            {chg.remark || 'Application Fee'}
                          </p>
                        </div>

                        <div className="flex items-center sm:text-right justify-between sm:justify-end gap-3">
                          <span className="text-xl font-black text-[#0F172A] font-mono">
                            ₹{chg.amount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3.5 border-t border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="text-[11px] text-[#64748B] flex items-center gap-2">
                          <span>Settled: <strong>{new Date(chg.paidAt || chg.updatedAt).toLocaleDateString('en-IN')}</strong></span>
                          {chg.transactionRef && (
                            <>
                              <span>•</span>
                              <span className="font-mono">UTR: <strong>{chg.transactionRef}</strong></span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewInvoice(chg)}
                            className="border-[#D6E4F5] bg-white text-[#0F172A] hover:bg-[#F7FAFF] text-xs h-9 px-3 rounded-xl font-semibold shadow-xs"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 text-[#2563EB]" /> View Invoice
                          </Button>

                          {downloadErrorChargeId === chg.id ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-[#DC2626] font-medium">Unable to download invoice</span>
                              <Button
                                size="sm"
                                onClick={() => handleDownloadInvoice(chg)}
                                className="bg-red-50 text-[#DC2626] hover:bg-red-100 text-xs h-9 px-2.5 rounded-xl border border-red-200"
                              >
                                Try Again
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              disabled={downloadingChargeId === chg.id}
                              onClick={() => handleDownloadInvoice(chg)}
                              className="bg-[#16A34A] hover:bg-emerald-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-xs flex items-center gap-1.5 transition"
                            >
                              {downloadingChargeId === chg.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Downloading...</span>
                                </>
                              ) : (
                                <>
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Download Invoice PDF</span>
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SECTION: CHOOSE PAYMENT METHOD (WHEN PENDING CHARGE ACTIVE) ─── */}
      {(((activeSpecificCharge && pendingChargesCount > 0 && !activeSpecificCharge.transactionRef)) || (!customerProfile?.kycStatus && options?.feeAmount && pendingChargesCount === 0 && customerCharges.length === 0)) && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#0F2A5F]">
                Choose Payment Method
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Amount payable: <strong className="text-[#0F172A] font-mono">₹{fee.toLocaleString('en-IN')}</strong> ({feeName}). Choose your preferred rail to complete transfer.
              </p>
            </div>
            <span className="text-xs font-bold text-[#2563EB] bg-[#EFF6FF] px-3 py-1 rounded-full border border-[#D6E4F5]">
              Live Banking Rail
            </span>
          </div>

          {!hasAnyPaymentMethod ? (
            <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
              <div className="font-bold flex items-center space-x-2 text-sm">
                <AlertCircle className="w-4 h-4 text-[#F59E0B] shrink-0" />
                <span>Payment Methods Temporarily Unavailable</span>
              </div>
              <p className="text-[#64748B]">
                Online payment rails are currently disabled or undergoing maintenance. Please contact customer support to proceed with your fee settlement.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 1. UPI Intent & QR Rail */}
              {upiActive && (
                <div
                  onClick={() => setSelectedMethod('UPI')}
                  className={`p-5 sm:p-6 rounded-2xl border cursor-pointer transition-all bg-white shadow-xs ${
                    selectedMethod === 'UPI' || selectedMethod === 'QR'
                      ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20 shadow-md'
                      : 'border-[#D6E4F5] hover:border-[#CBDDE9]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3.5">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                          selectedMethod === 'UPI' || selectedMethod === 'QR'
                            ? 'bg-[#2563EB] text-white border-[#2563EB]'
                            : 'border-[#D6E4F5]'
                        }`}
                      >
                        {(selectedMethod === 'UPI' || selectedMethod === 'QR') && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#0F172A] flex items-center space-x-2">
                          <span>UPI</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] font-bold border border-[#D6E4F5]">
                            Recommended
                          </span>
                        </div>
                        <div className="text-xs text-[#64748B] mt-0.5">Pay using any UPI app or QR Code</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-[#F7FAFF] border border-[#D6E4F5] text-[#2563EB]">GPay</span>
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-[#F7FAFF] border border-[#D6E4F5] text-[#0F172A]">PhonePe</span>
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-[#F7FAFF] border border-[#D6E4F5] text-[#0F172A]">Paytm</span>
                    </div>
                  </div>

                  {(selectedMethod === 'UPI' || selectedMethod === 'QR') && (
                    <div className="mt-4 pt-4 border-t border-[#D6E4F5] space-y-4 text-xs">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7FAFF] border border-[#D6E4F5]">
                        <span className="text-[#64748B] font-medium">Authoritative UPI ID:</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(options?.upi.primaryUpiId || 'pay@bank', 'upi');
                          }}
                          className="flex items-center space-x-1.5 text-[#2563EB] font-mono font-bold hover:underline"
                        >
                          <span>{options?.upi.primaryUpiId || 'pay@bank'}</span>
                          {copied === 'upi' ? <Check className="w-4 h-4 text-[#16A34A]" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* QR Code */}
                      <div className="text-center space-y-2 pt-2">
                        <div className="w-44 h-44 mx-auto p-3 rounded-2xl bg-white flex items-center justify-center shadow-md border border-[#D6E4F5]">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=upi://pay?pa=${options?.upi.primaryUpiId || 'pay@bank'}&am=${fee}&pn=${encodeURIComponent(branding.appName)}`}
                            alt="Scan UPI QR"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <p className="text-[11px] text-[#64748B]">
                          Scan using any UPI app to transfer exactly <strong>₹{fee.toLocaleString('en-IN')}</strong>, then submit your 12-digit UTR below.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 2. Merchant VPA */}
              {merchantVpaActive && (
                <div
                  onClick={() => setSelectedMethod('MERCHANT_VPA')}
                  className={`p-5 sm:p-6 rounded-2xl border cursor-pointer transition-all bg-white shadow-xs ${
                    selectedMethod === 'MERCHANT_VPA'
                      ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20 shadow-md'
                      : 'border-[#D6E4F5] hover:border-[#CBDDE9]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3.5">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                          selectedMethod === 'MERCHANT_VPA'
                            ? 'bg-[#2563EB] text-white border-[#2563EB]'
                            : 'border-[#D6E4F5]'
                        }`}
                      >
                        {selectedMethod === 'MERCHANT_VPA' && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#0F172A] flex items-center space-x-2">
                          <QrCode className="w-4 h-4 text-[#2563EB]" />
                          <span>Merchant UPI ID / VPA</span>
                        </div>
                        <div className="text-xs text-[#64748B] mt-0.5">Direct verified transfer to Merchant Virtual Private Address</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#16A34A] border border-emerald-200">
                      Merchant Rail
                    </span>
                  </div>

                  {selectedMethod === 'MERCHANT_VPA' && (
                    <div className="mt-4 pt-4 border-t border-[#D6E4F5] space-y-2 text-xs">
                      <div className="flex justify-between items-center text-[#64748B]">
                        <span>Merchant Name:</span>
                        <span className="font-bold text-[#0F172A]">{options?.upi.merchantName || branding.appName}</span>
                      </div>
                      <div className="flex justify-between items-center text-[#64748B]">
                        <span>Merchant VPA:</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const vpa = options?.upi.merchantVpa?.vpa || options?.upi.primaryUpiId || 'merchant@bank';
                            copyToClipboard(vpa, 'merchantVpa');
                          }}
                          className="flex items-center space-x-1.5 text-[#2563EB] font-mono font-bold hover:underline"
                        >
                          <span>{options?.upi.merchantVpa?.vpa || options?.upi.primaryUpiId || 'merchant@bank'}</span>
                          {copied === 'merchantVpa' ? <Check className="w-4 h-4 text-[#16A34A]" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Bank Transfer */}
              {bankActive && (
                <div
                  onClick={() => setSelectedMethod('BANK')}
                  className={`p-5 sm:p-6 rounded-2xl border cursor-pointer transition-all bg-white shadow-xs ${
                    selectedMethod === 'BANK'
                      ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20 shadow-md'
                      : 'border-[#D6E4F5] hover:border-[#CBDDE9]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3.5">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                          selectedMethod === 'BANK'
                            ? 'bg-[#2563EB] text-white border-[#2563EB]'
                            : 'border-[#D6E4F5]'
                        }`}
                      >
                        {selectedMethod === 'BANK' && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#0F172A] flex items-center space-x-2">
                          <Landmark className="w-4 h-4 text-[#2563EB]" />
                          <span>Bank Account / Bank Transfer</span>
                        </div>
                        <div className="text-xs text-[#64748B] mt-0.5">Wire transfer directly into official corporate account</div>
                      </div>
                    </div>
                  </div>

                  {selectedMethod === 'BANK' && options?.bank && (
                    <div className="mt-4 pt-4 border-t border-[#D6E4F5] space-y-2.5 text-xs">
                      <div className="flex justify-between items-center text-[#64748B]">
                        <span>Bank Name:</span>
                        <span className="font-bold text-[#0F172A]">{options.bank.bankName}</span>
                      </div>
                      <div className="flex justify-between items-center text-[#64748B]">
                        <span>Account Holder:</span>
                        <span className="font-bold text-[#0F172A]">{options.bank.accountHolder}</span>
                      </div>
                      <div className="flex justify-between items-center text-[#64748B]">
                        <span>Account Number:</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(options.bank.accountNumber, 'acc');
                          }}
                          className="flex items-center space-x-1.5 text-[#2563EB] font-mono font-bold hover:underline"
                        >
                          <span>{options.bank.accountNumber}</span>
                          {copied === 'acc' ? <Check className="w-4 h-4 text-[#16A34A]" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="flex justify-between items-center text-[#64748B]">
                        <span>IFSC Code:</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(options.bank.ifsc, 'ifsc');
                          }}
                          className="flex items-center space-x-1.5 text-[#2563EB] font-mono font-bold hover:underline"
                        >
                          <span>{options.bank.ifsc}</span>
                          {copied === 'ifsc' ? <Check className="w-4 h-4 text-[#16A34A]" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 4. Payment Link */}
              {linksActive && (
                <div
                  onClick={() => setSelectedMethod('LINK')}
                  className={`p-5 sm:p-6 rounded-2xl border cursor-pointer transition-all bg-white shadow-xs ${
                    selectedMethod === 'LINK'
                      ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20 shadow-md'
                      : 'border-[#D6E4F5] hover:border-[#CBDDE9]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3.5">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                          selectedMethod === 'LINK'
                            ? 'bg-[#2563EB] text-white border-[#2563EB]'
                            : 'border-[#D6E4F5]'
                        }`}
                      >
                        {selectedMethod === 'LINK' && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#0F172A] flex items-center space-x-2">
                          <ExternalLink className="w-4 h-4 text-[#2563EB]" />
                          <span>Official Payment Gateway Link</span>
                        </div>
                        <div className="text-xs text-[#64748B] mt-0.5">Pay via debit/credit card or netbanking portal</div>
                      </div>
                    </div>
                  </div>

                  {selectedMethod === 'LINK' && options?.paymentLinks && (
                    <div className="mt-4 pt-4 border-t border-[#D6E4F5] space-y-2 text-xs">
                      {options.paymentLinks.map((link) => (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-3 rounded-xl bg-[#F7FAFF] hover:bg-[#EFF6FF] border border-[#D6E4F5] flex items-center justify-between text-[#2563EB] font-bold transition"
                        >
                          <span>{link.title}</span>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* Action Button: Pay Securely */}
          <Button
            onClick={() => setShowUtrModal(true)}
            disabled={!hasAnyPaymentMethod}
            className="w-full h-14 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-2xl text-base shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Pay Securely</span>
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Trust Badges */}
      <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
        <div className="p-4 rounded-2xl bg-white border border-[#D6E4F5] shadow-xs flex items-center justify-center gap-2.5">
          <Lock className="w-4 h-4 text-[#16A34A]" />
          <span className="text-xs font-bold text-[#0F172A]">Encrypted 256-Bit SSL</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#D6E4F5] shadow-xs flex items-center justify-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
          <span className="text-xs font-bold text-[#0F172A]">100% Verified Rails</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#D6E4F5] shadow-xs flex items-center justify-center gap-2.5">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-bold text-[#0F172A]">Authoritative Invoicing</span>
        </div>
      </div>

      {/* ── SUBMIT UTR MODAL ──────────────────────────────────────────── */}
      {showUtrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D6E4F5] rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-[#D6E4F5]">
              <div>
                <h3 className="font-extrabold text-base text-[#0F2A5F]">
                  Enter Transaction Reference
                </h3>
                <span className="text-xs text-[#64748B]">{feeName} • ₹{fee.toLocaleString('en-IN')}</span>
              </div>
              <button
                onClick={() => setShowUtrModal(false)}
                className="text-[#64748B] hover:text-[#0F172A] p-1.5 rounded-lg hover:bg-[#F7FAFF] transition"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#64748B] leading-relaxed">
              Please enter the 12-digit UTR or transaction reference number generated by your banking or UPI app:
            </p>

            <form onSubmit={handleSubmitUtr} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-[#0F172A] uppercase tracking-wider">
                  12-Digit UTR Reference Number *
                </label>
                <Input
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="e.g. 428910482910"
                  className="bg-[#F7FAFF] border-[#D6E4F5] text-[#0F172A] font-mono text-base h-12 rounded-xl focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                  autoFocus
                  required
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUtrModal(false)}
                  className="flex-1 h-11 border-[#D6E4F5] text-[#64748B] hover:bg-[#F7FAFF] text-xs font-semibold rounded-xl bg-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !utrNumber.trim()}
                  className="flex-1 h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Payment</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── INVOICE PREVIEW DIALOG ────────────────────────────────────── */}
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
                <span className="text-xs text-[#64748B]">Rendering invoice PDF...</span>
              </div>
            ) : invoicePreviewUrl ? (
              <iframe
                src={invoicePreviewUrl}
                title={invoicePreviewTitle}
                className="w-full h-full border-0 rounded-2xl"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-[#64748B]">
                Invoice preview unavailable.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerPaymentPage;
