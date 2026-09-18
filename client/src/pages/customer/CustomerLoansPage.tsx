import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { loanApi, CustomerLoanApplication } from '@/api/loanApi';
import { LoanStatusBadge } from '@/components/LoanStatusBadge';
import {
  FileText,
  Plus,
  ArrowRight,
  Clock,
  Sparkles,
  Calendar,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export const CustomerLoansPage: React.FC = () => {
  const navigate = useNavigate();

  const {
    data: response,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['customerLoans'],
    queryFn: () => loanApi.getCustomerApplications(),
  });

  const applications = response?.data || [];
  const pendingOffers = applications.filter((app) => app.status === 'OFFER_PENDING_CUSTOMER');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            My Loan Applications
          </h1>
          <p className="text-sm text-muted-foreground">
            Track your submitted loan requests, status updates, and modified loan offers.
          </p>
        </div>
        <Link to="/customer/apply">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Apply for Loan
          </Button>
        </Link>
      </div>

      {/* Offer Available Banner */}
      {pendingOffers.length > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-white/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm">
                You have an offer waiting for your review!
              </p>
              <p className="text-xs text-white/80">
                Application #{pendingOffers[0].applicationNumber} has a proposed offer of ₹
                {pendingOffers[0].proposedAmount?.toLocaleString('en-IN')}.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => navigate(`/customer/loans/${pendingOffers[0].id}`)}
            className="bg-white text-emerald-800 hover:bg-emerald-50 font-semibold text-xs shrink-0 shadow-sm"
          >
            Review Offer
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      )}

      {/* Content Area */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-sm text-slate-500">Loading your loan applications...</p>
        </div>
      ) : isError ? (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
            <p className="text-sm font-medium text-red-900">
              Failed to load loan applications.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : applications.length === 0 ? (
        /* Empty State */
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="py-16 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FileText className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg text-slate-800">
                No loan applications yet
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                You haven&apos;t applied for any loans. Submit an application in minutes to get started.
              </p>
            </div>
            <Link to="/customer/apply">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="w-4 h-4 mr-1.5" />
                Start Your First Application
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        /* Applications List */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {applications.map((app: CustomerLoanApplication) => (
            <Card
              key={app.id}
              className="hover:shadow-md transition-shadow border-border cursor-pointer group"
              onClick={() => navigate(`/customer/loans/${app.id}`)}
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {app.applicationNumber}
                  </span>
                  <LoanStatusBadge status={app.status} />
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-slate-500 font-medium">Requested Amount</span>
                  <div className="text-2xl font-bold text-slate-900">
                    ₹{app.requestedAmount.toLocaleString('en-IN')}
                  </div>
                  {app.status === 'OFFER_PENDING_CUSTOMER' && app.proposedAmount && (
                    <p className="text-xs text-emerald-700 font-semibold">
                      Proposed Offer: ₹{app.proposedAmount.toLocaleString('en-IN')}
                    </p>
                  )}
                  {app.status === 'OFFER_ACCEPTED' && app.acceptedAmount && (
                    <p className="text-xs text-emerald-700 font-semibold">
                      Accepted Amount: ₹{app.acceptedAmount.toLocaleString('en-IN')}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{app.tenureMonths} Months Tenure</span>
                  </div>
                  <div className="flex items-center space-x-1.5 justify-end">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(app.submittedAt || app.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 text-slate-500">
                  <p className="truncate max-w-[240px]" title={app.purpose}>
                    {app.purpose}
                  </p>
                  <span className="text-emerald-700 font-medium group-hover:underline inline-flex items-center">
                    View Details
                    <ArrowRight className="w-3 h-3 ml-0.5" />
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
