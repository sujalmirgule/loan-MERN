import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  HelpCircle,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { useBrandTitle } from '@/hooks/useBrandTitle';

interface SupportTicketItem {
  id: string;
  subject: string;
  message: string;
  status: string;
  adminReply?: string;
  createdAt: string;
  resolvedAt?: string;
}

const FAQS = [
  {
    q: 'How long does KYC verification take?',
    a: 'Identity document verification is typically processed by our operations underwriters within 15 to 30 minutes during business hours.',
  },
  {
    q: 'What is the loan verification charge?',
    a: 'A nominal processing and verification deposit is required after initial review to verify your transaction handle and facilitate automated agreement creation and NACH setup.',
  },
  {
    q: 'Can I apply for more than one loan?',
    a: 'Under our single active loan policy, each borrower can have only ONE active approved loan at any given time. Once a loan is fully repaid and closed, you may apply for a higher limit.',
  },
  {
    q: 'How is the loan disbursed to my account?',
    a: 'Upon digital signing of your Master Loan Agreement, funds are disbursed directly to your verified bank account via IMPS / Bank Transfer or UPI.',
  },
];

export const CustomerSupportPage: React.FC = () => {
  useBrandTitle('Customer Support');
  const queryClient = useQueryClient();

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<'KYC' | 'PAYMENT' | 'LOAN_APPLICATION' | 'DISBURSEMENT' | 'GENERAL'>('GENERAL');
  const [message, setMessage] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const { data: tickets = [], isLoading } = useQuery<SupportTicketItem[]>({
    queryKey: ['customer-support-tickets'],
    queryFn: async () => {
      const res = await apiClient.get(API_ENDPOINTS.SUPPORT.CUSTOMER_LIST);
      return res.data;
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(API_ENDPOINTS.SUPPORT.CUSTOMER_CREATE, {
        subject: subject.trim(),
        category,
        message: message.trim(),
      });
    },
    onSuccess: () => {
      setFeedbackSuccess('Your support ticket has been submitted. Our team will review and reply promptly.');
      setFeedbackError(null);
      setSubject('');
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['customer-support-tickets'] });
    },
    onError: (err: Error) => {
      setFeedbackError(err.message || 'Failed to submit ticket.');
      setFeedbackSuccess(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setFeedbackError('Please complete all required ticket fields.');
      return;
    }
    createTicketMutation.mutate();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return <Badge className="bg-success text-background text-text-primary">Resolved ✓</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-primary text-background text-text-primary">In Progress</Badge>;
      default:
        return <Badge className="bg-warning text-background text-text-primary">Open</Badge>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2">
          <HelpCircle className="w-6 h-6 text-primary" />
          <span>Customer Help & Support Center</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Find quick answers to common borrower questions or submit a ticket directly to our underwriting team.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: FAQ Accordion */}
        <div className="space-y-4">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Frequently Asked Questions</CardTitle>
              <CardDescription>Instant answers for common loan inquiries</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {FAQS.map((faq, idx) => {
                const isOpen = expandedFaq === idx;
                return (
                  <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden transition-all">
                    <button
                      type="button"
                      onClick={() => setExpandedFaq(isOpen ? null : idx)}
                      className="w-full text-left p-3 text-xs font-semibold text-slate-800 bg-slate-50/50 hover:bg-slate-100 flex items-center justify-between"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="p-3 text-xs text-slate-600 bg-white border-t border-slate-100 leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Submit Support Ticket Form */}
        <div>
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span>Submit a Support Request</span>
              </CardTitle>
              <CardDescription>Get personalized assistance from our operations team</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {feedbackSuccess && (
                  <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{feedbackSuccess}</span>
                  </div>
                )}

                {feedbackError && (
                  <div className="p-3 rounded bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{feedbackError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="ticketCategorySelect" className="text-xs font-semibold text-slate-700">Category</label>
                  <select
                    id="ticketCategorySelect"
                    aria-label="Ticket Category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as typeof category)}
                    className="w-full text-xs h-9 px-2.5 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="GENERAL">General Inquiries</option>
                    <option value="KYC">KYC & Document Verification</option>
                    <option value="PAYMENT">Payment & UTR Verification</option>
                    <option value="LOAN_APPLICATION">Loan Application Review</option>
                    <option value="DISBURSEMENT">Disbursement & Bank Transfer</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="ticketSubjectInput" className="text-xs font-semibold text-slate-700">Subject</label>
                  <Input
                    id="ticketSubjectInput"
                    placeholder="Brief summary of your inquiry..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="ticketMessageTextarea" className="text-xs font-semibold text-slate-700">Detailed Message</label>
                  <textarea
                    id="ticketMessageTextarea"
                    rows={4}
                    placeholder="Describe your issue or question in detail..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={createTicketMutation.isPending || !subject.trim() || !message.trim()}
                  className="w-full text-xs h-9"
                >
                  {createTicketMutation.isPending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Submitting Ticket...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      Submit Support Ticket
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Ticket History Section */}
      <div className="space-y-3 pt-2">
        <h2 className="text-base font-semibold text-slate-900">Your Support Tickets</h2>

        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-20 bg-slate-200 rounded-lg" />
            <div className="h-20 bg-slate-200 rounded-lg" />
          </div>
        ) : tickets.length > 0 ? (
          <div className="space-y-3">
            {tickets.map((t) => (
              <Card key={t.id} className="border-slate-200 shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-900">{t.subject}</h3>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(t.status)}
                      <span className="text-[10px] text-text-secondary flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(t.createdAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-md border border-slate-100">
                    {t.message}
                  </p>

                  {t.adminReply && (
                    <div className="mt-2 p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs">
                      <div className="flex items-center space-x-1 text-emerald-800 font-bold text-[11px] mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Support Underwriter Response:</span>
                      </div>
                      <p className="text-emerald-950 leading-relaxed">{t.adminReply}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-slate-200 p-6 text-center text-xs text-text-secondary">
            No previous support tickets filed.
          </Card>
        )}
      </div>
    </div>
  );
};
