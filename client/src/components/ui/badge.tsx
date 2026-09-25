import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'danger'
    | 'outline'
    | 'success'
    | 'warning'
    | 'info'
    | 'pending'
    | 'neutral'
    | 'gold'
    | 'approved'
    | 'verified'
    | 'paid'
    | 'rejected';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'border-transparent bg-primary text-white font-bold',
    secondary: 'border-border bg-surface-elevated text-text-secondary font-semibold',
    neutral: 'border-[#D7E3F5] bg-[#F4F8FF] text-[#64748B] font-semibold',
    destructive: 'border-rose-200 bg-rose-50 text-rose-700 font-bold',
    danger: 'border-red-200 bg-red-50 text-red-700 font-bold',
    outline: 'text-text-primary border-border bg-transparent font-semibold',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700 font-bold',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-700 font-bold',
    verified: 'border-emerald-200 bg-emerald-50 text-emerald-700 font-bold',
    paid: 'border-emerald-200 bg-emerald-50 text-emerald-700 font-bold',
    rejected: 'border-rose-200 bg-rose-50 text-rose-700 font-bold',
    warning: 'border-amber-200 bg-amber-50 text-amber-700 font-bold',
    pending: 'border-amber-200 bg-amber-50 text-amber-700 font-bold',
    info: 'border-blue-200 bg-blue-50 text-[#155EEF] font-bold',
    gold: 'border-[#E6CF7A] bg-[#FEF9E7] text-[#B8860B] font-bold',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };


