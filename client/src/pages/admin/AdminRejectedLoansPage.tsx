import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/api/client';
import { XCircle, Search, RotateCcw, Eye, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana',
  'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur',
  'Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu',
  'Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir',
  'Ladakh','Puducherry','Chandigarh',
];
const LOAN_TYPES = ['Personal Loan', 'Business Loan', 'Salary Loan', 'Education Loan'];
const fmtCurr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

interface RejectedLoan {
  id: string;
  applicationNumber: string;
  loanType?: string;
  requestedAmount: number;
  tenureMonths: number;
  status: string;
  rejectionReason?: string;
  createdAt: string;
  submittedAt?: string;
  customer: { id: string; fullName: string; mobile: string; state?: string };
}

export const AdminRejectedLoansPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [loanTypeFilter, setLoanTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: response, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['adminRejectedLoans', page, search, stateFilter, loanTypeFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '25', status: 'REJECTED', ...(search ? { search } : {}), ...(stateFilter ? { state: stateFilter } : {}), ...(loanTypeFilter ? { loanType: loanTypeFilter } : {}), ...(dateFrom ? { dateFrom } : {}), ...(dateTo ? { dateTo } : {}) });
      return apiClient.get(`/admin/loan-applications?${params.toString()}`);
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = response as any;
  const loans: RejectedLoan[] = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.data?.data) ? raw.data.data : [];
  const pagination = raw?.pagination || raw?.data?.pagination || { page: 1, pageSize: 25, total: loans.length, totalPages: 1 };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); setSearch(searchInput.trim()); };
  const handleReset = () => { setSearch(''); setSearchInput(''); setStateFilter(''); setLoanTypeFilter(''); setDateFrom(''); setDateTo(''); setPage(1); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <XCircle className="w-6 h-6 text-red-600" /> Rejected Loans
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">All declined loan applications with rejection reasons</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="self-start text-xs h-9">
          <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1"><Search className="w-4 h-4 text-text-secondary absolute left-3 top-2.5" /><Input placeholder="Search name, mobile, application #..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9 text-sm" /></div>
            <Button type="submit" size="sm" className="bg-surface text-text-primary h-10">Search</Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleReset} className="h-10 px-3"><RotateCcw className="w-3.5 h-3.5" /></Button>
          </form>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
            <div>
              <Label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1 block">State</Label>
              <select value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); setPage(1); }} className="w-full text-xs h-9 rounded-md border border-input bg-background px-2.5">
                <option value="">All States</option>{INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1 block">Loan Type</Label>
              <select value={loanTypeFilter} onChange={(e) => { setLoanTypeFilter(e.target.value); setPage(1); }} className="w-full text-xs h-9 rounded-md border border-input bg-background px-2.5">
                <option value="">All Types</option>{LOAN_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1 block">From Date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="h-9 text-xs" />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1 block">To Date</Label>
              <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="h-9 text-xs" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b flex-row items-center justify-between">
          <CardTitle className="text-sm">Rejected Loans ({pagination.total})</CardTitle>
          <span className="text-xs text-text-secondary">Page {pagination.page} of {pagination.totalPages}</span>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center gap-3"><Loader2 className="w-8 h-8 animate-spin text-text-secondary" /><p className="text-sm text-text-secondary">Loading...</p></div>
          ) : loans.length === 0 ? (
            <div className="py-16 text-center"><XCircle className="w-10 h-10 text-text-secondary mx-auto mb-2" /><p className="text-sm text-text-secondary">No rejected loans found</p></div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b text-text-secondary font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Application #</th><th className="py-3 px-4">Customer</th><th className="py-3 px-4">State</th>
                      <th className="py-3 px-4">Loan Type</th><th className="py-3 px-4 text-right">Requested</th>
                      <th className="py-3 px-4">Applied</th><th className="py-3 px-4">Rejection Reason</th><th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loans.map((loan) => (
                      <tr key={loan.id} className="hover:bg-red-50/20 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-700">{loan.applicationNumber}</td>
                        <td className="py-3 px-4"><div className="font-semibold text-slate-900">{loan.customer.fullName}</div><div className="text-[11px] text-text-secondary">+91 {loan.customer.mobile}</div></td>
                        <td className="py-3 px-4 text-slate-600">{loan.customer.state}</td>
                        <td className="py-3 px-4 text-slate-600">{loan.loanType || 'Personal Loan'}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">{fmtCurr(loan.requestedAmount)}</td>
                        <td className="py-3 px-4 text-text-secondary">{new Date(loan.submittedAt || loan.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                        <td className="py-3 px-4 max-w-xs"><span className="text-red-700 text-[11px] line-clamp-2">{loan.rejectionReason || 'No reason provided'}</span></td>
                        <td className="py-3 px-4"><Button size="sm" variant="ghost" onClick={() => navigate(`/admin/loans/${loan.id}`)} className="h-7 px-2 text-[11px]"><Eye className="w-3 h-3 mr-1" />View</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden p-3 space-y-3">
                {loans.map((loan) => (
                  <div key={loan.id} className="border border-red-200 rounded-xl p-3.5 bg-red-50/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold">{loan.applicationNumber}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">Rejected</span>
                    </div>
                    <p className="font-semibold text-sm">{loan.customer.fullName} · {loan.customer.state}</p>
                    <p className="text-xs text-red-700 bg-red-50 rounded p-2 border border-red-100">{loan.rejectionReason || 'No reason'}</p>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/admin/loans/${loan.id}`)} className="w-full h-8 text-xs"><Eye className="w-3 h-3 mr-1.5" />View</Button>
                  </div>
                ))}
              </div>
              {pagination.totalPages > 1 && (
                <div className="p-3 border-t flex items-center justify-between text-xs text-slate-600">
                  <span>Showing {(pagination.page - 1) * pagination.pageSize + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPage((p) => p - 1)} className="h-8 px-2"><ChevronLeft className="w-4 h-4" /></Button>
                    <span>{pagination.page} / {pagination.totalPages}</span>
                    <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="h-8 px-2"><ChevronRight className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
