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
  Eye,
} from 'lucide-react';

interface Customer360Data {
  customer: {
    id: string;
    fullName: string;
    mobile: string;
    email: string;
    address: string;
    state: string;
    city: string;
    monthlyIncome: number;
    aadhaarMasked: string;
    kycStatus: string;
    status: string;
    createdAt: string;
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
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DOCS' | 'LOANS' | 'PAYMENTS' | 'TIMELINE'>('OVERVIEW');

  const { data, isLoading, isError } = useQuery<Customer360Data>({
    queryKey: ['admin-customer-detail', id],
    queryFn: async () => {
      if (!id) throw new Error('Customer ID is required');
      const res = await apiClient.get(API_ENDPOINTS.CUSTOMERS.DETAIL(id));
      return res.data;
    },
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3" />
        <div className="h-44 bg-slate-200 rounded-xl" />
        <div className="h-96 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
        <h3 className="text-base font-semibold text-red-900">Failed to load customer profile</h3>
        <p className="text-xs text-red-700 mt-1 mb-4">Could not retrieve 360 profile for this customer.</p>
        <Link to="/admin/customers">
          <Button size="sm" variant="outline">Back to Customers</Button>
        </Link>
      </Card>
    );
  }

  const { customer, documents, loans, payments, disbursements, timeline } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <Link to="/admin/customers" className="text-xs text-slate-500 hover:text-slate-800">
              Borrowers
            </Link>
            <span className="text-xs text-slate-400">/</span>
            <span className="text-xs font-semibold text-slate-900">{customer.fullName}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">{customer.fullName}</h1>
          <p className="text-xs text-slate-600">
            Registered: {new Date(customer.createdAt).toLocaleDateString('en-IN')} | Aadhaar:{' '}
            <span className="font-mono font-medium">{customer.aadhaarMasked}</span>
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Badge className="bg-emerald-600 text-white text-xs">{customer.kycStatus}</Badge>
          <Badge variant="outline" className="text-xs">{customer.status}</Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-2 overflow-x-auto text-xs font-medium">
        {[
          { key: 'OVERVIEW', label: 'Borrower 360 Overview' },
          { key: 'DOCS', label: `Documents (${documents.length})` },
          { key: 'LOANS', label: `Loans & Approvals (${loans.length})` },
          { key: 'PAYMENTS', label: `Payments & Disbursements (${payments.length})` },
          { key: 'TIMELINE', label: `Audit Timeline (${timeline.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`py-2 px-3.5 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 shadow-sm border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Personal & Demographic Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">Mobile Identity</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">+91 {customer.mobile}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">Email Address</span>
                  <span className="font-semibold text-slate-900 text-sm">{customer.email}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">Reported Monthly Income</span>
                  <span className="font-bold text-slate-900 text-sm">₹{customer.monthlyIncome.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">Aadhaar (Masked)</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{customer.aadhaarMasked}</span>
                </div>
                <div className="sm:col-span-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">Residential Address</span>
                  <span className="font-medium text-slate-900">{customer.address}, {customer.city}, {customer.state}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Account Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Total Loans Filed</span>
                <span className="font-bold text-slate-900">{loans.length}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Documents on Record</span>
                <span className="font-bold text-slate-900">{documents.length}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Payments Completed</span>
                <span className="font-bold text-emerald-700">{payments.filter((p) => p.status === 'PAID').length}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Total Disbursed</span>
                <span className="font-bold text-emerald-700">
                  ₹{disbursements.reduce((acc, d) => acc + d.amount, 0).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="pt-3">
                <Link to={`/admin/kyc/${customer.id}`}>
                  <Button size="sm" variant="outline" className="w-full text-xs h-8">
                    Open KYC Underwriting
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: DOCUMENTS */}
      {activeTab === 'DOCS' && (
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Uploaded Borrower Documents</CardTitle>
            <CardDescription>Identity and financial verification attachments</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Document Type</th>
                  <th className="py-2.5 px-4">File Name</th>
                  <th className="py-2.5 px-4">File Size</th>
                  <th className="py-2.5 px-4">Version</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Uploaded Date</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{doc.documentType}</td>
                    <td className="py-2.5 px-4 text-slate-700">{doc.fileName}</td>
                    <td className="py-2.5 px-4 text-slate-500">{(doc.fileSize / 1024).toFixed(1)} KB</td>
                    <td className="py-2.5 px-4 text-slate-500">v{doc.version}</td>
                    <td className="py-2.5 px-4">
                      <Badge variant="secondary" className="text-[10px]">{doc.status}</Badge>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">{new Date(doc.uploadedAt).toLocaleDateString('en-IN')}</td>
                    <td className="py-2.5 px-4 text-right">
                      <a
                        href={`/api/admin/kyc/documents/${doc.id}/file`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline font-medium inline-flex items-center text-xs"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View File
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: LOANS */}
      {activeTab === 'LOANS' && (
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Loan Applications History</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Application ID</th>
                  <th className="py-2.5 px-4">Requested</th>
                  <th className="py-2.5 px-4">Sanctioned</th>
                  <th className="py-2.5 px-4">Tenure</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Payment</th>
                  <th className="py-2.5 px-4">Agreement</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{loan.applicationNumber}</td>
                    <td className="py-2.5 px-4">₹{loan.requestedAmount.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-4 font-semibold text-emerald-800">
                      {loan.approvedAmount ? `₹${loan.approvedAmount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-2.5 px-4">{loan.tenureMonths}M</td>
                    <td className="py-2.5 px-4">
                      <Badge className="text-[10px]">{loan.status}</Badge>
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge variant="secondary" className="text-[10px]">{loan.paymentStatus}</Badge>
                    </td>
                    <td className="py-2.5 px-4">
                      {loan.agreement?.status === 'ACCEPTED' ? (
                        <span className="text-emerald-700 font-bold">Signed ✓</span>
                      ) : (
                        <span className="text-slate-400">Pending</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <Link to={`/admin/loans/${loan.id}`}>
                        <Button size="sm" variant="ghost" className="h-7 text-xs px-2">
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />
                          Review
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* TAB 4: PAYMENTS & DISBURSEMENTS */}
      {activeTab === 'PAYMENTS' && (
        <div className="space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payment & UTR Submissions</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Amount</th>
                    <th className="py-2.5 px-4">UTR Reference</th>
                    <th className="py-2.5 px-4">Method</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Submitted</th>
                    <th className="py-2.5 px-4">Verified By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5 px-4 font-bold text-slate-900">₹{p.amount}</td>
                      <td className="py-2.5 px-4 font-mono font-semibold">{p.utr}</td>
                      <td className="py-2.5 px-4">{p.paymentMethod}</td>
                      <td className="py-2.5 px-4">
                        <Badge className="text-[10px]">{p.status}</Badge>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">{new Date(p.submittedAt).toLocaleDateString('en-IN')}</td>
                      <td className="py-2.5 px-4 text-slate-700">{p.verifiedBy || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Disbursement Records</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Disbursed Amount</th>
                    <th className="py-2.5 px-4">Method</th>
                    <th className="py-2.5 px-4">Bank Reference</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Disbursed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {disbursements.map((d) => (
                    <tr key={d.id}>
                      <td className="py-2.5 px-4 font-bold text-emerald-800">₹{d.amount.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-4">{d.method}</td>
                      <td className="py-2.5 px-4 font-mono">{d.referenceId}</td>
                      <td className="py-2.5 px-4">
                        <Badge className="bg-emerald-600 text-white text-[10px]">{d.status}</Badge>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">{new Date(d.disbursedAt).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 5: CHRONOLOGICAL AUDIT TIMELINE */}
      {activeTab === 'TIMELINE' && (
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Chronological Borrower Audit Trail</CardTitle>
            <CardDescription>Immutable record of all lifecycle events and state transitions</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {timeline.length > 0 ? (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {timeline.map((item) => (
                  <div key={item.id} className="relative text-xs">
                    <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-emerald-600 ring-4 ring-white" />
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">{item.action}</span>
                      <Badge variant="outline" className="text-[10px]">{item.entity}</Badge>
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.timestamp).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Actor: <span className="font-semibold">{item.actorName}</span> ({item.actorType})
                      {item.ipAddress && <span className="ml-1 text-slate-400 font-mono">[{item.ipAddress}]</span>}
                    </p>
                    {item.details && (
                      <pre className="mt-1 p-2 rounded bg-slate-50 border border-slate-200 text-[10px] font-mono text-slate-700 overflow-x-auto">
                        {JSON.stringify(item.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">No audit records recorded yet.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
