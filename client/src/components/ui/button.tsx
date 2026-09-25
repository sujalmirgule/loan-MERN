import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
    | 'danger'
    | 'success'
    | 'warning'
    | 'gold'
    | 'approve'
    | 'review'
    | 'reject'
    | 'dark-secondary';
  size?: 'default' | 'sm' | 'lg' | 'xl' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer select-none';

    const variants = {
      default:
        'bg-[#155EEF] text-white shadow-xs hover:bg-[#123B8E] active:bg-[#07152F] border border-transparent',
      destructive:
        'bg-rose-600 text-white shadow-xs hover:bg-rose-700 active:bg-rose-800 border border-transparent',
      danger:
        'bg-red-600 text-white shadow-xs hover:bg-red-700 active:bg-red-800 border border-transparent',
      success:
        'bg-[#22C55E] text-white shadow-xs hover:bg-emerald-600 active:bg-emerald-700 border border-emerald-600',
      warning:
        'bg-[#F59E0B] text-white shadow-xs hover:bg-amber-600 active:bg-amber-700 border border-amber-600',
      gold:
        'bg-[#C9A227] text-[#090909] font-bold shadow-xs hover:bg-[#D4AF37] active:bg-[#A88932] border border-[#6E5A1F]',
      approve:
        'bg-[#22C55E] text-white font-bold shadow-xs hover:bg-emerald-600 active:bg-emerald-700 border border-emerald-600',
      review:
        'bg-[#F59E0B] text-white font-bold shadow-xs hover:bg-amber-600 active:bg-amber-700 border border-amber-600',
      reject:
        'bg-[#EF4444] text-white font-bold shadow-xs hover:bg-rose-600 active:bg-rose-700 border border-rose-600',
      'dark-secondary':
        'border border-border bg-white text-text-primary shadow-xs hover:bg-surface-elevated hover:text-primary',
      outline:
        'border border-border bg-card text-card-foreground shadow-xs hover:bg-surface-elevated hover:text-text-primary',
      secondary:
        'border border-border bg-surface-elevated text-text-primary shadow-xs hover:bg-surface hover:text-text-primary',
      ghost:
        'text-text-secondary hover:bg-surface-elevated hover:text-text-primary',
      link:
        'text-primary underline-offset-4 hover:underline font-semibold p-0 h-auto',
    };

    const sizes = {
      default: 'h-11 px-5 py-2.5 text-sm font-semibold', // 44px
      sm: 'h-9 rounded-lg px-3.5 text-xs font-semibold',   // 36px
      lg: 'h-12 rounded-xl px-6 text-base font-semibold',  // 48px
      xl: 'h-14 rounded-2xl px-8 text-lg font-bold',       // 56px
      icon: 'h-11 w-11 rounded-xl',
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };


