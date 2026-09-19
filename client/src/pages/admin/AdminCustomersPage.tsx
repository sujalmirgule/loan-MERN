import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

interface CustomerRecord {
  id: string;
  fullName: string;
  mobile: string;
  email: string;
  address: string;
  state: string;
  city: string;
  monthlyIncome: number;
  kycStatus: string;
  accountStatus: string;
  loanStatus: string;
  paymentStatus: string;
  createdAt: string;
}

interface CustomersListResponse {
  data: CustomerRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const AdminCustomersPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [kycStatus, setKycStatus] = useState('ALL');

  const { data, isLoading, refetch } = useQuery<CustomersListResponse>({
    queryKey: ['admin-customers', page, search, kycStatus],
    queryFn: async () => {
      const res = await apiClient.get(API_ENDPOINTS.CUSTOMERS.LIST, {
        params: {
          page,
          limit: 10,
          search: search.trim() || undefined,
          kycStatus: kycStatus !== 'ALL' ? kycStatus : undefined,
        },
      });
      return res;
    },
  });

  const customers = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-emerald-600 text-white text-[10px]">Approved</Badge>;
      case 'UNDER_REVIEW':
        return <Badge className="bg-amber-600 text-white text-[10px]">In Review</Badge>;
      case 'REUPLOAD_REQUIRED':
        return <Badge className="bg-orange-600 text-white text-[10px]">Re-upload Req</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-600 text-white text-[10px]">Rejected</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2">
            <Users className="w-6 h-6 text-emerald-600" />
            <span>Borrower Directory & Customer Records</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Comprehensive registry of all registered borrowers, KYC statuses, and active credit applications.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs h-8">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base">All Registered Borrowers ({pagination.total})</CardTitle>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  placeholder="Search name, mobile, email..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs h-8 pl-8 w-48 sm:w-64"
                />
              </div>

              <select
                aria-label="Filter by KYC status"
                value={kycStatus}
                onChange={(e) => {
                  setKycStatus(e.target.value);
                  setPage(1);
                }}
                className="text-xs h-8 px-2 rounded-md border border-input bg-background"
              >
                <option value="ALL">All KYC</option>
                <option value="PENDING">Pending</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Borrower Name</th>
                <th className="py-3 px-4">Mobile Number</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Reported Income</th>
                <th className="py-3 px-4">KYC Status</th>
                <th className="py-3 px-4">Active Loan</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="py-3 px-4 h-10 bg-slate-50" />
                  </tr>
                ))
              ) : customers.length > 0 ? (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">{c.fullName}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">+91 {c.mobile}</td>
                    <td className="py-3 px-4 text-slate-600">{c.email}</td>
                    <td className="py-3 px-4 text-slate-600">{c.city}, {c.state}</td>
                    <td className="py-3 px-4 text-slate-900 font-medium">₹{c.monthlyIncome.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4">{getStatusBadge(c.kycStatus)}</td>
                    <td className="py-3 px-4">{getStatusBadge(c.loanStatus)}</td>
                    <td className="py-3 px-4 text-right">
                      <Link to={`/admin/customers/${c.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs px-2.5">
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />
                          360 View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No borrower records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} borrowers)
            </span>
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="h-7 px-2"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="h-7 px-2"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
