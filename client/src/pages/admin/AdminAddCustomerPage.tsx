import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/api/client';

export const AdminAddCustomerPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Personal Info
  const [fullName, setFullName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('1992-05-14');

  // Address
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [pincode, setPincode] = useState('');

  // Identity
  const [aadhaar, setAadhaar] = useState('');
  const [pan, setPan] = useState('');

  // Bank
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [branch, setBranch] = useState('');
  const [accountType, setAccountType] = useState('SAVINGS');

  // Loan
  const [loanType, setLoanType] = useState('Personal Loan');
  const [loanAmount, setLoanAmount] = useState('100000');
  const [interestRate, setInterestRate] = useState('12.0');
  const [tenureMonths, setTenureMonths] = useState('12');
  const [status, setStatus] = useState('SUBMITTED');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto calculate estimated EMI
  const P = parseFloat(loanAmount) || 0;
  const r = (parseFloat(interestRate) || 0) / 12 / 100;
  const n = parseInt(tenureMonths) || 12;
  const estimatedEmi = r > 0 ? Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)) : Math.round(P / n);
  const totalPayable = estimatedEmi * n;

  const createMutation = useMutation({
    mutationFn: async () => {
      return api.post('/admin/customers/manual', {
        fullName: fullName.trim(),
        fatherName: fatherName.trim() || undefined,
        mobile: mobile.trim(),
        email: email.trim(),
        gender,
        dob,
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        aadhaar: aadhaar.trim(),
        pan: pan.trim(),
        bankName: bankName.trim() || undefined,
        accountHolder: accountHolder.trim() || fullName.trim(),
        accountNumber: accountNumber.trim() || undefined,
        ifsc: ifsc.trim() || undefined,
        branch: branch.trim() || undefined,
        accountType,
        loanType,
        requestedAmount: P,
        approvedAmount: ['APPROVED', 'ACTIVE', 'DISBURSED'].includes(status) ? P : undefined,
        interestRate: parseFloat(interestRate) || 12.0,
        tenureMonths: n,
        estimatedEmi,
        status,
      });
    },
    onSuccess: () => {
      setSuccessMsg('Customer record and loan account created successfully!');
      queryClient.invalidateQueries({ queryKey: ['adminCustomers'] });
      setTimeout(() => navigate('/admin/customers'), 1500);
    },
    onError: (err: unknown) => {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create customer');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !mobile || !email) {
      setErrorMsg('Full name, mobile number, and email address are required.');
      return;
    }
    setErrorMsg(null);
    createMutation.mutate();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-xs text-text-secondary">
        <Link to="/admin/dashboard" className="hover:text-text-primary transition">Dashboard</Link>
        <span>›</span>
        <Link to="/admin/customers" className="hover:text-text-primary transition">Customers</Link>
        <span>›</span>
        <span className="text-text-primary font-semibold">New Customer Origination</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Manual Customer & Loan Origination</h1>
        <p className="text-xs text-text-secondary">Create new customer profile, bank mandate, and originate corresponding loan file.</p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-success text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Demographics */}
        <Card className="bg-surface border-border rounded-2xl shadow-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-text-primary pb-2 border-b border-border">1. Borrower Personal Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Full Name *</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ajay Kumar"
                required
                className="bg-surface-elevated border-border text-text-primary text-xs h-9 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Father / Spouse Name</label>
              <Input
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="bg-surface-elevated border-border text-text-primary text-xs h-9 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Mobile Number (10 digits) *</label>
              <Input
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                maxLength={10}
                placeholder="8274842168"
                required
                className="bg-surface-elevated border-border text-text-primary font-mono text-xs h-9 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Email Address *</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ajay.kumar@example.com"
                required
                className="bg-surface-elevated border-border text-text-primary text-xs h-9 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full bg-surface-elevated border border-border rounded-lg p-2 text-xs text-text-primary"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Date of Birth</label>
              <Input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="bg-surface-elevated border-border text-text-primary text-xs h-9 rounded-lg"
              />
            </div>
          </div>
        </Card>

        {/* Section 2: Address & Identity */}
        <Card className="bg-surface border-border rounded-2xl shadow-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-text-primary pb-2 border-b border-border">2. Residential Address & KYC Identifiers</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Residential Address</label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Flat / House / Street Name"
                className="bg-surface-elevated border-border text-text-primary text-xs h-9 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">City</label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai"
                className="bg-surface-elevated border-border text-text-primary text-xs h-9 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">State</label>
              <Input
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Maharashtra"
                className="bg-surface-elevated border-border text-text-primary text-xs h-9 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">PIN Code</label>
              <Input
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="6 digit PIN"
                className="bg-surface-elevated border-border text-text-primary font-mono text-xs h-9 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Aadhaar Number</label>
              <Input
                value={aadhaar}
                onChange={(e) => setAadhaar(e.target.value)}
                placeholder="12 digits"
                className="bg-surface-elevated border-border text-text-primary font-mono text-xs h-9 rounded-lg"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">PAN Card Number</label>
              <Input
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                className="bg-surface-elevated border-border text-text-primary font-mono text-xs h-9 rounded-lg uppercase"
              />
            </div>
          </div>
        </Card>

        {/* Section 3: Bank Details */}
        <Card className="bg-surface border-border rounded-2xl shadow-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-text-primary pb-2 border-b border-border">3. Disbursal Bank Account Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Bank Name</label>
              <Input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. HDFC Bank Ltd"
                className="bg-surface-elevated border-border text-text-primary text-xs h-9 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Account Holder Name</label>
              <Input
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="Name as per Passbook"
                className="bg-surface-elevated border-border text-text-primary text-xs h-9 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Account Number</label>
              <Input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g. 50100492837192"
                className="bg-surface-elevated border-border text-text-primary font-mono text-xs h-9 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">IFSC Code</label>
              <Input
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                placeholder="e.g. HDFC0001234"
                className="bg-surface-elevated border-border text-text-primary font-mono text-xs h-9 rounded-lg uppercase"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Branch Name</label>
              <Input
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="e.g. BKC Mumbai"
                className="bg-surface-elevated border-border text-text-primary text-xs h-9 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Account Type</label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="w-full bg-surface-elevated border border-border rounded-lg p-2 text-xs text-text-primary"
              >
                <option value="SAVINGS">SAVINGS</option>
                <option value="CURRENT">CURRENT</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Section 4: Loan Parameters */}
        <Card className="bg-surface border-border rounded-2xl shadow-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-text-primary pb-2 border-b border-border">4. Loan Parameters & Origination Status</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Loan Type</label>
              <select
                value={loanType}
                onChange={(e) => setLoanType(e.target.value)}
                className="w-full bg-surface-elevated border border-border rounded-lg p-2 text-xs text-text-primary"
              >
                <option value="Personal Loan">Personal Loan</option>
                <option value="Business Loan">Business Loan</option>
                <option value="Salary Loan">Salary Loan</option>
                <option value="MSME Loan">MSME Loan</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Sanction / Requested Amount (₹)</label>
              <Input
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                className="bg-surface-elevated border-border text-text-primary text-xs h-9 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Tenure (Months)</label>
              <Input
                type="number"
                value={tenureMonths}
                onChange={(e) => setTenureMonths(e.target.value)}
                className="bg-surface-elevated border-border text-text-primary text-xs h-9 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Interest Rate (% p.a.)</label>
              <Input
                type="number"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="bg-surface-elevated border-border text-text-primary text-xs h-9 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Initial Loan Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-surface-elevated border border-border rounded-lg p-2 text-xs text-text-primary"
              >
                <option value="SUBMITTED">SUBMITTED (Pending)</option>
                <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                <option value="APPROVED">APPROVED (Ready for Agreement)</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
            <div className="p-3 rounded-xl bg-surface-elevated border border-border text-center flex flex-col justify-center">
              <span className="text-[10px] text-text-secondary block uppercase">Calculated EMI • Total Payable</span>
              <span className="text-base font-black text-success">
                ₹{estimatedEmi.toLocaleString('en-IN')}/mo • ₹{totalPayable.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </Card>

        <div className="flex space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            className="h-11 px-6 border-border text-text-secondary text-xs rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="h-11 px-8 bg-primary text-background hover:bg-secondary text-text-primary font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{createMutation.isPending ? 'Saving Customer...' : 'Save & Originate Loan'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminAddCustomerPage;
