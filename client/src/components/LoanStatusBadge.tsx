import React from 'react';
import { Badge } from '@/components/ui/badge';
import { LoanStatus } from '@/api/loanApi';

interface LoanStatusBadgeProps {
  status: LoanStatus;
  className?: string;
}

export const LoanStatusBadge: React.FC<LoanStatusBadgeProps> = ({ status, className }) => {
  switch (status) {
    case 'SUBMITTED':
      return (
        <Badge variant="secondary" className={`bg-blue-50 text-blue-700 border-blue-200 ${className || ''}`}>
          Submitted
        </Badge>
      );
    case 'UNDER_REVIEW':
      return (
        <Badge variant="secondary" className={`bg-purple-50 text-purple-700 border-purple-200 ${className || ''}`}>
          Under Review
        </Badge>
      );
    case 'DOCUMENTS_REQUIRED':
      return (
        <Badge variant="destructive" className={`bg-orange-50 text-orange-700 border-orange-200 ${className || ''}`}>
          Documents Required
        </Badge>
      );
    case 'ON_HOLD':
      return (
        <Badge variant="outline" className={`bg-amber-50 text-amber-800 border-amber-300 ${className || ''}`}>
          On Hold
        </Badge>
      );
    case 'APPROVED':
      return (
        <Badge variant="success" className={`bg-emerald-50 text-emerald-700 border-emerald-200 ${className || ''}`}>
          Approved
        </Badge>
      );
    case 'REJECTED':
      return (
        <Badge variant="destructive" className={`bg-rose-50 text-rose-700 border-rose-200 ${className || ''}`}>
          Rejected
        </Badge>
      );
    case 'OFFER_PENDING_CUSTOMER':
      return (
        <Badge className={`bg-emerald-600 text-white hover:bg-emerald-700 font-semibold animate-pulse ${className || ''}`}>
          Offer Available
        </Badge>
      );
    case 'OFFER_ACCEPTED':
      return (
        <Badge variant="success" className={`bg-emerald-100 text-emerald-800 border-emerald-300 ${className || ''}`}>
          Offer Accepted
        </Badge>
      );
    case 'OFFER_REJECTED':
      return (
        <Badge variant="secondary" className={`bg-slate-100 text-slate-600 border-slate-300 ${className || ''}`}>
          Offer Rejected
        </Badge>
      );
    default:
      return <Badge variant="outline" className={className}>{status}</Badge>;
  }
};
