import crypto from 'crypto';
import { prisma } from './db';
import { auditService } from './auditService';
import { pdfService } from './pdfService';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedUser } from '../middleware/authMiddleware';
import { SubmitUtrInput, RejectPaymentInput } from '../validators/phase5Validators';
import { settingsService } from './settingsService';
import { manualUpiProvider } from '../providers/upi/manualUpiProvider';
import { emailService } from './emailService';
import { whatsappService } from './whatsappService';
import { storageProvider } from '../providers/storage';

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

    const [paymentConfig, upiSettings, customerRecord] = await Promise.all([
      settingsService.getPaymentConfig(),
      prisma.uPISettings.findUnique({ where: { id: 'default' } }),
      prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          charges: true,
          documents: { where: { isCurrentVersion: true } },
          payments: { where: { loanId }, orderBy: { paymentDate: 'desc' } },
        },
      }),
    ]);

    const paymentRecord = customerRecord?.payments?.[0] || null;

    let chargeAmount = 0;
    let chargeType = 'NONE';
    let paymentStatus = 'NOT_REQUIRED';
    let instructions = paymentConfig.instructions;

    // STAGE 0 & 1: Before KYC
    if (customerRecord?.kycStatus !== 'APPROVED' && customerRecord?.kycStatus !== 'VERIFIED') {
      const hasAadhaarFront = customerRecord?.documents.some((d) => d.documentType === 'AADHAAR_FRONT');
      const hasAadhaarBack = customerRecord?.documents.some((d) => d.documentType === 'AADHAAR_BACK');
      const hasBothAadhaar = hasAadhaarFront && hasAadhaarBack;

      if (!hasBothAadhaar) {
        paymentStatus = 'NOT_REQUIRED';
        chargeAmount = 0;
        chargeType = 'NONE';
        instructions = 'No payment is currently required. Please complete your KYC verification first.';
      } else {
        paymentStatus = 'PAYMENT_REQUIRED';
        chargeAmount = paymentConfig.kycChargeAmount || 499;
        chargeType = 'KYC_CHARGES';
        instructions = 'Complete your KYC verification first. Once your KYC documents are uploaded and verified, you can proceed to the next payment step.';
      }
    } else {
      // STAGE 2: KYC Verified — Check KYC Charge
      const kycCharge = customerRecord.charges.find(
        (c) => c.name.includes('KYC') || c.remark?.includes('KYC')
      );

      if (!kycCharge || kycCharge.status !== 'PAID') {
        chargeType = 'KYC_CHARGES';
        chargeAmount = kycCharge ? kycCharge.amount : paymentConfig.kycChargeAmount;
        paymentStatus = kycCharge?.transactionRef ? 'UNDER_VERIFICATION' : 'PAYMENT_REQUIRED';
        instructions = 'Please transfer the KYC verification charge and submit the 12-digit transaction reference (UTR).';
      } else {
        // STAGE 3 & 4: KYC Charge Paid — Check Loan Documents
        const hasPan = customerRecord.documents.some((d) => d.documentType === 'PAN');
        if (!hasPan) {
          chargeType = 'NONE';
          chargeAmount = 0;
          paymentStatus = 'DOCUMENTS_REQUIRED';
          instructions = 'Your KYC payment is verified. Please upload your required loan documents to proceed.';
        } else {
          // STAGE 5: Loan Documents Uploaded — Processing Fee Stage
          const procCharge = customerRecord.charges.find((c) => c.name.includes('Processing'));
          chargeType = 'PROCESSING_FEE';
          chargeAmount = procCharge ? procCharge.amount : paymentConfig.processingFeeAmount;
          if (procCharge?.status === 'PAID') {
            paymentStatus = 'PAID';
          } else if (procCharge?.transactionRef) {
            paymentStatus = 'UNDER_VERIFICATION';
          } else {
            paymentStatus = 'PAYMENT_REQUIRED';
          }
        }
      }
    }

    if (paymentRecord && paymentStatus === 'PAYMENT_REQUIRED') {
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
      upiId: upiSettings?.upiId || paymentConfig.upiId,
      upiEnabled: upiSettings?.upiEnabled ?? true,
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
            submittedAt: paymentRecord.submittedAt || paymentRecord.paymentDate,
            verifiedAt: paymentRecord.verifiedAt,
            verifiedBy: paymentRecord.verifiedBy,
          }
        : null,
    };
  }

  /**
   * CRITICAL UPI PAYMENT FEATURE: Initiates a Single UPI Payment Request.
   * Derives authoritative amount strictly from database (tamper-proof).
   */
  async createUpiPayment(
    customerId: string,
    input: { chargeId?: string; loanId?: string },
    actor: AuthenticatedUser,
    ipAddress?: string
  ) {
    // 1. Fetch Single UPI Configuration
    const upiSettings = await prisma.uPISettings.findUnique({ where: { id: 'default' } });
    if (!upiSettings || !upiSettings.upiEnabled || !upiSettings.upiId) {
      throw new AppError(400, 'UPI payments are currently not configured or disabled by administration.', 'UPI_NOT_CONFIGURED');
    }

    const upiVpa = upiSettings.upiId;
    const merchantName = (upiSettings as any).merchantName || 'Merchant';

    let amount = 0;
    let loanId = input.loanId;
    let chargeName = 'Fee Payment';
    let chargeId: string | null = null;

    // 2. Resolve target charge or loan fee
    if (input.chargeId) {
      const charge = await prisma.charge.findUnique({
        where: { id: input.chargeId },
      });

      if (!charge) {
        throw new AppError(404, 'Charge record not found.');
      }

      if (charge.customerId !== customerId) {
        throw new AppError(403, 'Access denied: You do not own this charge.');
      }

      if (charge.status === 'PAID') {
        throw new AppError(400, 'This charge has already been paid and verified.', 'PAYMENT_ALREADY_VERIFIED');
      }

      amount = charge.amount;
      chargeName = charge.name;
      chargeId = charge.id;
      if (charge.loanId) {
        loanId = charge.loanId;
      }
    } else if (input.loanId) {
      const loan = await prisma.loanApplication.findUnique({
        where: { id: input.loanId },
      });

      if (!loan) {
        throw new AppError(404, 'Loan application not found.');
      }

      if (loan.customerId !== customerId) {
        throw new AppError(403, 'Access denied: You do not own this loan application.');
      }

      if (loan.paymentStatus === 'PAID') {
        throw new AppError(400, 'Payment for this loan has already been verified.', 'PAYMENT_ALREADY_VERIFIED');
      }

      const pConfig = await settingsService.getPaymentConfig();
      amount = pConfig.chargeAmount || 1250;
      chargeName = 'Processing Fee';
      loanId = loan.id;
    } else {
      // Find latest pending charge or loan fee
      const activeCharge = await prisma.charge.findFirst({
        where: { customerId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      });

      if (activeCharge) {
        amount = activeCharge.amount;
        chargeName = activeCharge.name;
        chargeId = activeCharge.id;
        loanId = activeCharge.loanId || undefined;
      } else {
        const latestLoan = await prisma.loanApplication.findFirst({
          where: { customerId },
          orderBy: { createdAt: 'desc' },
        });
        if (!latestLoan) {
          throw new AppError(404, 'No pending payment or active loan application found.');
        }
        const pConfig = await settingsService.getPaymentConfig();
        amount = pConfig.chargeAmount || 1250;
        chargeName = 'Processing Fee';
        loanId = latestLoan.id;
      }
    }

    if (!loanId) {
      // Guarantee valid loanId for Payment relation
      const fallbackLoan = await prisma.loanApplication.findFirst({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
      });
      if (!fallbackLoan) {
        throw new AppError(400, 'Customer must have an active loan application to initiate payment.');
      }
      loanId = fallbackLoan.id;
    }

    // 3. Generate unique transaction reference
    const transactionRef = `UPI-${Date.now().toString().slice(-8)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const receiptNumber = `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    // 4. Generate UPI Payment Data (Deep Link URI & QR Data URL)
    const upiData = await manualUpiProvider.generatePaymentData({
      amount,
      upiVpa,
      merchantName,
      transactionRef,
      note: chargeName,
    });

    // 5. Create or update Payment record
    const payment = await prisma.payment.create({
      data: {
        loanId,
        customerId,
        amount,
        paymentMethod: 'UPI',
        paymentType: 'PROCESSING_FEE',
        transactionRef,
        receiptNumber,
        status: 'PENDING',
        notes: `UPI Payment Initiated for ${chargeName}`,
        chargeId,
        upiVpa,
      },
    });

    // If linked to charge, update charge paymentId
    if (chargeId) {
      await prisma.charge.update({
        where: { id: chargeId },
        data: {
          paymentId: payment.id,
          transactionRef,
        },
      });
    }

    // Record AuditLog
    await auditService.record({
      actorType: 'CUSTOMER',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'UPI_PAYMENT_INITIATED',
      entity: 'Payment',
      entityId: payment.id,
      newValue: {
        amount,
        chargeName,
        transactionRef,
        vpa: upiVpa,
      },
      ipAddress,
    });

    return {
      paymentId: payment.id,
      amount,
      currency: 'INR',
      upiVpa,
      merchantName,
      transactionRef,
      status: payment.status,
      upiIntentUrl: upiData.upiIntentUrl,
      qrCodeDataUrl: upiData.qrCodeDataUrl,
      instructions: `Please complete payment of ₹${amount.toLocaleString('en-IN')} using any UPI application. After payment, submit your 12-digit UTR number.`,
    };
  }

  /**
   * Customer submits UTR for a specific Payment ID.
   * Enforces global duplicate UTR check across all successful/pending payments.
   */
  async submitPaymentUtr(
    customerId: string,
    paymentId: string,
    input: { utr: string; notes?: string },
    actor: AuthenticatedUser,
    ipAddress?: string
  ) {
    const cleanUtr = input.utr.trim().toUpperCase();
    if (!cleanUtr || cleanUtr.length < 6) {
      throw new AppError(400, 'Please enter a valid transaction reference / UTR number (at least 6 characters).');
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { loan: true },
    });

    if (!payment) {
      throw new AppError(404, 'Payment record not found.');
    }

    if (payment.customerId !== customerId) {
      throw new AppError(403, 'Access denied: You do not own this payment record.');
    }

    if (payment.status === 'PAID' || payment.status === 'SUCCESS') {
      throw new AppError(400, 'This payment has already been verified and completed.', 'PAYMENT_ALREADY_VERIFIED');
    }

    // Duplicate UTR check across database
    const duplicate = await prisma.payment.findFirst({
      where: {
        transactionRef: cleanUtr,
        id: { not: paymentId },
        status: { in: ['PAID', 'SUCCESS', 'UNDER_VERIFICATION'] },
      },
    });

    if (duplicate) {
      throw new AppError(409, 'Transaction reference already submitted.', 'DUPLICATE_UTR');
    }

    const now = new Date();

    // Update payment record to UNDER_VERIFICATION
    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        transactionRef: cleanUtr,
        status: 'UNDER_VERIFICATION',
        notes: input.notes ? `${payment.notes || ''} | ${input.notes}`.trim() : payment.notes,
        submittedAt: now,
        rejectionReason: null,
      },
    });

    // Update related loan application paymentStatus
    if (payment.loanId) {
      await prisma.loanApplication.update({
        where: { id: payment.loanId },
        data: { paymentStatus: 'UNDER_VERIFICATION' },
      });
    }

    // Update related charge if linked
    if (payment.chargeId) {
      await prisma.charge.update({
        where: { id: payment.chargeId },
        data: { transactionRef: cleanUtr },
      });
    }

    // Record AuditLog
    await auditService.record({
      actorType: 'CUSTOMER',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'UTR_SUBMITTED',
      entity: 'Payment',
      entityId: payment.id,
      newValue: {
        paymentId: payment.id,
        utr: cleanUtr,
        status: 'UNDER_VERIFICATION',
      },
      ipAddress,
    });

    // Notify Admin
    await prisma.notification.create({
      data: {
        recipientType: 'ADMIN',
        title: 'New UPI Payment UTR Submitted',
        message: `Customer ${actor.fullName} submitted UTR ${cleanUtr} for ₹${payment.amount}. Verification required.`,
        eventType: 'PAYMENT_SUBMITTED',
      },
    });

    return updated;
  }

  /**
   * Customer submits UTR by loanId (Backwards compatible)
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
        status: { in: ['PAID', 'SUCCESS', 'UNDER_VERIFICATION'] },
      },
    });

    if (existingUtr) {
      throw new AppError(400, 'Duplicate UTR: This transaction reference has already been submitted for another payment.', 'DUPLICATE_UTR');
    }

    const paymentConfig = await settingsService.getPaymentConfig();
    const paymentType = (input as any).paymentType === 'KYC_CHARGES' ? 'KYC_CHARGES' : 'PROCESSING_FEE';
    const chargeAmount = paymentType === 'KYC_CHARGES'
      ? (paymentConfig.kycChargeAmount || 499)
      : (paymentConfig.processingFeeAmount || paymentConfig.chargeAmount || 1999);

    const existingPayment = await prisma.payment.findFirst({
      where: { loanId, paymentType },
      orderBy: { paymentDate: 'desc' },
    });

    if (existingPayment && (existingPayment.status === 'PAID' || existingPayment.status === 'SUCCESS')) {
      throw new AppError(400, 'Payment has already been verified and paid for this loan application.', 'PAYMENT_ALREADY_VERIFIED');
    }

    const receiptNumber = existingPayment?.receiptNumber || `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const now = new Date();

    let payment;
    if (existingPayment) {
      payment = await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          transactionRef: cleanUtr,
          paymentMethod: input.paymentMethod || 'UPI',
          paymentType,
          status: 'UNDER_VERIFICATION',
          notes: input.notes || null,
          rejectionReason: null,
          amount: chargeAmount,
          submittedAt: now,
          paymentDate: now,
        },
      });
    } else {
      payment = await prisma.payment.create({
        data: {
          loanId: loan.id,
          customerId,
          amount: chargeAmount,
          paymentMethod: input.paymentMethod || 'UPI',
          paymentType,
          transactionRef: cleanUtr,
          receiptNumber,
          status: 'UNDER_VERIFICATION',
          notes: input.notes || null,
          submittedAt: now,
        },
      });
    }

    await prisma.loanApplication.update({
      where: { id: loanId },
      data: { paymentStatus: 'UNDER_VERIFICATION' },
    });

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
   * Admin: List pending payments requiring manual verification.
   */
  async listPendingPayments(filters: { search?: string; page?: number; limit?: number; state?: string; fromDate?: string; toDate?: string }) {
    return this.listPayments({
      ...filters,
      status: 'UNDER_VERIFICATION',
    });
  }

  /**
   * Admin: List payments with filtering, search, and pagination.
   */
  async listPayments(filters: { status?: string; search?: string; page?: number; limit?: number; state?: string; fromDate?: string; toDate?: string }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
    const skip = (page - 1) * limit;

    const andConditions: any[] = [];

    if (filters.status && filters.status !== 'ALL') {
      if (filters.status === 'UNDER_VERIFICATION' || filters.status === 'PENDING') {
        andConditions.push({ status: { in: ['UNDER_VERIFICATION', 'PENDING'] } });
      } else {
        andConditions.push({ status: filters.status });
      }
    }

    if (filters.state && filters.state !== 'ALL') {
      andConditions.push({ customer: { state: filters.state } });
    }

    if (filters.fromDate || filters.toDate) {
      const dateCond: any = {};
      if (filters.fromDate) dateCond.gte = new Date(filters.fromDate);
      if (filters.toDate) dateCond.lte = new Date(filters.toDate);
      andConditions.push({ paymentDate: dateCond });
    }

    if (filters.search && filters.search.trim().length > 0) {
      const term = filters.search.trim();
      andConditions.push({
        OR: [
          { transactionRef: { contains: term } },
          { receiptNumber: { contains: term } },
          { customer: { fullName: { contains: term } } },
          { customer: { mobile: { contains: term } } },
          { loan: { applicationNumber: { contains: term } } },
        ],
      });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    const [total, items] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: 'desc' },
        include: {
          customer: {
            select: { id: true, fullName: true, mobile: true, email: true, state: true, city: true },
          },
          loan: {
            select: { id: true, applicationNumber: true, status: true, requestedAmount: true, approvedAmount: true },
          },
        },
      }),
    ]);

    const chargeIds = items.map((p) => p.chargeId).filter(Boolean) as string[];
    const charges = chargeIds.length > 0
      ? await prisma.charge.findMany({
          where: { id: { in: chargeIds } },
          select: { id: true, name: true },
        })
      : [];
    const chargeMap = new Map(charges.map((c) => [c.id, c.name]));

    return {
      payments: items.map((p) => {
        let chargeName = 'Payment';
        if (p.chargeId && chargeMap.has(p.chargeId)) {
          chargeName = chargeMap.get(p.chargeId)!;
        } else if (p.notes?.includes('Specific Charge:')) {
          chargeName = p.notes.split('Specific Charge:')[1].split('(')[0].trim();
        } else if (p.notes?.toUpperCase().includes('KYC')) {
          chargeName = 'KYC Verification Charge';
        } else if (p.paymentType === 'PROCESSING_FEE') {
          chargeName = 'Processing Fee';
        } else if (p.paymentType) {
          chargeName = p.paymentType.replace(/_/g, ' ');
        }

        return {
          id: p.id,
          loanId: p.loanId,
          applicationNumber: p.loan?.applicationNumber || 'N/A',
          customerId: p.customerId,
          customerName: p.customer?.fullName || 'Customer',
          mobile: p.customer?.mobile || '',
          email: p.customer?.email || '',
          state: p.customer?.state || '',
          amount: p.amount,
          utr: p.transactionRef,
          receiptNumber: p.receiptNumber,
          paymentMethod: p.paymentMethod,
          chargeType: chargeName,
          status: p.status,
          rejectionReason: p.rejectionReason,
          notes: p.notes,
          submittedAt: p.submittedAt || p.paymentDate,
          verifiedAt: p.verifiedAt,
          verifiedBy: p.verifiedBy,
        };
      }),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Admin: Verifies payment with ATOMIC TRANSACTION.
   * Updates Payment -> PAID, Charge -> PAID, Invoice generation, Notification, AuditLog, and automated event triggers.
   * Enforces 1 Charge = 1 Invoice idempotency. Payment verification NEVER approves the loan.
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

    const loan = payment.loan;
    const customer = payment.customer;

    const now = new Date();

    // Execute atomic transaction
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

      // 2. Update linked Charge to PAID if exists
      if (payment.chargeId) {
        await tx.charge.update({
          where: { id: payment.chargeId },
          data: {
            status: 'PAID',
            paidAt: now,
          },
        });
      }

      // Check if there is an unlinked charge with this paymentId
      await tx.charge.updateMany({
        where: { paymentId: payment.id },
        data: {
          status: 'PAID',
          paidAt: now,
        },
      });

      // 3. Update Loan paymentStatus if applicable (Loan approval remains an explicit admin underwriting action)
      let updatedLoan = null;
      if (loan) {
        updatedLoan = await tx.loanApplication.update({
          where: { id: loan.id },
          data: {
            paymentStatus: 'PAID',
          },
        });
      }

      // Resolve dynamic charge name
      let chargeType = 'Fee Payment';
      if (payment.chargeId) {
        const linkedCharge = await prisma.charge.findUnique({ where: { id: payment.chargeId } });
        if (linkedCharge?.name) {
          chargeType = linkedCharge.name;
        }
      } else if (payment.notes?.includes('KYC')) {
        chargeType = 'KYC Verification Fee';
      } else if (payment.paymentType === 'KYC_CHARGES') {
        chargeType = 'KYC Verification Fee';
      } else if (payment.paymentType === 'PROCESSING_FEE') {
        chargeType = 'Processing Fee';
      }

      // 4. Create Customer Notification for Payment Verified
      await tx.notification.create({
        data: {
          recipientType: 'CUSTOMER',
          customerId: payment.customerId,
          title: 'Payment Verified',
          message: `Your ${chargeType} payment of ₹${payment.amount.toLocaleString('en-IN')} (UTR: ${payment.transactionRef}) has been verified. Official invoice is now available.`,
          eventType: 'PAYMENT_VERIFIED',
        },
      });

      return { updatedPayment, updatedLoan, chargeType };
    });

    // 5. Automatic Invoice PDF Generation & Storage Persistence (Strict Idempotency: 1 Charge = 1 Invoice)
    let invoiceRecord = null;
    if (payment.chargeId) {
      invoiceRecord = await prisma.invoice.findUnique({ where: { chargeId: payment.chargeId } });
    }
    if (!invoiceRecord) {
      invoiceRecord = await prisma.invoice.findFirst({ where: { paymentId: payment.id } });
    }

    if (invoiceRecord) {
      // Invoice already generated for this verified charge/payment. Return existing invoice (idempotent).
      return {
        payment: result.updatedPayment,
        loan: result.updatedLoan,
        invoice: invoiceRecord,
      };
    }

    let invoicePdfBuffer: Buffer | null = null;
    const chargeType = result.chargeType;
    const invoiceNum = `INV-${now.getFullYear()}-${payment.id.slice(-6).toUpperCase()}`;

    try {
      const branding = await prisma.brandingSettings.findUnique({ where: { id: 'default' } });

      invoicePdfBuffer = await pdfService.generateInvoicePdf({
        invoiceNumber: invoiceNum,
        invoiceDate: now,
        customerName: customer?.fullName || 'Valued Customer',
        customerMobile: customer?.mobile || undefined,
        customerEmail: customer?.email || undefined,
        customerAddress: customer ? `${customer.address}, ${customer.city}, ${customer.state}` : undefined,
        applicationNumber: loan?.applicationNumber || 'N/A',
        loanAccountNumber: loan?.accountNumber || loan?.applicationNumber || 'N/A',
        chargeId: payment.chargeId || undefined,
        recordId: payment.id.slice(-6).toUpperCase(),
        chargeType,
        chargeDescription: `${chargeType} for Loan Application ${loan?.applicationNumber || ''}`,
        amount: payment.amount,
        taxAmount: Math.round(payment.amount * 0.18),
        totalAmount: Math.round(payment.amount * 1.18),
        paymentMethod: payment.paymentMethod || 'UPI / Bank Transfer',
        paymentDate: now,
        paymentStatus: 'PAID',
        transactionRef: payment.transactionRef || 'VERIFIED',
        remark: payment.notes || `Payment verified for ${chargeType}.`,
        companyName: branding?.companyName || 'Loan Approve Financial Services',
        companyLegalName: branding?.companyLegalName || 'Loan Approve Financial Services Pvt. Ltd.',
        companyAddress: branding?.address || 'Nariman Point, Mumbai, Maharashtra 400021',
        companyEmail: branding?.email || 'billing@loanapprove.com',
        companyPhone: branding?.phone || '+91 8042054797',
        companyWebsite: branding?.website || 'https://loanapprove.com',
        authorizedSignatoryName: branding?.authorizedSignatoryName || 'Authorized Officer',
        authorizedSignatoryDesignation: branding?.authorizedSignatoryDesignation || 'Authorized Signatory',
        generatedDate: now,
      });

      const uniqueFileId = crypto.randomUUID();
      const storageKey = `invoices/${payment.customerId}/${payment.id}-${invoiceNum}.pdf`;
      const storageResult = await storageProvider.saveFile(
        storageKey,
        invoicePdfBuffer,
        'application/pdf'
      );

      // Create Invoice record
      if (payment.chargeId) {
        invoiceRecord = await prisma.invoice.upsert({
          where: { chargeId: payment.chargeId },
          create: {
            invoiceNumber: invoiceNum,
            customerId: payment.customerId,
            loanId: payment.loanId,
            chargeId: payment.chargeId,
            paymentId: payment.id,
            chargeName: chargeType,
            amount: payment.amount,
            taxAmount: Math.round(payment.amount * 0.18),
            totalAmount: Math.round(payment.amount * 1.18),
            currency: 'INR',
            status: 'PAID',
            storageKey: storageResult.storageKey,
            filePath: storageResult.filePath,
            fileUrl: `/api/customer/documents/${uniqueFileId}/file`,
            templateVersion: 'v1.0',
            brandingVersion: 'v1.0',
            issuedAt: now,
          },
          update: {
            storageKey: storageResult.storageKey,
            filePath: storageResult.filePath,
            status: 'PAID',
          },
        });
      } else {
        invoiceRecord = await prisma.invoice.create({
          data: {
            invoiceNumber: invoiceNum,
            customerId: payment.customerId,
            loanId: payment.loanId,
            paymentId: payment.id,
            chargeName: chargeType,
            amount: payment.amount,
            taxAmount: Math.round(payment.amount * 0.18),
            totalAmount: Math.round(payment.amount * 1.18),
            currency: 'INR',
            status: 'PAID',
            storageKey: storageResult.storageKey,
            filePath: storageResult.filePath,
            fileUrl: `/api/customer/documents/${uniqueFileId}/file`,
            templateVersion: 'v1.0',
            brandingVersion: 'v1.0',
            issuedAt: now,
          },
        });
      }

      // Register in LoanDocument for Customer Document Center
      await prisma.loanDocument.create({
        data: {
          id: uniqueFileId,
          customerId: payment.customerId,
          loanId: payment.loanId,
          documentType: 'INVOICE',
          fileName: `Invoice_${chargeType.replace(/\s+/g, '_')}_${invoiceNum}.pdf`,
          originalFileName: `Invoice_${chargeType.replace(/\s+/g, '_')}_${invoiceNum}.pdf`,
          storageKey: storageResult.storageKey,
          filePath: storageResult.filePath,
          fileUrl: `/api/customer/documents/${uniqueFileId}/file`,
          mimeType: 'application/pdf',
          fileSize: storageResult.fileSize,
          status: 'APPROVED',
          version: 1,
          isCurrentVersion: true,
          reviewedBy: actor.fullName,
          reviewedAt: now,
        },
      });

      // Secondary notification for Invoice Available
      await prisma.notification.create({
        data: {
          recipientType: 'CUSTOMER',
          customerId: payment.customerId,
          title: 'Invoice Available for Download',
          message: `Your official Tax Invoice for ${chargeType} (${invoiceNum}) is now available in your Document Center.`,
          eventType: 'INVOICE_AVAILABLE',
        },
      });
    } catch (invErr) {
      console.error('[InvoiceGeneration] Failed to generate/persist payment invoice:', invErr);
    }

    // Record audit trails
    await auditService.record({
      actorType: 'ADMIN',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'PAYMENT_VERIFIED',
      entity: 'Payment',
      entityId: payment.id,
      newValue: {
        status: 'PAID',
        verifiedBy: actor.fullName,
        utr: payment.transactionRef,
        invoiceNumber: invoiceNum,
        invoiceId: invoiceRecord?.id,
      },
      ipAddress,
    });

    // 6. Automated Communication Triggers (if enabled)
    try {
      const commSettings = await prisma.communicationSettings.findUnique({ where: { id: 'default' } });
      const branding = await prisma.brandingSettings.findUnique({ where: { id: 'default' } });
      const companyName = branding?.companyName || 'Your Financial Services';

      if (commSettings?.autoEmailOnPaymentVerified && customer) {
        await emailService.sendSingleEmail(
          {
            customerId: payment.customerId,
            loanId: payment.loanId,
            subject: `Payment Verified & Official Invoice Generated — ${invoiceNum}`,
            message: `Dear ${customer.fullName},\n\nYour payment of ₹${payment.amount.toLocaleString('en-IN')} (UTR: ${payment.transactionRef || 'N/A'}) has been successfully verified.\n\nPlease find your official Tax Invoice attached.\n\nWarm regards,\n${companyName}`,
            templateName: 'PAYMENT_VERIFIED',
            attachments: invoicePdfBuffer
              ? [{ filename: `Invoice_${invoiceNum}.pdf`, content: invoicePdfBuffer }]
              : undefined,
          },
          actor,
          ipAddress
        );
      }

      if (commSettings?.autoWhatsAppOnPaymentVerified && customer) {
        await whatsappService.sendMessage({
          customerId: payment.customerId,
          loanId: payment.loanId,
          message: `Hello ${customer.fullName}, your payment of ₹${payment.amount.toLocaleString('en-IN')} (UTR: ${payment.transactionRef}) has been successfully verified. Official invoice is now available in your portal.\n\nRegards,\n${companyName}`,
          templateName: 'PAYMENT_VERIFIED',
          actor,
          ipAddress,
        });
      }
    } catch {
      // Non-critical communication error does not revert database verification
    }

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

      if (payment.loanId) {
        await tx.loanApplication.update({
          where: { id: payment.loanId },
          data: { paymentStatus: 'PAYMENT_REQUIRED' },
        });
      }

      if (payment.chargeId) {
        await tx.charge.update({
          where: { id: payment.chargeId },
          data: { status: 'PENDING' },
        });
      }

      await tx.notification.create({
        data: {
          recipientType: 'CUSTOMER',
          customerId: payment.customerId,
          title: 'Payment Verification Failed',
          message: `Your payment reference (${payment.transactionRef}) could not be verified: ${input.rejectionReason}. Please re-submit valid details.`,
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
