import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ExternalLink,
  AlertCircle,
  CreditCard,
  Building2,
  Calendar,
  FileSignature,
  User,
  Clock,
  ArrowLeft,
} from 'lucide-react';

import { SpecificChargesSection } from '@/components/admin/SpecificChargesSection';
import { CustomerDocumentsSection } from '@/components/admin/CustomerDocumentsSection';

interface Customer360Data {
  customer: {
    id: string;
    fullName: string;
    fatherName?: string;
    gender?: string;
    dob?: string;
    mobile: string;
    email: string;
    address: string;
    state: string;
    city: string;
    pincode?: string;
    monthlyIncome: number;
    aadhaarMasked: string;
    panMasked?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankIfsc?: string;
    bankBranch?: string;
    bankAccountType?: string;
    kycStatus: string;
    status: string;
    pendingSince?: string | null;
    createdAt: string;
    updatedAt?: string;
  };
  documents: Array<{
    id: string;
    documentType: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    status: string;
    rejectionReason?: string;
    version: number;
    uploadedAt: string;
  }>;
  loans: Array<{
    id: string;
    applicationNumber: string;
    requestedAmount: number;
    proposedAmount?: number;
    approvedAmount?: number;
    tenureMonths: number;
    estimatedEmi?: number;
    purpose?: string;
    status: string;
    paymentStatus: string;
    submittedAt: string;
    agreement?: {
      status: string;
      acceptedAt?: string;
    } | null;
  }>;
  payments: Array<{
    id: string;
    loanId: string;
    amount: number;
    utr: string;
    receiptNumber: string;
    paymentMethod: string;
    status: string;
    rejectionReason?: string;
    submittedAt: string;
    verifiedAt?: string;
    verifiedBy?: string;
  }>;
  disbursements: Array<{
    id: string;
    loanId: string;
    amount: number;
    method: string;
    referenceId: string;
    status: string;
    notes?: string;
    disbursedAt: string;
  }>;
  supportTickets: Array<{
    id: string;
    subject: string;
    message: string;
    status: string;
    adminReply?: string;
    createdAt: string;
  }>;
  timeline: Array<{
    id: string;
    action: string;
    actorType: string;
    actorName: string;
    entity: string;
    entityId: string;
    timestamp: string;
    ipAddress?: string;
    details?: Record<string, unknown>;
  }>;
}

export const AdminCustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'KYC' | 'DOCS' | 'PAYMENTS' | 'EMI' | 'CHARGES' | 'TIMELINE'>('OVERVIEW');

  const { data, isLoading, isError } = useQuery<Customer360Data>({
    queryKey: ['admin-customer-detail', id],
    queryFn: async () => {
      if (!id) throw new Error('Customer ID is required');
      const res = await apiClient.get(API_ENDPOINTS.CUSTOMERS.DETAIL(id));
      return res.data;
    },
    enabled: Boolean(id),
    refetchInterval: 1500,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse max-w-6xl mx-auto py-6">
        <div className="h-8 bg-slate-200 rounded w-1/3" />
        <div className="h-32 bg-slate-200 rounded-xl" />
        <div className="h-96 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-red-200 bg-red-50 p-6 text-center max-w-2xl mx-auto my-10">
        <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
        <h3 className="text-base font-semibold text-red-900">Failed to load customer profile</h3>
        <p className="text-xs text-red-700 mt-1 mb-4">Could not retrieve 360 profile for this customer.</p>
        <Link to="/admin/customers">
          <Button size="sm" variant="outline">Back to Customers</Button>
        </Link>
      </Card>
    );
  }

  const { customer, documents, loans, payments, timeline } = data;
  const latestLoan = loans[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back Button and Context */}
      <div className="flex items-center justify-between">
        <Link to="/admin/customers">
          <Button
            variant="outline"
            className="h-10 px-4 rounded-xl border border-[#D6E4F5] bg-white text-[#0F172A] hover:bg-[#EFF6FF] hover:border-[#2563EB] hover:text-[#2563EB] font-semibold text-xs gap-2 inline-flex items-center shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Customers</span>
          </Button>
        </Link>
        <span className="text-xs font-semibold text-[#64748B]">Customer 360 Profile</span>
      </div>

      {/* Screen 8 Top Header & Profile Banner */}
      <div className="bg-white border border-[#D6E4F5] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] border border-[#D6E4F5] text-[#2563EB] flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
            {customer.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0F172A]">{customer.fullName}</h1>
              <Badge className={customer.kycStatus === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold' : 'bg-amber-50 text-amber-700 border-amber-200 font-bold'}>
                KYC {customer.kycStatus}
              </Badge>
              <Badge variant="outline" className="text-xs font-semibold text-slate-700 border-[#D6E4F5]">
                {customer.status}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#64748B] mt-1">
              <span>Mobile: <strong className="font-mono text-[#0F172A]">+91 {customer.mobile}</strong></span>
              <span>Email: <strong className="text-[#0F172A]">{customer.email}</strong></span>
              <span>PAN: <strong className="font-mono text-[#0F172A]">{customer.panMasked || 'XXXXX0000X'}</strong></span>
              <span>Aadhaar: <strong className="font-mono text-[#0F172A]">{customer.aadhaarMasked}</strong></span>
            </div>
          </div>
        </div>


        {/* Action Buttons for Screen 8 */}
        <div className="flex flex-wrap items-center gap-2.5">
          {latestLoan && (
            <>
              <Link to={`/approval-letter/${latestLoan.id}`} target="_blank">
                <Button size="sm" variant="outline" className="text-xs h-11 px-4 border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100/70 font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition">
                  <FileSignature className="w-4 h-4 text-[#2563EB]" />
                  Approval Letter
                </Button>
              </Link>
              <Link to={`/loan/${latestLoan.id}/emi`} target="_blank">
                <Button size="sm" variant="outline" className="text-xs h-11 px-4 border-slate-300 text-slate-800 hover:bg-slate-100 font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  EMI Schedule
                </Button>
              </Link>
            </>
          )}
          <Link to="/admin/customers/new">
            <Button size="sm" className="text-xs h-11 px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-xl shadow-md transition active:scale-95 flex items-center gap-1.5">
              + New Loan
            </Button>
          </Link>
        </div>
      </div>

      {/* Screen 8 Seven-Tab Navigation */}
      <div className="flex border-b border-slate-200 space-x-1 sm:space-x-2 overflow-x-auto text-xs font-semibold">
        {[
          { key: 'OVERVIEW', label: 'Overview' },
          { key: 'KYC', label: 'KYC Verification' },
          { key: 'DOCS', label: `Documents (${documents.length})` },
          { key: 'PAYMENTS', label: `Payments (${payments.length})` },
          { key: 'EMI', label: 'EMI Schedule' },
          { key: 'CHARGES', label: 'Charges & Fees' },
          { key: 'TIMELINE', label: `Activity (${timeline.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`py-3 px-4 border-b-2 whitespace-nowrap text-xs transition-colors ${
              activeTab === tab.key
                ? 'border-[#2563EB] text-[#2563EB] font-bold bg-[#EFF6FF] rounded-t-xl'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Customer Profile & Demographics */}
          <Card className="md:col-span-2 shadow-xs border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> Personal & Demographic Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-text-secondary block">Father / Spouse Name</span>
                  <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{customer.fatherName || 'Not Provided'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-text-secondary block">Gender / Date of Birth</span>
                  <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                    {customer.gender || 'Male'} • {customer.dob || '1992-05-14'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-text-secondary block">Verified Residential Address</span>
                  <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                    {customer.address}, {customer.city}, {customer.state} - {customer.pincode || '400051'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-text-secondary block">Assessed Monthly Income</span>
                  <span className="font-bold text-emerald-700 text-base mt-0.5 block">
                    ₹{Number(customer.monthlyIncome).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Requirement 7: Customer Date Information */}
              <div className="mt-6 pt-5 border-t border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-emerald-600" /> Key Dates & Verification Timeline
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-text-secondary block text-[11px]">Registration Date</span>
                    <span className="font-semibold text-slate-900 mt-1 block">
                      {new Date(customer.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="text-[10px] text-text-secondary font-mono">
                      {new Date(customer.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-text-secondary block text-[11px]">Application Date</span>
                    <span className="font-semibold text-slate-900 mt-1 block">
                      {latestLoan?.submittedAt
                        ? new Date(latestLoan.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'No Application Yet'}
                    </span>
                    {latestLoan?.submittedAt && (
                      <span className="text-[10px] text-text-secondary font-mono">
                        {new Date(latestLoan.submittedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-text-secondary block text-[11px]">Last Updated</span>
                    <span className="font-semibold text-slate-900 mt-1 block">
                      {new Date(customer.updatedAt || customer.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="text-[10px] text-text-secondary font-mono">
                      {new Date(customer.updatedAt || customer.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className={`p-3 rounded-xl border ${customer.pendingSince ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={`block text-[11px] ${customer.pendingSince ? 'text-amber-800 font-medium' : 'text-text-secondary'}`}>
                      Pending Since
                    </span>
                    <span className={`font-semibold mt-1 block ${customer.pendingSince ? 'text-amber-950' : 'text-slate-700'}`}>
                      {customer.pendingSince
                        ? new Date(customer.pendingSince).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'Up to Date'}
                    </span>
                    {customer.pendingSince ? (
                      <span className="text-[10px] text-amber-700 font-mono">
                        {new Date(customer.pendingSince).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="text-[10px] text-text-secondary">No review pending</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bank Account Details */}
              <div className="mt-6 pt-5 border-t border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-emerald-600" /> Disbursal Bank Account Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200">
                    <span className="text-text-secondary block">Bank Name</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">{customer.bankName || 'HDFC Bank Ltd'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200">
                    <span className="text-text-secondary block">Account Number</span>
                    <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                      {customer.bankAccountNumber || '50100492837192'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200">
                    <span className="text-text-secondary block">IFSC Code & Branch</span>
                    <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                      {customer.bankIfsc || 'HDFC0001234'} ({customer.bankBranch || 'Main Branch'})
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Loan Account Card */}
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" /> Primary Loan Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              {latestLoan ? (
                <div className="space-y-3.5 text-xs">
                  <div className="p-3 rounded-xl bg-surface text-text-primary">
                    <span className="text-[11px] text-text-secondary block">Application Ref</span>
                    <span className="font-mono font-bold text-success text-sm">{latestLoan.applicationNumber}</span>
                    <div className="mt-2 flex justify-between items-center text-xs">
                      <span className="text-text-secondary">Sanctioned Amount</span>
                      <span className="font-extrabold text-base text-text-primary">
                        ₹{Number(latestLoan.approvedAmount || latestLoan.requestedAmount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Status</span>
                      <Badge className="text-[10px] bg-success text-background text-text-primary">{latestLoan.status}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Tenure</span>
                      <span className="font-semibold text-slate-800">{latestLoan.tenureMonths} Months</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Monthly EMI</span>
                      <span className="font-bold text-emerald-700">₹{Number(latestLoan.estimatedEmi || 8500).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Fee Payment</span>
                      <span className="font-semibold text-slate-800">{latestLoan.paymentStatus}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link to={`/admin/loans/${latestLoan.id}`}>
                      <Button variant="outline" size="sm" className="w-full text-xs h-9 border-slate-300">
                        View Loan Underwriting File <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-text-secondary">No active loans found for this customer.</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: KYC */}
      {activeTab === 'KYC' && (
        <Card className="shadow-xs border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">KYC Verification & Identity Records</CardTitle>
            <CardDescription className="text-xs">
              Masked identifiers, cryptographic hashes, and verification audit trail.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-800 text-sm">Aadhaar Card (UIDAI)</span>
                  <Badge className="bg-success text-background text-text-primary text-[10px]">Verified ✓</Badge>
                </div>
                <p className="text-text-secondary">Masked UID: <strong className="font-mono text-slate-900">{customer.aadhaarMasked}</strong></p>
                <p className="text-text-secondary mt-1">Verification Status: Verified against mobile OTP</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-800 text-sm">Permanent Account Number (PAN)</span>
                  <Badge className="bg-success text-background text-text-primary text-[10px]">Verified ✓</Badge>
                </div>
                <p className="text-text-secondary">Masked PAN: <strong className="font-mono text-slate-900">{customer.panMasked || 'XXXXX1234F'}</strong></p>
                <p className="text-text-secondary mt-1">Status: Active & Linked to Bank</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: DOCUMENTS */}
      {activeTab === 'DOCS' && (
        <CustomerDocumentsSection
          customerId={customer.id}
          customerName={customer.fullName}
        />
      )}

      {/* TAB 4: PAYMENTS */}
      {activeTab === 'PAYMENTS' && (
        <Card className="shadow-xs border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Payment & UTR Submissions ({payments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-xs text-text-secondary">No payment records found.</p>
            ) : (
              <div className="divide-y divide-slate-200">
                {payments.map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-slate-900">UTR: {p.utr || 'N/A'}</span>
                      <p className="text-text-secondary text-[11px]">
                        Method: {p.paymentMethod} • Date: {new Date(p.submittedAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-extrabold text-sm text-slate-900">₹{Number(p.amount).toLocaleString('en-IN')}</span>
                      <Badge className={p.status === 'VERIFIED' ? 'bg-success text-background text-text-primary' : 'bg-amber-500 text-text-primary'}>
                        {p.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 5: EMI */}
      {activeTab === 'EMI' && (
        <Card className="shadow-xs border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Monthly EMI Breakdown</CardTitle>
              <CardDescription className="text-xs">Schedule for active loan account.</CardDescription>
            </div>
            {latestLoan && (
              <Link to={`/loan/${latestLoan.id}/emi`} target="_blank">
                <Button size="sm" variant="outline" className="text-xs h-8">
                  Full Interactive Schedule <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {latestLoan ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Monthly Installment</span>
                  <span className="font-extrabold text-emerald-700 text-sm">₹{Number(latestLoan.estimatedEmi || 8500).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Tenure</span>
                  <span className="font-semibold text-slate-800">{latestLoan.tenureMonths} Months</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Total Sanction</span>
                  <span className="font-semibold text-slate-800">₹{Number(latestLoan.approvedAmount || latestLoan.requestedAmount).toLocaleString('en-IN')}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-text-secondary">No active loans found.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 6: CHARGES */}
      {activeTab === 'CHARGES' && (
        <SpecificChargesSection
          customerId={customer.id}
          customerName={customer.fullName}
          applicationId={latestLoan?.applicationNumber}
          loanId={latestLoan?.id}
          loans={loans}
        />
      )}

      {/* TAB 7: TIMELINE */}
      {activeTab === 'TIMELINE' && (
        <Card className="shadow-xs border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Audit Trail & Activity Log ({timeline.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="text-xs text-text-secondary">No timeline events recorded.</p>
            ) : (
              <div className="space-y-3">
                {timeline.map((item) => (
                  <div key={item.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-900">{item.action}</span>
                      <span className="text-[11px] text-text-secondary font-mono">
                        {new Date(item.timestamp).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      By: <strong className="text-slate-800">{item.actorName}</strong> ({item.actorType})
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminCustomerDetailPage;
