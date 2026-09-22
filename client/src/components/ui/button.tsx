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
    | 'warning';
  size?: 'default' | 'sm' | 'lg' | 'xl' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer select-none';

    const variants = {
      default:
        'bg-[#2563EB] text-white shadow-xs hover:bg-[#1D4ED8] active:bg-[#1E40AF] border border-transparent',
      destructive:
        'bg-rose-600 text-white shadow-xs hover:bg-rose-700 active:bg-rose-800 border border-transparent',
      danger:
        'bg-red-600 text-white shadow-xs hover:bg-red-700 active:bg-red-800 border border-transparent',
      success:
        'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 active:bg-emerald-800 border border-transparent',
      warning:
        'bg-amber-600 text-white shadow-xs hover:bg-amber-700 active:bg-amber-800 border border-transparent',
      outline:
        'border border-[#D6E4F5] bg-white text-[#0F172A] shadow-xs hover:bg-[#EFF6FF] hover:border-[#2563EB] hover:text-[#2563EB]',
      secondary:
        'border border-[#D6E4F5] bg-[#F7FAFF] text-[#0F172A] shadow-xs hover:bg-[#EFF6FF] hover:border-[#2563EB] hover:text-[#2563EB]',
      ghost:
        'text-[#334155] hover:bg-[#EFF6FF] hover:text-[#2563EB]',
      link:
        'text-[#2563EB] underline-offset-4 hover:underline font-semibold p-0 h-auto',
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


