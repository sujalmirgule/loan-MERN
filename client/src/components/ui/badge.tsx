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
    | 'neutral';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'border-transparent bg-[#2563EB] text-white font-bold',
    secondary: 'border-slate-200 bg-slate-100 text-slate-800 font-semibold',
    neutral: 'border-slate-200 bg-slate-100 text-slate-700 font-semibold',
    destructive: 'border-rose-200 bg-rose-50 text-rose-700 font-bold',
    danger: 'border-red-200 bg-red-50 text-red-700 font-bold',
    outline: 'text-slate-800 border-slate-300 bg-white font-semibold',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700 font-bold',
    warning: 'border-amber-200 bg-amber-50 text-amber-700 font-bold',
    pending: 'border-amber-200 bg-amber-50 text-amber-700 font-bold',
    info: 'border-blue-200 bg-blue-50 text-blue-700 font-bold',
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


