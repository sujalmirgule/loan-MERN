import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../api/client';
import { API_ENDPOINTS } from '../../api/endpoints';
import {
  LifeBuoy,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Filter,
} from 'lucide-react';

interface SupportTicket {
  id: string;
  customerId: string;
  customerName: string;
  loanId?: string;
  subject: string;
  message: string;
  category: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  adminReply?: string;
  createdAt: string;
  updatedAt: string;
}

export const AdminSupportPage: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [newStatus, setNewStatus] = useState<'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'>('RESOLVED');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const url = filterStatus !== 'ALL'
        ? `${API_ENDPOINTS.SUPPORT.ADMIN_LIST}?status=${filterStatus}`
        : API_ENDPOINTS.SUPPORT.ADMIN_LIST;
      const res = await api.get(url);
      setTickets(res.data?.data || []);
    } catch (err: unknown) {
      console.error('Failed to load tickets:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to fetch support tickets');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleOpenReply = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setReplyText(ticket.adminReply || '');
    setNewStatus(ticket.status === 'OPEN' ? 'RESOLVED' : (ticket.status as 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'));
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setSubmitting(true);
    setErrorMsg('');
    setFeedbackMsg('');

    try {
      await api.post(API_ENDPOINTS.SUPPORT.ADMIN_REPLY(selectedTicket.id), {
        replyMessage: replyText.trim(),
        status: newStatus,
      });

      setFeedbackMsg('Reply submitted and customer notified successfully.');
      setSelectedTicket(null);
      fetchTickets();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit reply');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <LifeBuoy className="w-7 h-7 text-indigo-600" />
            Customer Support Tickets
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Resolve customer inquiries, payment clarification requests, and account assistance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="outline-none bg-transparent font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          <button
            onClick={fetchTickets}
            className="p-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 rounded flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="font-medium">{feedbackMsg}</span>
          </div>
          <button onClick={() => setFeedbackMsg('')} className="text-emerald-700 text-sm">Dismiss</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="font-medium">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-red-700 text-sm">Dismiss</button>
        </div>
      )}

      {/* Ticket List Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-base font-semibold text-gray-900">Tickets Queue</h2>
          <span className="text-xs text-gray-500">{tickets.length} ticket(s)</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
            <p className="text-sm">Loading tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <LifeBuoy className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="font-medium text-gray-700">No support tickets found</p>
            <p className="text-sm text-gray-400 mt-1">All borrower inquiries are currently resolved.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/80 transition">
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap text-xs">
                      {new Date(t.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{t.customer?.fullName || 'Customer'}</div>
                      <div className="text-xs text-gray-400">{t.customer?.mobile || ''}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-800">{t.subject}</div>
                      <div className="text-xs text-gray-500 truncate max-w-sm">{t.message}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                          t.priority === 'HIGH'
                            ? 'bg-red-100 text-red-800'
                            : t.priority === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          t.status === 'RESOLVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-800'
                            : t.status === 'OPEN'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenReply(t)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition"
                      >
                        <MessageSquare className="w-4 h-4" />
                        {t.adminReply ? 'Update Reply' : 'Reply'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Respond to Support Ticket
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedTicket.customer?.fullName} • {selectedTicket.customer?.mobile}
                </p>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
              <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                Subject: {selectedTicket.subject}
              </span>
              <p className="text-sm text-gray-800">{selectedTicket.message}</p>
            </div>

            <form onSubmit={handleSendReply} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Update Ticket Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED')}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="IN_PROGRESS">IN_PROGRESS (Under Review)</option>
                  <option value="RESOLVED">RESOLVED (Inquiry Answered)</option>
                  <option value="CLOSED">CLOSED (Archived)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Official Administrative Reply *
                </label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  placeholder="Provide detailed instructions or resolution details to the customer..."
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !replyText.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-sm font-semibold shadow transition"
                >
                  {submitting ? 'Submitting...' : 'Post Reply'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSupportPage;
