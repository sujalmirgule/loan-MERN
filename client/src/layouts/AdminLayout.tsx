import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  FileSpreadsheet,
  Clock,
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
  Bell,
  Globe,
  Tag,
  Building2,
  QrCode,
  ExternalLink,
  Shield,
  CheckCircle2,
  XCircle,
  Activity,
  MessageSquare,
  FileText,
  Mail,
  ChevronLeft,
  ChevronRight,
  Search,
  Zap,
  Palette,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeVariant?: 'amber' | 'mint' | 'indigo' | 'red';
  permission?: string | string[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const { user, logout, hasPermission } = useAuth();
  const { branding } = useBranding();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/admin/customers?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  // Close quick actions on click outside
  useEffect(() => {
    const handler = () => setShowQuickActions(false);
    if (showQuickActions) {
      window.addEventListener('click', handler);
      return () => window.removeEventListener('click', handler);
    }
  }, [showQuickActions]);

  const navSections: NavSection[] = [
    {
      title: 'OVERVIEW',
      items: [
        { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'CUSTOMERS',
      items: [
        { label: 'All Customers', path: '/admin/customers', icon: Users, permission: 'customers.view' },
        { label: 'Add Customer', path: '/admin/customers/new', icon: UserPlus, permission: 'customers.create' },
      ],
    },
    {
      title: 'LOANS',
      items: [
        { label: 'All Applications', path: '/admin/loans', icon: FileSpreadsheet, permission: 'applications.view' },
        { label: 'Loan Approval', path: '/admin/loan-approval', icon: FileCheck, badge: 'Ops', badgeVariant: 'amber', permission: 'applications.view' },
        { label: 'Pending Review', path: '/admin/loans/pending', icon: Clock, badge: 'Review', badgeVariant: 'amber', permission: 'applications.view' },
        { label: 'Approved Loans', path: '/admin/loans/approved', icon: CheckCircle2, badgeVariant: 'mint', permission: 'applications.view' },
        { label: 'Rejected Loans', path: '/admin/loans/rejected', icon: XCircle, badgeVariant: 'red', permission: 'applications.view' },
        { label: 'Active Loans', path: '/admin/loans/active', icon: Activity, badgeVariant: 'indigo', permission: 'applications.view' },
        { label: 'Disbursed Loans', path: '/admin/disbursements', icon: Send, permission: 'payments.view' },
      ],
    },
    {
      title: 'VERIFICATION',
      items: [
        { label: 'KYC Verification', path: '/admin/kyc', icon: ShieldCheck, permission: 'kyc.view' },
        { label: 'Documents', path: '/admin/documents', icon: FileCheck, permission: 'documents.view' },
      ],
    },
    {
      title: 'PAYMENTS',
      items: [
        { label: 'All Payments', path: '/admin/payments', icon: CreditCard, permission: 'payments.view' },
        { label: 'Charges & Fee Approval', path: '/admin/charges-approval', icon: FileCheck, badge: 'Verify', badgeVariant: 'amber', permission: 'charges.view' },
        { label: 'Pending Payments', path: '/admin/payments?status=PENDING', icon: Clock, badgeVariant: 'amber', permission: 'payments.view' },
        { label: 'Verified Payments', path: '/admin/payments?status=SUCCESS', icon: CheckCircle2, badgeVariant: 'mint', permission: 'payments.view' },
        { label: 'Charges & Fees', path: '/admin/payments/charges-fees', icon: Tag, permission: 'charges.view' },
        { label: 'UPI Settings', path: '/admin/settings/upi', icon: QrCode, permission: 'upi.view' },
        { label: 'Bank Settings', path: '/admin/settings/bank', icon: Building2, permission: 'upi.view' },
        { label: 'Payment Links', path: '/admin/settings/payment-links', icon: ExternalLink, permission: 'upi.view' },
      ],
    },
    {
      title: 'COMMUNICATION',
      items: [
        { label: 'Notifications', path: '/admin/notifications', icon: Bell },
        { label: 'Messages', path: '/admin/communication/messages', icon: MessageSquare, permission: 'communication.history' },
        { label: 'Customer Email', path: '/admin/settings/email', icon: Mail, permission: 'settings.view' },
        { label: 'WhatsApp', path: '/admin/settings/whatsapp', icon: Send, permission: 'settings.view' },
      ],
    },
    {
      title: 'WEBSITE',
      items: [
        { label: 'Domains', path: '/admin/domains', icon: Globe, permission: 'domains.view' },
        { label: 'Website Branding', path: '/admin/settings/branding', icon: Palette, permission: 'branding.view' },
        { label: 'Document Branding', path: '/admin/settings/document-branding', icon: Award, permission: 'branding.view' },
        { label: 'Website Content', path: '/admin/settings/website-content', icon: FileText, permission: 'branding.view' },
      ],
    },
    {
      title: 'REPORTING',
      items: [
        { label: 'Reports', path: '/admin/reports', icon: BarChart3, permission: 'reports.view' },
        { label: 'Activity Logs', path: '/admin/audit', icon: History, permission: 'activity_logs.view' },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { label: 'Admin Users', path: '/admin/users', icon: Shield, permission: 'admin_users.view' },
        { label: 'Settings', path: '/admin/settings/branding', icon: Settings, permission: 'settings.view' },
      ],
    },
  ];

  const visibleNavSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.permission || hasPermission(item.permission)),
    }))
    .filter((section) => section.items.length > 0);

  const getBadgeClass = (variant?: 'amber' | 'mint' | 'indigo' | 'red') => {
    switch (variant) {
      case 'amber':
        return 'bg-amber-400/20 text-amber-300 border border-amber-400/30';
      case 'mint':
        return 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30';
      case 'indigo':
        return 'bg-blue-400/20 text-blue-300 border border-blue-400/30';
      case 'red':
        return 'bg-rose-400/20 text-rose-300 border border-rose-400/30';
      default:
        return 'bg-[#0B2147] text-[#94A3B8] border border-[#1E3A6B]';
    }
  };

  return (
    <div className="theme-admin h-screen bg-[#F4F8FF] text-[#0B1220] flex overflow-hidden antialiased selection:bg-[#155EEF]/20 selection:text-[#155EEF]">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 bg-[#07152F] border-r border-[#0B2147] text-white flex flex-col transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 h-screen shadow-2xl shrink-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          collapsed ? 'lg:w-20' : 'w-64'
        )}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#0B2147] bg-[#07152F] shrink-0 h-16">
          <Link to="/admin/dashboard" className="flex items-center space-x-3 overflow-hidden group">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.appName || 'Logo'}
                className="w-9 h-9 object-contain rounded-xl shrink-0 group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#155EEF] to-[#07152F] border border-[#3B82F6]/50 flex items-center justify-center text-white font-black text-sm shadow-xs shrink-0">
                {(branding.appName || 'LA').slice(0, 2).toUpperCase()}
              </div>
            )}
            {!collapsed && (
              <div className="truncate">
                <span className="font-extrabold text-white text-sm tracking-wide leading-none block truncate">
                  {branding.appName || branding.companyName || 'LOAN FINANCE'}
                </span>
                <span className="text-[10px] text-[#C9A227] font-bold tracking-wider uppercase mt-1 block">
                  Operations Center
                </span>
              </div>
            )}
          </Link>
          <button
            className="lg:hidden text-[#94A3B8] hover:text-white p-1.5 rounded-lg hover:bg-[#0B2147] transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-[#0B2147] scrollbar-track-transparent">
          {visibleNavSections.map((section) => (
            <div key={section.title} className="mb-4">
              {/* Section Header */}
              {!collapsed ? (
                <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
                  {section.title}
                </div>
              ) : (
                <div className="h-px bg-[#0B2147] my-2 mx-2" />
              )}

              {/* Section Items */}
              <div className="space-y-1 mt-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const currentFull = location.pathname + location.search;
                  const isActive =
                    item.path.includes('?')
                      ? currentFull === item.path
                      : item.path === '/admin/dashboard'
                      ? location.pathname === '/admin/dashboard'
                      : item.path === '/admin/customers'
                      ? location.pathname === '/admin/customers'
                      : item.path === '/admin/loans'
                      ? location.pathname === '/admin/loans'
                      : item.path === '/admin/charges-approval'
                      ? location.pathname === '/admin/charges-approval'
                      : item.path === '/admin/payments'
                      ? location.pathname === '/admin/payments' && !location.search
                      : item.path === '/admin/settings/branding'
                      ? location.pathname === '/admin/settings/branding'
                      : item.path === '/admin/settings/website-content'
                      ? location.pathname === '/admin/settings/website-content' || location.pathname === '/admin/settings/content'
                      : item.path === '/admin/settings/approval-letter'
                      ? location.pathname === '/admin/settings/approval-letter'
                      : location.pathname === item.path ||
                        (item.path.length > 13 && location.pathname.startsWith(item.path));

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'flex items-center rounded-xl text-xs transition-colors duration-150 group relative',
                        collapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2.5',
                        isActive
                          ? 'bg-[#155EEF] text-white border border-[#3B82F6]/50 shadow-xs font-bold'
                          : 'text-[#CBD5E1] font-semibold hover:bg-[#0B2147] hover:text-white'
                      )}
                    >
                      {/* Active Indicator Strip */}
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#C9A227] rounded-r-full" />
                      )}

                      <div className="flex items-center space-x-3 min-w-0">
                        <Icon
                          className={cn(
                            'w-4 h-4 shrink-0 transition-colors',
                            isActive ? 'text-white' : 'text-[#94A3B8] group-hover:text-white'
                          )}
                        />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {!collapsed && item.badge && (
                        <span
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded font-bold leading-none shrink-0 ml-1.5',
                            getBadgeClass(item.badgeVariant)
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Collapse Toggle Button (Desktop) */}
        <div className="hidden lg:flex items-center justify-between px-3 py-2 border-t border-[#0B2147] bg-[#07152F] text-[#94A3B8]">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center space-x-2 w-full px-2 py-1.5 rounded-lg hover:bg-[#0B2147] hover:text-white text-xs font-semibold transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 mx-auto text-[#C9A227]" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 text-[#C9A227]" />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>
        </div>

        {/* Admin Profile Footer */}
        <div className="p-3 border-t border-[#0B2147] bg-[#0B2147] shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-[#07152F] border border-[#1E3A6B] flex items-center justify-center font-bold text-xs text-[#C9A227] shrink-0 shadow-xs">
                {(user?.fullName || 'AD').slice(0, 2).toUpperCase()}
              </div>
              {!collapsed && (
                <div className="truncate min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-white truncate leading-tight">
                      {user?.fullName || 'Admin User'}
                    </p>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#07152F] text-[#C9A227] border border-[#C9A227]/40 shrink-0">
                      {(user as any)?.adminRole || user?.role || 'ADMIN'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#94A3B8] font-medium truncate">{user?.email || 'admin@loanapprove.com'}</p>
                </div>
              )}
            </div>
            {!collapsed && (
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 ml-1"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#F4F8FF]">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#D7E3F5] px-4 py-3 sm:px-6 flex items-center justify-between shadow-xs shrink-0 h-16">
          <div className="flex items-center space-x-3 flex-1 max-w-xl">
            <button
              className="lg:hidden p-2 rounded-lg text-[#64748B] hover:bg-[#E8F1FF] hover:text-[#0B1220] transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Search Bar */}
            <form onSubmit={handleGlobalSearch} className="relative w-full max-w-md hidden sm:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                placeholder="Search customers, loans, UTR, mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#F4F8FF] border border-[#D7E3F5] rounded-xl text-xs text-[#0B1220] placeholder-[#64748B] focus:outline-none focus:border-[#155EEF] focus:bg-white transition-all font-semibold"
              />
            </form>
          </div>

          {/* Header Actions */}
          <div className="flex items-center space-x-3">
            {/* Quick Actions Menu */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowQuickActions(!showQuickActions);
                }}
                className="bg-white border-[#D7E3F5] text-[#0B1220] hover:bg-[#F4F8FF] hover:border-[#155EEF]/50 text-xs h-9 gap-1.5 hidden md:inline-flex font-semibold shadow-xs"
              >
                <Zap className="w-3.5 h-3.5 text-[#155EEF]" />
                <span>Quick Actions</span>
              </Button>

              {showQuickActions && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-[#D7E3F5] rounded-xl shadow-xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#D7E3F5]">
                    Rapid Operations
                  </div>
                  <Link
                    to="/admin/customers/new"
                    className="flex items-center px-3 py-2 text-[#0B1220] hover:bg-[#F4F8FF] hover:text-[#155EEF] gap-2.5 font-semibold transition-colors"
                  >
                    <UserPlus className="w-4 h-4 text-emerald-600" />
                    <span>Add New Customer</span>
                  </Link>
                  <Link
                    to="/admin/loans/pending"
                    className="flex items-center px-3 py-2 text-[#0B1220] hover:bg-[#F4F8FF] hover:text-[#155EEF] gap-2.5 font-semibold transition-colors"
                  >
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Review Pending Loans</span>
                  </Link>
                  <Link
                    to="/admin/charges-approval"
                    className="flex items-center px-3 py-2 text-[#0B1220] hover:bg-[#F4F8FF] hover:text-[#155EEF] gap-2.5 font-semibold transition-colors"
                  >
                    <FileCheck className="w-4 h-4 text-[#155EEF]" />
                    <span>Charges & Fee Approval</span>
                  </Link>
                  <Link
                    to="/admin/payments?status=PENDING"
                    className="flex items-center px-3 py-2 text-[#0B1220] hover:bg-[#F4F8FF] hover:text-[#155EEF] gap-2.5 font-semibold transition-colors"
                  >
                    <CreditCard className="w-4 h-4 text-amber-600" />
                    <span>Verify Pending Payments</span>
                  </Link>
                  <Link
                    to="/admin/settings/upi"
                    className="flex items-center px-3 py-2 text-[#0B1220] hover:bg-[#F4F8FF] hover:text-[#155EEF] gap-2.5 font-semibold transition-colors"
                  >
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>UPI Gateway Settings</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Notifications */}
            <Link
              to="/admin/notifications"
              className="relative p-2 rounded-xl bg-white border border-[#D7E3F5] text-[#64748B] hover:text-[#0B1220] hover:border-[#155EEF]/50 transition-colors shadow-xs"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </Link>

            <div className="h-5 w-px bg-[#D7E3F5]" />

            {/* Admin Profile Pill */}
            <div className="flex items-center space-x-2 pl-1">
              <div className="w-8 h-8 rounded-full bg-[#E8F1FF] border border-[#D7E3F5] text-[#155EEF] font-bold text-xs flex items-center justify-center">
                {(user?.fullName || 'AD').slice(0, 1).toUpperCase()}
              </div>
              <span className="hidden md:inline text-xs font-bold text-[#0B1220]">
                {user?.fullName || 'Admin'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[#F4F8FF]">
          <div className="max-w-[1440px] mx-auto animate-in fade-in duration-200">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
