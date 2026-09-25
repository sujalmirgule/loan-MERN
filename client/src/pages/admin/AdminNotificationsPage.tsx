import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  Clock,
  ArrowRight,
  Check,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataManagementModal, ManagementActionType } from '@/components/admin/DataManagementModal';
import { BulkActionBar } from '@/components/admin/BulkActionBar';

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
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'PAYMENT' | 'KYC'>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Safe Data Management Modal state
  const [mgmtModalState, setMgmtModalState] = useState<{
    isOpen: boolean;
    actionType: ManagementActionType;
    title: string;
    description: string;
    itemCount: number;
    itemNames: string[];
    warningMessage?: string;
    requireTypedConfirmation?: boolean;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    actionType: 'DELETE',
    title: '',
    description: '',
    itemCount: 0,
    itemNames: [],
    onConfirm: async () => {},
  });

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get(API_ENDPOINTS.NOTIFICATIONS.ADMIN_LIST);
      const list = Array.isArray(res?.data) ? res.data : (res?.data?.data || res?.data || []);
      setNotifications(list);
      setUnreadCount(res?.unreadCount ?? res?.data?.unreadCount ?? list.filter((i: any) => !i.read).length);
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
      await api.patch(API_ENDPOINTS.NOTIFICATIONS.ADMIN_MARK_READ(id), {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch(API_ENDPOINTS.NOTIFICATIONS.ADMIN_READ_ALL, {});
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleBulkDelete = () => {
    setMgmtModalState({
      isOpen: true,
      actionType: 'DELETE',
      title: 'Bulk Delete Admin Notifications',
      description: `Permanently remove ${selectedIds.length} selected notification alert(s).`,
      itemCount: selectedIds.length,
      itemNames: selectedIds.slice(0, 5),
      warningMessage: 'This will clear selected operational notifications from the admin action center.',
      onConfirm: async () => {
        await api.post(API_ENDPOINTS.NOTIFICATIONS.ADMIN_BULK_DELETE, { ids: selectedIds });
        setSelectedIds([]);
        fetchNotifications();
      },
    });
  };

  const handleSingleDelete = (n: AdminNotificationItem) => {
    setMgmtModalState({
      isOpen: true,
      actionType: 'DELETE',
      title: `Delete Notification: ${n.title}`,
      description: `Remove notification alert "${n.title}".`,
      itemCount: 1,
      itemNames: [n.title],
      onConfirm: async () => {
        await api.delete(API_ENDPOINTS.NOTIFICATIONS.ADMIN_DELETE(n.id));
        fetchNotifications();
      },
    });
  };

  const getSemanticStyling = (type: string, title: string) => {
    const t = (type || '').toUpperCase();
    const tit = (title || '').toUpperCase();

    if (t.includes('PAYMENT') || tit.includes('PAYMENT') || tit.includes('UTR') || tit.includes('CHARGE')) {
      return {
        leftBorder: 'border-l-4 border-l-[#155EEF]',
        iconBg: 'bg-[#EFF6FF] border-[#BFDBFE] text-[#155EEF]',
        badgeBg: 'bg-[#EFF6FF] text-[#155EEF] border-[#D7E3F5]',
        badgeLabel: 'Payment Verification',
        icon: <IndianRupee className="w-5 h-5 text-[#155EEF]" />,
        link: '/admin/charges-approval',
        linkLabel: 'Verify in Charges Approval',
      };
    }
    if (t.includes('KYC') || tit.includes('KYC') || tit.includes('DOCUMENT')) {
      return {
        leftBorder: 'border-l-4 border-l-[#4F46E5]',
        iconBg: 'bg-[#EEF2FF] border-[#C7D2FE] text-[#4F46E5]',
        badgeBg: 'bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE]',
        badgeLabel: 'KYC Document',
        icon: <FileCheck className="w-5 h-5 text-[#4F46E5]" />,
        link: '/admin/kyc',
        linkLabel: 'Review in KYC',
      };
    }
    if (t.includes('SECURITY') || t.includes('ALERT') || tit.includes('REJECT') || tit.includes('WARNING')) {
      return {
        leftBorder: 'border-l-4 border-l-[#DC2626]',
        iconBg: 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]',
        badgeBg: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
        badgeLabel: 'Urgent Alert',
        icon: <AlertTriangle className="w-5 h-5 text-[#DC2626]" />,
        link: null,
        linkLabel: null,
      };
    }
    if (t.includes('LOAN') || tit.includes('LOAN') || tit.includes('APPLICATION')) {
      return {
        leftBorder: 'border-l-4 border-l-[#0284C7]',
        iconBg: 'bg-[#F0F9FF] border-[#BAE6FD] text-[#0284C7]',
        badgeBg: 'bg-[#F0F9FF] text-[#0284C7] border-[#BAE6FD]',
        badgeLabel: 'Loan Application',
        icon: <Clock className="w-5 h-5 text-[#0284C7]" />,
        link: '/admin/loan-approval',
        linkLabel: 'Open Loan Approval',
      };
    }
    return {
      leftBorder: 'border-l-4 border-l-[#2563EB]',
      iconBg: 'bg-[#EFF6FF] border-[#D7E3F5] text-[#2563EB]',
      badgeBg: 'bg-[#EFF6FF] text-[#2563EB] border-[#D7E3F5]',
      badgeLabel: 'Operational Alert',
      icon: <Info className="w-5 h-5 text-[#2563EB]" />,
      link: null,
      linkLabel: null,
    };
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.read;
    if (filter === 'PAYMENT') {
      const s = (n.type + ' ' + n.title).toUpperCase();
      return s.includes('PAYMENT') || s.includes('UTR') || s.includes('CHARGE');
    }
    if (filter === 'KYC') {
      const s = (n.type + ' ' + n.title).toUpperCase();
      return s.includes('KYC') || s.includes('DOC');
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* ── Header Banner ─────────────────────────────────────────────────── */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#D7E3F5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8F1FF] text-[#155EEF] border border-[#D7E3F5] text-xs font-bold mb-2 uppercase tracking-wider">
            <Bell className="w-3.5 h-3.5" />
            <span>Admin Action Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#07152F] tracking-tight">
            Operational Alerts & Actions
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 leading-relaxed max-w-2xl font-medium">
            Real-time operational alerts for loan submissions, payment UTR verifications, KYC reviews, and system flags.
          </p>

          {/* Scope badges */}
          <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] font-semibold text-[#475569]">
            <span className="px-2.5 py-0.5 rounded-lg bg-[#F4F8FF] border border-[#D7E3F5]">Loan Submissions</span>
            <span className="px-2.5 py-0.5 rounded-lg bg-[#F4F8FF] border border-[#D7E3F5]">Payment UTR Verification</span>
            <span className="px-2.5 py-0.5 rounded-lg bg-[#F4F8FF] border border-[#D7E3F5]">KYC Actions</span>
            <span className="px-2.5 py-0.5 rounded-lg bg-[#F4F8FF] border border-[#D7E3F5]">Urgent Flags</span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
          {unreadCount > 0 ? (
            <span className="px-3.5 py-1.5 bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-pulse" />
              <span>{unreadCount} Unread Alert{unreadCount > 1 ? 's' : ''}</span>
            </span>
          ) : (
            <span className="px-3 py-1 bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] text-xs font-bold rounded-xl flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              <span>All Caught Up</span>
            </span>
          )}

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="bg-white border-[#D7E3F5] text-[#155EEF] hover:bg-[#EFF6FF] text-xs h-9 px-3 gap-1.5 rounded-xl font-bold shadow-xs"
            >
              <Check className="w-3.5 h-3.5 text-[#155EEF]" />
              <span className="hidden sm:inline">Mark All Read</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={fetchNotifications}
            disabled={loading}
            className="bg-white border-[#D7E3F5] text-[#0B1220] hover:bg-[#F4F8FF] text-xs h-9 px-3 gap-1.5 rounded-xl font-bold shadow-xs"
            title="Refresh alerts"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#155EEF] ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={filteredNotifications.length}
        onClearSelection={() => setSelectedIds([])}
        onDeleteSelected={handleBulkDelete}
        deleteLabel="Delete Selected Alerts"
      />

      {/* ── Filter Pills ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: 'ALL', label: 'All Alerts', count: notifications.length },
          { key: 'UNREAD', label: 'Unread Only', count: unreadCount },
          { key: 'PAYMENT', label: 'Payments & UTR', count: notifications.filter((n) => (n.type + n.title).toUpperCase().includes('PAYMENT') || (n.type + n.title).toUpperCase().includes('UTR')).length },
          { key: 'KYC', label: 'KYC Verification', count: notifications.filter((n) => (n.type + n.title).toUpperCase().includes('KYC')).length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              filter === tab.key
                ? 'bg-[#155EEF] text-white shadow-xs'
                : 'bg-white border border-[#D7E3F5] text-[#64748B] hover:text-[#0B1220] hover:bg-[#F4F8FF]'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                filter === tab.key ? 'bg-white/20 text-white' : 'bg-[#E8F1FF] text-[#155EEF]'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Notification List ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="bg-white p-16 rounded-3xl border border-[#D7E3F5] text-center shadow-xs">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#155EEF] mb-3" />
          <p className="text-sm font-bold text-[#07152F]">Fetching real-time administrative alerts...</p>
          <p className="text-xs text-[#64748B] mt-1 font-medium">Synchronizing with loan underwriting queues.</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white p-16 rounded-3xl border border-[#D7E3F5] text-center shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] text-[#16A34A] flex items-center justify-center mx-auto shadow-2xs">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[#07152F]">No Notifications in this View</h3>
            <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto leading-relaxed font-medium">
              There are no outstanding operational alerts matching the selected filter. Check other filters or refresh.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((n) => {
            const style = getSemanticStyling(n.type, n.title);

            return (
              <div
                key={n.id}
                className={`bg-white rounded-2xl border border-[#D7E3F5] p-5 shadow-xs transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${style.leftBorder} ${
                  !n.read ? 'ring-1 ring-[#155EEF]/20' : ''
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  {/* Semantic Icon Pill */}
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs mt-0.5 ${style.iconBg}`}>
                    {style.icon}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${style.badgeBg}`}>
                        {style.badgeLabel}
                      </span>
                      <h3 className="text-sm font-extrabold text-[#0B1220] tracking-tight">
                        {n.title}
                      </h3>
                      {!n.read && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#155EEF] uppercase tracking-wider bg-[#EFF6FF] px-2 py-0.5 rounded-full border border-[#D7E3F5]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#155EEF]" />
                          Unread
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-[#475569] leading-relaxed font-medium">
                      {n.message}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-[#94A3B8] font-semibold pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#94A3B8]" />
                        {new Date(n.createdAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center pl-13 sm:pl-0">
                  {style.link && (
                    <Link
                      to={style.link}
                      className="px-3 py-1.5 bg-[#F4F8FF] hover:bg-[#E8F1FF] text-[#155EEF] border border-[#D7E3F5] hover:border-[#155EEF] text-xs font-bold rounded-xl transition flex items-center gap-1 shadow-2xs"
                    >
                      <span>{style.linkLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}

                  {!n.read && (
                    <Button
                      size="sm"
                      onClick={() => handleMarkAsRead(n.id)}
                      className="bg-[#155EEF] hover:bg-[#123B8E] text-white text-xs h-8.5 px-4 font-bold rounded-xl shadow-xs transition cursor-pointer"
                    >
                      <span>Mark Read</span>
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSingleDelete(n)}
                    className="h-8.5 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
                    title="Delete Notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Safe Data Management Confirmation Modal */}
      <DataManagementModal
        isOpen={mgmtModalState.isOpen}
        onClose={() => setMgmtModalState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={mgmtModalState.onConfirm}
        actionType={mgmtModalState.actionType}
        title={mgmtModalState.title}
        description={mgmtModalState.description}
        itemCount={mgmtModalState.itemCount}
        itemNames={mgmtModalState.itemNames}
        warningMessage={mgmtModalState.warningMessage}
        requireTypedConfirmation={mgmtModalState.requireTypedConfirmation}
        confirmTextRequired="DELETE"
      />
    </div>
  );
};

export default AdminNotificationsPage;
