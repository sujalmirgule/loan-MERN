import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, CheckCircle2, AlertCircle, Plus, Link as LinkIcon, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { DataManagementModal, ManagementActionType } from '@/components/admin/DataManagementModal';

interface PaymentLinkItem {
  id: string;
  title: string;
  url: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export const AdminPaymentLinksPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const { data: links, isLoading, refetch } = useQuery<PaymentLinkItem[]>({
    queryKey: ['adminPaymentLinks'],
    queryFn: async () => {
      const res = await api.get(API_ENDPOINTS.PAYMENT_LINKS.LIST);
      const list = res.data?.data || res.data || [];
      return Array.isArray(list) ? list : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return api.post(API_ENDPOINTS.PAYMENT_LINKS.CREATE, {
        title: title.trim(),
        url: url.trim(),
        description: description.trim() || undefined,
        status,
      });
    },
    onSuccess: () => {
      setSuccessMsg('Payment link added successfully');
      setErrorMsg(null);
      setTitle('');
      setUrl('');
      setDescription('');
      queryClient.invalidateQueries({ queryKey: ['adminPaymentLinks'] });
      queryClient.invalidateQueries({ queryKey: ['activePaymentOptions'] });
      refetch();
      setTimeout(() => setSuccessMsg(null), 3500);
    },
    onError: (err: unknown) => {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create payment link');
      setTimeout(() => setErrorMsg(null), 4000);
    },
  });

  // Safe Delete Handlers


  const handleSingleDelete = (link: PaymentLinkItem) => {
    setMgmtModalState({
      isOpen: true,
      actionType: 'DELETE',
      title: `Delete Payment Link: ${link.title}`,
      description: `Requesting permanent removal for payment link '${link.title}'.`,
      itemCount: 1,
      itemNames: [`${link.title} (${link.url})`],
      requireTypedConfirmation: true,
      warningMessage: 'This action is permanent and removes payment link option for borrowers.',
      onConfirm: async () => {
        try {
          await api.delete(API_ENDPOINTS.PAYMENT_LINKS.DELETE(link.id));
          setSuccessMsg('Payment link removed successfully');
          queryClient.invalidateQueries({ queryKey: ['adminPaymentLinks'] });
          queryClient.invalidateQueries({ queryKey: ['activePaymentOptions'] });
          refetch();
        } catch (err: any) {
          setErrorMsg(err.response?.data?.message || err.message || 'Failed to delete payment link');
        }
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-xs text-[#52657A]">
        <Link to="/admin/dashboard" className="hover:text-[#0B1F3A] transition-colors font-medium">
          Dashboard
        </Link>
        <span>›</span>
        <span className="text-[#52657A]">Payments</span>
        <span>›</span>
        <span className="text-[#0B1F3A] font-bold">Payment Links</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-[#0B1F3A] tracking-tight">Payment Links Management</h1>
        <p className="text-xs text-[#52657A] mt-1">
          Configure external payment gateway links and quick checkout URLs for customers.
        </p>
      </div>

      {/* Feedback Messages */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs flex items-center space-x-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#10B981]" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs flex items-center space-x-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#EF4444]" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Form: Add Payment Link */}
        <Card className="bg-[#FFFFFF] border border-[#D9E6F2] rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="p-5 pb-4 bg-[#F8FAFC] border-b border-[#D9E6F2]">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-[#EAF4FF] text-[#2563EB] border border-[#BFDBFE]">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-extrabold text-[#0B1F3A]">Add Payment Link</CardTitle>
                <CardDescription className="text-xs text-[#52657A]">Create a new direct checkout URL</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wider">Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Pay via PhonePe Gateway"
                  className="bg-[#FFFFFF] border-[#D9E6F2] text-[#0B1F3A] text-xs h-10 rounded-xl placeholder-[#52657A]/50 focus:border-[#2563EB]"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wider">Target URL *</Label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://pay.example.com/checkout"
                  className="bg-[#FFFFFF] border-[#D9E6F2] text-[#0B1F3A] text-xs h-10 rounded-xl placeholder-[#52657A]/50 focus:border-[#2563EB]"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wider">Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional note for borrowers"
                  className="bg-[#FFFFFF] border-[#D9E6F2] text-[#0B1F3A] text-xs h-10 rounded-xl placeholder-[#52657A]/50 focus:border-[#2563EB]"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wider">Status</Label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                  className="w-full bg-[#FFFFFF] border border-[#D9E6F2] rounded-xl p-2.5 text-xs text-[#0B1F3A] font-semibold focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE (Visible on checkout)</option>
                  <option value="INACTIVE">INACTIVE (Hidden)</option>
                </select>
              </div>

              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl shadow-md shadow-[#2563EB]/25 flex items-center justify-center space-x-2 mt-3"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Creating Link...</span>
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4 text-white" />
                    <span>Create Payment Link</span>
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Table: Configured Payment Links */}
        <Card className="lg:col-span-2 bg-[#FFFFFF] border border-[#D9E6F2] rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="p-5 pb-4 bg-[#F8FAFC] border-b border-[#D9E6F2]">
            <CardTitle className="text-base font-extrabold text-[#0B1F3A]">Configured Payment Links</CardTitle>
            <CardDescription className="text-xs text-[#52657A]">
              Payment rails presented to borrowers when Payment Link option is selected.
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#52657A]">
              <thead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wider text-[#52657A] font-bold border-b border-[#D9E6F2]">
                <tr>
                  <th className="py-3.5 px-4">Title</th>
                  <th className="py-3.5 px-4">Target URL</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E6F2]">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-[#52657A]">
                      <Loader2 className="w-5 h-5 animate-spin text-[#2563EB] mx-auto mb-2" />
                      Loading configured links...
                    </td>
                  </tr>
                ) : links && links.length > 0 ? (
                  links.map((link) => (
                    <tr key={link.id} className="hover:bg-[#F8FAFC] transition">
                      <td className="py-4 px-4 font-bold text-[#0B1F3A]">{link.title}</td>
                      <td className="py-4 px-4 font-mono text-[#52657A] max-w-[200px] truncate">{link.url}</td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            link.status === 'ACTIVE'
                              ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                              : 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]'
                          }`}
                        >
                          {link.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSingleDelete(link)}
                          className="text-[#DC2626] hover:text-[#991B1B] hover:bg-[#FEF2F2] p-1.5 h-8 w-8 rounded-lg"
                          title="Delete Payment Link"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-[#52657A]">
                      No custom payment links configured yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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

export default AdminPaymentLinksPage;
