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
  const [cityFilter, setCityFilter] = useState<string>('');

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
      cityFilter,
    ],
    queryFn: () =>
      loanApi.getAdminApplications({
        page,
        pageSize,
        search: search || undefined,
        status: status || undefined,
        dateFilter: dateFilter || undefined,
        state: stateFilter || undefined,
        city: cityFilter || undefined,
      }),
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
    setCityFilter('');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Loan Applications Underwriting
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage incoming loan requests, conduct credit reviews, request verification documents, and propose offers.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="self-start sm:self-auto text-xs"
        >
          {isFetching ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 mr-1.5" />}
          Refresh
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-sm border-border">
        <CardContent className="p-4 space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <Input
                placeholder="Search by Application #, Borrower Name, Mobile, Email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
            <Button type="submit" size="sm" className="bg-slate-900 hover:bg-slate-800 text-white">
              Search
            </Button>
          </form>

          {/* Combined Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
            {/* Status Filter */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Status
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

            {/* Date Filter */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
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
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                State
              </label>
              <Input
                placeholder="e.g. Karnataka, Maharashtra"
                value={stateFilter}
                onChange={(e) => {
                  setStateFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 text-xs"
              />
            </div>

            {/* City Filter */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                City
              </label>
              <div className="flex gap-1.5">
                <Input
                  placeholder="e.g. Bengaluru, Pune"
                  value={cityFilter}
                  onChange={(e) => {
                    setCityFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 text-xs"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  title="Reset Filters"
                  className="px-2 h-9 text-slate-500 hover:text-slate-900"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications Data Table (Desktop) / Cards (Mobile) */}
      <Card className="shadow-sm border-border">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-slate-600" />
            <CardTitle className="text-base font-semibold">
              Applications ({pagination.total})
            </CardTitle>
          </div>
          <span className="text-xs text-slate-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-slate-600 animate-spin" />
              <p className="text-sm text-slate-500">Loading underwriting records...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Filter className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-semibold text-slate-700">No applications found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No loan records match your current search and filter criteria. Try resetting filters.
              </p>
              <Button variant="outline" size="sm" onClick={handleResetFilters} className="text-xs mt-2">
                Reset All Filters
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-xs">Application #</TableHead>
                      <TableHead className="text-xs">Borrower Name</TableHead>
                      <TableHead className="text-xs">Location</TableHead>
                      <TableHead className="text-xs">Requested</TableHead>
                      <TableHead className="text-xs">Tenure</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Submitted</TableHead>
                      <TableHead className="text-xs text-right">Action</TableHead>
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
                          <div className="text-[11px] text-slate-500 font-mono">
                            +91 {app.mobile}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {app.city}, {app.state}
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
                          <LoanStatusBadge status={app.status} />
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
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
                      <p className="text-xs text-slate-500 font-mono">+91 {app.mobile}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Requested</span>
                        <span className="font-bold text-slate-900">
                          ₹{app.requestedAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Tenure</span>
                        <span>{app.tenureMonths} Months</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{app.city}, {app.state}</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/admin/loans/${app.id}`)}
                        className="h-7 text-xs bg-slate-900 hover:bg-slate-800 text-white"
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
