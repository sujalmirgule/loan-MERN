import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Smartphone, ArrowRight, AlertCircle, RefreshCw, Landmark } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/api/client';

export const CustomerLogin: React.FC = () => {
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { loginCustomer } = useAuth();
  const navigate = useNavigate();

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobile(raw);
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!/^[6-9]/.test(mobile)) {
      setError('Mobile number must start with 6, 7, 8, or 9.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await loginCustomer(mobile);
      navigate('/customer/dashboard', { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setError('No customer account found with this number. Please register below.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Unable to sign in. Please check your network connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Brand Bar */}
      <header className="max-w-md mx-auto w-full pt-4">
        <Link to="/" className="inline-flex items-center space-x-2 text-slate-900 font-bold text-lg">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <Landmark className="w-5 h-5" />
          </div>
          <span>Loan Approve</span>
        </Link>
      </header>

      {/* Main Login Card */}
      <main className="max-w-md w-full mx-auto my-auto">
        <Card className="shadow-lg border-border">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2">
              <Smartphone className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Welcome to Loan Approve</CardTitle>
            <CardDescription className="text-sm">
              Enter your registered 10-digit mobile number to access your loans and payments.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-start space-x-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="mobile-input">Mobile Number</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-slate-500 font-medium">
                    +91
                  </span>
                  <Input
                    id="mobile-input"
                    type="tel"
                    placeholder="98765 43210"
                    value={mobile}
                    onChange={handleMobileChange}
                    className="pl-12 text-base tracking-wider font-medium"
                    maxLength={10}
                    autoFocus
                    required
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Passwordless authentication. No OTP required for instant verified access.
                </p>
              </div>

              <Button
                type="submit"
                disabled={mobile.length !== 10 || isSubmitting}
                className="w-full h-11 text-base font-semibold flex items-center justify-center space-x-2 shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center pt-4 border-t border-border text-xs text-slate-600">
              <p>
                Don&apos;t have an account yet?{' '}
                <Link
                  to="/customer/register"
                  className="font-semibold text-primary hover:underline"
                >
                  Create Account
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="max-w-md mx-auto w-full text-center pb-4 text-xs text-muted-foreground">
        <p>© 2026 Loan Approve. All financial data is encrypted and secure.</p>
      </footer>
    </div>
  );
};
