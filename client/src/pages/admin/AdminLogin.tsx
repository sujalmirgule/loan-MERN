import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminLogin: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-2xl border-slate-800 bg-slate-950 text-white">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2">
            <Shield className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Admin Authentication</CardTitle>
          <CardDescription className="text-slate-400">
            Sign in with your administrative credentials to access the console.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300">
            <p className="font-semibold text-emerald-400 mb-1">Phase 1 Foundation Ready</p>
            <p>Admin bcrypt/JWT authentication logic will be activated in <strong>Phase 2: Authentication</strong>.</p>
          </div>
          <Link to="/" className="inline-flex items-center text-sm text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Home
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};
