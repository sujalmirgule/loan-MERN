import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { API_ENDPOINTS } from '../../api/endpoints';
import {
  Banknote,
  CheckCircle2,
  RefreshCw,
  Search,
  PlusCircle,
  AlertCircle,
} from 'lucide-react';

interface DisbursementRecord {
  id: string;
  loanId: string;
  amount: number;
  paymentMode: 'BANK_TRANSFER' | 'UPI';
  referenceNumber: string;
  disbursedAt: string;
  notes?: string;
  loan?: {
    applicationNumber: string;
    amount: number;
    user?: {
      fullName: string;
      email: string;
      mobileNumber: string;
      bankAccounts?: Array<{
        bankName: string;
        accountNumber: string;
        ifscCode: string;
      }>;
    };
  };
}

interface ApprovedLoan {
  id: string;
  applicationNumber: string;
  amount: number;
  approvedAmount?: number;
  status: string;
  user: {
    fullName: string;
    mobileNumber: string;
    bankAccounts?: Array<{
      bankName: string;
      accountNumber: string;
      ifscCode: string;
    }>;
  };
}

export const AdminDisbursementsPage: React.FC = () => {
  const [disbursements, setDisbursements] = useState<DisbursementRecord[]>([]);
  const [approvedLoans, setApprovedLoans] = useState<ApprovedLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form State
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [paymentMode, setPaymentMode] = useState<'BANK_TRANSFER' | 'UPI'>('BANK_TRANSFER');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [disbursedAt, setDisbursedAt] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [disbRes, loansRes] = await Promise.all([
        api.get(API_ENDPOINTS.DISBURSEMENTS.ADMIN_LIST),
        api.get(`${API_ENDPOINTS.ADMIN_LOANS.LIST}?status=APPROVED`),
      ]);

      const disbList =
        disbRes.data?.data?.disbursements ||
        disbRes.data?.disbursements ||
        (Array.isArray(disbRes.data?.data) ? disbRes.data.data : Array.isArray(disbRes.data) ? disbRes.data : []);
      setDisbursements(Array.isArray(disbList) ? disbList : []);
      
      const rawLoans =
        loansRes.data?.data?.loans ||
        loansRes.data?.loans ||
        (Array.isArray(loansRes.data?.data) ? loansRes.data.data : Array.isArray(loansRes.data) ? loansRes.data : []);
      setApprovedLoans(Array.isArray(rawLoans) ? rawLoans : []);
    } catch (err: unknown) {
      console.error('Failed to load disbursements data:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load disbursements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLoanSelect = (loanId: string) => {
    setSelectedLoanId(loanId);
    const found = approvedLoans.find((l) => l.id === loanId);
    if (found) {
      setAmount(String(found.approvedAmount || found.amount || ''));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanId || !referenceNumber || !amount) {
      setErrorMessage('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await api.post(API_ENDPOINTS.DISBURSEMENTS.ADMIN_RECORD, {
        loanId: selectedLoanId,
        paymentMode,
        referenceNumber: referenceNumber.trim(),
        amount: parseFloat(amount),
        disbursedAt: new Date(disbursedAt).toISOString(),
        notes: notes.trim() || undefined,
      });

      setSuccessMessage('Disbursement successfully recorded and loan updated to DISBURSED!');
      setShowModal(false);
      setSelectedLoanId('');
      setReferenceNumber('');
      setAmount('');
      setNotes('');
      fetchData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to record disbursement');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDisbursements = (Array.isArray(disbursements) ? disbursements : []).filter((d) => {
    const q = search.toLowerCase();
    const appNum = d.loan?.applicationNumber?.toLowerCase() || '';
    const custName = d.loan?.user?.fullName?.toLowerCase() || '';
    const ref = d.referenceNumber?.toLowerCase() || '';
    return appNum.includes(q) || custName.includes(q) || ref.includes(q);
  });

  const totalDisbursed = disbursements.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Banknote className="w-7 h-7 text-blue-600" />
            Loan Disbursements
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage fund transfers, record bank/UPI settlements, and notify customers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-background hover:bg-secondary text-text-primary text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <PlusCircle className="w-5 h-5" />
            Record Disbursement
          </button>
          <button
            onClick={fetchData}
            className="p-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-800 rounded flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-green-700 text-sm">Dismiss</button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-red-700 text-sm">Dismiss</button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Disbursed</span>
          <p className="text-2xl font-black text-gray-900 mt-1">₹{totalDisbursed.toLocaleString('en-IN')}</p>
          <span className="text-xs text-green-600 mt-1 inline-block">100% verified settlement</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Disbursement Count</span>
          <p className="text-2xl font-black text-gray-900 mt-1">{disbursements.length}</p>
          <span className="text-xs text-gray-500 mt-1 inline-block">Successful payouts</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Awaiting Disbursement</span>
          <p className="text-2xl font-black text-amber-600 mt-1">{approvedLoans.length}</p>
          <span className="text-xs text-gray-500 mt-1 inline-block">Approved loans ready for payout</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
        <Search className="w-5 h-5 text-gray-400 mr-2" />
        <input
          type="text"
          placeholder="Search by Application #, Customer Name, or UTR/Reference..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-sm outline-none bg-transparent text-gray-900 placeholder-gray-400"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-xs text-gray-400 hover:text-gray-600">
            Clear
          </button>
        )}
      </div>

      {/* Disbursements Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-base font-semibold text-gray-900">Disbursement History</h2>
          <span className="text-xs text-gray-500">{filteredDisbursements.length} record(s)</span>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin mb-2 text-blue-500" />
            <p className="text-sm">Loading disbursements...</p>
          </div>
        ) : filteredDisbursements.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <Banknote className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="font-medium text-gray-700">No disbursements found</p>
            <p className="text-sm text-gray-400 mt-1">Record a disbursement for an approved loan to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                  <th className="py-3 px-4">Disbursed Date</th>
                  <th className="py-3 px-4">Application #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Payment Mode</th>
                  <th className="py-3 px-4">Reference / UTR</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDisbursements.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition">
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                      {new Date(item.disbursedAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-blue-600">
                      {item.loan?.applicationNumber || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{item.loan?.user?.fullName || 'Customer'}</div>
                      <div className="text-xs text-gray-400">{item.loan?.user?.mobileNumber || ''}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">
                        {item.paymentMode === 'BANK_TRANSFER' ? 'NEFT / RTGS / IMPS' : 'UPI Transfer'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-800 text-xs font-bold">
                      {item.referenceNumber}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">
                      ₹{Number(item.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Disbursed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Disbursement Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-blue-600" />
                Record Loan Disbursement
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Select Approved Loan *
                </label>
                <select
                  value={selectedLoanId}
                  onChange={(e) => handleLoanSelect(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                >
                  <option value="">-- Choose Loan to Disburse --</option>
                  {approvedLoans.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.applicationNumber} — {l.user.fullName} (₹{Number(l.approvedAmount || l.amount).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
                {approvedLoans.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No pending approved loans available.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Payment Mode *
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as 'BANK_TRANSFER' | 'UPI')}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Transaction Reference / UTR Number *
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. UTR98234123512"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Disbursed Timestamp
                </label>
                <input
                  type="datetime-local"
                  value={disbursedAt}
                  onChange={(e) => setDisbursedAt(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Settlement Notes / Remarks (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Disbursed via HDFC Corporate Banking Account"
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedLoanId}
                  className="px-5 py-2 bg-primary text-background hover:bg-secondary disabled:bg-blue-300 text-text-primary rounded-lg text-sm font-semibold shadow transition"
                >
                  {submitting ? 'Recording...' : 'Confirm Disbursement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDisbursementsPage;
