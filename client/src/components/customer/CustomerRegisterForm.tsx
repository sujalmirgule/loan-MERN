import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  UserCheck,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Zap,
  Lock,
  FileCheck2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useBranding } from '@/contexts/BrandingContext';
import { ApiError, apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { INDIAN_STATES, getCitiesByState } from '@/constants/indianLocations';

export const registerFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters'),
  fatherName: z
    .string()
    .trim()
    .max(100, 'Father / Guardian name cannot exceed 100 characters')
    .optional()
    .or(z.literal('')),
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number starting with 6-9'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email address format'),
  address: z
    .string()
    .trim()
    .min(5, 'Residential address must be at least 5 characters')
    .max(255, 'Address cannot exceed 255 characters'),
  state: z.string().min(1, 'Please select a state'),
  city: z.string().min(1, 'Please select a city'),
  pincode: z.string().trim().optional(),
  aadhaar: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => /^\d{12}$/.test(v), 'Aadhaar must be exactly 12 numeric digits'),
  monthlyIncome: z
    .coerce
    .number({ invalid_type_error: 'Please enter a valid monthly income' })
    .positive('Monthly income must be greater than zero')
    .max(100000000, 'Monthly income exceeds allowable limit'),
});

export type RegisterFormData = z.infer<typeof registerFormSchema>;

interface CustomerRegisterFormProps {
  isEmbedded?: boolean;
  onSuccessRedirect?: string;
  initialLoanType?: string;
  initialLoanAmount?: number;
}

export const CustomerRegisterForm: React.FC<CustomerRegisterFormProps> = ({
  isEmbedded = false,
  onSuccessRedirect: _onSuccessRedirect = '/customer/dashboard',
  initialLoanType = 'Personal Loan',
  initialLoanAmount = 100000,
}) => {
  const { branding } = useBranding();
  const [currentStep, setCurrentStep] = useState(1);
  const [loanType, setLoanType] = useState(initialLoanType);
  const [loanAmount, setLoanAmount] = useState(initialLoanAmount);
  const tenure = 12; // default 12 months

  const [selectedState, setSelectedState] = useState<string>('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  const navigate = useNavigate();

  // Live EMI calculation (12% p.a. standard rate)
  const r = 12 / 12 / 100;
  const emiPreview = Math.round(
    (loanAmount * r * Math.pow(1 + r, tenure)) / (Math.pow(1 + r, tenure) - 1)
  );

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      fullName: '',
      fatherName: '',
      mobile: '',
      email: '',
      address: '',
      state: '',
      city: '',
      aadhaar: '',
      monthlyIncome: 35000,
    },
    mode: 'onTouched',
  });

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newState = e.target.value;
    setSelectedState(newState);
    setValue('state', newState, { shouldValidate: true });
    const cities = getCitiesByState(newState);
    setAvailableCities(cities);
    setValue('city', '', { shouldValidate: true });
  };

  const handleNextStep = async () => {
    let isValid = false;
    if (currentStep === 1) {
      isValid = true; // Loan requirements are local state, always valid
    } else if (currentStep === 2) {
      isValid = await trigger(['fullName', 'mobile', 'email', 'aadhaar']);
    }

    if (isValid) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const onSubmit = async (data: RegisterFormData) => {
    if (currentStep !== 3) return;

    try {
      setApiError(null);
      // Call API directly without auto-authenticating the session.
      // This ensures the customer must explicitly log in after signup.
      await apiClient(API_ENDPOINTS.AUTH.CUSTOMER_REGISTER, {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          monthlyIncome: Number(data.monthlyIncome),
        }),
      });
      sessionStorage.setItem('pending_loan_pref', JSON.stringify({ loanType, loanAmount, tenure }));

      // Redirect to login with success message and pre-filled mobile number.
      // Customer must explicitly log in — no auto-authentication after signup.
      navigate('/customer/login', {
        replace: true,
        state: { signupSuccess: true, mobile: data.mobile },
      });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setApiError(err.message);
      } else {
        setApiError('Registration failed. Please check details and try again.');
      }
    }
  };

  return (
    <div className={`w-full ${isEmbedded ? '' : 'max-w-3xl mx-auto'}`}>
      {/* Step Indicator */}
      <div className="mb-8 max-w-2xl mx-auto w-full px-2">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 relative">
          {/* Connecting line behind step badges */}
          <div className="absolute top-4 left-[15%] right-[15%] h-0.5 bg-[#D9E6F2] -z-0" />
          <div
            className="absolute top-4 left-[15%] h-0.5 bg-[#2563EB] transition-all duration-300 -z-0"
            style={{
              width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%',
            }}
          />

          {/* STEP 1: Loan Requirements */}
          <div className="flex flex-col items-center text-center relative z-10">
            <div
              className={`w-8 sm:w-9 h-8 sm:h-9 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                currentStep >= 1
                  ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/25 ring-4 ring-[#EAF4FF]'
                  : 'bg-white border-2 border-[#CBDDE9] text-[#94A3B8]'
              }`}
            >
              1
            </div>
            <div className="mt-2 space-y-0.5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#52657A] block">
                STEP 1
              </span>
              <span
                className={`text-xs sm:text-sm font-extrabold leading-tight block ${
                  currentStep === 1 ? 'text-[#2563EB]' : 'text-[#0B1F3A]'
                }`}
              >
                Loan Requirements
              </span>
            </div>
          </div>

          {/* STEP 2: Identity */}
          <div className="flex flex-col items-center text-center relative z-10">
            <div
              className={`w-8 sm:w-9 h-8 sm:h-9 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                currentStep >= 2
                  ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/25 ring-4 ring-[#EAF4FF]'
                  : 'bg-white border-2 border-[#CBDDE9] text-[#94A3B8]'
              }`}
            >
              2
            </div>
            <div className="mt-2 space-y-0.5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#52657A] block">
                STEP 2
              </span>
              <span
                className={`text-xs sm:text-sm font-extrabold leading-tight block ${
                  currentStep === 2 ? 'text-[#2563EB]' : 'text-[#0B1F3A]'
                }`}
              >
                Identity
              </span>
            </div>
          </div>

          {/* STEP 3: Address */}
          <div className="flex flex-col items-center text-center relative z-10">
            <div
              className={`w-8 sm:w-9 h-8 sm:h-9 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                currentStep >= 3
                  ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/25 ring-4 ring-[#EAF4FF]'
                  : 'bg-white border-2 border-[#CBDDE9] text-[#94A3B8]'
              }`}
            >
              3
            </div>
            <div className="mt-2 space-y-0.5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#52657A] block">
                STEP 3
              </span>
              <span
                className={`text-xs sm:text-sm font-extrabold leading-tight block ${
                  currentStep === 3 ? 'text-[#2563EB]' : 'text-[#0B1F3A]'
                }`}
              >
                Address
              </span>
            </div>
          </div>
        </div>
      </div>

      {apiError && (
        <div className="p-3.5 mb-6 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span className="font-semibold">{apiError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit, (err) => console.error('FORM_SUBMIT_ERRORS:', JSON.stringify(err)))} className="space-y-6">
        {/* STEP 1: Loan Requirements */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-200">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0B1F3A] tracking-tight">
                What do you need a loan for?
              </h2>
              <p className="text-xs sm:text-sm text-[#52657A] mt-1">
                Select your loan type and desired loan amount.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs text-[#52657A] font-bold uppercase tracking-wider block">
                Select Loan Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {['Personal Loan', 'Business Loan', 'MSME Loan', 'Education Loan'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setLoanType(type)}
                    className={`px-3.5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all border text-center ${
                      loanType === type
                        ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-md shadow-blue-500/20'
                        : 'bg-[#F7FAFC] text-[#52657A] border-[#D9E6F2] hover:border-[#2563EB]/50 hover:bg-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-[#52657A] font-semibold">Required Amount</span>
                <span className="font-black text-[#2563EB] text-xl sm:text-2xl font-mono">
                  ₹{loanAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <input
                type="range"
                min="25000"
                max="1000000"
                step="5000"
                value={loanAmount}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
              />
              <div className="flex justify-between text-[11px] text-[#52657A] font-semibold">
                <span>₹25,000</span>
                <span>₹5,00,000</span>
                <span>₹10,00,000</span>
              </div>
            </div>

            <div className="bg-[#EAF4FF] border border-[#CBDDE9] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-xs text-[#52657A] font-medium block">Estimated EMI (12 Months @ 12% p.a.)</span>
                <span className="text-xl sm:text-2xl font-black text-[#2563EB]">
                  ₹{emiPreview.toLocaleString('en-IN')}{' '}
                  <span className="text-xs font-semibold text-[#52657A]">/ month</span>
                </span>
              </div>
              <Button
                type="button"
                onClick={handleNextStep}
                className="w-full sm:w-auto h-11 px-6 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition"
              >
                <span>Next Step</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Basic Identity */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-200">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0B1F3A] tracking-tight">
                Personal Details
              </h2>
              <p className="text-xs sm:text-sm text-[#52657A] mt-1">
                Enter your identity information for underwriting and verification.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="fullName" className="text-xs font-bold text-[#0B1F3A]">
                  Full Name (as per PAN/Aadhaar) *
                </Label>
                <Input
                  id="fullName"
                  placeholder="e.g. Ajay Kumar"
                  {...register('fullName')}
                  className="h-11 bg-[#F7FAFC] border-[#D9E6F2] text-[#0B1F3A] rounded-xl text-sm"
                />
                {errors.fullName && <p className="text-[11px] text-red-600 font-semibold">{errors.fullName.message}</p>}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="fatherName" className="text-xs font-bold text-[#0B1F3A]">
                  Father / Guardian Name
                </Label>
                <Input
                  id="fatherName"
                  placeholder="e.g. Ramesh Kumar"
                  {...register('fatherName')}
                  className="h-11 bg-[#F7FAFC] border-[#D9E6F2] text-[#0B1F3A] rounded-xl text-sm"
                />
                {errors.fatherName && <p className="text-[11px] text-red-600 font-semibold">{errors.fatherName.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mobile" className="text-xs font-bold text-[#0B1F3A]">
                  Mobile Number (for Login & Alerts) *
                </Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-[#D9E6F2] bg-[#EAF4FF] text-[#123B66] text-xs font-bold">
                    +91
                  </span>
                  <Input
                    id="mobile"
                    type="tel"
                    maxLength={10}
                    placeholder="9876543210"
                    {...register('mobile')}
                    className="rounded-l-none h-11 bg-[#F7FAFC] border-[#D9E6F2] text-[#0B1F3A] font-mono rounded-r-xl text-sm"
                  />
                </div>
                {errors.mobile && <p className="text-[11px] text-red-600 font-semibold">{errors.mobile.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold text-[#0B1F3A]">
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ajay.kumar@example.com"
                  {...register('email')}
                  className="h-11 bg-[#F7FAFC] border-[#D9E6F2] text-[#0B1F3A] rounded-xl text-sm"
                />
                {errors.email && <p className="text-[11px] text-red-600 font-semibold">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="aadhaar" className="text-xs font-bold text-[#0B1F3A]">
                  12-Digit Aadhaar Number *
                </Label>
                <Input
                  id="aadhaar"
                  maxLength={12}
                  placeholder="123456789012"
                  {...register('aadhaar')}
                  className="h-11 bg-[#F7FAFC] border-[#D9E6F2] text-[#0B1F3A] font-mono tracking-widest rounded-xl text-sm"
                />
                {errors.aadhaar && <p className="text-[11px] text-red-600 font-semibold">{errors.aadhaar.message}</p>}
              </div>
            </div>

            <div className="flex justify-between pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevStep}
                className="h-11 px-5 border-[#D9E6F2] text-[#0B1F3A] rounded-xl hover:bg-slate-100 font-bold text-xs"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleNextStep}
                className="h-11 px-6 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition"
              >
                <span>Next Step</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Financial & Address */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-200">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0B1F3A] tracking-tight">
                Financial & Address
              </h2>
              <p className="text-xs sm:text-sm text-[#52657A] mt-1">
                Final step! Provide your monthly income and residential address.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="monthlyIncome" className="text-xs font-bold text-[#0B1F3A]">
                  Monthly Income (Net ₹) *
                </Label>
                <Input
                  id="monthlyIncome"
                  type="number"
                  placeholder="45000"
                  {...register('monthlyIncome')}
                  className="h-11 bg-[#F7FAFC] border-[#D9E6F2] text-[#0B1F3A] font-mono rounded-xl text-sm"
                />
                {errors.monthlyIncome && (
                  <p className="text-[11px] text-red-600 font-semibold">{errors.monthlyIncome.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="state" className="text-xs font-bold text-[#0B1F3A]">
                  State *
                </Label>
                <Select
                  id="state"
                  value={selectedState}
                  onChange={handleStateChange}
                  className="h-11 bg-[#F7FAFC] border-[#D9E6F2] text-[#0B1F3A] rounded-xl text-xs sm:text-sm"
                >
                  <option value="">Select State</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
                {errors.state && <p className="text-[11px] text-red-600 font-semibold">{errors.state.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="city" className="text-xs font-bold text-[#0B1F3A]">
                  City / District *
                </Label>
                <Select
                  id="city"
                  disabled={!selectedState}
                  {...register('city', {
                    onChange: (e) => {
                      setValue('city', e.target.value, { shouldValidate: true });
                    },
                  })}
                  className="h-11 bg-[#F7FAFC] border-[#D9E6F2] text-[#0B1F3A] rounded-xl text-xs sm:text-sm"
                >
                  <option value="">Select City</option>
                  {availableCities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
                {errors.city && <p className="text-[11px] text-red-600 font-semibold">{errors.city.message}</p>}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="address" className="text-xs font-bold text-[#0B1F3A]">
                  Full Residential Address *
                </Label>
                <Input
                  id="address"
                  placeholder="Flat / House No, Street, Landmark, Area"
                  {...register('address')}
                  className="h-11 bg-[#F7FAFC] border-[#D9E6F2] text-[#0B1F3A] rounded-xl text-sm"
                />
                {errors.address && <p className="text-[11px] text-red-600 font-semibold">{errors.address.message}</p>}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pincode" className="text-xs font-bold text-[#0B1F3A]">
                  6-Digit Area Pincode
                </Label>
                <Input
                  id="pincode"
                  maxLength={6}
                  placeholder="400001"
                  {...register('pincode')}
                  className="h-11 bg-[#F7FAFC] border-[#D9E6F2] text-[#0B1F3A] font-mono w-full sm:w-1/2 rounded-xl text-sm"
                />
                {errors.pincode && <p className="text-[11px] text-red-600 font-semibold">{errors.pincode.message}</p>}
              </div>
            </div>

            <div className="pt-2 text-[11px] text-[#52657A] leading-relaxed">
              By clicking <strong>Submit Application</strong>, you authorize {branding.appName || 'Loan Approve'} to check credit eligibility and agree to our{' '}
              <Link to="/terms" className="text-[#2563EB] font-bold underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-[#2563EB] font-bold underline">
                Privacy Policy
              </Link>.
            </div>

            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevStep}
                className="h-11 px-5 border-[#D9E6F2] text-[#0B1F3A] rounded-xl hover:bg-slate-100 font-bold text-xs"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 px-8 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Submit Application</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </form>

      {/* Trust Badges */}
      <div className="mt-8 pt-6 border-t border-[#D9E6F2] grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-[11px] text-[#52657A]">
        <div className="flex items-center justify-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
          <span>256-Bit SSL Encrypted</span>
        </div>
        <div className="flex items-center justify-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
          <span>Instant Evaluation</span>
        </div>
        <div className="flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
          <span>Zero Hidden Fees</span>
        </div>
        <div className="flex items-center justify-center gap-1.5">
          <FileCheck2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
          <span>100% Digital KYC</span>
        </div>
      </div>
    </div>
  );
};
