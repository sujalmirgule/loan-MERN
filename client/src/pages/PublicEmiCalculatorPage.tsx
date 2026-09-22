import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calculator, ArrowLeft, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBranding } from '@/contexts/BrandingContext';
import { useBrandTitle } from '@/hooks/useBrandTitle';

export const PublicEmiCalculatorPage: React.FC = () => {
  const navigate = useNavigate();
  const { branding } = useBranding();
  useBrandTitle('EMI Calculator');

  const [loanType, setLoanType] = useState<'PERSONAL' | 'BUSINESS'>('PERSONAL');
  const [loanAmount, setLoanAmount] = useState<number>(200000);
  const [interestRate, setInterestRate] = useState<number>(12);
  const [tenureMonths, setTenureMonths] = useState<number>(24);

  // EMI Formula: P * r * (1 + r)^n / ((1 + r)^n - 1)
  const monthlyRate = interestRate / 12 / 100;
  const emi = Math.round(
    (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
      (Math.pow(1 + monthlyRate, tenureMonths) - 1)
  );
  const totalPayable = emi * tenureMonths;
  const totalInterest = Math.max(0, totalPayable - loanAmount);

  const handleApply = () => {
    navigate(`/customer/register?amount=${loanAmount}&tenure=${tenureMonths}&type=${loanType}`);
  };

  return (
    <div className="min-h-screen bg-surface-elevated text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-border bg-surface/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 text-text-secondary hover:text-text-primary transition">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>
          <div className="flex items-center space-x-2">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.appName} className="w-8 h-8 rounded-lg object-contain shadow-md shadow-blue-500/20" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary text-background flex items-center justify-center text-text-primary font-bold shadow-md shadow-blue-500/20">
                {branding.appName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="font-bold text-base tracking-tight text-text-primary">{branding.appName}</span>
          </div>
          <Link to="/customer/login" className="text-xs text-primary font-semibold hover:underline">
            Login
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto w-full px-4 py-6 flex-1">
        <div className="text-center mb-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-primary/20 text-primary text-xs font-semibold mb-2">
            <Calculator className="w-3.5 h-3.5" />
            <span>Interactive Financial Tool</span>
          </div>
          <h1 className="text-2xl font-black text-text-primary">EMI Calculator</h1>
          <p className="text-xs text-text-secondary mt-1">Estimate your monthly installments and plan your borrowing.</p>
        </div>

        {/* Card Screen 5 Implementation */}
        <Card className="bg-surface border-border text-slate-100 shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border">
            {/* Category Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-surface-elevated/80 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setLoanType('PERSONAL');
                  setInterestRate(12);
                }}
                className={`py-2 rounded-lg transition-all ${
                  loanType === 'PERSONAL'
                    ? 'bg-primary text-background text-text-primary shadow-md'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Personal Loan
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoanType('BUSINESS');
                  setInterestRate(14);
                }}
                className={`py-2 rounded-lg transition-all ${
                  loanType === 'BUSINESS'
                    ? 'bg-primary text-background text-text-primary shadow-md'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Business Loan
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-6">
            {/* Slider 1: Loan Amount */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-text-secondary">
                <span>Loan Amount</span>
                <span className="text-base font-extrabold text-text-primary">₹{loanAmount.toLocaleString('en-IN')}</span>
              </div>
              <input
                type="range"
                min={50000}
                max={5000000}
                step={25000}
                value={loanAmount}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="w-full h-2 bg-surface-elevated rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-text-secondary">
                <span>₹50,000</span>
                <span>₹50,00,000</span>
              </div>
            </div>

            {/* Slider 2: Interest Rate */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-text-secondary">
                <span>Interest Rate (% per annum)</span>
                <span className="text-base font-extrabold text-text-primary">{interestRate}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={36}
                step={0.5}
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                className="w-full h-2 bg-surface-elevated rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-text-secondary">
                <span>5%</span>
                <span>36%</span>
              </div>
            </div>

            {/* Slider 3: Tenure Months */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-text-secondary">
                <span>Tenure (Months)</span>
                <span className="text-base font-extrabold text-text-primary">{tenureMonths}</span>
              </div>
              <input
                type="range"
                min={6}
                max={84}
                step={6}
                value={tenureMonths}
                onChange={(e) => setTenureMonths(Number(e.target.value))}
                className="w-full h-2 bg-surface-elevated rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-text-secondary">
                <span>6</span>
                <span>84</span>
              </div>
            </div>

            {/* Results Card */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-success/20 text-center space-y-3">
              <span className="text-xs font-semibold text-success uppercase tracking-wider">Estimated Monthly EMI</span>
              <div className="text-3xl font-black text-success">
                ₹{emi.toLocaleString('en-IN')}{' '}
                <span className="text-xs font-normal text-text-secondary">/ month</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border text-xs">
                <div className="text-left">
                  <span className="text-text-secondary block text-[11px]">Total Interest</span>
                  <span className="font-bold text-text-primary">₹{totalInterest.toLocaleString('en-IN')}</span>
                </div>
                <div className="text-right">
                  <span className="text-text-secondary block text-[11px]">Total Payable</span>
                  <span className="font-bold text-text-primary">₹{totalPayable.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <Button
              onClick={handleApply}
              className="w-full h-12 bg-primary text-background hover:bg-secondary text-text-primary font-bold rounded-xl text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2"
            >
              <span>Apply for this loan</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Security / Trust Footer */}
        <div className="flex items-center justify-center space-x-6 text-[11px] text-text-secondary mt-6">
          <div className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>100% Secure</span>
          </div>
          <div className="flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Instant Sanction</span>
          </div>
        </div>
      </main>
    </div>
  );
};
