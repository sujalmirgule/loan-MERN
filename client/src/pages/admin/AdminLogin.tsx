import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/api/client';

export const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both email address and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await loginAdmin(email.trim(), password);
      navigate('/admin/dashboard', { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Authentication service unavailable. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Header */}
      <header className="max-w-md mx-auto w-full pt-4">
        <Link to="/" className="inline-flex items-center space-x-2 text-slate-400 hover:text-white text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Admin Card */}
      <main className="max-w-md w-full mx-auto my-auto">
        <Card className="shadow-2xl border-slate-800 bg-slate-900 text-white">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2 shadow-inner">
              <Shield className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-white">
              Admin Console
            </CardTitle>
            <CardDescription className="text-sm text-slate-400">
              Sign in with your administrative credentials to manage borrowers, loans, and disbursements.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-950/50 border border-red-800 text-xs text-red-300 flex items-start space-x-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="admin-email" className="text-slate-300">
                  Email Address
                </Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@loanapprove.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admin-password" className="text-slate-300">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={!email || !password || isSubmitting}
                className="w-full h-11 text-base font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center space-x-2 shadow-lg transition-all mt-6"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <span>Access Command Center</span>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center pt-4 border-t border-slate-800 text-[11px] text-slate-500">
              <p>Restricted access. All authentication attempts are logged for security compliance.</p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="max-w-md mx-auto w-full text-center pb-4 text-xs text-slate-600">
        <p>© 2026 Loan Approve Admin Portal. Multi-factor capable infrastructure.</p>
      </footer>
    </div>
  );
};
