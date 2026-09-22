import React from 'react';
import { Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { RefreshCw, ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AuthLoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 animate-pulse">
      <RefreshCw className="w-6 h-6 animate-spin text-primary" />
    </div>
    <p className="text-sm font-semibold text-slate-700">Verifying session...</p>
    <p className="text-xs text-muted-foreground mt-1">Loan Platform Security Layer</p>
  </div>
);

export const AccessDeniedScreen: React.FC<{ requiredPermission?: string | string[] }> = ({ requiredPermission }) => {
  const permText = Array.isArray(requiredPermission) ? requiredPermission.join(' or ') : requiredPermission;
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-danger/10 border border-red-500/20 text-danger flex items-center justify-center mb-4 shadow-sm">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wider mb-2">
        <Lock className="w-3.5 h-3.5" /> 403 Forbidden
      </span>
      <h1 className="text-2xl font-black text-slate-900 tracking-tight">Access Denied</h1>
      <p className="text-sm text-text-secondary max-w-md mt-2">
        You do not have the required permissions to access this administrative section.
      </p>
      {permText && (
        <div className="mt-3 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono text-slate-700">
          Required: <span className="font-bold text-red-600">{permText}</span>
        </div>
      )}
      <p className="text-xs text-text-secondary mt-2 max-w-sm">
        Please contact a Super Administrator if you need access to this feature.
      </p>
      <div className="mt-6">
        <Link to="/admin/dashboard">
          <Button className="bg-surface hover:bg-surface-elevated text-text-primary text-xs font-semibold rounded-xl flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};

/**
 * Guard allowing only authenticated customers.
 */
export const CustomerRoute: React.FC = () => {
  const { isAuthenticated, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated || role !== 'CUSTOMER') {
    return <Navigate to="/customer/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

/**
 * Guard allowing authenticated administrators.
 */
export const AdminRoute: React.FC = () => {
  const { isAuthenticated, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated || role !== 'ADMIN') {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

/**
 * Granular Permission Guard for Admin Routes.
 */
export const AdminPermissionRoute: React.FC<{ permission: string | string[] }> = ({ permission }) => {
  const { isAuthenticated, role, isLoading, hasPermission } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated || role !== 'ADMIN') {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (!hasPermission(permission)) {
    return <AccessDeniedScreen requiredPermission={permission} />;
  }

  return <Outlet />;
};

/**
 * Guard for public customer authentication pages (login/register).
 * Only redirects if the user is ALREADY authenticated as a CUSTOMER.
 * If logged in as ADMIN or unauthenticated, allows visiting the customer page without redirecting to Admin.
 */
export const CustomerPublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated && role === 'CUSTOMER') {
    return <Navigate to="/customer/dashboard" replace />;
  }

  return <>{children}</>;
};

/**
 * Guard for public admin authentication pages (admin login).
 * Only redirects if the user is ALREADY authenticated as an ADMIN.
 * If logged in as CUSTOMER or unauthenticated, allows visiting the admin login page without redirecting to Customer.
 */
export const AdminPublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated && role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
};

/**
 * Legacy PublicOnlyRoute (for backwards compatibility)
 */
export const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <CustomerPublicOnlyRoute>{children}</CustomerPublicOnlyRoute>;
};
