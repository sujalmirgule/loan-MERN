import { prisma } from './db';
import { AppError } from '../middleware/errorHandler';

export interface DashboardFilters {
  dateFrom?: string;
  dateTo?: string;
  state?: string;
  loanType?: string;
  status?: string;
}

export class DashboardService {
  /**
   * Retrieves aggregated dynamic statistics, funnel, chart data, and tracking table.
   * Supports optional filtering by date range, state, loan type, and status.
   */
  async getAdminDashboardData(filters: DashboardFilters = {}) {
    const { dateFrom, dateTo, state, loanType, status } = filters;

    // Build date range filter
    const dateWhere = dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(new Date(dateTo).setHours(23, 59, 59, 999)) } : {}),
          },
        }
      : {};

    // Build loan application where clause
    const loanWhere: Record<string, unknown> = {
      ...(status ? { status } : {}),
      ...(loanType ? { loanType } : {}),
      ...dateWhere,
    };

    // Build customer where clause (for state filter)
    const customerWhere: Record<string, unknown> = {
      isDeleted: false,
      ...(state ? { state } : {}),
      ...(dateWhere.createdAt ? { createdAt: dateWhere.createdAt } : {}),
    };

    // Build loan-with-state filter (join through customer)
    const loanWithStateWhere: Record<string, unknown> = {
      ...loanWhere,
      ...(state ? { customer: { state } } : {}),
    };

    // 1. KPI Metrics
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
      prisma.customer.count({ where: customerWhere }),
      prisma.customer.count({ where: { ...customerWhere, kycStatus: { in: ['PENDING', 'UNDER_REVIEW', 'REUPLOAD_REQUIRED'] } } }),
      prisma.customer.count({ where: { ...customerWhere, kycStatus: 'APPROVED' } }),
      prisma.customer.count({ where: { ...customerWhere, kycStatus: 'REJECTED' } }),
      prisma.loanApplication.count({ where: loanWithStateWhere }),
      prisma.loanApplication.count({
        where: { ...loanWithStateWhere, status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_REQUIRED', 'ON_HOLD'] } },
      }),
      prisma.loanApplication.count({ where: { ...loanWithStateWhere, status: 'APPROVED' } }),
      prisma.loanApplication.count({ where: { ...loanWithStateWhere, status: 'REJECTED' } }),
      prisma.payment.count({ where: { status: { in: ['PENDING', 'UNDER_VERIFICATION'] } } }),
      prisma.payment.count({ where: { status: { in: ['PAID', 'SUCCESS'] } } }),
      prisma.disbursement.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.loanApplication.count({ where: { ...loanWithStateWhere, status: 'APPROVED' } }),
    ]);

    const totalDisbursed = disbursementsAgg._sum.amount || 0;

    // 2. Funnel Calculations
    const [kycStartedCount, paymentCompletedCount, disbursedLoansCount] = await Promise.all([
      prisma.loanDocument.findMany({ select: { customerId: true }, distinct: ['customerId'] }),
      prisma.payment.findMany({ where: { status: { in: ['PAID', 'SUCCESS'] } }, select: { customerId: true }, distinct: ['customerId'] }),
      prisma.disbursement.findMany({ where: { status: 'COMPLETED' }, select: { customerId: true }, distinct: ['customerId'] }),
    ]);

    const funnel = [
      { step: 'Registered', count: totalCustomers, percentage: 100 },
      { step: 'KYC Started', count: kycStartedCount.length, percentage: totalCustomers > 0 ? Math.round((kycStartedCount.length / totalCustomers) * 100) : 0 },
      { step: 'KYC Completed', count: kycApproved, percentage: totalCustomers > 0 ? Math.round((kycApproved / totalCustomers) * 100) : 0 },
      { step: 'Payment Done', count: paymentCompletedCount.length, percentage: totalCustomers > 0 ? Math.round((paymentCompletedCount.length / totalCustomers) * 100) : 0 },
      { step: 'Loan Approved', count: approvedLoans, percentage: totalCustomers > 0 ? Math.round((approvedLoans / totalCustomers) * 100) : 0 },
      { step: 'Disbursed', count: disbursedLoansCount.length, percentage: totalCustomers > 0 ? Math.round((disbursedLoansCount.length / totalCustomers) * 100) : 0 },
    ];

    // 3. Loan Applications Trend (last 19 days, grouped by date)
    const trendRaw = await prisma.loanApplication.findMany({
      where: loanWithStateWhere,
      select: { submittedAt: true, createdAt: true, status: true },
      orderBy: { createdAt: 'asc' },
    });

    const trendMap: Record<string, { date: string; applications: number; approved: number; rejected: number }> = {};
    trendRaw.forEach((loan) => {
      const d = (loan.submittedAt || loan.createdAt).toISOString().split('T')[0];
      if (!trendMap[d]) trendMap[d] = { date: d, applications: 0, approved: 0, rejected: 0 };
      trendMap[d].applications++;
      if (loan.status === 'APPROVED') trendMap[d].approved++;
      if (loan.status === 'REJECTED') trendMap[d].rejected++;
    });
    const applicationTrend = Object.values(trendMap).slice(-30);

    // 4. Loan Status Distribution (for donut chart)
    const statusCounts = await prisma.loanApplication.groupBy({
      by: ['status'],
      where: state ? { customer: { state } } : undefined,
      _count: { status: true },
    });
    const statusDistribution = statusCounts.map((s) => ({
      status: s.status,
      count: s._count.status,
    }));

    // 5. Recent Applications (for table)
    const recentApplications = await prisma.loanApplication.findMany({
      where: loanWithStateWhere,
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { id: true, fullName: true, mobile: true, state: true, city: true },
        },
      },
    });

    const recentApplicationsList = recentApplications.map((app) => ({
      id: app.id,
      applicationNumber: app.applicationNumber,
      customerName: app.customer.fullName,
      customerId: app.customer.id,
      mobile: app.customer.mobile,
      state: app.customer.state,
      city: app.customer.city,
      loanType: app.loanType || 'Personal Loan',
      requestedAmount: app.requestedAmount,
      approvedAmount: app.approvedAmount,
      status: app.status,
      submittedAt: app.submittedAt || app.createdAt,
    }));

    // 6. Tracking Table
    const recentCustomers = await prisma.customer.findMany({
      where: customerWhere,
      take: 20,
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
      if (latestPayment) paymentStatusDisplay = latestPayment.status;
      else if (activeLoan?.paymentStatus) paymentStatusDisplay = activeLoan.paymentStatus;

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
      applicationTrend,
      statusDistribution,
      recentApplications: recentApplicationsList,
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

    const kycRequiredTypes = ['AADHAAR_FRONT', 'AADHAAR_BACK'];
    const uploadedTypes = customer.documents.map((d) => d.documentType);
    const kycUploadedCount = kycRequiredTypes.filter((t) => uploadedTypes.includes(t)).length;
    const kycProgressPercent = customer.kycStatus === 'APPROVED'
      ? 100
      : Math.min(100, Math.round((kycUploadedCount / kycRequiredTypes.length) * 100));

    const invoices = await prisma.invoice.findMany({
      where: { customerId },
      orderBy: { issuedAt: 'desc' },
      take: 10,
    });

    const activeLoan = customer.loans.find((l) => ['APPROVED', 'OFFER_ACCEPTED', 'DISBURSED'].includes(l.status)) || customer.loans[0] || null;
    let paymentStatus = 'NOT_REQUIRED';
    if (activeLoan) {
      if (activeLoan.payments[0]) paymentStatus = activeLoan.payments[0].status;
      else paymentStatus = activeLoan.paymentStatus;
    }

    const disbursement = activeLoan?.disbursements[0] || null;
    const agreement = activeLoan?.agreement || null;

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
        requiredMissing: kycRequiredTypes.filter((t) => !uploadedTypes.includes(t)),
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
      invoices,
      notifications: customer.notifications,
    };
  }
}

export const dashboardService = new DashboardService();
