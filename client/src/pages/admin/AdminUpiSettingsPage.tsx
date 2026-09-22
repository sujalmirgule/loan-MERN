import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Smartphone,
  Info,
  Loader2,
  Upload,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { adminService } from '@/services/adminService';
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

export const AdminUpiSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [upiEnabled, setUpiEnabled] = useState(true);
  const [upiId, setUpiId] = useState('');
  const [merchantName, setMerchantName] = useState('Loan Approve FinTech');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrImageError, setQrImageError] = useState(false);

  // Upload state
  const [uploadingQr, setUploadingQr] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['adminUpiSettings'],
    queryFn: async () => {
      const res = await adminService.getUpiSettings();
      return res;
    },
  });

  useEffect(() => {
    if (data) {
      setUpiEnabled(data.upiEnabled ?? data.enabled ?? true);
      setUpiId(data.upiId || '');
      setMerchantName(data.merchantName || 'Loan Approve FinTech');
      setQrCodeUrl(data.qrCodeUrl || '');
      setQrImageError(false);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      setSaveStatus('saving');
      return adminService.updateUpiSettings({
        enabled: upiEnabled,
        upiId: upiId.trim(),
        merchantName: merchantName.trim(),
        qrCodeUrl: qrCodeUrl.trim() || undefined,
      });
    },
    onSuccess: () => {
      setSaveStatus('saved');
      setSuccessMsg('UPI payment gateway configuration saved successfully.');
      setErrorMsg(null);
      queryClient.invalidateQueries({ queryKey: ['adminUpiSettings'] });
      queryClient.invalidateQueries({ queryKey: ['activePaymentOptions'] });
      queryClient.invalidateQueries({ queryKey: ['adminPaymentMethods'] });
      setTimeout(() => {
        setSaveStatus('idle');
        setSuccessMsg(null);
      }, 3500);
    },
    onError: (err: unknown) => {
      setSaveStatus('error');
      const msg = err instanceof Error ? err.message : 'Failed to save UPI settings';
      setErrorMsg(msg);
      setTimeout(() => setSaveStatus('idle'), 4000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  // QR File Upload Handler
  const handleQrFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type: PNG, JPG, JPEG, WebP
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Invalid file format. Please upload a PNG, JPG, or WebP QR code image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate size: 2MB max
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('File size exceeds 2MB limit. Please upload an image under 2MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setUploadingQr(true);
      setErrorMsg(null);

      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post(API_ENDPOINTS.UPI_SETTINGS.UPLOAD_QR, formData, {
        tokenType: 'admin',
      });

      const uploadedUrl = res.data?.data?.url || res.data?.url;
      if (uploadedUrl) {
        setQrCodeUrl(uploadedUrl);
        setQrImageError(false);
        setSuccessMsg('QR code uploaded successfully. Click Save UPI Settings to persist.');
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to upload QR code image.');
    } finally {
      setUploadingQr(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveQr = () => {
    setQrCodeUrl('');
    setQrImageError(false);
    setSuccessMsg('Custom QR removed. System will use dynamic generated QR codes.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Dynamic sample UPI Intent URL for borrower preview
  const sampleAmount = 1250;
  const sampleUpiIntent = `upi://pay?pa=${encodeURIComponent(upiId || 'merchant@bank')}&pn=${encodeURIComponent(merchantName || 'LoanApprove')}&am=${sampleAmount}&cu=INR&tn=LoanFee`;
  const dynamicQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(sampleUpiIntent)}`;

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
        <span className="text-[#0B1F3A] font-bold">UPI Settings</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-[#0B1F3A] tracking-tight">UPI Gateway Configuration</h1>
        <p className="text-xs text-[#52657A] mt-1">
          Configure authoritative Unified Payments Interface (UPI) merchant VPA, dynamic QR codes, and custom merchant QR asset for loan charges and verification fees.
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

      {/* Dynamic Payment Methods Configuration Control */}
      <PaymentMethodsConfigCard />

      {/* Two-Column Form & Live Customer Preview Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Settings Form (2 Columns) */}
        <div className="lg:col-span-2 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Card className="bg-[#FFFFFF] border border-[#D9E6F2] rounded-2xl shadow-sm overflow-hidden">
              <CardHeader className="p-5 pb-4 bg-[#F8FAFC] border-b border-[#D9E6F2]">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-extrabold text-[#0B1F3A]">
                      UPI Merchant & Gateway Credentials
                    </CardTitle>
                    <CardDescription className="text-xs text-[#52657A] mt-0.5">
                      Configure authoritative VPA details and merchant display info.
                    </CardDescription>
                  </div>
                  <div className="p-2 rounded-xl bg-[#EAF4FF] text-[#2563EB] border border-[#BFDBFE]">
                    <Smartphone className="w-5 h-5" />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 sm:p-6 space-y-5">
                {/* UPI Method Enable Switch */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-[#F8FAFC] border border-[#D9E6F2]">
                  <div>
                    <h3 className="text-sm font-bold text-[#0B1F3A]">Enable UPI Payment Rail</h3>
                    <p className="text-xs text-[#52657A] mt-0.5">
                      Unified rail for instant mobile UPI app intent and desktop QR scan.
                    </p>
                  </div>
                  <ModernToggleSwitch
                    id="upi-enable-switch"
                    checked={upiEnabled}
                    onChange={setUpiEnabled}
                  />
                </div>

                {/* UPI VPA */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wider flex items-center gap-1">
                    <span>Authoritative UPI ID / VPA</span>
                    <span className="text-[#DC2626]">*</span>
                  </Label>
                  <Input
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. loanapprove@icici or loanapprove@okaxis"
                    className="bg-[#FFFFFF] border-[#D9E6F2] text-[#0B1F3A] font-mono text-xs h-10 rounded-xl placeholder-[#52657A]/50 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                    required
                  />
                  <p className="text-[11px] text-[#52657A]">
                    The exact virtual payment address where fee transactions are directly settled.
                  </p>
                </div>

                {/* Merchant Name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wider flex items-center gap-1">
                    <span>Merchant Name (as registered with Bank / NPCI)</span>
                    <span className="text-[#DC2626]">*</span>
                  </Label>
                  <Input
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    placeholder="e.g. Loan Approve Financial Services Pvt Ltd"
                    className="bg-[#FFFFFF] border-[#D9E6F2] text-[#0B1F3A] text-xs h-10 rounded-xl placeholder-[#52657A]/50 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                    required
                  />
                  <p className="text-[11px] text-[#52657A]">
                    Display name shown to the borrower inside Google Pay, PhonePe, Paytm, and BHIM upon scanning.
                  </p>
                </div>

                {/* QR Code Configuration Section */}
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#D9E6F2] space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-extrabold text-[#0B1F3A] uppercase tracking-wider">
                        Merchant QR Code Asset
                      </h4>
                      <p className="text-[11px] text-[#52657A] mt-0.5">
                        Upload custom static QR or allow system to auto-generate dynamic QR codes.
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        qrCodeUrl
                          ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                          : upiId
                          ? 'bg-[#EAF4FF] text-[#2563EB] border-[#BFDBFE]'
                          : 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
                      }`}
                    >
                      {qrCodeUrl
                        ? 'Custom QR Active'
                        : upiId
                        ? 'Dynamic QR Fallback'
                        : 'QR Not Configured'}
                    </span>
                  </div>

                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleQrFileUpload}
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                  />

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingQr}
                      className="h-9 px-4 bg-[#FFFFFF] hover:bg-[#EAF4FF] text-[#2563EB] border-[#BFDBFE] text-xs font-bold rounded-xl flex items-center space-x-2"
                    >
                      {uploadingQr ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>{qrCodeUrl ? 'Replace QR Image' : 'Upload QR Image'}</span>
                    </Button>

                    {qrCodeUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleRemoveQr}
                        className="h-9 px-3 bg-[#FFFFFF] hover:bg-[#FEF2F2] text-[#DC2626] border-[#FECACA] text-xs font-semibold rounded-xl flex items-center space-x-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Custom QR</span>
                      </Button>
                    )}
                  </div>

                  {/* Custom QR URL Input fallback */}
                  <div className="space-y-1 pt-1">
                    <Label className="text-[11px] font-semibold text-[#52657A]">
                      Direct QR Image URL (Optional)
                    </Label>
                    <Input
                      value={qrCodeUrl}
                      onChange={(e) => {
                        setQrCodeUrl(e.target.value);
                        setQrImageError(false);
                      }}
                      placeholder="https://example.com/merchant-qr.png (or use upload button above)"
                      className="bg-[#FFFFFF] border-[#D9E6F2] text-[#0B1F3A] text-xs h-9 rounded-xl placeholder-[#52657A]/50 focus:border-[#2563EB]"
                    />
                    <p className="text-[10px] text-[#52657A]">
                      Supported formats: PNG, JPG, WebP (Max 2MB). If blank, auto-generates dynamic QR with exact fee amount.
                    </p>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    id="save-upi-settings-btn"
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
                        <span className="text-white font-bold">UPI Settings Saved ✓</span>
                      </>
                    ) : saveStatus === 'error' ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-white" />
                        <span className="text-white font-bold">Failed to save changes</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 text-white" />
                        <span className="text-white font-bold">Save UPI Settings</span>
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Architecture Info Notice */}
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#D9E6F2] flex items-start space-x-3 text-xs text-[#52657A]">
              <div className="p-1.5 rounded-lg bg-[#EAF4FF] text-[#2563EB] shrink-0 mt-0.5">
                <Info className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <p className="text-[#0B1F3A] font-bold">Unified UPI Rail Architecture</p>
                <p className="leading-relaxed">
                  In compliance with fintech standards, mobile borrowers receive standard <code className="px-1.5 py-0.5 rounded bg-[#EAF4FF] text-[#2563EB] font-mono text-[11px]">upi://pay</code> Intent deep-links opening installed apps (Google Pay, PhonePe, Paytm, BHIM), while desktop borrowers scan dynamic QR codes.
                </p>
              </div>
            </div>
          </form>
        </div>

        {/* Live Customer-Side Preview Card (1 Column) */}
        <div className="lg:sticky lg:top-6 space-y-4">
          <Card className="bg-[#FFFFFF] border border-[#D9E6F2] rounded-2xl shadow-sm overflow-hidden">
            <CardHeader className="p-4 pb-3 bg-[#F8FAFC] border-b border-[#D9E6F2]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-[#EAF4FF] text-[#2563EB]">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-xs font-extrabold text-[#0B1F3A] uppercase tracking-wider">
                      Borrower Payment Preview
                    </CardTitle>
                    <CardDescription className="text-[11px] text-[#52657A]">
                      Live visualization of customer checkout
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#D9E6F2] text-center space-y-3">
                <div className="text-xs font-medium text-[#52657A]">Sample Processing Fee</div>
                <div className="text-3xl font-black text-[#0B1F3A] font-mono">₹1,250.00</div>
                <div className="text-xs font-bold text-[#2563EB]">{merchantName || 'Merchant Name'}</div>
                <div className="text-[11px] font-mono text-[#52657A] bg-[#FFFFFF] py-1 px-2.5 rounded-lg inline-block border border-[#D9E6F2]">
                  {upiId || 'merchant@bank'}
                </div>

                {/* QR Code Container with Preview / Fallback / Empty State */}
                <div className="w-44 h-44 mx-auto bg-white p-2 rounded-xl border border-[#D9E6F2] shadow-sm flex flex-col items-center justify-center">
                  {qrCodeUrl && !qrImageError ? (
                    <img
                      src={qrCodeUrl}
                      alt="Merchant QR"
                      onError={() => setQrImageError(true)}
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : upiId ? (
                    <div className="text-center p-1 space-y-1">
                      <img
                        src={dynamicQrUrl}
                        alt="Dynamic UPI QR"
                        className="w-32 h-32 mx-auto object-contain"
                      />
                      <span className="text-[9px] text-[#2563EB] font-bold block uppercase tracking-wider">
                        Dynamic UPI QR
                      </span>
                    </div>
                  ) : (
                    <div className="text-center p-3 space-y-2">
                      <div className="p-3 rounded-full bg-[#F1F5F9] text-[#94A3B8] inline-block">
                        <QrCode className="w-10 h-10" />
                      </div>
                      <span className="text-xs text-[#52657A] font-semibold block">
                        QR not configured
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[10px] h-7 px-2.5 bg-[#EAF4FF] text-[#2563EB] border-[#BFDBFE] font-bold rounded-lg"
                      >
                        <Upload className="w-3 h-3 mr-1" />
                        Upload QR
                      </Button>
                    </div>
                  )}
                </div>

                <div className="pt-1 space-y-2">
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 px-4 bg-[#10B981] text-white text-xs font-extrabold rounded-xl opacity-90 shadow-sm cursor-not-allowed"
                  >
                    Pay with UPI (Mobile Intent)
                  </button>
                  <p className="text-[10px] text-[#52657A] font-mono break-all truncate" title={sampleUpiIntent}>
                    {sampleUpiIntent}
                  </p>
                  <p className="text-[10px] text-[#52657A]">
                    Mobile: One-tap intent · Desktop: Scan & Pay QR
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminUpiSettingsPage;
