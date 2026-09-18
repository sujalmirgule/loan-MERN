import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Admin Command Center</h2>
          <p className="text-sm text-muted-foreground">Portfolio overview, KPIs, and operations queue.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <CardTitle>Admin Dashboard Placeholder</CardTitle>
          </div>
          <CardDescription>
            Live KPI counters, charts, and filterable tables will be connected in Phase 13.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Phase 1 foundation is active. Administrative layout, routing, and backend connectivity are operational.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
