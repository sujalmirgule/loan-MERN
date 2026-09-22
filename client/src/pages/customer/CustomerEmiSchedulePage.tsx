import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import { useBrandTitle } from '@/hooks/useBrandTitle';

interface EmiScheduleItem {
  id: string;
  installmentNumber: number;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  status: 'PENDING' | 'DUE' | 'PAID' | 'OVERDUE';
  paidAt?: string | null;
}

interface EmiScheduleResponse {
  loanId: string;
  applicationNumber: string;
  accountNumber?: string;
  loanType: string;
  loanAmount: number;
  tenureMonths: number;
  interestRate: number;
  monthlyEmi: number;
  schedule: EmiScheduleItem[];
}

export const CustomerEmiSchedulePage: React.FC = () => {
  useBrandTitle('EMI Schedule');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'ALL' | 'PAID' | 'UPCOMING' | 'OVERDUE'>('ALL');
  const [downloading, setDownloading] = useState(false);

  const { data } = useQuery<EmiScheduleResponse>({
    queryKey: ['emiSchedule', id],
    queryFn: async () => {
      const targetId = id && id !== 'latest' ? id : 'latest';
      const res = await apiClient.get(`/customer/loans/${targetId}/emi-schedule`);
      return res.data?.data || res.data;
    },
  });

  const schedule = data?.schedule || [];

  const filtered = schedule.filter((item) => {
    if (filter === 'ALL') return true;
    if (filter === 'PAID') return item.status === 'PAID';
    if (filter === 'OVERDUE') return item.status === 'OVERDUE';
    if (filter === 'UPCOMING') return item.status === 'PENDING' || item.status === 'DUE';
    return true;
  });

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      const targetId = data?.loanId || id || 'latest';
      const res = await apiClient.get(`/customer/loans/${targetId}/emi-pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EMI_Schedule_${data?.applicationNumber || 'Loan'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      // ignore
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 text-[#0B1F3A]">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-3xl border border-[#D9E6F2] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#52657A] hover:text-[#0B1F3A] mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Loans
          </button>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0B1F3A] tracking-tight">
            EMI Repayment Schedule
          </h1>
          <p className="text-xs text-[#52657A] mt-1">
            Official month-by-month repayment breakdown with principal, interest, and due dates.
          </p>
        </div>

        <Button
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="bg-[#2563EB] hover:bg-[#123B66] text-white font-bold text-xs h-10 px-4 rounded-xl shadow-md flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
        >
          {downloading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Downloading...</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>Download Schedule PDF</span>
            </>
          )}
        </Button>
      </div>

      {/* Loan Financial Summary Box */}
      <Card className="bg-white border-[#D9E6F2] rounded-2xl shadow-xs overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <span className="text-xs font-bold text-[#2563EB] uppercase tracking-wider block">
                {data?.loanType || 'Business Loan'}
              </span>
              <div className="text-2xl sm:text-3xl font-black text-[#0B1F3A] mt-1 font-mono">
                ₹{(data?.loanAmount || 100000).toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-[#52657A] font-mono mt-0.5">
                Account Number: <strong>{data?.accountNumber || data?.applicationNumber || 'LN20260906142729'}</strong>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 w-full sm:w-auto text-center pt-3 sm:pt-0 border-t sm:border-t-0 border-[#D9E6F2]">
              <div className="p-2.5 rounded-xl bg-[#F7FAFC] border border-[#D9E6F2]">
                <span className="text-[10px] text-[#52657A] uppercase block font-bold">Monthly EMI</span>
                <span className="text-sm font-black text-[#0B1F3A] font-mono">₹{(data?.monthlyEmi || 8500).toLocaleString('en-IN')}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#F7FAFC] border border-[#D9E6F2]">
                <span className="text-[10px] text-[#52657A] uppercase block font-bold">Tenure</span>
                <span className="text-sm font-black text-[#0B1F3A]">{data?.tenureMonths || 12} Mos</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#F7FAFC] border border-[#D9E6F2]">
                <span className="text-[10px] text-[#52657A] uppercase block font-bold">Interest Rate</span>
                <span className="text-sm font-black text-[#16A34A]">{data?.interestRate || 2.0}% p.a.</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
        {(['ALL', 'PAID', 'UPCOMING', 'OVERDUE'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-2 rounded-xl font-bold transition whitespace-nowrap ${
              filter === tab
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'bg-white border border-[#D9E6F2] text-[#52657A] hover:text-[#0B1F3A] hover:bg-[#F0F6FC]'
            }`}
          >
            {tab === 'ALL' ? 'All Installments' : tab}
          </button>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white border border-[#D9E6F2] rounded-2xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs text-[#52657A]">
          <thead className="bg-[#F7FAFC] text-[11px] uppercase tracking-wider text-[#52657A] font-bold border-b border-[#D9E6F2]">
            <tr>
              <th className="py-3 px-4">#</th>
              <th className="py-3 px-4">Due Date</th>
              <th className="py-3 px-4 text-right">Principal</th>
              <th className="py-3 px-4 text-right">Interest</th>
              <th className="py-3 px-4 text-right">Total EMI</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D9E6F2]">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-[#F0F6FC] transition">
                <td className="py-3.5 px-4 font-mono font-bold text-[#0B1F3A]">{item.installmentNumber}</td>
                <td className="py-3.5 px-4">
                  {new Date(item.dueDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className="py-3.5 px-4 text-right font-mono">₹{item.principalAmount.toLocaleString('en-IN')}</td>
                <td className="py-3.5 px-4 text-right font-mono text-[#52657A]">₹{item.interestAmount.toLocaleString('en-IN')}</td>
                <td className="py-3.5 px-4 text-right font-bold text-[#0B1F3A] font-mono">₹{item.totalAmount.toLocaleString('en-IN')}</td>
                <td className="py-3.5 px-4 text-center">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      item.status === 'PAID'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : item.status === 'DUE'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : item.status === 'OVERDUE'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-[#F0F6FC] text-[#52657A] border border-[#D9E6F2]'
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-2.5">
        {filtered.map((item) => (
          <Card key={item.id} className="bg-white border-[#D9E6F2] rounded-2xl p-4 shadow-xs">
            <div className="flex justify-between items-center pb-2.5 border-b border-[#D9E6F2]">
              <span className="font-bold text-sm text-[#0B1F3A]">EMI #{item.installmentNumber}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  item.status === 'PAID'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : item.status === 'DUE'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-[#F0F6FC] text-[#52657A] border border-[#D9E6F2]'
                }`}
              >
                {item.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2.5 text-xs">
              <div>
                <span className="text-[10px] text-[#52657A] block">Due Date</span>
                <span className="text-[#0B1F3A] font-medium">
                  {new Date(item.dueDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#52657A] block">Total Amount</span>
                <span className="font-bold text-[#0B1F3A] font-mono">₹{item.totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CustomerEmiSchedulePage;
