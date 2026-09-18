import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Landmark } from 'lucide-react';

export const CustomerHome: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Borrower Dashboard</h2>
          <p className="text-sm text-muted-foreground">Manage your loans, upcoming EMIs, and applications.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Landmark className="w-5 h-5 text-primary" />
            <CardTitle>Customer Overview Placeholder</CardTitle>
          </div>
          <CardDescription>
            Live borrower KPIs and quick apply actions will be activated in subsequent phases.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Phase 1 foundation is active. Layout, navigation, and API bridge are ready.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
