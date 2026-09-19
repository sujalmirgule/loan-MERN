import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { API_ENDPOINTS } from '../../api/endpoints';
import {
  Bell,
  CheckCircle2,
  RefreshCw,
  Info,
  AlertTriangle,
  IndianRupee,
  FileCheck,
} from 'lucide-react';

interface AdminNotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

export const AdminNotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get(API_ENDPOINTS.NOTIFICATIONS.ADMIN_LIST);
      setNotifications(res.data?.data || []);
      setUnreadCount(res.data?.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load admin notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.post(API_ENDPOINTS.NOTIFICATIONS.ADMIN_MARK_READ(id), {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'PAYMENT':
      case 'PAYMENT_RECEIVED':
        return <IndianRupee className="w-5 h-5 text-emerald-600" />;
      case 'KYC':
      case 'KYC_SUBMITTED':
        return <FileCheck className="w-5 h-5 text-indigo-600" />;
      case 'SECURITY':
      case 'ALERT':
        return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Bell className="w-7 h-7 text-indigo-600" />
            Admin Action Center
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time operational alerts for loan submissions, payment UTR verifications, and urgent flags
          </p>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <span className="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-full">
              {unreadCount} unread action(s)
            </span>
          )}
          <button
            onClick={fetchNotifications}
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
          <p className="text-sm">Fetching real-time notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-gray-200 text-center text-gray-500">
          <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
          <p className="font-medium text-gray-800">All caught up!</p>
          <p className="text-sm text-gray-400 mt-1">No outstanding administrative notifications or warnings.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-xl border transition flex items-start justify-between gap-4 ${
                n.read
                  ? 'bg-white border-gray-200 text-gray-700'
                  : 'bg-indigo-50/40 border-indigo-200 text-gray-900 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-2xs mt-0.5">
                  {getIcon(n.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold">{n.title}</h3>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                  <span className="text-xs text-gray-400 mt-1 inline-block">
                    {new Date(n.createdAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
              </div>

              {!n.read && (
                <button
                  onClick={() => handleMarkAsRead(n.id)}
                  className="px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg shrink-0 transition"
                >
                  Mark Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminNotificationsPage;
