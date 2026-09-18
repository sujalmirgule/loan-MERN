import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { RefreshCw } from 'lucide-react';

const AuthLoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 animate-pulse">
      <RefreshCw className="w-6 h-6 animate-spin text-primary" />
    </div>
    <p className="text-sm font-semibold text-slate-700">Verifying session...</p>
    <p className="text-xs text-muted-foreground mt-1">Loan Approve Security Layer</p>
  </div>
);

/**
 * Guard allowing only authenticated customers.
 */
export const CustomerRoute: React.FC = () => {
  const { isAuthenticated, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/customer/login" state={{ from: location }} replace />;
  }

  if (role !== 'CUSTOMER') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
};

/**
 * Guard allowing only authenticated administrators.
 */
export const AdminRoute: React.FC = () => {
  const { isAuthenticated, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (role !== 'ADMIN') {
    return <Navigate to="/customer/dashboard" replace />;
  }

  return <Outlet />;
};

/**
 * Guard for public authentication pages (login/register). Redirects if already signed in.
 */
export const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated) {
    if (role === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/customer/dashboard" replace />;
  }

  return <>{children}</>;
};
