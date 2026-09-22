import React from 'react';
import { LoanStatus } from '@/api/loanApi';

interface LoanStatusBadgeProps {
  status: LoanStatus | string;
  className?: string;
}

export const LoanStatusBadge: React.FC<LoanStatusBadgeProps> = ({ status, className = '' }) => {
  const s = String(status || '').toUpperCase();

  switch (s) {
    case 'PENDING':
    case 'SUBMITTED':
    case 'NEW':
      return (
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wide ${className}`}
        >
          Pending
        </span>
      );

    case 'UNDER_REVIEW':
    case 'DOCUMENTS_REQUIRED':
    case 'ON_HOLD':
      return (
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-900 border border-blue-300 uppercase tracking-wide ${className}`}
        >
          Under Review
        </span>
      );

    case 'APPROVED':
    case 'OFFER_ACCEPTED':
    case 'OFFER_PENDING_CUSTOMER':
      return (
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300 uppercase tracking-wide ${className}`}
        >
          Approved
        </span>
      );

    case 'DISBURSED':
    case 'ACTIVE':
      return (
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-400 uppercase tracking-wide ${className}`}
        >
          Disbursed
        </span>
      );

    case 'REJECTED':
    case 'OFFER_REJECTED':
      return (
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-900 border border-red-300 uppercase tracking-wide ${className}`}
        >
          Rejected
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300 uppercase tracking-wide ${className}`}
        >
          {status}
        </span>
      );
  }
};
