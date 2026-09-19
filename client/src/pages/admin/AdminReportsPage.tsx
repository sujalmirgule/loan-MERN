import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { API_ENDPOINTS } from '../../api/endpoints';
import {
  BarChart3,
  Download,
  Printer,
  RefreshCw,
  Users,
  Banknote,
  FileCheck,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface ReportSummary {
  customers: {
    total: number;
  };
  loans: {
    total: number;
    approved: number;
    rejected: number;
    approvalRate: number;
  };
  disbursements: {
    totalAmount: number;
  };
  payments: {
    totalCollected: number;
    pendingVerification: number;
  };
  collections: {
    overdueCount: number;
  };
}

export const AdminReportsPage: React.FC = () => {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await api.get(API_ENDPOINTS.REPORTS.SUMMARY);
      setSummary(res.data?.data || res.data);
    } catch (err) {
      console.error('Failed to load report summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleExport = async (type: 'customers' | 'loans' | 'payments' | 'disbursements') => {
    setExporting(type);
    try {
      const response = await api.get(`/admin/reports/export/excel?type=${type}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Export ${type} failed:`, err);
      alert(`Export failed for ${type}. Please try again.`);
    } finally {
      setExporting(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:p-0 print:m-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 print:border-none">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-600" />
            Executive Reports & Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time fintech metrics, portfolio performance, and audit-grade data exports
          </p>
        </div>

        <div className="flex items-center gap-3 print:hidden">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition shadow-xs"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
          <button
            onClick={fetchSummary}
            className="p-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
          <p className="text-sm">Calculating portfolio metrics...</p>
        </div>
      ) : (
        <>
          {/* Key KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Borrowers</span>
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-2xl font-black text-gray-900 mt-2">
                {summary?.customers.total.toLocaleString('en-IN') || 0}
              </p>
              <span className="text-xs text-blue-600 font-medium mt-1 inline-block">Registered KYC Profiles</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Applications</span>
                <FileCheck className="w-5 h-5 text-indigo-500" />
              </div>
              <p className="text-2xl font-black text-gray-900 mt-2">
                {summary?.loans.total.toLocaleString('en-IN') || 0}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs">
                <span className="text-emerald-600 font-semibold">{summary?.loans.approved || 0} Approved</span>
                <span className="text-gray-300">•</span>
                <span className="text-rose-500">{summary?.loans.rejected || 0} Rejected</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Approval Rate</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-emerald-600 mt-2">
                {summary?.loans.approvalRate || 0}%
              </p>
              <span className="text-xs text-gray-500 mt-1 inline-block">Underwriting conversion</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Disbursed</span>
                <Banknote className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-700 mt-2">
                ₹{(summary?.disbursements.totalAmount || 0).toLocaleString('en-IN')}
              </p>
              <span className="text-xs text-emerald-600 font-medium mt-1 inline-block">Completed transfers</span>
            </div>
          </div>

          {/* Revenue & Collections Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-green-600" />
                Fee & Payment Collections
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-gray-600">Total Verification Fees Collected</span>
                  <span className="text-base font-bold text-gray-900">
                    ₹{(summary?.payments.totalCollected || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-gray-600">Pending Fee Verifications</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    {summary?.payments.pendingVerification || 0} pending
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Overdue EMI Instalments</span>
                  <span className="text-base font-bold text-rose-600">
                    {summary?.collections.overdueCount || 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                Risk & Underwriting Funnel
              </h2>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-gray-600">Approval Ratio</span>
                    <span className="text-emerald-700">{summary?.loans.approvalRate || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, summary?.loans.approvalRate || 0)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-gray-600">Rejection Ratio</span>
                    <span className="text-rose-700">
                      {summary?.loans.total
                        ? Number((((summary.loans.rejected || 0) / summary.loans.total) * 100).toFixed(1))
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          summary?.loans.total
                            ? Math.min(100, ((summary.loans.rejected || 0) / summary.loans.total) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Export Center */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm print:hidden">
            <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-600" />
              Download Audit Reports (CSV)
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Export clean, comma-separated datasets ready for external accounting, regulatory audits, or Excel analysis.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => handleExport('customers')}
                disabled={exporting !== null}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50/50 transition group text-left"
              >
                <div>
                  <div className="font-semibold text-gray-900 group-hover:text-indigo-600">Customers Directory</div>
                  <div className="text-xs text-gray-400 mt-1">Full KYC, City, Income</div>
                </div>
                <Download className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
              </button>

              <button
                onClick={() => handleExport('loans')}
                disabled={exporting !== null}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50/50 transition group text-left"
              >
                <div>
                  <div className="font-semibold text-gray-900 group-hover:text-indigo-600">Loans Ledger</div>
                  <div className="text-xs text-gray-400 mt-1">All applications & statuses</div>
                </div>
                <Download className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
              </button>

              <button
                onClick={() => handleExport('payments')}
                disabled={exporting !== null}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50/50 transition group text-left"
              >
                <div>
                  <div className="font-semibold text-gray-900 group-hover:text-indigo-600">Payments Audit</div>
                  <div className="text-xs text-gray-400 mt-1">UTRs, amounts, verifications</div>
                </div>
                <Download className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
              </button>

              <button
                onClick={() => handleExport('disbursements')}
                disabled={exporting !== null}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50/50 transition group text-left"
              >
                <div>
                  <div className="font-semibold text-gray-900 group-hover:text-indigo-600">Disbursements Log</div>
                  <div className="text-xs text-gray-400 mt-1">Settlements & reference IDs</div>
                </div>
                <Download className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminReportsPage;
