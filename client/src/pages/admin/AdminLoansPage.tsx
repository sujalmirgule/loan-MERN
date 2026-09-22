import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  loanApi,
  AdminLoanApplicationListItem,
  PaginatedAdminLoansResponse,
} from '@/api/loanApi';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { LoanStatusBadge } from '@/components/LoanStatusBadge';
import {
  Search,
  Filter,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  Loader2,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';

export const AdminLoansPage: React.FC = () => {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [stateFilter, setStateFilter] = useState<string>('');
  const [loanType, setLoanType] = useState<string>('');

  // Dynamically load distinct states
  const { data: statesData = [] } = useQuery<string[]>({
    queryKey: ['admin-customer-states'],
    queryFn: async () => {
      const res = await apiClient.get(API_ENDPOINTS.CUSTOMERS.STATES);
      return Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
    },
  });

  const statesList: string[] = Array.isArray(statesData)
    ? statesData
    : Array.isArray((statesData as any)?.data)
    ? (statesData as any).data
    : [];

  const {
    data: response,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      'adminLoanApplications',
      page,
      pageSize,
      search,
      status,
      dateFilter,
      stateFilter,
      loanType,
    ],
    queryFn: () =>
      loanApi.getAdminApplications({
        page,
        pageSize,
        search: search || undefined,
        status: status || undefined,
        dateFilter: dateFilter || undefined,
        state: stateFilter || undefined,
        loanType: loanType || undefined,
      }),
    refetchInterval: 1500,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatus('');
    setDateFilter('');
    setStateFilter('');
    setLoanType('');
    setPage(1);
  };

  const rawData = response?.data;
  const applications: AdminLoanApplicationListItem[] = Array.isArray(rawData)
    ? rawData
    : Array.isArray((rawData as unknown as { data?: AdminLoanApplicationListItem[] })?.data)
    ? (rawData as unknown as { data: AdminLoanApplicationListItem[] }).data
    : [];

  const pagination =
    response?.pagination ||
    (rawData as unknown as PaginatedAdminLoansResponse)?.pagination || {
      page: 1,
      pageSize: 10,
      total: applications.length,
      totalPages: 1,
    };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">
            Loan Applications Underwriting
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Conduct credit reviews, verify borrower records, and propose sanction terms.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="self-start sm:self-auto text-xs bg-surface-elevated border-border text-text-primary hover:bg-surface-elevated hover:brightness-110 h-9"
        >
          {isFetching ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 mr-1.5" />}
          Refresh
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="bg-surface-elevated border border-border shadow-sm">
        <CardContent className="p-4 space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-text-secondary absolute left-3 top-2.5" />
              <Input
                placeholder="Search by Application #, Borrower Name, Mobile, Email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 text-xs bg-surface border-border text-text-primary h-9 placeholder-[#8FA3BA]/60"
              />
            </div>
            <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 text-text-primary text-xs h-9 font-bold px-4">
              Search
            </Button>
          </form>

          {/* Combined Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2 border-t border-border">
            {/* Status Filter */}
            <div>
              <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                Application Status
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="DOCUMENTS_REQUIRED">Documents Required</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="OFFER_PENDING_CUSTOMER">Offer Available</option>
                <option value="OFFER_ACCEPTED">Offer Accepted</option>
                <option value="OFFER_REJECTED">Offer Rejected</option>
              </select>
            </div>

            {/* Loan Type Filter */}
            <div>
              <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                Loan Type
              </label>
              <select
                value={loanType}
                onChange={(e) => {
                  setLoanType(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All Loan Types</option>
                <option value="Personal Loan">Personal Loan</option>
                <option value="Business Loan">Business Loan</option>
                <option value="Home Loan">Home Loan</option>
                <option value="Education Loan">Education Loan</option>
                <option value="Gold Loan">Gold Loan</option>
                <option value="Vehicle Loan">Vehicle Loan</option>
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                Submission Date
              </label>
              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All Time</option>
                <option value="TODAY">Today</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="LAST_7_DAYS">Last 7 Days</option>
                <option value="LAST_30_DAYS">Last 30 Days</option>
              </select>
            </div>

            {/* State Filter */}
            <div>
              <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                State
              </label>
              <select
                value={stateFilter}
                onChange={(e) => {
                  setStateFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring overflow-y-auto"
              >
                <option value="">All States</option>
                {statesList.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Filters */}
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="w-full h-9 text-xs text-slate-600 hover:text-slate-900 border-dashed"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications Data Table (Desktop) / Cards (Mobile) */}
      <Card className="bg-surface-elevated border border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-semibold text-text-primary">
              Applications ({pagination.total})
            </CardTitle>
          </div>
          <span className="text-xs text-text-secondary">
            Page {pagination.page} of {pagination.totalPages}
          </span>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-text-secondary">Loading underwriting records...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Filter className="w-10 h-10 text-text-secondary/40 mx-auto" />
              <h3 className="font-semibold text-text-primary">No applications found</h3>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                No loan records match your current search and filter criteria. Try resetting filters.
              </p>
              <Button variant="outline" size="sm" onClick={handleResetFilters} className="text-xs mt-2 border-border text-text-secondary">
                Reset All Filters
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-surface border-b border-border">
                    <TableRow className="border-b border-border">
                      <TableHead className="text-xs text-text-secondary font-bold uppercase">Application #</TableHead>
                      <TableHead className="text-xs text-text-secondary font-bold uppercase">Borrower Name</TableHead>
                      <TableHead className="text-xs text-text-secondary font-bold uppercase">State</TableHead>
                      <TableHead className="text-xs text-text-secondary font-bold uppercase">Loan Type</TableHead>
                      <TableHead className="text-xs text-text-secondary font-bold uppercase">Requested</TableHead>
                      <TableHead className="text-xs text-text-secondary font-bold uppercase">Tenure</TableHead>
                      <TableHead className="text-xs text-text-secondary font-bold uppercase">KYC Status</TableHead>
                      <TableHead className="text-xs text-text-secondary font-bold uppercase">Loan Status</TableHead>
                      <TableHead className="text-xs text-text-secondary font-bold uppercase">Submitted</TableHead>
                      <TableHead className="text-xs text-text-secondary font-bold uppercase text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((app: AdminLoanApplicationListItem) => (
                      <TableRow key={app.id} className="hover:bg-slate-50/80">
                        <TableCell className="font-mono text-xs font-semibold text-slate-700">
                          {app.applicationNumber}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-semibold text-slate-900">
                            {app.customerName}
                          </div>
                          <div className="text-[11px] text-text-secondary font-mono">
                            +91 {app.mobile}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {app.state}
                        </TableCell>
                        <TableCell className="text-xs text-slate-700 font-medium">
                          {app.loanType || 'Personal Loan'}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-slate-900">
                          ₹{app.requestedAmount.toLocaleString('en-IN')}
                          {app.proposedAmount && (
                            <span className="block text-[10px] text-emerald-700 font-normal">
                              Offer: ₹{app.proposedAmount.toLocaleString('en-IN')}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {app.tenureMonths} Mo.
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const st = (app.kycStatus || 'PENDING').toUpperCase();
                            if (st === 'APPROVED' || st === 'VERIFIED') {
                              return (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Verified
                                </span>
                              );
                            }
                            if (st === 'REJECTED') {
                              return (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Rejected
                                </span>
                              );
                            }
                            if (st === 'REUPLOAD_REQUIRED' || st === 'CORRECTION_REQUIRED') {
                              return (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Correction
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending
                              </span>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <LoanStatusBadge status={app.status} />
                        </TableCell>
                        <TableCell className="text-xs text-text-secondary">
                          {new Date(app.submittedAt || app.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/admin/loans/${app.id}`)}
                            className="h-8 text-xs font-medium"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List */}
              <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3">
                {applications.map((app: AdminLoanApplicationListItem) => (
                  <div
                    key={app.id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-slate-700">
                        {app.applicationNumber}
                      </span>
                      <LoanStatusBadge status={app.status} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-slate-900">{app.customerName}</h4>
                      <p className="text-xs text-text-secondary font-mono">+91 {app.mobile}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs py-1 border-y border-slate-100">
                      <span className="text-slate-600 font-medium">{app.loanType || 'Personal Loan'}</span>
                      <div>
                        {(() => {
                          const st = (app.kycStatus || 'PENDING').toUpperCase();
                          if (st === 'APPROVED' || st === 'VERIFIED') {
                            return (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                KYC: Verified
                              </span>
                            );
                          }
                          if (st === 'REJECTED') {
                            return (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                KYC: Rejected
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              KYC: Pending
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                      <div>
                        <span className="text-[10px] text-text-secondary block">Requested</span>
                        <span className="font-bold text-slate-900">
                          ₹{app.requestedAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-text-secondary block">Tenure</span>
                        <span>{app.tenureMonths} Months</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-text-secondary pt-1">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-text-secondary" />
                        <span>{app.state}</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/admin/loans/${app.id}`)}
                        className="h-7 text-xs bg-surface hover:bg-surface-elevated text-text-primary"
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>
                Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                {pagination.total} entries
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="h-8 px-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-medium">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 px-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
