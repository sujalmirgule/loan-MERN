import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Phone,
  Mail,
  MapPin,
  IndianRupee,
  ShieldCheck,
  Calendar,
  Edit2,
  X,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { INDIAN_STATES, getCitiesByState } from '@/constants/indianLocations';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useBrandTitle } from '@/hooks/useBrandTitle';

const profileFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, 'Full name must be at least 3 characters')
    .max(100, 'Full name cannot exceed 100 characters'),
  fatherName: z
    .string()
    .trim()
    .max(100, 'Father / Guardian name cannot exceed 100 characters')
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .trim()
    .email('Invalid email address format'),
  address: z
    .string()
    .trim()
    .min(5, 'Address must be at least 5 characters'),
  state: z
    .string()
    .min(2, 'Please select a state'),
  city: z
    .string()
    .min(2, 'Please select a city'),
  monthlyIncome: z.coerce
    .number()
    .positive('Monthly income must be greater than zero')
    .min(1000, 'Monthly income must be at least ₹1,000'),
  aadhaar: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        const digits = val.replace(/\D/g, '');
        return digits.length === 12;
      },
      { message: 'Aadhaar number must be 12 digits' }
    ),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface CustomerProfileData {
  id: string;
  fullName: string;
  fatherName?: string | null;
  mobile: string;
  email: string;
  address: string;
  state: string;
  city: string;
  aadhaarMasked: string;
  monthlyIncome: number;
  status: string;
  kycStatus: string;
  createdAt: string;
  updatedAt: string;
}

export const CustomerProfile: React.FC = () => {
  useBrandTitle('My Profile');
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState<CustomerProfileData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
  });

  const selectedState = watch('state');
  const availableCities = selectedState ? getCitiesByState(selectedState) : [];

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      // Backend returns: { success: true, data: { profile: {...} } }
      // apiClient.get returns the full body, so res = { success, data: { profile } }
      const res = await apiClient.get(API_ENDPOINTS.CUSTOMERS.PROFILE);
      const data: CustomerProfileData =
        res.data?.data?.profile || res.data?.profile || res.data?.data || res.data;
      setProfile(data);
      reset({
        fullName: data.fullName || '',
        fatherName: data.fatherName || '',
        email: data.email,
        address: data.address,
        state: data.state,
        city: data.city,
        monthlyIncome: data.monthlyIncome,
        aadhaar: '',
      });
    } catch (err: unknown) {
      const errorMsg =
        (err as { message?: string })?.message ||
        'Failed to load customer profile';
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newState = e.target.value;
    setValue('state', newState, { shouldValidate: true });
    setValue('city', '', { shouldValidate: true });
  };

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const payload: Record<string, unknown> = {
        fullName: values.fullName,
        fatherName: values.fatherName ? values.fatherName.trim() : '',
        email: values.email,
        address: values.address,
        state: values.state,
        city: values.city,
        monthlyIncome: values.monthlyIncome,
      };

      if (values.aadhaar && values.aadhaar.trim().length > 0) {
        payload.aadhaar = values.aadhaar.replace(/\D/g, '');
      }

      const res = await apiClient.patch(API_ENDPOINTS.CUSTOMERS.UPDATE, payload);
      const updated: CustomerProfileData =
        res.data?.data?.profile || res.data?.profile || res.data?.data || res.data;
      setProfile(updated);
      updateUser(updated);

      setSuccessMessage('Profile updated successfully!');
      setIsEditing(false);
      reset({
        fullName: updated.fullName,
        fatherName: updated.fatherName || '',
        email: updated.email,
        address: updated.address,
        state: updated.state,
        city: updated.city,
        monthlyIncome: updated.monthlyIncome,
        aadhaar: '',
      });
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update profile';
      setErrorMessage(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      reset({
        fullName: profile.fullName,
        fatherName: profile.fatherName || '',
        email: profile.email,
        address: profile.address,
        state: profile.state,
        city: profile.city,
        monthlyIncome: profile.monthlyIncome,
        aadhaar: '',
      });
    }
    setIsEditing(false);
    setErrorMessage(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-text-secondary font-medium">Loading profile details...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-slate-900">Profile Unavailable</h3>
        <p className="text-sm text-text-secondary mb-4">{errorMessage || 'Unable to retrieve your profile details.'}</p>
        <Button onClick={fetchProfile} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-border shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 border-2 border-success flex items-center justify-center text-emerald-800 font-bold text-xl">
            {(profile.fullName || 'User').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-slate-900">{profile.fullName}</h2>
              <Badge variant={profile.status === 'ACTIVE' ? 'success' : 'outline'}>
                {profile.status}
              </Badge>
            </div>
            <p className="text-xs text-text-secondary flex items-center mt-1">
              <Calendar className="w-3.5 h-3.5 mr-1" />
              Member since {new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {!isEditing ? (
          <Button
            onClick={() => {
              setIsEditing(true);
              setSuccessMessage(null);
            }}
            className="flex items-center space-x-2 self-start sm:self-auto"
          >
            <Edit2 className="w-4 h-4" />
            <span>Edit Profile</span>
          </Button>
        ) : (
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="flex items-center space-x-1"
            >
              <X className="w-4 h-4 mr-1" />
              <span>Cancel</span>
            </Button>
            <Button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={isSaving}
              className="flex items-center space-x-1"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Feedback Messages */}
      {successMessage && (
        <div className="flex items-center space-x-2 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center space-x-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal & Login Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center space-x-2">
              <User className="w-4 h-4 text-emerald-600" />
              <span>Personal Information</span>
            </CardTitle>
            <CardDescription>
              Basic identification and login information registered with your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full Name</Label>
                {isEditing ? (
                  <div>
                    <Input id="fullName" {...register('fullName')} placeholder="Enter full legal name" />
                    {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName.message}</p>}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-slate-800 bg-slate-50 p-2.5 rounded-md border border-slate-200">
                    {profile.fullName}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fatherName">Father / Guardian Name</Label>
                {isEditing ? (
                  <div>
                    <Input id="fatherName" {...register('fatherName')} placeholder="Enter Father / Guardian Name" />
                    {errors.fatherName && <p className="text-xs text-destructive mt-1">{errors.fatherName.message}</p>}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-slate-800 bg-slate-50 p-2.5 rounded-md border border-slate-200">
                    {profile.fatherName || '—'}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mobile" className="flex items-center justify-between">
                  <span>Mobile Number</span>
                  <span className="text-[11px] text-text-secondary font-normal">Primary Login ID (Immutable)</span>
                </Label>
                <div className="flex items-center space-x-2 bg-slate-100 p-2.5 rounded-md border border-slate-200 text-slate-600">
                  <Phone className="w-4 h-4 text-text-secondary" />
                  <span className="text-sm font-mono font-medium">+91 {profile.mobile}</span>
                  <Badge variant="outline" className="ml-auto text-[10px] bg-slate-200 border-none">
                    Verified
                  </Badge>
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="email">Email Address</Label>
                {isEditing ? (
                  <div>
                    <Input id="email" type="email" {...register('email')} placeholder="you@example.com" />
                    {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-md border border-slate-200">
                    <Mail className="w-4 h-4 text-text-secondary" />
                    <span className="text-sm font-medium text-slate-800">{profile.email}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Residential Address</span>
            </CardTitle>
            <CardDescription>
              Address used for verification and correspondence.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="address">Street Address</Label>
              {isEditing ? (
                <div>
                  <Input id="address" {...register('address')} placeholder="Flat, building, street, locality" />
                  {errors.address && <p className="text-xs text-destructive mt-1">{errors.address.message}</p>}
                </div>
              ) : (
                <p className="text-sm font-medium text-slate-800 bg-slate-50 p-2.5 rounded-md border border-slate-200">
                  {profile.address}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="state">State</Label>
                {isEditing ? (
                  <div>
                    <select
                      id="state"
                      value={selectedState || ''}
                      onChange={handleStateChange}
                      className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Select State</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    {errors.state && <p className="text-xs text-destructive mt-1">{errors.state.message}</p>}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-slate-800 bg-slate-50 p-2.5 rounded-md border border-slate-200">
                    {profile.state}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                {isEditing ? (
                  <div>
                    <select
                      id="city"
                      {...register('city')}
                      disabled={!selectedState}
                      className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                    >
                      <option value="">{selectedState ? 'Select City' : 'Select state first'}</option>
                      {availableCities.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    {errors.city && <p className="text-xs text-destructive mt-1">{errors.city.message}</p>}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-slate-800 bg-slate-50 p-2.5 rounded-md border border-slate-200">
                    {profile.city}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial & KYC Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center space-x-2">
              <IndianRupee className="w-4 h-4 text-emerald-600" />
              <span>Financial & Identification Details</span>
            </CardTitle>
            <CardDescription>
              Details required for loan eligibility calculation and regulatory KYC compliance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="monthlyIncome">Declared Monthly Income (₹)</Label>
                {isEditing ? (
                  <div>
                    <Input
                      id="monthlyIncome"
                      type="number"
                      step="500"
                      {...register('monthlyIncome')}
                      placeholder="e.g. 50000"
                    />
                    {errors.monthlyIncome && (
                      <p className="text-xs text-destructive mt-1">{errors.monthlyIncome.message}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-slate-800 bg-slate-50 p-2.5 rounded-md border border-slate-200 font-mono">
                    ₹ {profile.monthlyIncome.toLocaleString('en-IN')}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="aadhaar" className="flex items-center justify-between">
                  <span>Aadhaar Number</span>
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Masked & Protected
                  </span>
                </Label>
                {isEditing ? (
                  <div>
                    <Input
                      id="aadhaar"
                      maxLength={14}
                      {...register('aadhaar')}
                      placeholder="Enter 12 digits only if updating"
                    />
                    <p className="text-[11px] text-text-secondary mt-1">
                      Current: <span className="font-mono">{profile.aadhaarMasked}</span>. Leave blank to keep existing.
                    </p>
                    {errors.aadhaar && <p className="text-xs text-destructive mt-1">{errors.aadhaar.message}</p>}
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-md border border-slate-200">
                    <span className="text-sm font-mono font-bold text-slate-800 tracking-wider">
                      {profile.aadhaarMasked}
                    </span>
                    <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200">
                      Encrypted
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* KYC Status indicator */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                  Overall KYC Status
                </span>
                <span className="text-sm font-medium text-slate-800">
                  {profile.kycStatus.replace('_', ' ')}
                </span>
              </div>
              <Badge
                variant={
                  profile.kycStatus === 'APPROVED'
                    ? 'success'
                    : profile.kycStatus === 'REJECTED'
                    ? 'destructive'
                    : profile.kycStatus === 'REUPLOAD_REQUIRED'
                    ? 'warning'
                    : 'outline'
                }
              >
                {profile.kycStatus}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};
