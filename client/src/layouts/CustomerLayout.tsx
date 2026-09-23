import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  FileSpreadsheet,
  CreditCard,
  Folder,
  LifeBuoy,
  User,
  Landmark,
  LogOut,
  Bell,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  PlusCircle,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { Button } from '@/components/ui/button';

export const CustomerLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const { user, logout } = useAuth();
  const { branding } = useBranding();

  const handleLogout = async () => {
    await logout();
    navigate('/customer/login', { replace: true });
  };

  const navItems = [
    { label: 'Home', path: '/customer/dashboard', icon: Home, matchPaths: ['/customer/dashboard'] },
    { label: 'Loans', path: '/customer/loans', icon: FileSpreadsheet, matchPaths: ['/customer/loans', '/customer/applications', '/customer/apply', '/customer/timeline', '/customer/emi', '/customer/agreement'] },
    { label: 'Payments', path: '/customer/payments', icon: CreditCard, matchPaths: ['/customer/payments', '/customer/payment'] },
    { label: 'Documents', path: '/customer/documents', icon: Folder, matchPaths: ['/customer/documents', '/customer/kyc'] },
    { label: 'Support', path: '/customer/support', icon: LifeBuoy, matchPaths: ['/customer/support'] },
    { label: 'Profile', path: '/customer/profile', icon: User, matchPaths: ['/customer/profile'] },
  ];

  const isNavActive = (item: typeof navItems[0]) => {
    if (location.pathname === item.path) return true;
    return item.matchPaths.some((p) => location.pathname.startsWith(p));
  };

  return (
    <div className="theme-customer min-h-screen bg-[#F4F8FF] text-[#0B1220] flex flex-col md:flex-row antialiased">
      {/* ── MOBILE DRAWER OVERLAY ────────────────────────────────────────── */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* ── DESKTOP & MOBILE SIDEBAR (DEEP-BLUE LAYERED NAV) ───────── */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 bg-[#0B2147] border-r border-[#123B8E]/60 flex flex-col justify-between transition-all duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0 shadow-2xl md:shadow-none shrink-0 text-white',
          mobileDrawerOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0',
          collapsed ? 'md:w-20' : 'md:w-64'
        )}
      >
        {/* Top Brand Header */}
        <div className="flex flex-col shrink-0">
          <div className="flex items-center justify-between px-4 py-4 border-b border-[#123B8E]/60 h-18">
            <Link
              to="/customer/dashboard"
              onClick={() => setMobileDrawerOpen(false)}
              className="flex items-center gap-3 overflow-hidden group"
            >
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={branding.appName}
                  className="w-9 h-9 object-contain rounded-xl shrink-0 group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#123B8E] to-[#155EEF] flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-500/20 shrink-0 group-hover:scale-105 transition-transform">
                  <Landmark className="w-5 h-5" />
                </div>
              )}
              {(!collapsed || mobileDrawerOpen) && (
                <div className="truncate flex flex-col">
                  <span className="font-extrabold text-sm text-white tracking-tight leading-tight block truncate">
                    {branding.appName || 'Loan Finance'}
                  </span>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-[#3B82F6] flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3 h-3 text-[#16A34A]" /> Customer Portal
                  </span>
                </div>
              )}
            </Link>

            {/* Mobile Close Button */}
            <button
              className="md:hidden text-[#D7E3F5] hover:text-white p-2 rounded-xl hover:bg-[#123B8E]/40 transition-colors"
              onClick={() => setMobileDrawerOpen(false)}
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Apply Loan Button inside Expanded Sidebar */}
          {(!collapsed || mobileDrawerOpen) && (
            <div className="p-3 border-b border-[#123B8E]/60 bg-[#07152F]/70">
              <Link
                to="/customer/apply"
                onClick={() => setMobileDrawerOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#155EEF] hover:bg-[#123B8E] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Apply for New Loan</span>
              </Link>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(item);
            const isSidebarCollapsed = collapsed && !mobileDrawerOpen;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileDrawerOpen(false)}
                title={isSidebarCollapsed ? item.label : undefined}
                className={cn(
                  'flex items-center rounded-xl text-sm font-semibold transition-all duration-200 relative group',
                  isSidebarCollapsed ? 'justify-center p-3' : 'justify-start px-3.5 py-3 gap-3.5',
                  active
                    ? 'bg-[#155EEF] text-white shadow-md font-bold'
                    : 'text-[#D7E3F5] hover:text-white hover:bg-[#123B8E]/40'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0 transition-transform group-hover:scale-110',
                    active ? 'text-white' : 'text-[#D7E3F5] group-hover:text-white'
                  )}
                />

                {!isSidebarCollapsed && (
                  <span className="truncate tracking-tight">{item.label}</span>
                )}

                {/* Collapsed Tooltip Indicator */}
                {isSidebarCollapsed && active && (
                  <span className="absolute right-2 top-2 w-2 h-2 rounded-full bg-white" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer & Collapse Toggle (Desktop) */}
        <div className="border-t border-[#123B8E]/60 bg-[#07152F] shrink-0">
          {/* Desktop Collapse Toggle */}
          <div className="hidden md:block p-2 border-b border-[#123B8E]/60 bg-[#0B2147]/80">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex items-center justify-center w-full py-2 px-3 rounded-lg text-xs font-semibold text-[#D7E3F5] hover:text-white hover:bg-[#123B8E]/40 transition-colors gap-2"
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4 text-[#3B82F6]" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4 text-[#3B82F6]" />
                  <span>Collapse Navigation</span>
                </>
              )}
            </button>
          </div>

          {/* User Profile Pill & Sign Out */}
          <div className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-[#155EEF] border border-[#3B82F6]/50 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-inner">
                  {(user?.fullName || 'CU').slice(0, 2).toUpperCase()}
                </div>
                {(!collapsed || mobileDrawerOpen) && (
                  <div className="truncate min-w-0">
                    <p className="text-xs font-bold text-white truncate leading-tight">
                      {user?.fullName || 'Borrower'}
                    </p>
                    <p className="text-[11px] text-[#D7E3F5] font-mono truncate mt-0.5">
                      {user && 'mobile' in user ? `+91 ${user.mobile}` : user?.email || ''}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-[#D7E3F5] hover:text-[#DC2626] hover:bg-red-500/10 transition-colors shrink-0"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA (CLEAN VERTICAL SCROLL FLOW) ────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F4F8FF]">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#D7E3F5] px-4 sm:px-6 h-16 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 rounded-xl text-[#0B1220] hover:bg-[#E8F1FF] transition-colors"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="hidden sm:block">
              <span className="text-xs font-semibold text-[#64748B]">
                Welcome back, <strong className="text-[#0B1220]">{user?.fullName || 'Borrower'}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/customer/apply"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-[#155EEF] hover:bg-[#123B8E] text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Apply Loan</span>
            </Link>

            <Link
              to="/customer/notifications"
              className="relative p-2.5 rounded-xl bg-[#F4F8FF] border border-[#D7E3F5] text-[#64748B] hover:text-[#0B1220] hover:bg-[#E8F1FF] transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#155EEF] ring-2 ring-white" />
            </Link>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-xs text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 p-2 h-9 rounded-xl hidden sm:flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </header>

        {/* Scrollable Page Body (Unconstrained natural vertical document flow) */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-28 md:pb-12 bg-[#F4F8FF]">
          <Outlet />
        </main>
      </div>

      {/* ── MOBILE BOTTOM NAVIGATION BAR ─────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B2147]/95 backdrop-blur-md border-t border-[#123B8E]/60 md:hidden py-2 px-3 flex justify-around items-center shadow-2xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(item);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[11px] font-semibold transition-colors',
                active ? 'text-[#3B82F6] font-bold' : 'text-[#D7E3F5] hover:text-white'
              )}
            >
              <Icon className={cn('w-5 h-5 mb-0.5', active ? 'text-[#3B82F6]' : 'text-[#D7E3F5]')} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default CustomerLayout;
