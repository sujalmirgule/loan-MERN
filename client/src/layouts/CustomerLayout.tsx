import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, FileText, CreditCard, Folder, Bell, User, Landmark, LogOut, LifeBuoy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { Button } from '@/components/ui/button';

export const CustomerLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { branding } = useBranding();

  const handleLogout = async () => {
    await logout();
    navigate('/customer/login', { replace: true });
  };

  const navItems = [
    { label: 'Home', path: '/customer/dashboard', icon: Home },
    { label: 'Loans', path: '/customer/loans', icon: FileText },
    { label: 'Payments', path: '/customer/payments', icon: CreditCard },
    { label: 'Documents', path: '/customer/documents', icon: Folder },
    { label: 'Support', path: '/customer/support', icon: LifeBuoy },
    { label: 'Profile', path: '/customer/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-border px-4 py-3 sm:px-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/customer/dashboard" className="flex items-center space-x-2">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.appName} className="w-8 h-8 object-contain rounded" />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold shadow-sm"
                style={{ backgroundColor: branding.primaryColor || '#047857' }}
              >
                <Landmark className="w-5 h-5" />
              </div>
            )}
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">{branding.appName}</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Customer Portal
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-slate-100 text-primary font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center space-x-3">
            {user && (
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-900">{user.fullName}</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {'mobile' in user ? `+91 ${user.mobile}` : user.email}
                </span>
              </div>
            )}

            <Link
              to="/customer/notifications"
              className="relative p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
            </Link>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-xs text-slate-600 hover:text-destructive hover:bg-red-50 p-2 h-8"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline ml-1.5">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-20 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar */}
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

export default CustomerLayout;
