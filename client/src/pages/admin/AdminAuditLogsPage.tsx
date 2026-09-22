import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../api/client';
import { API_ENDPOINTS } from '../../api/endpoints';
import {
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Code,
} from 'lucide-react';

interface AuditRecord {
  id: string;
  actorType: string;
  actorId: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  ipAddress: string;
  timestamp: string;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actorType, setActorType] = useState('ALL');
  const [entity, setEntity] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditRecord | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (actorType !== 'ALL') params.append('actorType', actorType);
      if (entity !== 'ALL') params.append('entity', entity);
      params.append('page', String(page));
      params.append('limit', '20');

      const res = await api.get(`${API_ENDPOINTS.AUDIT.LIST}?${params.toString()}`);
      const list = Array.isArray(res?.data) ? res.data : (res?.data?.data || res?.data || []);
      setLogs(list);
      const pagination = res?.pagination || res?.data?.pagination;
      if (pagination) {
        setTotalPages(pagination.totalPages || 1);
        setTotalCount(pagination.total || 0);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [search, actorType, entity, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-indigo-600" />
            System Audit Trail
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Immutable chronicle of all admin and customer security, financial, and state-transition events
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Actor Name, Action, Entity ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-text-primary text-sm font-semibold rounded-lg shadow-sm transition"
          >
            Search
          </button>
        </form>

        <div className="flex gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={actorType}
              onChange={(e) => {
                setActorType(e.target.value);
                setPage(1);
              }}
              className="text-xs border border-gray-300 rounded-lg p-2 outline-none font-medium bg-white"
            >
              <option value="ALL">All Actors</option>
              <option value="ADMIN">ADMIN</option>
              <option value="CUSTOMER">CUSTOMER</option>
              <option value="SYSTEM">SYSTEM</option>
            </select>
          </div>

          <div>
            <select
              value={entity}
              onChange={(e) => {
                setEntity(e.target.value);
                setPage(1);
              }}
              className="text-xs border border-gray-300 rounded-lg p-2 outline-none font-medium bg-white"
            >
              <option value="ALL">All Entities</option>
              <option value="Customer">Customer</option>
              <option value="LoanApplication">LoanApplication</option>
              <option value="Payment">Payment</option>
              <option value="Disbursement">Disbursement</option>
              <option value="Settings">Settings</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-base font-semibold text-gray-900">Event Logs</h2>
          <span className="text-xs text-gray-500">{totalCount} total event(s) recorded</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
            <p className="text-sm">Fetching audit records...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <ShieldCheck className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="font-medium text-gray-700">No audit records match the criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Entity ID</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4 text-center">Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/80 transition font-mono text-xs">
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('en-IN', {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                          log.actorType === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : log.actorType === 'CUSTOMER'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {log.actorType}
                      </span>
                      <span className="font-sans font-medium text-gray-800 ml-1.5">{log.actorName}</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-800">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {log.entity}
                    </td>
                    <td className="py-3 px-4 text-gray-500 truncate max-w-[120px]" title={log.entityId}>
                      {log.entityId}
                    </td>
                    <td className="py-3 px-4 text-gray-400">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      {(log.previousValue || log.newValue) ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                        >
                          <Code className="w-4 h-4" />
                          Inspect
                        </button>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1 border border-gray-300 rounded disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1 border border-gray-300 rounded disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inspect Changes Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Audit Snapshot: {selectedLog.action}
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedLog.entity} ({selectedLog.entityId}) by {selectedLog.actorName} ({selectedLog.actorType})
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Previous State
                </span>
                <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap overflow-x-auto">
                  {selectedLog.previousValue
                    ? JSON.stringify(selectedLog.previousValue, null, 2)
                    : '(None / Creation)'}
                </pre>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-1">
                  New State
                </span>
                <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap overflow-x-auto">
                  {selectedLog.newValue
                    ? JSON.stringify(selectedLog.newValue, null, 2)
                    : '(None / Deletion)'}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAuditLogsPage;
