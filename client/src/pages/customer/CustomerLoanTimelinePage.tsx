import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useBrandTitle } from '@/hooks/useBrandTitle';

interface LoanTimelineData {
  id: string;
  applicationNumber: string;
  accountNumber?: string;
  loanType: string;
  requestedAmount: number;
  approvedAmount?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const CustomerLoanTimelinePage: React.FC = () => {
  useBrandTitle('Loan Timeline');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: loan } = useQuery<LoanTimelineData>({
    queryKey: ['loanTimeline', id],
    queryFn: async () => {
      if (!id || id === 'latest') {
        const res = await apiClient.get(API_ENDPOINTS.LOANS.CUSTOMER_LIST);
        const apps = res.data?.data || res.data || [];
        return apps[0] || null;
      }
      const res = await apiClient.get(API_ENDPOINTS.LOANS.CUSTOMER_DETAIL(id));
      return res.data?.data || res.data;
    },
  });

  const effectiveAmount = loan?.approvedAmount || loan?.requestedAmount || 100000;
  const effectiveType = loan?.loanType || 'Business Loan';
  const effectiveAppId = loan?.accountNumber || loan?.applicationNumber || 'LN20260906142729';

  // Determine stage progression
  const status = loan?.status || 'APPROVED';
  const isApproved = ['APPROVED', 'DISBURSED', 'ACTIVE'].includes(status);
  const isDisbursed = ['DISBURSED', 'ACTIVE'].includes(status);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 text-[#0B1F3A]">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-3xl border border-[#D9E6F2] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#52657A] hover:text-[#0B1F3A] mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0B1F3A] tracking-tight">
            Application Progress & Timeline
          </h1>
          <p className="text-xs text-[#52657A] mt-1">
            Track real-time underwriting milestones, verification progress, and disbursement stage.
          </p>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-[#EAF4FF] text-[#2563EB] border border-[#CBDDE9] text-xs font-bold shrink-0 self-start sm:self-auto">
          Status: {status}
        </div>
      </div>

      {/* Top Summary Card */}
      <Card className="bg-white border-[#D9E6F2] text-[#0B1F3A] rounded-2xl shadow-xs overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-xs font-bold text-[#2563EB] uppercase tracking-wider block">
                {effectiveType}
              </span>
              <div className="text-3xl font-black text-[#0B1F3A] mt-1 font-mono">
                ₹{effectiveAmount.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-[#52657A] mt-1 font-mono">
                Application Number: <strong>{effectiveAppId}</strong>
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
              {status}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Timeline */}
      <Card className="bg-white border-[#D9E6F2] rounded-2xl shadow-xs p-6 sm:p-8">
        <div className="space-y-6 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-[#D9E6F2] before:z-0">
          {/* Step 1: Application Submitted */}
          <div className="flex items-start space-x-4 relative z-10">
            <div className="w-7 h-7 rounded-full bg-[#16A34A] text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-emerald-600/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-[#0B1F3A]">Application Submitted</div>
              <div className="text-xs text-[#52657A]">Initial proposal and requirements accepted</div>
              <div className="text-[11px] text-[#16A34A] font-semibold mt-0.5">Completed</div>
            </div>
          </div>

          {/* Step 2: Documents Verification */}
          <div className="flex items-start space-x-4 relative z-10">
            <div className="w-7 h-7 rounded-full bg-[#16A34A] text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-emerald-600/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-[#0B1F3A]">Identity Verification (KYC)</div>
              <div className="text-xs text-[#52657A]">Aadhaar front and back validated against records</div>
              <div className="text-[11px] text-[#16A34A] font-semibold mt-0.5">Verified & Compliant</div>
            </div>
          </div>

          {/* Step 3: Under Review */}
          <div className="flex items-start space-x-4 relative z-10">
            <div className="w-7 h-7 rounded-full bg-[#16A34A] text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-emerald-600/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-[#0B1F3A]">Credit Assessment</div>
              <div className="text-xs text-[#52657A]">Underwriting review and loan eligibility sanctioned</div>
              <div className="text-[11px] text-[#16A34A] font-semibold mt-0.5">Sanction Approved</div>
            </div>
          </div>

          {/* Step 4: Approved */}
          <div className="flex items-start space-x-4 relative z-10">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold shrink-0 shadow-md ${
                isApproved
                  ? 'bg-[#2563EB] text-white shadow-blue-500/30'
                  : 'bg-[#F0F6FC] text-[#52657A] border border-[#D9E6F2]'
              }`}
            >
              {isApproved ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-[#0B1F3A]">Loan Sanction & Agreement</div>
              <div className="text-xs text-[#52657A]">Official approval letter and electronic agreement</div>
              <div className="text-[11px] text-[#2563EB] font-semibold mt-0.5">
                {isApproved ? 'Sanction Letter Issued' : 'Pending final signoff'}
              </div>
            </div>
          </div>

          {/* Step 5: Disbursement */}
          <div className="flex items-start space-x-4 relative z-10">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold shrink-0 shadow-md ${
                isDisbursed
                  ? 'bg-[#16A34A] text-white shadow-emerald-600/20'
                  : 'bg-[#F0F6FC] text-[#52657A] border border-[#D9E6F2]'
              }`}
            >
              {isDisbursed ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-[#0B1F3A]">Disbursement to Bank</div>
              <div className="text-xs text-[#52657A]">{isDisbursed ? 'Disbursed to registered bank account' : 'Pending Wire Transfer'}</div>
              <div className="text-[11px] text-[#52657A] mt-0.5">
                {isDisbursed ? 'Direct NEFT/RTGS Transfer Completed' : 'Queued for banking disbursement rail'}
              </div>
            </div>
          </div>

          {/* Step 6: Active */}
          <div className="flex items-start space-x-4 relative z-10">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold shrink-0 ${
                isDisbursed
                  ? 'bg-[#16A34A] text-white'
                  : 'bg-[#F0F6FC] text-[#52657A] border border-[#D9E6F2]'
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-[#0B1F3A]">Active Repayment Cycle</div>
              <div className="text-xs text-[#52657A]">Monthly installment billing as per agreed EMI schedule</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Celebration / Action Banner */}
      {isApproved && (
        <Card className="bg-white border border-[#D9E6F2] rounded-2xl shadow-xs p-6 space-y-3">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF4FF] text-[#2563EB] flex items-center justify-center shrink-0 border border-[#CBDDE9]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0B1F3A]">Application Approved! 🎉</h2>
              <p className="text-xs text-[#52657A] mt-0.5">
                Your loan sanction has been finalized. Access your official documents below.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link to="/customer/documents" className="flex-1">
              <Button className="w-full h-11 bg-[#2563EB] hover:bg-[#123B66] text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-md shadow-blue-600/20">
                <Download className="w-4 h-4" />
                <span>View Sanction Documents</span>
              </Button>
            </Link>
            <Link to={`/customer/loans/${loan?.id || 'latest'}/emi`} className="flex-1">
              <Button variant="outline" className="w-full h-11 border-[#D9E6F2] text-[#0B1F3A] hover:bg-[#F0F6FC] font-semibold text-xs rounded-xl flex items-center justify-center space-x-1.5">
                <Calendar className="w-4 h-4 text-[#2563EB]" />
                <span>View EMI Schedule</span>
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CustomerLoanTimelinePage;
