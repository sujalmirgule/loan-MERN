import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, FileText, CreditCard, Folder, Bell, User, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';

export const CustomerLayout: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { label: 'Home', path: '/customer/dashboard', icon: Home },
    { label: 'Loans', path: '/customer/loans', icon: FileText },
    { label: 'Payments', path: '/customer/payments', icon: CreditCard },
    { label: 'Docs', path: '/customer/documents', icon: Folder },
    { label: 'Profile', path: '/customer/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-border px-4 py-3 sm:px-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/customer/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-sm">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">Loan Approve</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Customer Portal
              </span>
            </div>
          </Link>

          <div className="flex items-center space-x-3">
            <Link
              to="/customer/notifications"
              className="relative p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-600"></span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-20 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar (Part 2 & Part 22 UX) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border md:hidden py-1.5 px-2 flex justify-around items-center shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-3 rounded-lg text-xs font-medium transition-colors',
                isActive
                  ? 'text-primary font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              )}
            >
              <Icon className={cn('w-5 h-5 mb-0.5', isActive ? 'text-primary' : 'text-slate-500')} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
