import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CreditCard,
  Smartphone,
  Landmark,
  QrCode,
  Check,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { adminService } from '@/services/adminService';

interface ToggleProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

const ModernToggleSwitch: React.FC<ToggleProps> = ({ id, checked, onChange, disabled }) => {
  return (
    <label
      htmlFor={id}
      className={`relative inline-flex items-center gap-2 cursor-pointer select-none py-1 px-1.5 rounded-full transition-all duration-200 border ${
        checked
          ? 'bg-[#EAF4FF] border-[#BFDBFE]'
          : 'bg-[#F1F5F9] border-[#E2E8F0]'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm'}`}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      {/* Visual State Badge [ ON ] / [ OFF ] */}
      <span
        className={`text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider transition-colors ${
          checked
            ? 'bg-[#2563EB] text-white'
            : 'bg-[#94A3B8] text-white'
        }`}
      >
        {checked ? 'ON' : 'OFF'}
      </span>

      {/* Slider Pill */}
      <div
        className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out relative flex items-center p-0.5 ${
          checked ? 'bg-[#2563EB]' : 'bg-[#CBD5E1]'
        }`}
      >
        <span
          className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out flex items-center justify-center ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        >
          {checked ? (
            <Check className="w-3 h-3 text-[#2563EB] stroke-[3]" />
          ) : (
            <X className="w-3 h-3 text-[#94A3B8] stroke-[3]" />
          )}
        </span>
      </div>
    </label>
  );
};

export const PaymentMethodsConfigCard: React.FC = () => {
  const queryClient = useQueryClient();

  const [methods, setMethods] = useState<{
    upi: boolean;
    bankTransfer: boolean;
    merchantVpa: boolean;
  }>({
    upi: true,
    bankTransfer: true,
    merchantVpa: true,
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['adminPaymentMethods'],
    queryFn: async () => {
      const res = await adminService.getPaymentMethods();
      return res;
    },
  });

  useEffect(() => {
    if (data) {
      setMethods({
        upi: Boolean(data.upi),
        bankTransfer: Boolean(data.bankTransfer),
        merchantVpa: Boolean(data.merchantVpa),
      });
    }
  }, [data]);

  const allSelected = methods.upi && methods.bankTransfer && methods.merchantVpa;
  const someSelected = (methods.upi || methods.bankTransfer || methods.merchantVpa) && !allSelected;

  const handleSelectAllToggle = (checked: boolean) => {
    setMethods({
      upi: checked,
      bankTransfer: checked,
      merchantVpa: checked,
    });
  };

  const handleIndividualToggle = (key: 'upi' | 'bankTransfer' | 'merchantVpa', checked: boolean) => {
    setMethods((prev) => ({
      ...prev,
      [key]: checked,
    }));
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      setSaveStatus('saving');
      return adminService.updatePaymentMethods(methods);
    },
    onSuccess: () => {
      setSaveStatus('saved');
      setSuccessMsg('Payment methods configuration saved successfully.');
      setErrorMsg(null);
      queryClient.invalidateQueries({ queryKey: ['adminPaymentMethods'] });
      queryClient.invalidateQueries({ queryKey: ['activePaymentOptions'] });
      queryClient.invalidateQueries({ queryKey: ['adminUpiSettings'] });
      queryClient.invalidateQueries({ queryKey: ['adminBankSettings'] });
      setTimeout(() => {
        setSaveStatus('idle');
        setSuccessMsg(null);
      }, 3500);
    },
    onError: (err: unknown) => {
      setSaveStatus('error');
      const msg = err instanceof Error ? err.message : 'Failed to save payment methods configuration';
      setErrorMsg(msg);
      setTimeout(() => setSaveStatus('idle'), 4000);
    },
  });

  return (
    <Card className="bg-[#FFFFFF] border border-[#D9E6F2] rounded-2xl shadow-sm overflow-hidden">
      <CardHeader className="p-5 pb-4 bg-[#F8FAFC] border-b border-[#D9E6F2]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[#EAF4FF] text-[#2563EB] border border-[#BFDBFE]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-extrabold text-[#0B1F3A]">
                Payment Methods
              </CardTitle>
              <CardDescription className="text-xs text-[#52657A] mt-0.5">
                Enable or disable each payment rail independently for borrower checkout.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#52657A]">Status:</span>
            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                allSelected
                  ? 'bg-[#EAF4FF] text-[#2563EB] border-[#BFDBFE]'
                  : someSelected
                  ? 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]'
                  : 'bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]'
              }`}
            >
              {allSelected ? 'All Active (3/3)' : someSelected ? 'Partially Active' : 'All Disabled (0/3)'}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {successMsg && (
          <div className="p-3.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs flex items-center space-x-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#10B981]" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs flex items-center space-x-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#EF4444]" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-2 text-xs text-[#52657A]">
            <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" />
            <span>Loading payment methods configuration...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* 1. UPI Payment Method */}
            <div
              className={`p-4 rounded-xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                methods.upi
                  ? 'bg-[#FFFFFF] border-[#2563EB]/40 ring-1 ring-[#2563EB]/15 shadow-sm'
                  : 'bg-[#F8FAFC] border-[#D9E6F2] opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-start sm:items-center space-x-3.5 flex-1">
                <div
                  className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                    methods.upi
                      ? 'bg-[#EAF4FF] text-[#2563EB] border border-[#BFDBFE]'
                      : 'bg-[#E2E8F0] text-[#64748B]'
                  }`}
                >
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-extrabold text-[#0B1F3A]">UPI</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EAF4FF] text-[#2563EB] font-bold border border-[#BFDBFE]">
                      UPI Intent / QR payments
                    </span>
                  </div>
                  <p className="text-xs text-[#52657A] leading-relaxed">
                    Google Pay, PhonePe, Paytm, BHIM and dynamic QR scanning on desktop & mobile.
                  </p>
                </div>
              </div>

              <div className="shrink-0 self-end sm:self-center">
                <ModernToggleSwitch
                  id="pm-toggle-upi"
                  checked={methods.upi}
                  onChange={(checked) => handleIndividualToggle('upi', checked)}
                />
              </div>
            </div>

            {/* 2. Bank Account / Bank Transfer */}
            <div
              className={`p-4 rounded-xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                methods.bankTransfer
                  ? 'bg-[#FFFFFF] border-[#2563EB]/40 ring-1 ring-[#2563EB]/15 shadow-sm'
                  : 'bg-[#F8FAFC] border-[#D9E6F2] opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-start sm:items-center space-x-3.5 flex-1">
                <div
                  className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                    methods.bankTransfer
                      ? 'bg-[#EAF4FF] text-[#2563EB] border border-[#BFDBFE]'
                      : 'bg-[#E2E8F0] text-[#64748B]'
                  }`}
                >
                  <Landmark className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-extrabold text-[#0B1F3A]">
                      Bank Account / Bank Transfer
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8] font-bold border border-[#DBEAFE]">
                      IMPS / NEFT / RTGS
                    </span>
                  </div>
                  <p className="text-xs text-[#52657A] leading-relaxed">
                    Displays official corporate bank account number, IFSC code, and branch details.
                  </p>
                </div>
              </div>

              <div className="shrink-0 self-end sm:self-center">
                <ModernToggleSwitch
                  id="pm-toggle-bank"
                  checked={methods.bankTransfer}
                  onChange={(checked) => handleIndividualToggle('bankTransfer', checked)}
                />
              </div>
            </div>

            {/* 3. Merchant UPI / VPA */}
            <div
              className={`p-4 rounded-xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                methods.merchantVpa
                  ? 'bg-[#FFFFFF] border-[#2563EB]/40 ring-1 ring-[#2563EB]/15 shadow-sm'
                  : 'bg-[#F8FAFC] border-[#D9E6F2] opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-start sm:items-center space-x-3.5 flex-1">
                <div
                  className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                    methods.merchantVpa
                      ? 'bg-[#EAF4FF] text-[#2563EB] border border-[#BFDBFE]'
                      : 'bg-[#E2E8F0] text-[#64748B]'
                  }`}
                >
                  <QrCode className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-extrabold text-[#0B1F3A]">
                      Merchant UPI ID / VPA
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] font-bold border border-[#A7F3D0]">
                      Direct VPA Copy
                    </span>
                  </div>
                  <p className="text-xs text-[#52657A] leading-relaxed">
                    Standalone merchant VPA copy card for manual transfers from any UPI or banking app.
                  </p>
                </div>
              </div>

              <div className="shrink-0 self-end sm:self-center">
                <ModernToggleSwitch
                  id="pm-toggle-vpa"
                  checked={methods.merchantVpa}
                  onChange={(checked) => handleIndividualToggle('merchantVpa', checked)}
                />
              </div>
            </div>

            {/* Master Select All & Save Button Row */}
            <div className="pt-4 border-t border-[#D9E6F2] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <ModernToggleSwitch
                  id="pm-toggle-select-all"
                  checked={allSelected}
                  onChange={handleSelectAllToggle}
                />
                <div>
                  <span className="text-xs font-bold text-[#0B1F3A] block">
                    Select All Payment Methods
                  </span>
                  <span className="text-[11px] text-[#52657A]">
                    {allSelected
                      ? 'All payment methods are currently active'
                      : someSelected
                      ? 'Some payment methods are disabled'
                      : 'All payment methods are disabled'}
                  </span>
                </div>
              </div>

              <Button
                type="button"
                id="pm-save-changes-btn"
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className={`h-11 px-6 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 ${
                  saveStatus === 'saved'
                    ? 'bg-[#10B981] hover:bg-[#059669] text-white'
                    : saveStatus === 'error'
                    ? 'bg-[#EF4444] hover:bg-[#DC2626] text-white'
                    : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-[#2563EB]/25'
                }`}
              >
                {saveStatus === 'saving' || updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span className="text-white font-bold">Saving...</span>
                  </>
                ) : saveStatus === 'saved' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span className="text-white font-bold">Changes Saved ✓</span>
                  </>
                ) : saveStatus === 'error' ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-white" />
                    <span className="text-white font-bold">Failed to save changes</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-white" />
                    <span className="text-white font-bold">Save Payment Settings</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentMethodsConfigCard;
