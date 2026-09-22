import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Landmark,
  Loader2,
  Check,
  X,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { PaymentMethodsConfigCard } from '@/components/admin/PaymentMethodsConfigCard';

interface ModernToggleProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const ModernToggleSwitch: React.FC<ModernToggleProps> = ({ id, checked, onChange, disabled }) => {
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
      <span
        className={`text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider transition-colors ${
          checked ? 'bg-[#2563EB] text-white' : 'bg-[#94A3B8] text-white'
        }`}
      >
        {checked ? 'ON' : 'OFF'}
      </span>
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

export const AdminBankSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [bankEnabled, setBankEnabled] = useState(true);
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [branch, setBranch] = useState('');

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['adminBankSettings'],
    queryFn: async () => {
      const res = await api.get(API_ENDPOINTS.BANK_SETTINGS.GET);
      return res.data?.data || res.data;
    },
  });

  useEffect(() => {
    if (data) {
      setBankEnabled(data.bankEnabled ?? true);
      setAccountHolder(data.accountHolder || '');
      setAccountNumber(data.accountNumber || '');
      setBankName(data.bankName || '');
      setIfsc(data.ifsc || '');
      setBranch(data.branch || '');
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      setSaveStatus('saving');
      return api.patch(API_ENDPOINTS.BANK_SETTINGS.UPDATE, {
        bankEnabled,
        accountHolder: accountHolder.trim(),
        accountNumber: accountNumber.trim(),
        bankName: bankName.trim(),
        ifsc: ifsc.trim().toUpperCase(),
        branch: branch.trim(),
      });
    },
    onSuccess: () => {
      setSaveStatus('saved');
      setSuccessMsg('Bank transfer credentials updated successfully.');
      setErrorMsg(null);
      queryClient.invalidateQueries({ queryKey: ['adminBankSettings'] });
      queryClient.invalidateQueries({ queryKey: ['activePaymentOptions'] });
      queryClient.invalidateQueries({ queryKey: ['adminPaymentMethods'] });
      setTimeout(() => {
        setSaveStatus('idle');
        setSuccessMsg(null);
      }, 3500);
    },
    onError: (err: unknown) => {
      setSaveStatus('error');
      const msg = err instanceof Error ? err.message : 'Failed to update bank settings';
      setErrorMsg(msg);
      setTimeout(() => setSaveStatus('idle'), 4000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-xs text-[#52657A]">
        <Link to="/admin/dashboard" className="hover:text-[#0B1F3A] transition-colors font-medium">
          Dashboard
        </Link>
        <span>›</span>
        <span className="text-[#52657A]">Payments</span>
        <span>›</span>
        <span className="text-[#0B1F3A] font-bold">Bank Settings</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-[#0B1F3A] tracking-tight">Bank Transfer Configuration</h1>
        <p className="text-xs text-[#52657A] mt-1">
          Manage corporate bank account details displayed to customers for direct IMPS, NEFT, and RTGS payment deposits.
        </p>
      </div>

      {/* Feedback Messages */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs flex items-center space-x-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#10B981]" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs flex items-center space-x-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#EF4444]" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Dynamic Payment Methods Configuration Card */}
      <PaymentMethodsConfigCard />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Card className="bg-[#FFFFFF] border border-[#D9E6F2] rounded-2xl shadow-sm overflow-hidden">
              <CardHeader className="p-5 pb-4 bg-[#F8FAFC] border-b border-[#D9E6F2]">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-extrabold text-[#0B1F3A]">
                      Corporate Bank Account Details
                    </CardTitle>
                    <CardDescription className="text-xs text-[#52657A] mt-0.5">
                      Enter official banking credentials for direct wire transfers.
                    </CardDescription>
                  </div>
                  <div className="p-2 rounded-xl bg-[#EAF4FF] text-[#2563EB] border border-[#BFDBFE]">
                    <Landmark className="w-5 h-5" />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 sm:p-6 space-y-5">
                {/* Method Enable Switch */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-[#F8FAFC] border border-[#D9E6F2]">
                  <div>
                    <h3 className="text-sm font-bold text-[#0B1F3A]">Enable Direct Bank Transfer</h3>
                    <p className="text-xs text-[#52657A] mt-0.5">
                      Allow customers to transfer fee deposits via Net Banking / IMPS / NEFT / RTGS
                    </p>
                  </div>
                  <ModernToggleSwitch
                    id="bank-enable-switch"
                    checked={bankEnabled}
                    onChange={setBankEnabled}
                  />
                </div>

                {/* Account Holder */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wider flex items-center gap-1">
                    <span>Account Holder Name</span>
                    <span className="text-[#DC2626]">*</span>
                  </Label>
                  <Input
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="e.g. Loan Approve Financial Services Pvt Ltd"
                    className="bg-[#FFFFFF] border-[#D9E6F2] text-[#0B1F3A] text-xs h-10 rounded-xl placeholder-[#52657A]/50 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                    required
                  />
                </div>

                {/* Bank Name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wider flex items-center gap-1">
                    <span>Bank Name</span>
                    <span className="text-[#DC2626]">*</span>
                  </Label>
                  <Input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. HDFC Bank"
                    className="bg-[#FFFFFF] border-[#D9E6F2] text-[#0B1F3A] text-xs h-10 rounded-xl placeholder-[#52657A]/50 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                    required
                  />
                </div>

                {/* Account Number */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wider flex items-center gap-1">
                    <span>Bank Account Number</span>
                    <span className="text-[#DC2626]">*</span>
                  </Label>
                  <Input
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 50200084729104"
                    className="bg-[#FFFFFF] border-[#D9E6F2] text-[#0B1F3A] font-mono text-xs h-10 rounded-xl placeholder-[#52657A]/50 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                    required
                  />
                </div>

                {/* IFSC & Branch */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wider flex items-center gap-1">
                      <span>IFSC Code</span>
                      <span className="text-[#DC2626]">*</span>
                    </Label>
                    <Input
                      value={ifsc}
                      onChange={(e) => setIfsc(e.target.value)}
                      placeholder="e.g. HDFC0000060"
                      className="bg-[#FFFFFF] border-[#D9E6F2] text-[#0B1F3A] font-mono text-xs h-10 rounded-xl uppercase placeholder-[#52657A]/50 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wider">
                      Branch Location
                    </Label>
                    <Input
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      placeholder="e.g. Fort, Mumbai"
                      className="bg-[#FFFFFF] border-[#D9E6F2] text-[#0B1F3A] text-xs h-10 rounded-xl placeholder-[#52657A]/50 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    id="save-bank-settings-btn"
                    disabled={updateMutation.isPending || isLoading}
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
                        <span className="text-white font-bold">Bank Settings Saved ✓</span>
                      </>
                    ) : saveStatus === 'error' ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-white" />
                        <span className="text-white font-bold">Failed to save changes</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 text-white" />
                        <span className="text-white font-bold">Save Bank Settings</span>
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>

        {/* Live Preview Card */}
        <div>
          <Card className="bg-[#FFFFFF] border border-[#D9E6F2] rounded-2xl shadow-sm overflow-hidden">
            <CardHeader className="p-4 pb-3 bg-[#F8FAFC] border-b border-[#D9E6F2]">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-[#EAF4FF] text-[#2563EB]">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-xs font-extrabold text-[#0B1F3A] uppercase tracking-wider">
                    Borrower Bank Card Preview
                  </CardTitle>
                  <CardDescription className="text-[11px] text-[#52657A]">
                    Live view of bank details card
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#D9E6F2] space-y-2.5">
                <div className="flex justify-between items-center text-[#52657A]">
                  <span>Bank Name:</span>
                  <span className="font-extrabold text-[#0B1F3A]">{bankName || 'HDFC Bank'}</span>
                </div>
                <div className="flex justify-between items-center text-[#52657A]">
                  <span>Account Holder:</span>
                  <span className="font-bold text-[#0B1F3A]">{accountHolder || 'Financial Services Pvt Ltd'}</span>
                </div>
                <div className="flex justify-between items-center text-[#52657A]">
                  <span>Account Number:</span>
                  <span className="font-mono font-bold text-[#2563EB]">{accountNumber || '50200084729104'}</span>
                </div>
                <div className="flex justify-between items-center text-[#52657A]">
                  <span>IFSC Code:</span>
                  <span className="font-mono font-bold text-[#2563EB]">{ifsc || 'HDFC0000060'}</span>
                </div>
                {branch && (
                  <div className="flex justify-between items-center text-[#52657A]">
                    <span>Branch:</span>
                    <span className="font-semibold text-[#0B1F3A]">{branch}</span>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-[#EAF4FF] border border-[#BFDBFE] flex items-start space-x-2 text-[11px] text-[#1D4ED8]">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#2563EB]" />
                <p>
                  Customers transferring via NEFT/RTGS will receive instructions to enter the 12-digit UTR reference after completing the transfer.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminBankSettingsPage;
