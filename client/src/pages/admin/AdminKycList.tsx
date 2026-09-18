import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  Clock,
  RotateCw,
  AlertCircle,
  FileText,
  ChevronRight,
  Loader2,
  Filter,
} from 'lucide-react';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface KycCustomerSummary {
  id: string;
  fullName: string;
  mobile: string;
  email: string;
  state: string;
  city: string;
  accountStatus: string;
  kycStatus: string;
  createdAt: string;
  updatedAt: string;
  docStats: {
    total: number;
    approved: number;
    pending: number;
    reuploadRequired: number;
    rejected: number;
  };
}

export const AdminKycList: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<KycCustomerSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchKycList = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (searchTerm.trim().length > 0) params.append('search', searchTerm.trim());

      const res = await apiClient.get(`${API_ENDPOINTS.ADMIN.KYC_LIST}?${params.toString()}`);
      setCustomers(res.data.data.customers || []);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to load KYC queue';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    fetchKycList();
  }, [fetchKycList]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchKycList();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Badge variant="success" className="flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
          </Badge>
        );
      case 'REUPLOAD_REQUIRED':
        return (
          <Badge variant="warning" className="flex items-center space-x-1">
            <RotateCw className="w-3 h-3 mr-1" /> Re-upload
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="destructive" className="flex items-center space-x-1">
            <AlertCircle className="w-3 h-3 mr-1" /> Rejected
          </Badge>
        );
      case 'UNDER_REVIEW':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 flex items-center space-x-1">
            <Clock className="w-3 h-3 mr-1" /> Under Review
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-slate-500 bg-slate-100">
            Pending
          </Badge>
        );
    }
  };

  const statusFilters = [
    { label: 'All Customers', value: 'ALL' },
    { label: 'Under Review', value: 'UNDER_REVIEW' },
    { label: 'Re-upload Needed', value: 'REUPLOAD_REQUIRED' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">KYC & Document Verification</h1>
          <p className="text-sm text-slate-500 mt-1">
            Verify customer identity documents, review Aadhaar/PAN cards, and approve loan eligibility.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
            {statusFilters.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === tab.value
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Search by customer name, mobile (+91), or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
            <Button type="submit" variant="default" size="sm" className="px-4">
              <Filter className="w-4 h-4 mr-1.5" />
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Customer List Table / Cards */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-slate-500 font-medium">Loading KYC queue...</p>
        </div>
      ) : customers.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No Customers Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No customer records match the current status filter or search parameters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Customer Name & Contact</th>
                  <th className="px-6 py-3.5">Location</th>
                  <th className="px-6 py-3.5">KYC Status</th>
                  <th className="px-6 py-3.5">Document Progress</th>
                  <th className="px-6 py-3.5">Registered Date</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-semibold text-slate-900 block">{c.fullName}</span>
                        <span className="text-xs text-slate-500 font-mono">+91 {c.mobile}</span>
                        <span className="text-xs text-slate-400 block truncate max-w-[200px]">{c.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      <span>{c.city}, {c.state}</span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(c.kycStatus)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs space-y-1">
                        <span className="font-medium text-slate-700">
                          {c.docStats.approved} / {c.docStats.total} Approved
                        </span>
                        {c.docStats.pending > 0 && (
                          <span className="text-[11px] text-amber-600 block">
                            • {c.docStats.pending} pending review
                          </span>
                        )}
                        {c.docStats.reuploadRequired > 0 && (
                          <span className="text-[11px] text-orange-600 block">
                            • {c.docStats.reuploadRequired} re-upload needed
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(c.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/admin/kyc/${c.id}`)}
                        className="text-xs flex items-center space-x-1 ml-auto"
                      >
                        <span>Review KYC</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
