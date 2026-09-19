import { prisma } from './db';
import { AppError } from '../middleware/errorHandler';

export class ReportsService {
  /**
   * Retrieves high-level report metrics across the platform.
   */
  async getReportSummary() {
    const [
      totalCustomers,
      totalLoans,
      approvedLoans,
      rejectedLoans,
      totalDisbursedAgg,
      totalPaymentsAgg,
      pendingPaymentsCount,
      overdueEmisCount,
    ] = await Promise.all([
      prisma.customer.count({ where: { isDeleted: false } }),
      prisma.loanApplication.count(),
      prisma.loanApplication.count({ where: { status: 'APPROVED' } }),
      prisma.loanApplication.count({ where: { status: 'REJECTED' } }),
      prisma.disbursement.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: { in: ['PAID', 'SUCCESS'] } },
        _sum: { amount: true },
      }),
      prisma.payment.count({
        where: { status: { in: ['PENDING', 'UNDER_VERIFICATION'] } },
      }),
      prisma.eMISchedule.count({
        where: { status: 'OVERDUE' },
      }),
    ]);

    return {
      customers: {
        total: totalCustomers,
      },
      loans: {
        total: totalLoans,
        approved: approvedLoans,
        rejected: rejectedLoans,
        approvalRate: totalLoans > 0 ? Number(((approvedLoans / totalLoans) * 100).toFixed(1)) : 0,
      },
      disbursements: {
        totalAmount: totalDisbursedAgg._sum.amount || 0,
      },
      payments: {
        totalCollected: totalPaymentsAgg._sum.amount || 0,
        pendingVerification: pendingPaymentsCount,
      },
      collections: {
        overdueCount: overdueEmisCount,
      },
    };
  }

  /**
   * Generates CSV report data for download.
   */
  async exportCsv(type: 'customers' | 'loans' | 'payments' | 'disbursements'): Promise<{ filename: string; csv: string }> {
    const timestamp = new Date().toISOString().slice(0, 10);

    if (type === 'customers') {
      const customers = await prisma.customer.findMany({
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' },
      });

      const header = 'ID,Full Name,Mobile,Email,State,City,Monthly Income,KYC Status,Account Status,Registered Date\n';
      const rows = customers.map((c) =>
        [
          `"${c.id}"`,
          `"${c.fullName.replace(/"/g, '""')}"`,
          `"${c.mobile}"`,
          `"${c.email}"`,
          `"${c.state}"`,
          `"${c.city}"`,
          c.monthlyIncome,
          c.kycStatus,
          c.status,
          c.createdAt.toISOString(),
        ].join(',')
      );

      return {
        filename: `customers-report-${timestamp}.csv`,
        csv: header + rows.join('\n'),
      };
    }

    if (type === 'loans') {
      const loans = await prisma.loanApplication.findMany({
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { fullName: true, mobile: true } } },
      });

      const header = 'Application ID,Customer Name,Mobile,Requested Amount,Approved Amount,Tenure (Months),Status,Payment Status,Submitted Date\n';
      const rows = loans.map((l) =>
        [
          `"${l.applicationNumber}"`,
          `"${l.customer.fullName.replace(/"/g, '""')}"`,
          `"${l.customer.mobile}"`,
          l.requestedAmount,
          l.approvedAmount || 0,
          l.tenureMonths,
          l.status,
          l.paymentStatus,
          l.submittedAt ? l.submittedAt.toISOString() : l.createdAt.toISOString(),
        ].join(',')
      );

      return {
        filename: `loans-report-${timestamp}.csv`,
        csv: header + rows.join('\n'),
      };
    }

    if (type === 'payments') {
      const payments = await prisma.payment.findMany({
        orderBy: { paymentDate: 'desc' },
        include: {
          customer: { select: { fullName: true, mobile: true } },
          loan: { select: { applicationNumber: true } },
        },
      });

      const header = 'Payment ID,Application No,Customer Name,Mobile,Amount,UTR / Transaction Ref,Method,Status,Submitted Date,Verified Date,Verified By\n';
      const rows = payments.map((p) =>
        [
          `"${p.id}"`,
          `"${p.loan.applicationNumber}"`,
          `"${p.customer.fullName.replace(/"/g, '""')}"`,
          `"${p.customer.mobile}"`,
          p.amount,
          `"${p.transactionRef}"`,
          p.paymentMethod,
          p.status,
          p.paymentDate.toISOString(),
          p.verifiedAt ? p.verifiedAt.toISOString() : '',
          `"${p.verifiedBy || ''}"`,
        ].join(',')
      );

      return {
        filename: `payments-report-${timestamp}.csv`,
        csv: header + rows.join('\n'),
      };
    }

    if (type === 'disbursements') {
      const disbursements = await prisma.disbursement.findMany({
        orderBy: { disbursedAt: 'desc' },
        include: {
          customer: { select: { fullName: true, mobile: true } },
          loan: { select: { applicationNumber: true } },
        },
      });

      const header = 'Disbursement ID,Application No,Customer Name,Mobile,Amount,Method,Reference UTR,Status,Disbursed Date\n';
      const rows = disbursements.map((d) =>
        [
          `"${d.id}"`,
          `"${d.loan.applicationNumber}"`,
          `"${d.customer.fullName.replace(/"/g, '""')}"`,
          `"${d.customer.mobile}"`,
          d.amount,
          d.method,
          `"${d.referenceId}"`,
          d.status,
          d.disbursedAt.toISOString(),
        ].join(',')
      );

      return {
        filename: `disbursements-report-${timestamp}.csv`,
        csv: header + rows.join('\n'),
      };
    }

    throw new AppError(400, `Invalid report type: ${type}`);
  }
}

export const reportsService = new ReportsService();
