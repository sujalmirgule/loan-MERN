import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldCheck, Mail, Calendar, KeyRound, Server, Activity } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const admin = user && 'role' in user && user.role === 'ADMIN' ? user : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Admin Command Center</h2>
          <p className="text-sm text-muted-foreground">
            System administration, borrower registry oversight, and operational compliance.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="success" className="px-3 py-1 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
            System Operational
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Administrator Identity Card */}
        <Card className="md:col-span-2 shadow-sm border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <CardTitle className="text-lg">Administrator Identity</CardTitle>
              </div>
              <Badge variant="secondary" className="font-mono text-xs">
                ROLE_ADMIN
              </Badge>
            </div>
            <CardDescription>
              Authenticated administrator session with elevated privileges.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center space-x-2 text-slate-500 text-xs mb-1">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Admin Email</span>
                </div>
                <span className="font-semibold text-slate-800 break-all">
                  {admin?.email || 'admin@loanapprove.com'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center space-x-2 text-slate-500 text-xs mb-1">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Authorization Scope</span>
                </div>
                <span className="font-semibold text-emerald-700">
                  Full System Control
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center space-x-2 text-slate-500 text-xs mb-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Last Login Recorded</span>
                </div>
                <span className="font-medium text-slate-800 text-xs">
                  {admin?.lastLoginAt
                    ? new Date(admin.lastLoginAt).toLocaleString('en-IN')
                    : 'Current Active Session'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center space-x-2 text-slate-500 text-xs mb-1">
                  <Server className="w-3.5 h-3.5" />
                  <span>Account Established</span>
                </div>
                <span className="font-medium text-slate-800 text-xs">
                  {admin?.createdAt
                    ? new Date(admin.createdAt).toLocaleDateString('en-IN')
                    : 'System Initialization'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security & Audit Monitor */}
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <CardTitle className="text-lg">Audit & Compliance</CardTitle>
            </div>
            <CardDescription>Real-time security safeguards</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-slate-600">
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>Rate-limiting active: 20 auth attempts / 15 min per IP.</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>Bcrypt hash comparison with constant-time verification.</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>Immutable audit trail tracking every authentication event.</span>
              </div>
            </div>

            <div className="pt-3 border-t border-border">
              <p className="text-slate-500">
                KYC verification queues and loan approvals will be activated in subsequent phases.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
