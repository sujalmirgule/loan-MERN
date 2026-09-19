import { prisma } from './db';
import { auditService } from './auditService';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedUser } from '../middleware/authMiddleware';
import { SubmitUtrInput, RejectPaymentInput } from '../validators/phase5Validators';
import { settingsService } from './settingsService';

export class PaymentService {
  /**
   * Helper: Calculates Reducing Balance Monthly EMI
   */
  calculateEmi(principal: number, annualRate: number, tenureMonths: number): number {
    if (principal <= 0 || tenureMonths <= 0) return 0;
    if (annualRate <= 0) return Number((principal / tenureMonths).toFixed(2));
    const monthlyRate = annualRate / 12 / 100;
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    return Number(emi.toFixed(2));
  }

  /**
   * Retrieves payment requirements and current payment state for a given loan application.
   */
  async getPaymentForLoan(customerId: string, loanId: string) {
    const loan = await prisma.loanApplication.findUnique({
      where: { id: loanId },
      include: { customer: { select: { id: true, fullName: true, mobile: true } } },
    });

    if (!loan) {
      throw new AppError(404, 'Loan application not found');
    }

    if (loan.customerId !== customerId) {
      throw new AppError(403, 'Access denied: You do not have permission to access payments for this loan');
    }

    const [paymentConfig, paymentRecord] = await Promise.all([
      settingsService.getPaymentConfig(),
      prisma.payment.findFirst({
        where: { loanId },
        orderBy: { paymentDate: 'desc' },
      }),
    ]);

    const chargeAmount = paymentConfig.chargeAmount;
    let paymentStatus = 'PAYMENT_REQUIRED';

    if (paymentRecord) {
      if (paymentRecord.status === 'PAID' || paymentRecord.status === 'SUCCESS') {
        paymentStatus = 'PAID';
      } else if (paymentRecord.status === 'UNDER_VERIFICATION' || paymentRecord.status === 'PENDING') {
        paymentStatus = 'UNDER_VERIFICATION';
      } else if (paymentRecord.status === 'REJECTED') {
        paymentStatus = 'REJECTED';
      } else if (paymentRecord.status === 'FAILED') {
        paymentStatus = 'FAILED';
      }
    }

    return {
      loanId: loan.id,
      applicationNumber: loan.applicationNumber,
      loanStatus: loan.status,
      paymentStatus,
      chargeAmount,
      chargeType: paymentConfig.chargeType,
      upiId: paymentConfig.upiId,
      accountNumber: paymentConfig.accountNumber,
      ifscCode: paymentConfig.ifscCode,
      accountHolderName: paymentConfig.accountHolderName,
      instructions: paymentConfig.instructions,
      paymentRecord: paymentRecord
        ? {
            id: paymentRecord.id,
            amount: paymentRecord.amount,
            transactionRef: paymentRecord.transactionRef,
            paymentMethod: paymentRecord.paymentMethod,
            status: paymentRecord.status,
            rejectionReason: paymentRecord.rejectionReason,
            submittedAt: paymentRecord.paymentDate,
            verifiedAt: paymentRecord.verifiedAt,
            verifiedBy: paymentRecord.verifiedBy,
          }
        : null,
    };
  }

  /**
   * Customer submits UTR/transaction reference for loan payment verification.
   */
  async submitUtr(customerId: string, loanId: string, input: SubmitUtrInput, actor: AuthenticatedUser, ipAddress?: string) {
    const loan = await prisma.loanApplication.findUnique({
      where: { id: loanId },
    });

    if (!loan) {
      throw new AppError(404, 'Loan application not found');
    }

    if (loan.customerId !== customerId) {
      throw new AppError(403, 'Access denied: You do not have permission to submit payment for this loan');
    }

    const cleanUtr = input.utr.trim().toUpperCase();

    // Check duplicate UTR globally across all other payments
    const existingUtr = await prisma.payment.findFirst({
      where: {
        transactionRef: cleanUtr,
        loanId: { not: loanId },
      },
    });

    if (existingUtr) {
      throw new AppError(400, 'Duplicate UTR: This transaction reference has already been submitted for another payment.', 'DUPLICATE_UTR');
    }

    const paymentConfig = await settingsService.getPaymentConfig();
    const chargeAmount = paymentConfig.chargeAmount;

    // Check if payment already exists for this loan
    const existingPayment = await prisma.payment.findFirst({
      where: { loanId },
      orderBy: { paymentDate: 'desc' },
    });

    if (existingPayment && (existingPayment.status === 'PAID' || existingPayment.status === 'SUCCESS')) {
      throw new AppError(400, 'Payment has already been verified and paid for this loan application.', 'PAYMENT_ALREADY_VERIFIED');
    }

    const receiptNumber = existingPayment?.receiptNumber || `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    let payment;
    if (existingPayment) {
      payment = await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          transactionRef: cleanUtr,
          paymentMethod: input.paymentMethod,
          status: 'UNDER_VERIFICATION',
          notes: input.notes || null,
          rejectionReason: null,
          amount: chargeAmount,
          paymentDate: new Date(),
        },
      });
    } else {
      payment = await prisma.payment.create({
        data: {
          loanId: loan.id,
          customerId,
          amount: chargeAmount,
          paymentMethod: input.paymentMethod,
          paymentType: 'PROCESSING_FEE',
          transactionRef: cleanUtr,
          receiptNumber,
          status: 'UNDER_VERIFICATION',
          notes: input.notes || null,
        },
      });
    }

    // Update loan application payment status
    await prisma.loanApplication.update({
      where: { id: loanId },
      data: { paymentStatus: 'UNDER_VERIFICATION' },
    });

    // Record audit event
    await auditService.record({
      actorType: 'CUSTOMER',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'PAYMENT_SUBMITTED',
      entity: 'Payment',
      entityId: payment.id,
      newValue: {
        loanId,
        amount: chargeAmount,
        utr: cleanUtr,
        status: 'UNDER_VERIFICATION',
      },
      ipAddress,
    });

    // Create Admin notification
    await prisma.notification.create({
      data: {
        recipientType: 'ADMIN',
        title: 'New Payment Submitted for Verification',
        message: `Customer ${actor.fullName} submitted UTR ${cleanUtr} for Loan ${loan.applicationNumber}.`,
        eventType: 'PAYMENT_SUBMITTED',
      },
    });

    return payment;
  }

  /**
   * Admin: List payments with filtering, search, and pagination.
   */
  async listPayments(filters: { status?: string; search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }

    if (filters.search && filters.search.trim().length > 0) {
      const term = filters.search.trim();
      where.OR = [
        { transactionRef: { contains: term } },
        { receiptNumber: { contains: term } },
        { customer: { fullName: { contains: term } } },
        { customer: { mobile: { contains: term } } },
        { loan: { applicationNumber: { contains: term } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: 'desc' },
        include: {
          customer: {
            select: { id: true, fullName: true, mobile: true, email: true },
          },
          loan: {
            select: { id: true, applicationNumber: true, status: true, requestedAmount: true, approvedAmount: true },
          },
        },
      }),
    ]);

    return {
      payments: items.map((p) => ({
        id: p.id,
        loanId: p.loanId,
        applicationNumber: p.loan.applicationNumber,
        customerId: p.customerId,
        customerName: p.customer.fullName,
        mobile: p.customer.mobile,
        email: p.customer.email,
        amount: p.amount,
        utr: p.transactionRef,
        receiptNumber: p.receiptNumber,
        paymentMethod: p.paymentMethod,
        status: p.status,
        rejectionReason: p.rejectionReason,
        notes: p.notes,
        submittedAt: p.paymentDate,
        verifiedAt: p.verifiedAt,
        verifiedBy: p.verifiedBy,
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
   * Admin: Verifies payment with ATOMIC TRANSACTION, enforces One Approved Loan Rule,
   * and automatically transitions the loan application to APPROVED.
   */
  async verifyPayment(paymentId: string, actor: AuthenticatedUser, ipAddress?: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        loan: true,
        customer: true,
      },
    });

    if (!payment) {
      throw new AppError(404, 'Payment record not found');
    }

    if (payment.status === 'PAID') {
      throw new AppError(400, 'Payment has already been verified.', 'PAYMENT_ALREADY_VERIFIED');
    }

    // --- ONE APPROVED LOAN RULE ENFORCEMENT ---
    const existingActiveApprovedLoan = await prisma.loanApplication.findFirst({
      where: {
        customerId: payment.customerId,
        status: 'APPROVED',
        id: { not: payment.loanId },
      },
    });

    if (existingActiveApprovedLoan) {
      throw new AppError(
        400,
        `Customer already has an active approved loan (${existingActiveApprovedLoan.applicationNumber}) on file. Policy permits only one active approved loan per customer.`,
        'ACTIVE_LOAN_EXISTS'
      );
    }

    const loan = payment.loan;
    const finalAmount = loan.acceptedAmount || loan.proposedAmount || loan.requestedAmount;
    const calculatedEmi = this.calculateEmi(finalAmount, loan.interestRate, loan.tenureMonths);
    const now = new Date();

    // Execute atomic server-side business transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Payment to PAID
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'PAID',
          verifiedBy: actor.fullName,
          verifiedAt: now,
          rejectionReason: null,
        },
      });

      // 2. Update Loan to APPROVED
      const updatedLoan = await tx.loanApplication.update({
        where: { id: loan.id },
        data: {
          status: 'APPROVED',
          paymentStatus: 'PAID',
          approvedAmount: finalAmount,
          estimatedEmi: calculatedEmi,
          finalEmi: calculatedEmi,
          reviewedBy: actor.fullName,
          reviewedAt: now,
        },
      });

      // 3. Generate initial LoanAgreement if not present
      const existingAgreement = await tx.loanAgreement.findUnique({
        where: { loanId: loan.id },
      });

      if (!existingAgreement) {
        const agreementHtml = `
          <div class="agreement-document font-sans text-slate-800 p-4">
            <h2 class="text-xl font-bold mb-3">LOAN SANCTION & BORROWER AGREEMENT</h2>
            <p class="text-sm mb-2">This Master Loan Agreement is executed on <strong>${now.toLocaleDateString('en-IN')}</strong> between <strong>Loan Approve Financial Services</strong> (Lender) and <strong>${payment.customer.fullName}</strong> (Borrower).</p>
            <div class="grid grid-cols-2 gap-2 my-4 p-3 bg-slate-50 border rounded text-xs">
              <div><strong>Application No:</strong> ${loan.applicationNumber}</div>
              <div><strong>Sanctioned Amount:</strong> ₹${finalAmount.toLocaleString('en-IN')}</div>
              <div><strong>Tenure:</strong> ${loan.tenureMonths} Months</div>
              <div><strong>Monthly EMI:</strong> ₹${calculatedEmi.toLocaleString('en-IN')}</div>
              <div><strong>Annual Interest Rate:</strong> ${loan.interestRate}% Reducing Balance</div>
              <div><strong>Registered Mobile:</strong> +91 ${payment.customer.mobile}</div>
            </div>
            <h3 class="text-base font-semibold mt-4 mb-2">Key Covenants & Repayment Terms:</h3>
            <ol class="list-decimal pl-5 space-y-1 text-xs text-slate-600">
              <li>The Borrower agrees to repay the loan in ${loan.tenureMonths} equated monthly installments of ₹${calculatedEmi.toLocaleString('en-IN')}.</li>
              <li>Each installment is due on or before the 5th of each calendar month following disbursement.</li>
              <li>Pre-closure and foreclosure shall be governed by current applicable RBI guidelines without discriminatory charges.</li>
              <li>By electronically accepting this agreement, the Borrower confirms the truthfulness of identity and financial declarations.</li>
            </ol>
          </div>
        `;

        await tx.loanAgreement.create({
          data: {
            loanId: loan.id,
            customerId: payment.customerId,
            agreementVersion: 'v1.0',
            agreementContentHtml: agreementHtml,
            acceptanceStatus: 'PENDING',
          },
        });
      }

      // 4. Generate EMI Schedule installments if not present
      const existingScheduleCount = await tx.eMISchedule.count({
        where: { loanId: loan.id },
      });

      if (existingScheduleCount === 0) {
        const monthlyInterestRate = loan.interestRate / 12 / 100;
        let remainingBalance = finalAmount;

        for (let i = 1; i <= loan.tenureMonths; i++) {
          const interestPortion = Number((remainingBalance * monthlyInterestRate).toFixed(2));
          let principalPortion = Number((calculatedEmi - interestPortion).toFixed(2));
          if (i === loan.tenureMonths || principalPortion > remainingBalance) {
            principalPortion = remainingBalance;
          }
          remainingBalance = Math.max(0, Number((remainingBalance - principalPortion).toFixed(2)));

          const dueDate = new Date(now);
          dueDate.setMonth(dueDate.getMonth() + i);
          dueDate.setDate(5); // 5th of each month

          await tx.eMISchedule.create({
            data: {
              loanId: loan.id,
              customerId: payment.customerId,
              installmentNumber: i,
              dueDate,
              principalAmount: principalPortion,
              interestAmount: interestPortion,
              totalAmount: Number((principalPortion + interestPortion).toFixed(2)),
              status: 'UPCOMING',
            },
          });
        }
      }

      // 5. Create customer Notification
      await tx.notification.create({
        data: {
          recipientType: 'CUSTOMER',
          customerId: payment.customerId,
          title: 'Payment Verified & Loan Approved!',
          message: `Your verification payment of ₹${payment.amount} has been verified. Loan ${loan.applicationNumber} for ₹${finalAmount.toLocaleString('en-IN')} has been approved! Please review and sign your loan agreement.`,
          eventType: 'LOAN_APPROVED',
        },
      });

      return { updatedPayment, updatedLoan };
    });

    // Record audit trails
    await auditService.record({
      actorType: 'ADMIN',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'PAYMENT_VERIFIED',
      entity: 'Payment',
      entityId: payment.id,
      newValue: { status: 'PAID', verifiedBy: actor.fullName },
      ipAddress,
    });

    await auditService.record({
      actorType: 'SYSTEM',
      actorName: 'Automated Loan Approval Engine',
      action: 'LOAN_AUTO_APPROVED',
      entity: 'LoanApplication',
      entityId: loan.id,
      newValue: {
        status: 'APPROVED',
        approvedAmount: finalAmount,
        estimatedEmi: calculatedEmi,
        reason: `Auto-approved following payment verification of UTR ${payment.transactionRef}`,
      },
      ipAddress,
    });

    return result;
  }

  /**
   * Admin: Reject payment with mandatory reason.
   */
  async rejectPayment(paymentId: string, input: RejectPaymentInput, actor: AuthenticatedUser, ipAddress?: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { loan: true },
    });

    if (!payment) {
      throw new AppError(404, 'Payment record not found');
    }

    if (payment.status === 'PAID') {
      throw new AppError(400, 'Cannot reject a payment that has already been verified and marked PAID.');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'REJECTED',
          rejectionReason: input.rejectionReason,
          verifiedBy: actor.fullName,
          verifiedAt: new Date(),
        },
      });

      await tx.loanApplication.update({
        where: { id: payment.loanId },
        data: { paymentStatus: 'PAYMENT_REQUIRED' },
      });

      await tx.notification.create({
        data: {
          recipientType: 'CUSTOMER',
          customerId: payment.customerId,
          title: 'Payment Verification Unsuccessful',
          message: `Your payment reference (${payment.transactionRef}) could not be verified: ${input.rejectionReason}. Please re-check and submit valid transaction details.`,
          eventType: 'PAYMENT_REJECTED',
        },
      });

      return p;
    });

    await auditService.record({
      actorType: 'ADMIN',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'PAYMENT_REJECTED',
      entity: 'Payment',
      entityId: payment.id,
      newValue: {
        status: 'REJECTED',
        rejectionReason: input.rejectionReason,
      },
      ipAddress,
    });

    return updated;
  }
}

export const paymentService = new PaymentService();
