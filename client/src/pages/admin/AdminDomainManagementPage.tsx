import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe,
  Plus,
  Trash2,
  Phone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { DataManagementModal, ManagementActionType } from '@/components/admin/DataManagementModal';

interface DomainRecord {
  id: string;
  domainName: string;
  helplineNumber?: string;
  contactEmail?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    customers: number;
    loans: number;
  };
}

export const AdminDomainManagementPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [domainName, setDomainName] = useState('');
  const [helplineNumber, setHelplineNumber] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Selection & Safe Data Management Modal State
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

  // Fetch domains
  const { data: domains, refetch } = useQuery<DomainRecord[]>({
    queryKey: ['adminDomains'],
    queryFn: async () => {
      const res = await api.get(API_ENDPOINTS.DOMAINS.LIST);
      const list = res.data?.data || res.data || [];
      return Array.isArray(list) ? list : [];
    },
  });

  // Create Domain Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      return api.post(API_ENDPOINTS.DOMAINS.CREATE, {
        domainName: domainName.trim(),
        helplineNumber: helplineNumber.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        description: description.trim() || undefined,
        isActive,
      });
    },
    onSuccess: () => {
      setSuccessMsg(`Domain ${domainName} added successfully!`);
      setErrorMsg(null);
      setDomainName('');
      setHelplineNumber('');
      setContactEmail('');
      setDescription('');
      setIsActive(true);
      queryClient.invalidateQueries({ queryKey: ['adminDomains'] });
      refetch();
    },
    onError: (err: unknown) => {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create domain');
    },
  });

  // Safe Delete Handlers

  const handleSingleDelete = (domain: DomainRecord) => {
    const hasLinkedRecords = (domain._count?.customers ?? 0) > 0 || (domain._count?.loans ?? 0) > 0;
    setMgmtModalState({
      isOpen: true,
      actionType: 'DELETE',
      title: `Delete Domain: ${domain.domainName}`,
      description: `Requesting permanent deletion for domain ${domain.domainName}.`,
      itemCount: 1,
      itemNames: [`${domain.domainName} (${domain._count?.customers || 0} customers, ${domain._count?.loans || 0} loans)`],
      requireTypedConfirmation: true,
      warningMessage: hasLinkedRecords
        ? `CANNOT DELETE: Domain '${domain.domainName}' has ${domain._count?.customers || 0} associated customer(s) and ${domain._count?.loans || 0} loan(s). Foreign key protection will reject this deletion; deactivate the domain instead.`
        : 'This action is permanent and removes domain routing configuration.',
      onConfirm: async () => {
        try {
          const res = await api.delete(API_ENDPOINTS.DOMAINS.DELETE(domain.id));
          setSuccessMsg(res.data?.message || 'Domain removed successfully');
          queryClient.invalidateQueries({ queryKey: ['adminDomains'] });
          refetch();
        } catch (err: any) {
          setErrorMsg(err.response?.data?.message || err.message || 'Failed to delete domain');
        }
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainName.trim()) {
      setErrorMsg('Domain name is required');
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-xs text-text-secondary">
        <Link to="/admin/dashboard" className="hover:text-text-primary transition">Dashboard</Link>
        <span>›</span>
        <span className="text-text-primary font-semibold">Domain Settings</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Domain Management</h1>
          <p className="text-xs text-text-secondary">Configure multi-tenant domain aliases, helplines and customer routing.</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm" className="border-border text-text-secondary text-xs h-9">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-success/10 border border-success/30 text-success text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Add New Domain (Screen 9 Reference) */}
        <Card className="bg-surface border-border rounded-2xl shadow-xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base text-text-primary flex items-center space-x-2">
              <Globe className="w-4 h-4 text-primary" />
              <span>Add New Domain</span>
            </CardTitle>
            <CardDescription className="text-xs text-text-secondary">
              Bind a new customer domain to this loan platform instance.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">
                  Domain Name *
                </label>
                <Input
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value)}
                  placeholder="e.g. mudramantra.in"
                  className="bg-surface-elevated border-border text-text-primary text-xs h-10 rounded-xl font-mono focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">
                  Helpline Number
                </label>
                <Input
                  value={helplineNumber}
                  onChange={(e) => setHelplineNumber(e.target.value)}
                  placeholder="e.g. 1800-xxx-xxxx"
                  className="bg-surface-elevated border-border text-text-primary text-xs h-10 rounded-xl focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">
                  Contact Email
                </label>
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="admin@yourdomain.com"
                  className="bg-surface-elevated border-border text-text-primary text-xs h-10 rounded-xl focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">
                  Description
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional note"
                  className="bg-surface-elevated border-border text-text-primary text-xs h-10 rounded-xl focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-elevated border border-border">
                <span className="text-xs text-text-secondary font-medium">Status</span>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs font-bold ${isActive ? 'text-success' : 'text-text-secondary'}`}>
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full h-10 bg-primary text-background hover:bg-secondary text-text-primary font-bold text-xs rounded-xl shadow-md shadow-blue-600/30 flex items-center justify-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{createMutation.isPending ? 'Adding Domain...' : 'Add Domain'}</span>
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Card 2: Existing Domains (Screen 9 Reference) */}
        <Card className="bg-surface border-border rounded-2xl shadow-xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base text-text-primary">Existing Domains</CardTitle>
            <CardDescription className="text-xs text-text-secondary">
              Active multi-tenant domains routing to this loan system.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-3">
            {domains && domains.length > 0 ? (
              domains.map((dom) => (
                <div
                  key={dom.id}
                  className="p-3.5 rounded-xl bg-surface-elevated border border-border flex items-start justify-between hover:border-border transition"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="font-mono text-sm font-bold text-text-primary">{dom.domainName}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          dom.isActive
                            ? 'bg-success/20 text-success border border-success/30'
                            : 'bg-danger/20 text-danger border border-danger/30'
                        }`}
                      >
                        {dom.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {dom.helplineNumber && (
                      <div className="text-[11px] text-text-secondary flex items-center space-x-1">
                        <Phone className="w-3 h-3" />
                        <span>{dom.helplineNumber}</span>
                      </div>
                    )}
                    {/* Customer & Loan count badges */}
                    <div className="flex items-center space-x-2 pt-0.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                        {dom._count?.customers ?? 0} customers
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
                        {dom._count?.loans ?? 0} loans
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 mt-0.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSingleDelete(dom)}
                      className="text-danger hover:text-red-300 hover:bg-danger/10 p-1.5 h-8 w-8 rounded-lg"
                      title="Delete Domain"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-text-secondary">
                No custom domains registered yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
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
