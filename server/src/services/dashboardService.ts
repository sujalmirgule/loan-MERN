import { prisma } from './db';
import { AppError } from '../middleware/errorHandler';

export class DashboardService {
  /**
   * Retrieves aggregated dynamic statistics, funnel data, and tracking table for the Admin Dashboard.
   */
  async getAdminDashboardData() {
    // 1. Calculate the 12 primary KPI metrics dynamically
    const [
      totalCustomers,
      kycPending,
      kycApproved,
      kycRejected,
      totalLoanApplications,
      loansUnderReview,
      approvedLoans,
      rejectedLoans,
      paymentPending,
      paymentVerified,
      disbursementsAgg,
      activeLoansCount,
    ] = await Promise.all([
      prisma.customer.count({ where: { isDeleted: false } }),
      prisma.customer.count({
        where: {
          isDeleted: false,
          kycStatus: { in: ['PENDING', 'UNDER_REVIEW', 'REUPLOAD_REQUIRED'] },
        },
      }),
      prisma.customer.count({ where: { isDeleted: false, kycStatus: 'APPROVED' } }),
      prisma.customer.count({ where: { isDeleted: false, kycStatus: 'REJECTED' } }),
      prisma.loanApplication.count(),
      prisma.loanApplication.count({
        where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_REQUIRED', 'ON_HOLD'] } },
      }),
      prisma.loanApplication.count({ where: { status: 'APPROVED' } }),
      prisma.loanApplication.count({ where: { status: 'REJECTED' } }),
      prisma.payment.count({
        where: { status: { in: ['PENDING', 'UNDER_VERIFICATION'] } },
      }),
      prisma.payment.count({
        where: { status: { in: ['PAID', 'SUCCESS'] } },
      }),
      prisma.disbursement.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.loanApplication.count({ where: { status: 'APPROVED' } }),
    ]);

    const totalDisbursed = disbursementsAgg._sum.amount || 0;

    // 2. Dynamic Funnel Calculations
    const [kycStartedCount, paymentCompletedCount, disbursedLoansCount] = await Promise.all([
      prisma.loanDocument.findMany({
        select: { customerId: true },
        distinct: ['customerId'],
      }),
      prisma.payment.findMany({
        where: { status: { in: ['PAID', 'SUCCESS'] } },
        select: { customerId: true },
        distinct: ['customerId'],
      }),
      prisma.disbursement.findMany({
        where: { status: 'COMPLETED' },
        select: { customerId: true },
        distinct: ['customerId'],
      }),
    ]);

    const funnel = [
      { step: 'Registered', count: totalCustomers, percentage: 100 },
      {
        step: 'KYC Started',
        count: kycStartedCount.length,
        percentage: totalCustomers > 0 ? Math.round((kycStartedCount.length / totalCustomers) * 100) : 0,
      },
      {
        step: 'KYC Completed',
        count: kycApproved,
        percentage: totalCustomers > 0 ? Math.round((kycApproved / totalCustomers) * 100) : 0,
      },
      {
        step: 'Payment Completed',
        count: paymentCompletedCount.length,
        percentage: totalCustomers > 0 ? Math.round((paymentCompletedCount.length / totalCustomers) * 100) : 0,
      },
      {
        step: 'Loan Approved',
        count: approvedLoans,
        percentage: totalCustomers > 0 ? Math.round((approvedLoans / totalCustomers) * 100) : 0,
      },
      {
        step: 'Disbursed',
        count: disbursedLoansCount.length,
        percentage: totalCustomers > 0 ? Math.round((disbursedLoansCount.length / totalCustomers) * 100) : 0,
      },
    ];

    // 3. Tracking Table: Recent Borrower Activity with combined statuses
    const recentCustomers = await prisma.customer.findMany({
      where: { isDeleted: false },
      take: 15,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        mobile: true,
        email: true,
        state: true,
        city: true,
        status: true,
        kycStatus: true,
        createdAt: true,
        updatedAt: true,
        loans: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            applicationNumber: true,
            status: true,
            paymentStatus: true,
            requestedAmount: true,
            approvedAmount: true,
          },
        },
        payments: {
          take: 1,
          orderBy: { paymentDate: 'desc' },
          select: { status: true, transactionRef: true },
        },
      },
    });

    const trackingTable = recentCustomers.map((c) => {
      const activeLoan = c.loans[0] || null;
      const latestPayment = c.payments[0] || null;

      let paymentStatusDisplay = 'NOT_REQUIRED';
      if (latestPayment) {
        paymentStatusDisplay = latestPayment.status;
      } else if (activeLoan?.paymentStatus) {
        paymentStatusDisplay = activeLoan.paymentStatus;
      }

      return {
        customerId: c.id,
        fullName: c.fullName,
        mobile: c.mobile,
        email: c.email,
        state: c.state,
        city: c.city,
        signupStatus: 'REGISTERED',
        kycStatus: c.kycStatus,
        loanStatus: activeLoan ? activeLoan.status : 'NO_APPLICATION',
        applicationNumber: activeLoan ? activeLoan.applicationNumber : null,
        loanId: activeLoan ? activeLoan.id : null,
        paymentStatus: paymentStatusDisplay,
        lastActivity: c.updatedAt,
      };
    });

    return {
      kpis: {
        totalCustomers,
        kycPending,
        kycApproved,
        kycRejected,
        totalLoanApplications,
        loansUnderReview,
        approvedLoans,
        rejectedLoans,
        paymentPending,
        paymentVerified,
        totalDisbursed,
        activeLoans: activeLoansCount,
      },
      funnel,
      trackingTable,
    };
  }

  /**
   * Retrieves aggregated dynamic summary for the Borrower/Customer Dashboard.
   */
  async getCustomerDashboardData(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        documents: {
          where: { isCurrentVersion: true },
          select: { id: true, documentType: true, status: true, fileName: true },
        },
        loans: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            agreement: { select: { id: true, acceptanceStatus: true, acceptedAt: true } },
            disbursements: { take: 1, orderBy: { disbursedAt: 'desc' } },
            payments: { take: 1, orderBy: { paymentDate: 'desc' } },
          },
        },
        notifications: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, message: true, eventType: true, isRead: true, createdAt: true },
        },
      },
    });

    if (!customer || customer.isDeleted) {
      throw new AppError(404, 'Customer account not found');
    }

    // KYC Progress
    const requiredTypes = ['AADHAAR_FRONT', 'AADHAAR_BACK', 'PAN'];
    const uploadedTypes = customer.documents.map((d) => d.documentType);
    const uploadedCount = requiredTypes.filter((t) => uploadedTypes.includes(t)).length;
    const kycProgressPercent = Math.min(100, Math.round((uploadedCount / requiredTypes.length) * 100));

    // Active Loan: prioritize approved/active loan over pending
    const activeLoan = customer.loans.find((l) => ['APPROVED', 'OFFER_ACCEPTED', 'DISBURSED'].includes(l.status)) || customer.loans[0] || null;
    let paymentStatus = 'NOT_REQUIRED';
    if (activeLoan) {
      if (activeLoan.payments[0]) {
        paymentStatus = activeLoan.payments[0].status;
      } else {
        paymentStatus = activeLoan.paymentStatus;
      }
    }

    const disbursement = activeLoan?.disbursements[0] || null;
    const agreement = activeLoan?.agreement || null;

    // Timeline calculation based on actual business states
    const timeline = [
      { step: 'APPLICATION', title: 'Application Submitted', completed: Boolean(activeLoan), current: activeLoan?.status === 'SUBMITTED' },
      { step: 'KYC', title: 'KYC Verification', completed: customer.kycStatus === 'APPROVED', current: customer.kycStatus === 'UNDER_REVIEW' || customer.kycStatus === 'PENDING' },
      { step: 'REVIEW', title: 'Underwriting Review', completed: ['APPROVED', 'OFFER_ACCEPTED', 'OFFER_PENDING_CUSTOMER'].includes(activeLoan?.status || ''), current: activeLoan?.status === 'UNDER_REVIEW' },
      { step: 'PAYMENT', title: 'Verification Payment', completed: paymentStatus === 'PAID' || paymentStatus === 'SUCCESS', current: paymentStatus === 'UNDER_VERIFICATION' || paymentStatus === 'PAYMENT_REQUIRED' },
      { step: 'APPROVAL', title: 'Loan Approved', completed: activeLoan?.status === 'APPROVED', current: activeLoan?.status === 'APPROVED' && agreement?.acceptanceStatus !== 'ACCEPTED' },
      { step: 'AGREEMENT', title: 'Agreement Signed', completed: agreement?.acceptanceStatus === 'ACCEPTED', current: activeLoan?.status === 'APPROVED' && agreement?.acceptanceStatus === 'PENDING' },
      { step: 'DISBURSEMENT', title: 'Disbursement', completed: disbursement?.status === 'COMPLETED', current: agreement?.acceptanceStatus === 'ACCEPTED' && !disbursement },
    ];

    return {
      customer: {
        id: customer.id,
        fullName: customer.fullName,
        mobile: customer.mobile,
        email: customer.email,
        address: customer.address,
        state: customer.state,
        city: customer.city,
        monthlyIncome: customer.monthlyIncome,
        aadhaarMasked: customer.aadhaarMasked,
        kycStatus: customer.kycStatus,
        status: customer.status,
      },
      kycSummary: {
        status: customer.kycStatus,
        progressPercent: kycProgressPercent,
        documentsUploaded: customer.documents.length,
        requiredMissing: requiredTypes.filter((t) => !uploadedTypes.includes(t)),
      },
      loanSummary: activeLoan
        ? {
            id: activeLoan.id,
            applicationNumber: activeLoan.applicationNumber,
            requestedAmount: activeLoan.requestedAmount,
            proposedAmount: activeLoan.proposedAmount,
            approvedAmount: activeLoan.approvedAmount,
            acceptedAmount: activeLoan.acceptedAmount,
            tenureMonths: activeLoan.tenureMonths,
            estimatedEmi: activeLoan.finalEmi || activeLoan.estimatedEmi,
            status: activeLoan.status,
            rejectionReason: activeLoan.rejectionReason,
            holdReason: activeLoan.holdReason,
            docRequestReason: activeLoan.docRequestReason,
            submittedAt: activeLoan.submittedAt,
            paymentStatus,
            hasAgreement: Boolean(agreement),
            agreementAccepted: agreement?.acceptanceStatus === 'ACCEPTED',
            isDisbursed: disbursement?.status === 'COMPLETED',
            disbursementAmount: disbursement?.amount || null,
          }
        : null,
      timeline,
      notifications: customer.notifications,
    };
  }
}

export const dashboardService = new DashboardService();
