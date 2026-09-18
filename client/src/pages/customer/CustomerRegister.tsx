import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserCheck, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/api/client';
import { INDIAN_STATES, getCitiesByState } from '@/constants/indianLocations';

const registerFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters'),
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

type RegisterFormData = z.infer<typeof registerFormSchema>;

export const CustomerRegister: React.FC = () => {
  const [selectedState, setSelectedState] = useState<string>('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const { registerCustomer } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      fullName: '',
      mobile: '',
      email: '',
      address: '',
      state: '',
      city: '',
      aadhaar: '',
      monthlyIncome: '' as unknown as number,
    },
  });

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newState = e.target.value;
    setSelectedState(newState);
    setValue('state', newState, { shouldValidate: true });
    
    // Dynamically filter cities based on the selected state
    const cities = getCitiesByState(newState);
    setAvailableCities(cities);
    setValue('city', '', { shouldValidate: true });
  };

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setApiError(null);
      await registerCustomer({
        ...data,
        monthlyIncome: Number(data.monthlyIncome),
      });
      navigate('/customer/dashboard', { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setApiError(err.message);
      } else {
        setApiError('Registration failed. Please check your connection and try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <header className="max-w-2xl mx-auto w-full pt-2 mb-4">
        <Link to="/customer/login" className="inline-flex items-center space-x-2 text-slate-700 hover:text-slate-900 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sign In</span>
        </Link>
      </header>

      {/* Main Registration Card */}
      <main className="max-w-2xl w-full mx-auto my-auto">
        <Card className="shadow-lg border-border">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2">
              <UserCheck className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Borrower Registration</CardTitle>
            <CardDescription className="text-sm">
              Create your account to apply for instant loans and track repayment schedules.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {apiError && (
              <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-start space-x-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <span className="font-medium">{apiError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Row 1: Full Name & Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="e.g. Ramesh Kumar Sharma"
                    {...register('fullName')}
                  />
                  {errors.fullName && (
                    <p className="text-xs text-destructive">{errors.fullName.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mobile">Mobile Number (Primary Identifier)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm text-slate-500 font-medium">+91</span>
                    <Input
                      id="mobile"
                      type="tel"
                      placeholder="98765 43210"
                      className="pl-12"
                      maxLength={10}
                      {...register('mobile')}
                    />
                  </div>
                  {errors.mobile && (
                    <p className="text-xs text-destructive">{errors.mobile.message}</p>
                  )}
                </div>
              </div>

              {/* Row 2: Email & Monthly Income */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ramesh.sharma@example.com"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="monthlyIncome">Monthly Income (₹)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm text-slate-500 font-medium">₹</span>
                    <Input
                      id="monthlyIncome"
                      type="number"
                      placeholder="50,000"
                      className="pl-8"
                      {...register('monthlyIncome')}
                    />
                  </div>
                  {errors.monthlyIncome && (
                    <p className="text-xs text-destructive">{errors.monthlyIncome.message}</p>
                  )}
                </div>
              </div>

              {/* Row 3: Residential Address */}
              <div className="space-y-1.5">
                <Label htmlFor="address">Residential Address</Label>
                <Input
                  id="address"
                  placeholder="Flat / House No., Street, Landmark"
                  {...register('address')}
                />
                {errors.address && (
                  <p className="text-xs text-destructive">{errors.address.message}</p>
                )}
              </div>

              {/* Row 4: Connected State & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="state">State</Label>
                  <Select
                    id="state"
                    value={selectedState}
                    onChange={handleStateChange}
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </Select>
                  {errors.state && (
                    <p className="text-xs text-destructive">{errors.state.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="city">City</Label>
                  <Select
                    id="city"
                    disabled={!selectedState}
                    {...register('city')}
                  >
                    <option value="">{selectedState ? 'Select City' : 'Choose state first'}</option>
                    {availableCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </Select>
                  {errors.city && (
                    <p className="text-xs text-destructive">{errors.city.message}</p>
                  )}
                </div>
              </div>

              {/* Row 5: Aadhaar Number */}
              <div className="space-y-1.5">
                <Label htmlFor="aadhaar">Aadhaar Number (12 Digits)</Label>
                <Input
                  id="aadhaar"
                  placeholder="1234 5678 9012"
                  maxLength={12}
                  {...register('aadhaar')}
                />
                <p className="text-[11px] text-muted-foreground">
                  Your Aadhaar is protected with bank-grade encryption and will always be masked in the dashboard.
                </p>
                {errors.aadhaar && (
                  <p className="text-xs text-destructive">{errors.aadhaar.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 text-base font-semibold flex items-center justify-center space-x-2 shadow-md mt-6"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <span>Register & Continue</span>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center pt-4 border-t border-border text-xs text-slate-600">
              <p>
                Already have an account?{' '}
                <Link to="/customer/login" className="font-semibold text-primary hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="max-w-2xl mx-auto w-full text-center pb-4 text-xs text-muted-foreground">
        <p>© 2026 Loan Approve Financial Services. Safe, verified, regulatory compliant.</p>
      </footer>
    </div>
  );
};
