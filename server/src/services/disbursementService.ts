import { prisma } from './db';
import { auditService } from './auditService';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedUser } from '../middleware/authMiddleware';
import { RecordDisbursementInput } from '../validators/phase5Validators';

export class DisbursementService {
  /**
   * Admin: Records loan disbursement and triggers customer notification.
   */
  async recordDisbursement(input: RecordDisbursementInput, actor: AuthenticatedUser, ipAddress?: string) {
    const loan = await prisma.loanApplication.findUnique({
      where: { id: input.loanId },
      include: { customer: true },
    });

    if (!loan) {
      throw new AppError(404, 'Loan application not found');
    }

    if (loan.status !== 'APPROVED') {
      throw new AppError(400, `Cannot disburse loan: Application status is currently ${loan.status}. Loan must be APPROVED first.`);
    }

    const disbursement = await prisma.$transaction(async (tx) => {
      const d = await tx.disbursement.create({
        data: {
          loanId: loan.id,
          customerId: loan.customerId,
          amount: input.amount,
          method: input.method,
          referenceId: input.referenceId.trim().toUpperCase(),
          status: 'COMPLETED',
          notes: input.notes || null,
          createdByAdminId: actor.id,
        },
      });

      // Update customer notification
      await tx.notification.create({
        data: {
          recipientType: 'CUSTOMER',
          customerId: loan.customerId,
          title: 'Loan Disbursed Successfully!',
          message: `Congratulations! Your loan of ₹${input.amount.toLocaleString('en-IN')} (Application ${loan.applicationNumber}) has been disbursed via ${input.method}. Transaction Reference: ${d.referenceId}.`,
          eventType: 'LOAN_DISBURSED',
        },
      });

      return d;
    });

    await auditService.record({
      actorType: 'ADMIN',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'LOAN_DISBURSED',
      entity: 'Disbursement',
      entityId: disbursement.id,
      newValue: {
        loanId: loan.id,
        amount: input.amount,
        method: input.method,
        referenceId: input.referenceId,
      },
      ipAddress,
    });

    return disbursement;
  }

  /**
   * Admin: List all disbursements.
   */
  async listDisbursements(filters: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filters.search && filters.search.trim().length > 0) {
      const term = filters.search.trim();
      where.OR = [
        { referenceId: { contains: term } },
        { customer: { fullName: { contains: term } } },
        { customer: { mobile: { contains: term } } },
        { loan: { applicationNumber: { contains: term } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.disbursement.count({ where }),
      prisma.disbursement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { disbursedAt: 'desc' },
        include: {
          customer: { select: { id: true, fullName: true, mobile: true, email: true } },
          loan: { select: { id: true, applicationNumber: true, approvedAmount: true, tenureMonths: true } },
          admin: { select: { id: true, fullName: true } },
        },
      }),
    ]);

    return {
      disbursements: items.map((d) => ({
        id: d.id,
        loanId: d.loanId,
        applicationNumber: d.loan.applicationNumber,
        customerId: d.customerId,
        customerName: d.customer.fullName,
        mobile: d.customer.mobile,
        amount: d.amount,
        method: d.method,
        referenceId: d.referenceId,
        status: d.status,
        notes: d.notes,
        disbursedAt: d.disbursedAt,
        disbursedBy: d.admin?.fullName || 'Administrator',
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves disbursement info for a specific loan.
   */
  async getDisbursementForLoan(userId: string, loanId: string, isAdmin: boolean) {
    const loan = await prisma.loanApplication.findUnique({
      where: { id: loanId },
    });

    if (!loan) {
      throw new AppError(404, 'Loan application not found');
    }

    if (!isAdmin && loan.customerId !== userId) {
      throw new AppError(403, 'Access denied: You do not have permission to view this disbursement');
    }

    const disbursement = await prisma.disbursement.findFirst({
      where: { loanId },
      orderBy: { disbursedAt: 'desc' },
    });

    return disbursement;
  }
}

export const disbursementService = new DisbursementService();
