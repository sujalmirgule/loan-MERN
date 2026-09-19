import { prisma } from './db';
import { auditService } from './auditService';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedUser } from '../middleware/authMiddleware';

export class AgreementService {
  /**
   * Retrieves or auto-initializes the loan agreement for a given loan application.
   */
  async getAgreementForLoan(userId: string, loanId: string, isAdmin: boolean) {
    const loan = await prisma.loanApplication.findUnique({
      where: { id: loanId },
      include: {
        customer: { select: { id: true, fullName: true, mobile: true, email: true, address: true, city: true, state: true } },
      },
    });

    if (!loan) {
      throw new AppError(404, 'Loan application not found');
    }

    if (!isAdmin && loan.customerId !== userId) {
      throw new AppError(403, 'Access denied: You do not have permission to view this agreement');
    }

    let agreement = await prisma.loanAgreement.findUnique({
      where: { loanId },
    });

    const sanctionedAmount = loan.approvedAmount || loan.acceptedAmount || loan.proposedAmount || loan.requestedAmount;
    const emi = loan.finalEmi || loan.estimatedEmi || 0;
    const now = new Date();

    if (!agreement) {
      const agreementHtml = `
        <div class="agreement-document font-sans text-slate-800 p-4">
          <h2 class="text-xl font-bold mb-3">LOAN SANCTION & BORROWER AGREEMENT</h2>
          <p class="text-sm mb-2">This Master Loan Agreement is executed on <strong>${now.toLocaleDateString('en-IN')}</strong> between <strong>Loan Approve Financial Services</strong> (Lender) and <strong>${loan.customer.fullName}</strong> (Borrower).</p>
          <div class="grid grid-cols-2 gap-2 my-4 p-3 bg-slate-50 border rounded text-xs">
            <div><strong>Application No:</strong> ${loan.applicationNumber}</div>
            <div><strong>Sanctioned Amount:</strong> ₹${sanctionedAmount.toLocaleString('en-IN')}</div>
            <div><strong>Tenure:</strong> ${loan.tenureMonths} Months</div>
            <div><strong>Monthly EMI:</strong> ₹${emi.toLocaleString('en-IN')}</div>
            <div><strong>Annual Interest Rate:</strong> ${loan.interestRate}% Reducing Balance</div>
            <div><strong>Registered Mobile:</strong> +91 ${loan.customer.mobile}</div>
          </div>
          <h3 class="text-base font-semibold mt-4 mb-2">Key Covenants & Repayment Terms:</h3>
          <ol class="list-decimal pl-5 space-y-1 text-xs text-slate-600">
            <li>The Borrower agrees to repay the loan in ${loan.tenureMonths} equated monthly installments of ₹${emi.toLocaleString('en-IN')}.</li>
            <li>Each installment is due on or before the 5th of each calendar month following disbursement.</li>
            <li>Pre-closure and foreclosure shall be governed by current applicable RBI guidelines without discriminatory charges.</li>
            <li>By electronically accepting this agreement, the Borrower confirms the truthfulness of identity and financial declarations.</li>
          </ol>
        </div>
      `;

      agreement = await prisma.loanAgreement.create({
        data: {
          loanId: loan.id,
          customerId: loan.customerId,
          agreementVersion: 'v1.0',
          agreementContentHtml: agreementHtml,
          acceptanceStatus: 'PENDING',
        },
      });
    }

    return {
      agreementId: agreement.id,
      loanId: loan.id,
      applicationNumber: loan.applicationNumber,
      customerName: loan.customer.fullName,
      sanctionedAmount,
      tenureMonths: loan.tenureMonths,
      emi,
      interestRate: loan.interestRate,
      agreementVersion: agreement.agreementVersion,
      contentHtml: agreement.agreementContentHtml,
      acceptanceStatus: agreement.acceptanceStatus,
      acceptedAt: agreement.acceptedAt,
      ipAddress: agreement.ipAddress,
      userAgent: agreement.userAgent,
    };
  }

  /**
   * Customer electronically accepts the loan agreement.
   */
  async acceptAgreement(customerId: string, loanId: string, actor: AuthenticatedUser, ipAddress?: string, userAgent?: string) {
    const loan = await prisma.loanApplication.findUnique({
      where: { id: loanId },
    });

    if (!loan) {
      throw new AppError(404, 'Loan application not found');
    }

    if (loan.customerId !== customerId) {
      throw new AppError(403, 'Access denied: You do not have permission to accept this agreement');
    }

    let agreement = await prisma.loanAgreement.findUnique({
      where: { loanId },
    });

    if (!agreement) {
      // Initialize if not already present
      await this.getAgreementForLoan(customerId, loanId, false);
      agreement = await prisma.loanAgreement.findUnique({ where: { loanId } });
    }

    if (agreement?.acceptanceStatus === 'ACCEPTED') {
      throw new AppError(400, 'Loan agreement has already been accepted.', 'AGREEMENT_ALREADY_ACCEPTED');
    }

    const now = new Date();
    const updated = await prisma.loanAgreement.update({
      where: { loanId },
      data: {
        acceptanceStatus: 'ACCEPTED',
        acceptedAt: now,
        ipAddress: ipAddress || '127.0.0.1',
        userAgent: userAgent || 'Client Web Portal',
      },
    });

    await auditService.record({
      actorType: 'CUSTOMER',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'AGREEMENT_ACCEPTED',
      entity: 'LoanAgreement',
      entityId: updated.id,
      newValue: {
        loanId,
        acceptanceStatus: 'ACCEPTED',
        acceptedAt: now.toISOString(),
      },
      ipAddress,
    });

    await prisma.notification.create({
      data: {
        recipientType: 'ADMIN',
        title: 'Loan Agreement Accepted',
        message: `Borrower ${actor.fullName} electronically signed the loan agreement for Application ${loan.applicationNumber}. Ready for disbursement.`,
        eventType: 'AGREEMENT_ACCEPTED',
      },
    });

    return updated;
  }
}

export const agreementService = new AgreementService();
