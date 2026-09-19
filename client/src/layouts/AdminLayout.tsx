import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  FileCheck,
  CreditCard,
  Send,
  BarChart3,
  History,
  Settings,
  Menu,
  X,
  ShieldCheck,
  LogOut,
  LifeBuoy,
  Bell,
  Mail,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { Button } from '@/components/ui/button';

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { branding } = useBranding();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  const navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Customers', path: '/admin/customers', icon: Users },
    { label: 'Loans & Reviews', path: '/admin/loans', icon: FileSpreadsheet },
    { label: 'KYC & Documents', path: '/admin/documents', icon: FileCheck },
    { label: 'Payments & UTR', path: '/admin/payments', icon: CreditCard },
    { label: 'Disbursements', path: '/admin/disbursements', icon: Send },
    { label: 'Reports & Analytics', path: '/admin/reports', icon: BarChart3 },
    { label: 'Audit Trail', path: '/admin/audit', icon: History },
    { label: 'Support Tickets', path: '/admin/support', icon: LifeBuoy },
    { label: 'Action Alerts', path: '/admin/notifications', icon: Bell },
  ];

  const settingsSubItems = [
    { label: 'Branding & Theme', path: '/admin/settings/branding', icon: Settings },
    { label: 'Email / SMTP', path: '/admin/settings/email', icon: Mail },
    { label: 'WhatsApp Gateway', path: '/admin/settings/whatsapp', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-200 flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.appName} className="w-8 h-8 object-contain rounded" />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: branding.primaryColor || '#047857' }}
              >
                <ShieldCheck className="w-5 h-5" />
              </div>
            )}
            <div className="truncate max-w-[140px]">
              <span className="font-bold text-white text-base truncate block">{branding.appName}</span>
              <span className="block text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                Admin Console
              </span>
            </div>
          </div>
          <button
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Settings Section */}
          <div className="pt-3 border-t border-slate-800 mt-2">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              System Settings
            </span>
            <div className="mt-1 space-y-1">
              {settingsSubItems.map((sub) => {
                const SubIcon = sub.icon;
                const isSubActive = location.pathname === sub.path;
                return (
                  <Link
                    key={sub.path}
                    to={sub.path}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center space-x-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      isSubActive
                        ? 'bg-slate-800 text-emerald-400 font-semibold'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    )}
                  >
                    <SubIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{sub.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Footer with user identity & sign out */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 truncate pr-2">
            <p className="font-semibold text-slate-200 truncate">{user?.fullName || 'System Administrator'}</p>
            <p className="truncate text-[11px] text-slate-400">{user?.email || 'admin@loanapprove.com'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white border-b border-border px-4 py-3 sm:px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <button
              className="lg:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base font-semibold text-slate-800 hidden sm:block">
              {branding.companyName}
            </h1>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <Link
              to="/admin/notifications"
              className="relative p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Action Alerts"
            >
              <Bell className="w-5 h-5" />
            </Link>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              Admin Authenticated
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-xs text-slate-600 hover:text-destructive hover:bg-red-50 h-8"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              Sign Out
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
