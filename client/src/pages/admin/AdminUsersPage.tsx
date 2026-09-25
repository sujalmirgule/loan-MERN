import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Users,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Search,
  Lock,
  Unlock,
  CheckSquare,
  Square,
  KeyRound,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';
import { DataManagementModal, ManagementActionType } from '@/components/admin/DataManagementModal';
import { BulkActionBar } from '@/components/admin/BulkActionBar';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { useAuth } from '@/contexts/AuthContext';
import {
  PERMISSION_GROUPS,
  ALL_PERMISSION_KEYS,
  ROLE_PRESETS,
} from '@/constants/permissions';

interface AdminUserRecord {
  id: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'STAFF';
  isActive: boolean;
  permissions?: string[];
  lastLoginAt?: string;
  createdAt: string;
}

export const AdminUsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const isSuperAdmin = (currentUser as any)?.adminRole === 'SUPER_ADMIN' || (currentUser as any)?.role === 'SUPER_ADMIN';

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserRecord | null>(null);

  // Form states
  const [formData, setFormData] = useState<{
    fullName: string;
    email: string;
    password: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'STAFF';
    isActive: boolean;
    permissions: string[];
  }>({
    fullName: '',
    email: '',
    password: '',
    role: 'ADMIN',
    isActive: true,
    permissions: [...ROLE_PRESETS.ADMIN],
  });

  // Collapsed module groups inside modal
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Selection & Safe Data Management Modal State
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
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

  // Messages
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);


  // Fetch users list
  const { data: users = [], isLoading, refetch } = useQuery<AdminUserRecord[]>({
    queryKey: ['adminUsersList'],
    queryFn: async () => {
      const res = await api.get(API_ENDPOINTS.ADMIN_USERS.LIST);
      const list = res.data?.data || res.data || [];
      return Array.isArray(list) ? list : [];
    },
  });

  // Stats calculation
  const stats = useMemo(() => {
    const total = users.length;
    const superAdmins = users.filter((u) => u.role === 'SUPER_ADMIN').length;
    const admins = users.filter((u) => u.role === 'ADMIN').length;
    const staff = users.filter((u) => u.role === 'STAFF').length;
    const active = users.filter((u) => u.isActive !== false).length;
    const disabled = total - active;
    return { total, superAdmins, admins, staff, active, disabled };
  }, [users]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, searchQuery, roleFilter]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      fullName: '',
      email: '',
      password: '',
      role: 'ADMIN',
      isActive: true,
      permissions: [...ROLE_PRESETS.ADMIN],
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (user: AdminUserRecord) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName,
      email: user.email,
      password: '',
      role: user.role,
      isActive: user.isActive !== false,
      permissions: Array.isArray(user.permissions)
        ? [...user.permissions]
        : [...(ROLE_PRESETS[user.role] || [])],
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  // Preset Application
  const handleApplyPreset = (targetRole: 'SUPER_ADMIN' | 'ADMIN' | 'STAFF') => {
    setFormData((prev) => ({
      ...prev,
      role: targetRole,
      permissions: [...(ROLE_PRESETS[targetRole] || [])],
    }));
  };

  // Global Permissions Toggle
  const handleSelectAllPermissions = () => {
    setFormData((prev) => ({
      ...prev,
      permissions: [...ALL_PERMISSION_KEYS],
    }));
  };

  const handleClearAllPermissions = () => {
    setFormData((prev) => ({
      ...prev,
      permissions: [],
    }));
  };

  // Module Level Permissions Toggle
  const handleToggleModulePermissions = (moduleKeys: string[], shouldSelect: boolean) => {
    setFormData((prev) => {
      const current = new Set(prev.permissions);
      if (shouldSelect) {
        moduleKeys.forEach((k) => current.add(k));
      } else {
        moduleKeys.forEach((k) => current.delete(k));
      }
      return { ...prev, permissions: Array.from(current) };
    });
  };

  // Single Permission Toggle
  const handleToggleSinglePermission = (key: string) => {
    setFormData((prev) => {
      const exists = prev.permissions.includes(key);
      const next = exists
        ? prev.permissions.filter((p) => p !== key)
        : [...prev.permissions, key];
      return { ...prev, permissions: next };
    });
  };

  // Toggle Module Group Accordion
  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Create or Update Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingUser) {
        // Update user
        const payload: any = {
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          role: formData.role,
          isActive: formData.isActive,
          permissions: formData.permissions,
        };
        if (formData.password.trim()) {
          payload.password = formData.password.trim();
        }
        return api.put(API_ENDPOINTS.ADMIN_USERS.UPDATE(editingUser.id), payload);
      } else {
        // Create user
        return api.post(API_ENDPOINTS.ADMIN_USERS.CREATE, {
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          password: formData.password.trim(),
          role: formData.role,
          permissions: formData.permissions,
        });
      }
    },
    onSuccess: () => {
      setSuccessMsg(
        editingUser
          ? `Admin user ${formData.fullName} updated successfully.`
          : `Admin user ${formData.fullName} created successfully.`
      );
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['adminUsersList'] });
      refetch();
      setTimeout(() => setSuccessMsg(null), 5000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Operation failed';
      setErrorMsg(msg);
    },
  });

  // Toggle Active/Disable Status
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ user, newStatus }: { user: AdminUserRecord; newStatus: boolean }) => {
      return api.put(API_ENDPOINTS.ADMIN_USERS.UPDATE(user.id), {
        isActive: newStatus,
      });
    },
    onSuccess: (_, vars) => {
      setSuccessMsg(`Admin user status changed to ${vars.newStatus ? 'ACTIVE' : 'DISABLED'}.`);
      queryClient.invalidateQueries({ queryKey: ['adminUsersList'] });
      refetch();
      setTimeout(() => setSuccessMsg(null), 5000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Status update failed';
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 5000);
    },
  });

  // Handlers for Safe User Management & Deletion
  const handleBulkDeactivate = () => {
    const selectedUsers = users.filter((u) => selectedUserIds.includes(u.id));
    setMgmtModalState({
      isOpen: true,
      actionType: 'DEACTIVATE',
      title: 'Bulk Deactivate Admin Users',
      description: `Deactivate administrative access for ${selectedUserIds.length} selected user(s).`,
      itemCount: selectedUserIds.length,
      itemNames: selectedUsers.map((u) => `${u.fullName} (${u.email})`).slice(0, 5),
      warningMessage: 'Deactivated users will lose dashboard login access immediately. Super Admin accounts are safeguarded from bulk deactivation.',
      onConfirm: async () => {
        const res = await api.post(API_ENDPOINTS.ADMIN_USERS.BULK_DEACTIVATE, { userIds: selectedUserIds });
        setSuccessMsg(res.data?.message || `Successfully deactivated admin users.`);
        setSelectedUserIds([]);
        queryClient.invalidateQueries({ queryKey: ['adminUsersList'] });
        refetch();
      },
    });
  };

  const handleBulkDelete = () => {
    const selectedUsers = users.filter((u) => selectedUserIds.includes(u.id));
    setMgmtModalState({
      isOpen: true,
      actionType: 'DELETE',
      title: 'Permanently Delete Selected Admin Users',
      description: `Permanently delete ${selectedUserIds.length} selected admin user account(s).`,
      itemCount: selectedUserIds.length,
      itemNames: selectedUsers.map((u) => `${u.fullName} (${u.email})`).slice(0, 5),
      requireTypedConfirmation: true,
      warningMessage: 'SECURITY SAFEGUARD: You cannot delete your own active session account or Super Admin accounts in bulk operations.',
      onConfirm: async () => {
        const res = await api.post(API_ENDPOINTS.ADMIN_USERS.BULK_DELETE, { userIds: selectedUserIds });
        setSuccessMsg(res.data?.message || `Successfully deleted admin users.`);
        setSelectedUserIds([]);
        queryClient.invalidateQueries({ queryKey: ['adminUsersList'] });
        refetch();
      },
    });
  };

  const handleSingleDelete = (targetUser: AdminUserRecord) => {
    setMgmtModalState({
      isOpen: true,
      actionType: 'DELETE',
      title: `Delete Admin User: ${targetUser.fullName}`,
      description: `Permanently delete admin user account ${targetUser.fullName} (${targetUser.email}).`,
      itemCount: 1,
      itemNames: [`${targetUser.fullName} (${targetUser.email}) - ${targetUser.role}`],
      requireTypedConfirmation: true,
      warningMessage: targetUser.role === 'SUPER_ADMIN'
        ? 'WARNING: You are requesting deletion of a SUPER_ADMIN account. The sole remaining SUPER_ADMIN cannot be deleted.'
        : 'This action is permanent and removes admin credentials.',
      onConfirm: async () => {
        const res = await api.delete(API_ENDPOINTS.ADMIN_USERS.DELETE(targetUser.id));
        setSuccessMsg(res.data?.message || `Admin user ${targetUser.fullName} deleted successfully.`);
        queryClient.invalidateQueries({ queryKey: ['adminUsersList'] });
        refetch();
      },
    });
  };


  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser && !formData.password.trim()) {
      setErrorMsg('Password is required when creating a new administrator.');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-text-secondary mb-1">
            <Link to="/admin/dashboard" className="hover:text-text-primary transition">
              Dashboard
            </Link>
            <span>›</span>
            <span className="text-text-primary font-semibold">Admin Users & RBAC</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-primary" />
            Granular Role & Permission Governance
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Manage administrative team members, grant fine-grained module access, and control platform authority.
          </p>
        </div>

        {/* Action Button */}
        <Button
          onClick={handleOpenCreate}
          className="bg-primary hover:bg-secondary text-text-primary font-semibold text-xs h-9 px-4 rounded-xl gap-2 shadow-lg shadow-primary/20 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Admin User</span>
        </Button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-success/10 border border-success/30 text-success text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-success hover:text-emerald-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-danger hover:text-red-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-surface border-border p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Total Accounts</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-text-primary">{stats.total}</div>
          <div className="text-[10px] text-success mt-1">{stats.active} Active accounts</div>
        </Card>

        <Card className="bg-surface border-border p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Super Admins</span>
            <ShieldAlert className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-400">{stats.superAdmins}</div>
          <div className="text-[10px] text-text-secondary mt-1">Full system root access</div>
        </Card>

        <Card className="bg-surface border-border p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Admins</span>
            <ShieldCheck className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-primary">{stats.admins}</div>
          <div className="text-[10px] text-text-secondary mt-1">Operational controllers</div>
        </Card>

        <Card className="bg-surface border-border p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Staff</span>
            <KeyRound className="w-4 h-4 text-warning" />
          </div>
          <div className="mt-2 text-2xl font-bold text-warning">{stats.staff}</div>
          <div className="text-[10px] text-text-secondary mt-1">Review & support specialists</div>
        </Card>
      </div>

      {/* Bulk Action Sticky Bar */}
      <BulkActionBar
        selectedCount={selectedUserIds.length}
        totalCount={filteredUsers.length}
        onClearSelection={() => setSelectedUserIds([])}
        onArchiveSelected={handleBulkDeactivate}
        archiveLabel="Deactivate Selected"
        onDeleteSelected={handleBulkDelete}
        deleteLabel="Delete Selected"
      />

      {/* Users Table Card */}
      <Card className="bg-surface border-border rounded-2xl shadow-xl overflow-hidden">
        {/* Table Header & Search Filter */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-8 pr-3 py-1.5 bg-surface-elevated border border-border rounded-lg text-xs text-text-primary placeholder-[#8FA3BA]/60 focus:outline-none focus:border-primary"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-surface-elevated border border-border text-xs text-text-primary rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              <option value="ADMIN">ADMIN</option>
              <option value="STAFF">STAFF</option>
            </select>
          </div>

          <div className="text-xs text-text-secondary">
            Showing <span className="font-semibold text-text-primary">{filteredUsers.length}</span> of{' '}
            <span className="font-semibold text-text-primary">{users.length}</span> members
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-text-secondary">
            <thead className="bg-surface-elevated/80 text-[10px] uppercase tracking-wider text-text-secondary font-bold border-b border-border">
              <tr>
                <th className="py-3 px-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={filteredUsers.length > 0 && filteredUsers.every((u) => selectedUserIds.includes(u.id))}
                    onChange={() => {
                      if (filteredUsers.every((u) => selectedUserIds.includes(u.id))) {
                        setSelectedUserIds([]);
                      } else {
                        setSelectedUserIds(filteredUsers.map((u) => u.id));
                      }
                    }}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">User Details</th>
                <th className="py-3 px-4">Role Preset</th>
                <th className="py-3 px-4">Granular Permissions</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1D3047]/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-text-secondary">
                    Loading administrative accounts...
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u) => {
                  const permCount = Array.isArray(u.permissions) ? u.permissions.length : 0;
                  const isUserSuperAdmin = u.role === 'SUPER_ADMIN';
                  const isCurrentSelf = currentUser?.email === u.email;

                  return (
                    <tr key={u.id} className="hover:bg-surface-elevated/40 transition">
                      <td className="py-3.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(u.id)}
                          disabled={isCurrentSelf || isUserSuperAdmin}
                          onChange={() => {
                            setSelectedUserIds((prev) =>
                              prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                            );
                          }}
                          className={`w-4 h-4 rounded border-border text-primary focus:ring-primary ${
                            isCurrentSelf || isUserSuperAdmin ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
                          }`}
                        />
                      </td>
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-border flex items-center justify-center font-bold text-xs text-success shrink-0">
                            {u.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-text-primary flex items-center gap-1.5">
                              <span>{u.fullName}</span>
                              {isCurrentSelf && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-text-secondary font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        {u.role === 'SUPER_ADMIN' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-sm">
                            <ShieldAlert className="w-3 h-3" />
                            SUPER_ADMIN
                          </span>
                        ) : u.role === 'ADMIN' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-primary border border-primary/30">
                            <ShieldCheck className="w-3 h-3" />
                            ADMIN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-warning/15 text-warning border border-warning/30">
                            <KeyRound className="w-3 h-3" />
                            STAFF
                          </span>
                        )}
                      </td>

                      {/* Granular Permission count */}
                      <td className="py-3.5 px-4">
                        {isUserSuperAdmin ? (
                          <div className="flex items-center gap-1.5 text-purple-400">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span className="font-semibold text-xs">Full Root Access</span>
                            <span className="text-[10px] text-text-secondary">({ALL_PERMISSION_KEYS.length}/{ALL_PERMISSION_KEYS.length})</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-surface-elevated border border-border text-text-primary font-mono text-[11px] font-semibold">
                              {permCount} / {ALL_PERMISSION_KEYS.length}
                            </span>
                            <span className="text-[10px] text-text-secondary">modules granted</span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {u.isActive !== false ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/20 text-success border border-success/30">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger/20 text-danger border border-danger/30">
                            DISABLED
                          </span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-right text-text-secondary">
                        {new Date(u.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Edit / Matrix */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(u)}
                            disabled={!isSuperAdmin && isUserSuperAdmin}
                            title={
                              !isSuperAdmin && isUserSuperAdmin
                                ? 'Only Super Admins can edit Super Admin accounts'
                                : 'Configure Permissions & Edit Profile'
                            }
                            className="bg-surface-elevated border-border text-text-primary hover:border-focus hover:text-text-primary h-7 px-2.5 text-[11px] gap-1 rounded-lg"
                          >
                            <Edit2 className="w-3 h-3 text-primary" />
                            <span>Edit Matrix</span>
                          </Button>

                          {/* Disable / Enable */}
                          {u.isActive !== false ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to disable ${u.fullName}'s administrative login access?`)) {
                                  toggleStatusMutation.mutate({ user: u, newStatus: false });
                                }
                              }}
                              disabled={(!isSuperAdmin && isUserSuperAdmin) || toggleStatusMutation.isPending}
                              title="Disable Account"
                              className="bg-danger/10 border-red-500/20 text-danger hover:bg-danger/20 h-7 px-2 text-[11px] rounded-lg"
                            >
                              <Lock className="w-3 h-3" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleStatusMutation.mutate({ user: u, newStatus: true })}
                              disabled={(!isSuperAdmin && isUserSuperAdmin) || toggleStatusMutation.isPending}
                              title="Enable Account"
                              className="bg-success/10 border-success/20 text-success hover:bg-success/20 h-7 px-2 text-[11px] rounded-lg"
                            >
                              <Unlock className="w-3 h-3" />
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSingleDelete(u)}
                            disabled={isCurrentSelf || (!isSuperAdmin && isUserSuperAdmin)}
                            title="Delete Admin User"
                            className="bg-danger/10 border-red-500/20 text-danger hover:bg-danger/20 h-7 px-2 text-[11px] rounded-lg"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-text-secondary">
                    No administrative accounts match your search filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* PERMISSION MATRIX & USER CONFIGURATION MODAL */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-surface border border-border w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-surface-elevated/80">
              <div>
                <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  {editingUser ? `Edit Account & Permissions: ${editingUser.fullName}` : 'Add New Administrator'}
                </h3>
                <p className="text-xs text-text-secondary">
                  Configure credentials, role archetype, and granular MODULE.ACTION security permissions.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Account Basic Info Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-background p-4 rounded-xl border border-border">
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <Input
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className="bg-surface-elevated border-border text-text-primary text-xs h-9 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                    Email Address *
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ramesh@loanapprove.com"
                    className="bg-surface-elevated border-border text-text-primary text-xs h-9 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                    Password {editingUser ? '(Leave empty to keep)' : '*'}
                  </label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? '••••••••' : 'Strong password'}
                    className="bg-surface-elevated border-border text-text-primary text-xs h-9 rounded-lg"
                    required={!editingUser}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                    Primary Role Archetype
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => {
                      const newRole = e.target.value as 'SUPER_ADMIN' | 'ADMIN' | 'STAFF';
                      setFormData({ ...formData, role: newRole });
                    }}
                    disabled={!isSuperAdmin && formData.role === 'SUPER_ADMIN'}
                    className="w-full bg-surface-elevated border border-border rounded-lg p-2 text-xs text-text-primary h-9 focus:outline-none focus:border-primary"
                  >
                    <option value="STAFF">STAFF (Underwriting & review)</option>
                    <option value="ADMIN">ADMIN (Full loan operations)</option>
                    {isSuperAdmin && <option value="SUPER_ADMIN">SUPER_ADMIN (Root governance)</option>}
                  </select>
                </div>
              </div>

              {/* Status Toggle & Role Presets Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface-elevated/60 rounded-xl border border-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-secondary">Account Status:</span>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, isActive: !prev.isActive }))}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      formData.isActive
                        ? 'bg-success/20 text-success border border-success/40'
                        : 'bg-danger/20 text-danger border border-danger/40'
                    }`}
                  >
                    {formData.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    {formData.isActive ? 'ACTIVE' : 'DISABLED'}
                  </button>
                </div>

                {/* Preset Fast-Loader */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary">Load Role Preset:</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyPreset('STAFF')}
                    className="bg-background border-border hover:border-warning/50 hover:text-warning text-xs h-7 px-2.5"
                  >
                    Staff Preset ({ROLE_PRESETS.STAFF.length})
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyPreset('ADMIN')}
                    className="bg-background border-border hover:border-primary/50 hover:text-primary text-xs h-7 px-2.5"
                  >
                    Admin Preset ({ROLE_PRESETS.ADMIN.length})
                  </Button>
                  {isSuperAdmin && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplyPreset('SUPER_ADMIN')}
                      className="bg-background border-border hover:border-purple-500/50 hover:text-purple-400 text-xs h-7 px-2.5"
                    >
                      Super Admin Preset ({ROLE_PRESETS.SUPER_ADMIN.length})
                    </Button>
                  )}
                </div>
              </div>

              {/* Super Admin Notice */}
              {formData.role === 'SUPER_ADMIN' && (
                <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs flex items-center space-x-2.5">
                  <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                  <div>
                    <span className="font-bold">Super Administrator Privilege Active:</span> All permission checks are
                    bypassed by backend policy. Custom matrix selections will be stored for role fallback.
                  </div>
                </div>
              )}

              {/* Granular Permissions Section Header */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-2">
                  <div>
                    <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-primary" />
                      Granular Permission Matrix ({formData.permissions.length} / {ALL_PERMISSION_KEYS.length} Selected)
                    </h4>
                    <p className="text-[11px] text-text-secondary">
                      Select specific capabilities granted to this administrator across all system modules.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllPermissions}
                      className="bg-surface-elevated border-border text-success hover:bg-success/10 text-xs h-7 px-2.5 gap-1.5"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Select All</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleClearAllPermissions}
                      className="bg-surface-elevated border-border text-danger hover:bg-danger/10 text-xs h-7 px-2.5 gap-1.5"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>Clear All</span>
                    </Button>
                  </div>
                </div>

                {/* Module Permission Groups */}
                <div className="space-y-3">
                  {PERMISSION_GROUPS.map((group) => {
                    const groupKeyList = group.permissions.map((p) => p.key);
                    const selectedCount = groupKeyList.filter((k) => formData.permissions.includes(k)).length;
                    const isAllSelected = selectedCount === groupKeyList.length;
                    const isCollapsed = collapsedGroups[group.moduleId];

                    return (
                      <div
                        key={group.moduleId}
                        className="bg-background border border-border rounded-xl overflow-hidden"
                      >
                        {/* Group Header */}
                        <div className="p-3 bg-surface-elevated/50 flex items-center justify-between">
                          <div
                            className="flex items-center space-x-2.5 cursor-pointer select-none flex-1"
                            onClick={() => toggleGroupCollapse(group.moduleId)}
                          >
                            <span className="font-bold text-xs text-text-primary">{group.moduleLabel}</span>
                            <span className="text-[10px] px-2 py-0.2 rounded-full font-mono bg-[#1D3047] text-text-secondary">
                              {selectedCount} / {groupKeyList.length}
                            </span>
                            <span className="text-[10px] text-text-secondary hidden sm:inline truncate max-w-xs">
                              — {group.description}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            {isAllSelected ? (
                              <button
                                type="button"
                                onClick={() => handleToggleModulePermissions(groupKeyList, false)}
                                className="text-[10px] font-bold text-danger hover:text-red-300 px-2 py-0.5 rounded bg-danger/10"
                              >
                                Clear
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleModulePermissions(groupKeyList, true)}
                                className="text-[10px] font-bold text-success hover:text-success/80 px-2 py-0.5 rounded bg-success/10"
                              >
                                Select All
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => toggleGroupCollapse(group.moduleId)}
                              className="text-text-secondary hover:text-text-primary p-1"
                            >
                              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Group Checkboxes */}
                        {!isCollapsed && (
                          <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2 border-t border-border/60 bg-background">
                            {group.permissions.map((perm) => {
                              const isChecked = formData.permissions.includes(perm.key);
                              return (
                                <label
                                  key={perm.key}
                                  className={`flex items-start space-x-3 p-2.5 rounded-lg border transition cursor-pointer select-none ${
                                    isChecked
                                      ? 'bg-surface-elevated border-primary/40 text-text-primary'
                                      : 'bg-surface/50 border-border text-text-secondary hover:bg-surface-elevated/60'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleSinglePermission(perm.key)}
                                    className="mt-0.5 rounded border-border text-primary focus:ring-0 focus:ring-offset-0 bg-background shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-semibold text-text-primary">{perm.label}</span>
                                      {perm.isHighPrivilege && (
                                        <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-danger/20 text-red-300 border border-danger/30">
                                          High Risk
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-text-secondary leading-relaxed mt-0.5">{perm.description}</p>
                                    <code className="text-[9px] text-primary/80 font-mono mt-0.5 block">{perm.key}</code>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-border flex items-center justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-surface-elevated border-border text-text-secondary hover:text-text-primary h-9 px-4 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="bg-primary hover:bg-secondary text-text-primary font-bold text-xs h-9 px-5 rounded-xl shadow-lg shadow-primary/20"
                >
                  {saveMutation.isPending
                    ? 'Saving...'
                    : editingUser
                    ? 'Update Account & Permissions'
                    : 'Create Administrator'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Safe Data Management System Confirmation Modal */}
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

export default AdminUsersPage;
