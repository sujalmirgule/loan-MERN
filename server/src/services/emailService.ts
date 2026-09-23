import { prisma } from './db';
import { auditService } from './auditService';
import { pdfService } from './pdfService';
import { config } from '../config';
import { decryptSecret } from '../utils/security';
import { AuthenticatedUser } from '../middleware/authMiddleware';
import { EmailProvider, EmailPayload, EmailSendResult } from '../providers/email/emailProvider.interface';
import { SmtpEmailProvider } from '../providers/email/smtpEmailProvider';
import { EtherealEmailProvider } from '../providers/email/etherealEmailProvider';
import { DevelopmentEmailProvider } from '../providers/email/developmentEmailProvider';

export interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
}

export interface SendEmailPayload {
  customerId: string;
  subject: string;
  message: string;
  templateName?: string;
  ticketId?: string;
  loanId?: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
  forceMock?: boolean;
}

export interface BatchSendEmailPayload {
  customerIds?: string[];
  filter?: {
    status?: string;
    state?: string;
    kycStatus?: string;
    fromDate?: string;
    toDate?: string;
  };
  subject: string;
  message: string;
  templateName?: string;
  ticketId?: string;
  forceMock?: boolean;
}

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'PENDING_APPLICATION',
    name: 'Pending Application',
    category: 'Application',
    subject: 'Action Required: Your Loan Application {{applicationId}} is Pending',
    body: `Dear {{customerName}},

We noticed that your loan application {{applicationId}} is currently in {{loanStatus}} status.

Please log in to your customer portal to complete any pending application details or upload required documents so our team can evaluate your loan.

Warm regards,
{{companyName}} Customer Support`,
  },
  {
    id: 'KYC_PENDING',
    name: 'KYC Pending',
    category: 'KYC',
    subject: 'Action Required: Complete Your KYC Verification - {{applicationId}}',
    body: `Dear {{customerName}},

Your loan application {{applicationId}} requires identity verification. Your current KYC status is: {{kycStatus}}.

Please upload clear copies of your Aadhaar Card and PAN Card in the customer portal to complete verification.

Thank you for choosing {{companyName}}.

Sincerely,
{{companyName}} Verification Desk`,
  },
  {
    id: 'KYC_VERIFIED',
    name: 'KYC Verified',
    category: 'KYC',
    subject: 'KYC Verification Approved - {{applicationId}}',
    body: `Dear {{customerName}},

Great news! Your KYC identity verification has been successfully approved (Status: {{kycStatus}}).

Your loan application {{applicationId}} is now proceeding to credit evaluation.

Sincerely,
{{companyName}} Team`,
  },
  {
    id: 'KYC_REJECTED',
    name: 'KYC Rejected',
    category: 'KYC',
    subject: 'Important: Document Correction Required for KYC - {{applicationId}}',
    body: `Dear {{customerName}},

During verification of application {{applicationId}}, your KYC documents could not be approved.

Please log in to your account to review the compliance notes and re-upload the requested documents.

Best regards,
{{companyName}} Compliance Team`,
  },
  {
    id: 'PAYMENT_PENDING',
    name: 'Payment Pending',
    category: 'Payment',
    subject: 'Fee Payment Required for Loan Application {{applicationId}}',
    body: `Dear {{customerName}},

Your loan application {{applicationId}} has an active payment due for {{chargeType}} of ₹{{amount}}.

Please complete payment via UPI in your customer portal.

Regards,
{{companyName}} Accounts Desk`,
  },
  {
    id: 'PAYMENT_VERIFIED',
    name: 'Payment Verified',
    category: 'Payment',
    subject: 'Payment Verified & Official Invoice Generated - {{applicationId}}',
    body: `Dear {{customerName}},

We have successfully verified your payment of ₹{{amount}} for {{chargeType}} (UTR: {{utr}}).

Your official GST tax invoice ({{invoiceNumber}}) is available for download in your dashboard.

Sincerely,
{{companyName}} Accounts Department`,
  },
  {
    id: 'APPLICATION_APPROVED',
    name: 'Application Approved',
    category: 'Loan',
    subject: 'Congratulations! Your Loan Application {{applicationId}} is Approved',
    body: `Dear {{customerName}},

We are pleased to inform you that your loan application {{applicationId}} has been approved for ₹{{amount}}!

Please review your sanction letter, sign the agreement in your portal, and proceed with disbursement.

Warm regards,
{{companyName}} Underwriting Team`,
  },
  {
    id: 'APPLICATION_REJECTED',
    name: 'Application Rejected',
    category: 'Loan',
    subject: 'Update Regarding Your Loan Application {{applicationId}}',
    body: `Dear {{customerName}},

After careful review of your loan application {{applicationId}}, we regret to inform you that we cannot approve your application at this time.

Sincerely,
{{companyName}} Credit Committee`,
  },
];

export class EmailService {
  private provider: EmailProvider;

  constructor(provider?: EmailProvider) {
    this.provider = provider || this.resolveInitialProvider();
  }

  private resolveInitialProvider(): EmailProvider {
    const configuredProvider = (process.env.EMAIL_PROVIDER || '').trim().toLowerCase();
    if (configuredProvider === 'development') {
      return new DevelopmentEmailProvider();
    }
    if (configuredProvider === 'smtp' || (process.env.SMTP_HOST && process.env.SMTP_HOST !== 'smtp.ethereal.email')) {
      return new SmtpEmailProvider();
    }
    return new EtherealEmailProvider();
  }

  private customProvider: EmailProvider | null = null;

  public setProvider(provider: EmailProvider) {
    this.customProvider = provider;
    this.provider = provider;
  }

  public resetProvider() {
    this.customProvider = null;
    this.provider = this.resolveInitialProvider();
  }

  public getProvider(): EmailProvider {
    return this.provider;
  }

  /**
   * Refreshes SMTP configuration from environment or database settings
   */
  private async refreshProviderConfig() {
    if (this.customProvider) {
      this.provider = this.customProvider;
      return;
    }

    const configuredProvider = (process.env.EMAIL_PROVIDER || '').trim().toLowerCase();

    if (configuredProvider === 'development') {
      if (!(this.provider instanceof DevelopmentEmailProvider)) {
        this.provider = new DevelopmentEmailProvider();
      }
      return;
    }

    if (configuredProvider === 'ethereal') {
      if (!(this.provider instanceof EtherealEmailProvider)) {
        this.provider = new EtherealEmailProvider();
      }
      return;
    }

    let smtpHost = process.env.SMTP_HOST || '';
    let smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    let smtpUser = process.env.SMTP_USER || '';
    let smtpPass = process.env.SMTP_PASSWORD || '';
    let fromEmail = process.env.SMTP_FROM_EMAIL || process.env.EMAIL_FROM || 'notifications@loanapprove.com';
    let fromName = process.env.SMTP_FROM_NAME || process.env.EMAIL_FROM_NAME || 'Loan Approve Desk';
    let replyTo = process.env.EMAIL_REPLY_TO || 'support@loanapprove.com';

    if (!smtpHost) {
      const dbSettings = await prisma.emailSettings.findUnique({ where: { id: 'default' } });
      if (dbSettings && dbSettings.smtpHost) {
        smtpHost = dbSettings.smtpHost;
        smtpPort = dbSettings.smtpPort;
        smtpUser = dbSettings.smtpUsername;
        fromEmail = dbSettings.fromEmail || fromEmail;
        fromName = dbSettings.fromName || fromName;
        if (dbSettings.smtpPasswordEnc) {
          try {
            smtpPass = decryptSecret(dbSettings.smtpPasswordEnc, config.JWT_SECRET);
          } catch {
            smtpPass = '';
          }
        }
      }
    }

    // If host is explicitly set or in test mode or smtp is specified, use SmtpEmailProvider
    if (smtpHost || configuredProvider === 'smtp' || process.env.NODE_ENV === 'test') {
      if (!(this.provider instanceof SmtpEmailProvider)) {
        this.provider = new SmtpEmailProvider({
          host: smtpHost,
          port: smtpPort,
          user: smtpUser,
          pass: smtpPass,
          fromEmail,
          fromName,
          replyTo,
        });
      } else {
        this.provider.updateConfig({
          host: smtpHost,
          port: smtpPort,
          user: smtpUser,
          pass: smtpPass,
          fromEmail,
          fromName,
          replyTo,
        });
      }
    } else {
      if (!(this.provider instanceof EtherealEmailProvider)) {
        this.provider = new EtherealEmailProvider();
      }
    }
  }

  /**
   * Resolves dynamic template variables using authoritative database values.
   */
  resolveVariables(template: string, variables: Record<string, string>): string {
    if (!template) return '';

    return template.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/gi, (_, key) => {
      const normalizedKey = key.trim();
      if (variables[normalizedKey] !== undefined && variables[normalizedKey] !== null) {
        return variables[normalizedKey];
      }
      switch (normalizedKey) {
        case 'customerName': return 'Customer';
        case 'applicationId': return 'N/A';
        case 'loanId': return 'N/A';
        case 'loanStatus': return 'Active';
        case 'kycStatus': return 'Verified';
        case 'paymentStatus': return 'Pending';
        case 'chargeType': return 'Fee';
        case 'loanAmount':
        case 'amount': return '0';
        case 'utr': return 'N/A';
        case 'invoiceNumber': return 'N/A';
        case 'companyName': return 'Loan Approve';
        default: return '';
      }
    });
  }

  /**
   * Builds customer dynamic variable map from authoritative database state.
   */
  async getCustomerVariables(customerId: string): Promise<{
    customer: any;
    latestLoan: any;
    variables: Record<string, string>;
  }> {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        loans: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!customer || customer.isDeleted) {
      throw new Error(`Customer with ID ${customerId} not found`);
    }

    if (customer.status === 'DEACTIVATED' || customer.isActive === false) {
      throw new Error(`Customer account is deactivated`);
    }

    const latestLoan = customer.loans && customer.loans.length > 0 ? customer.loans[0] : null;
    const branding = await prisma.brandingSettings.findUnique({ where: { id: 'default' } });
    const companyName = branding?.companyName || 'Loan Approve';
    const amountFormatted = latestLoan ? latestLoan.requestedAmount.toLocaleString('en-IN') : '0';

    const variables: Record<string, string> = {
      customerName: customer.fullName || 'Customer',
      applicationId: latestLoan?.applicationNumber || 'N/A',
      loanId: latestLoan?.accountNumber || latestLoan?.applicationNumber || 'N/A',
      loanStatus: latestLoan?.status ? latestLoan.status.replace(/_/g, ' ') : 'Pending',
      kycStatus: customer.kycStatus ? customer.kycStatus.replace(/_/g, ' ') : 'Pending',
      paymentStatus: latestLoan?.paymentStatus ? latestLoan.paymentStatus.replace(/_/g, ' ') : 'Not Required',
      amount: amountFormatted,
      loanAmount: amountFormatted,
      companyName,
    };

    return { customer, latestLoan, variables };
  }

  /**
   * Sends a personalized email to a single customer.
   * STRICT NO FAKE SUCCESS: Returns EMAIL_PROVIDER_NOT_CONFIGURED if SMTP is unconfigured.
   */
  async sendSingleEmail(
    payload: SendEmailPayload,
    actor: AuthenticatedUser,
    ipAddress?: string
  ): Promise<EmailSendResult & { customerName: string; customerId: string }> {
    await this.refreshProviderConfig();

    const { customer, latestLoan, variables } = await this.getCustomerVariables(payload.customerId);

    const resolvedSubject = this.resolveVariables(payload.subject, variables);
    const resolvedMessage = this.resolveVariables(payload.message, variables);

    // Deduplication check: 10-second deduplication
    const tenSecAgo = new Date(Date.now() - 10 * 1000);
    const recentDuplicate = await prisma.emailMessage.findFirst({
      where: {
        customerId: customer.id,
        recipientEmail: customer.email,
        subject: resolvedSubject,
        createdAt: { gte: tenSecAgo },
      },
    });

    if (recentDuplicate) {
      return {
        customerId: customer.id,
        recipient: customer.email,
        customerName: customer.fullName,
        status: recentDuplicate.status as 'SENT' | 'FAILED',
        messageId: recentDuplicate.providerMessageId || recentDuplicate.id,
      };
    }

    let status: 'SENT' | 'FAILED' = 'SENT';
    let providerMessageId: string | null = null;
    let failureReason: string | null = null;
    let previewUrl: string | undefined = undefined;
    let providerNote: string | undefined = undefined;

    if (payload.forceMock) {
      // Used explicitly for isolated testing
      status = 'SENT';
      providerMessageId = `mock_email_${Date.now()}`;
      providerNote = 'Mock Test Mode';
    } else if (!this.provider.isConfigured()) {
      status = 'FAILED';
      failureReason = 'EMAIL_PROVIDER_NOT_CONFIGURED';
    } else {
      const sendRes = await this.provider.sendEmail({
        to: customer.email,
        subject: resolvedSubject,
        text: resolvedMessage,
        attachments: payload.attachments,
      });
      status = sendRes.status;
      providerMessageId = sendRes.messageId || null;
      failureReason = sendRes.error || null;
      previewUrl = sendRes.previewUrl;
      providerNote = sendRes.providerNote;
    }

    // Record in EmailMessage table
    let validAdminId: string | null = null;
    if (actor?.id) {
      const adminExists = await prisma.adminUser.findUnique({ where: { id: actor.id } });
      if (adminExists) validAdminId = actor.id;
    }

    let validLoanId: string | null = null;
    const candidateLoanId = payload.loanId || latestLoan?.id;
    if (candidateLoanId) {
      const loanExists = await prisma.loanApplication.findUnique({ where: { id: candidateLoanId } });
      if (loanExists) validLoanId = candidateLoanId;
    }

    const emailRecord = await prisma.emailMessage.create({
      data: {
        customerId: customer.id,
        loanId: validLoanId,
        ticketId: payload.ticketId || null,
        adminId: validAdminId,
        recipientEmail: customer.email,
        subject: resolvedSubject,
        message: resolvedMessage,
        templateName: payload.templateName || 'CUSTOM',
        status,
        providerMessageId: previewUrl ? (providerMessageId ? `${providerMessageId} [Preview: ${previewUrl}]` : `preview_${Date.now()} [Preview: ${previewUrl}]`) : providerMessageId,
        sentAt: status === 'SENT' ? new Date() : null,
        failedAt: status === 'FAILED' ? new Date() : null,
        failureReason,
      },
    });

    // Record immutable audit log
    await auditService.record({
      actorType: 'ADMIN',
      actorId: actor.id,
      actorName: actor.fullName,
      action: status === 'SENT' ? 'Email Sent' : 'Email Failed',
      entity: 'EmailMessage',
      entityId: emailRecord.id,
      newValue: {
        customerId: customer.id,
        recipientEmail: customer.email,
        subject: resolvedSubject,
        status,
        failureReason,
        previewUrl,
        providerNote,
      },
      ipAddress,
    });

    return {
      customerId: customer.id,
      recipient: customer.email,
      customerName: customer.fullName,
      status,
      messageId: emailRecord.id,
      previewUrl,
      providerNote,
      error: failureReason || undefined,
    };
  }

  /**
   * Bulk sends emails to multiple selected customers (filter-first supported).
   */
  async sendBulkEmails(
    payload: BatchSendEmailPayload,
    actor: AuthenticatedUser,
    ipAddress?: string
  ): Promise<{
    total: number;
    sentCount: number;
    failedCount: number;
    results: any[];
  }> {
    let targetIds: string[] = payload.customerIds || [];

    // Filter-first execution: If filter specified, query DB directly
    if (payload.filter && (!targetIds || targetIds.length === 0)) {
      const where: any = { isDeleted: false };
      if (payload.filter.kycStatus && payload.filter.kycStatus !== 'ALL') {
        where.kycStatus = payload.filter.kycStatus;
      }
      if (payload.filter.state && payload.filter.state !== 'ALL') {
        where.state = payload.filter.state;
      }
      if (payload.filter.status && payload.filter.status !== 'ALL') {
        where.status = payload.filter.status;
      }
      if (payload.filter.fromDate || payload.filter.toDate) {
        where.createdAt = {};
        if (payload.filter.fromDate) where.createdAt.gte = new Date(payload.filter.fromDate);
        if (payload.filter.toDate) where.createdAt.lte = new Date(payload.filter.toDate);
      }

      const matchingCustomers = await prisma.customer.findMany({
        where,
        select: { id: true },
      });
      targetIds = matchingCustomers.map((c) => c.id);
    }

    const results: any[] = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const customerId of targetIds) {
      try {
        const res = await this.sendSingleEmail(
          {
            customerId,
            subject: payload.subject,
            message: payload.message,
            templateName: payload.templateName,
            ticketId: payload.ticketId,
            forceMock: payload.forceMock,
          },
          actor,
          ipAddress
        );
        results.push(res);
        if (res.status === 'SENT') {
          sentCount++;
        } else {
          failedCount++;
        }
      } catch (err: any) {
        failedCount++;
        results.push({
          customerId,
          recipient: 'unknown',
          customerName: 'Customer',
          status: 'FAILED',
          error: err.message || 'Failed to dispatch email',
        });
      }
    }

    if (targetIds.length > 0) {
      await auditService.record({
        actorType: 'ADMIN',
        actorId: actor.id,
        actorName: actor.fullName,
        action: 'Bulk Email Sent',
        entity: 'EmailMessage',
        entityId: `batch-${Date.now()}`,
        newValue: {
          totalRecipients: targetIds.length,
          sentCount,
          failedCount,
          templateName: payload.templateName || 'CUSTOM',
        },
        ipAddress,
      });
    }

    return {
      total: targetIds.length,
      sentCount,
      failedCount,
      results,
    };
  }

  /**
   * Dispatches Invoice PDF as an authenticated email attachment
   */
  async sendInvoiceEmail(
    chargeId: string,
    actor: AuthenticatedUser,
    ipAddress?: string
  ) {
    const charge = await prisma.charge.findUnique({
      where: { id: chargeId },
      include: { customer: true, loan: true },
    });

    if (!charge || !charge.customer) {
      throw new Error('Charge or associated customer record not found.');
    }

    if (charge.status !== 'PAID') {
      throw new Error('Cannot email invoice: Charge has not been verified/marked as PAID.');
    }

    const branding = await prisma.brandingSettings.findUnique({ where: { id: 'default' } });

    // Generate Invoice PDF
    const { buffer, filename } = await pdfService.generateInvoicePdfForCharge(chargeId);

    const subject = `Tax Invoice: ${charge.name} (#${charge.id.slice(0, 8).toUpperCase()})`;
    const message = `Dear ${charge.customer.fullName},\n\nPlease find attached the official GST tax invoice for your payment of ₹${charge.amount.toLocaleString('en-IN')} towards ${charge.name}.\n\nThank you for choosing ${branding?.companyName || 'our services'}.`;

    return this.sendSingleEmail(
      {
        customerId: charge.customer.id,
        loanId: charge.loanId || undefined,
        subject,
        message,
        templateName: 'INVOICE_EMAIL',
        attachments: [{ filename, content: buffer }],
      },
      actor,
      ipAddress
    );
  }

  /**
   * Dispatches Approval Letter PDF as an authenticated email attachment
   */
  async sendApprovalLetterEmail(
    loanId: string,
    actor: AuthenticatedUser,
    ipAddress?: string
  ) {
    const loan = await prisma.loanApplication.findUnique({
      where: { id: loanId },
      include: { customer: true },
    });

    if (!loan || !loan.customer) {
      throw new Error('Loan application or customer record not found.');
    }

    if (loan.status !== 'APPROVED') {
      throw new Error('Cannot email approval letter: Loan is not in APPROVED status.');
    }

    const branding = await prisma.brandingSettings.findUnique({ where: { id: 'default' } });

    const approvalNo = loan.approvalNumber || loan.accountNumber || loan.applicationNumber;

    // Generate Approval Letter PDF
    const pdfBuffer = await pdfService.generateApprovalLetterPdf({
      customerName: loan.customer.fullName,
      customerPhone: loan.customer.mobile,
      customerEmail: loan.customer.email,
      customerAddress: loan.customer.address ? `${loan.customer.address}, ${loan.customer.city || ''}, ${loan.customer.state || ''}` : undefined,
      applicationNumber: loan.applicationNumber,
      loanAccountNumber: loan.accountNumber || loan.applicationNumber,
      approvalNumber: approvalNo,
      loanType: loan.loanType || 'Personal Loan',
      approvedAmount: loan.approvedAmount || loan.requestedAmount,
      interestRate: loan.interestRate,
      tenureMonths: loan.tenureMonths,
      monthlyEmi: loan.finalEmi || loan.estimatedEmi || 0,
      processingFee: loan.processingFeeAmount || 7899,
      approvalDate: loan.updatedAt,
      panMasked: loan.customer.panMasked || undefined,
      aadhaarMasked: loan.customer.aadhaarMasked || undefined,
      accountHolderName: loan.customer.fullName,
      accountNumberMasked: loan.customer.bankAccountNumber ? `XXXXXX${loan.customer.bankAccountNumber.slice(-4)}` : undefined,
      bankIfsc: loan.customer.bankIfsc || undefined,
      bankName: loan.customer.bankName || undefined,
      kycVerificationId: `MUDFNC/437/907/687`,
      companyName: branding?.companyName,
      companyLegalName: branding?.companyLegalName,
      companyEmail: branding?.email,
      companyPhone: branding?.phone,
      companyAddress: branding?.address,
      companyWebsite: branding?.website,
      authorizedSignatoryName: branding?.authorizedSignatoryName,
      authorizedSignatoryDesignation: branding?.authorizedSignatoryDesignation,
      logoUrl: branding?.logoUrl,
      secondaryLogoUrl: branding?.secondaryLogoUrl,
      approvalLetterHeaderUrl: branding?.approvalLetterHeaderUrl,
      watermarkLogoUrl: branding?.watermarkLogoUrl,
      documentWatermarkEnabled: branding?.documentWatermarkEnabled,
      watermarkOpacity: branding?.watermarkOpacity,
      watermarkSize: branding?.watermarkSize,
      watermarkPosition: branding?.watermarkPosition,
    });

    const filename = `Approval_Letter_${loan.applicationNumber}.pdf`;
    const subject = `Sanction Letter: Loan Application Approved (#${loan.applicationNumber})`;
    const message = `Dear ${loan.customer.fullName},\n\nCongratulations! Your loan application #${loan.applicationNumber} has been approved for ₹${(loan.approvedAmount || loan.requestedAmount).toLocaleString('en-IN')}.\n\nPlease find attached your official sanction letter.\n\nWarm regards,\n${branding?.companyName || 'Your Financial Services'}`;

    return this.sendSingleEmail(
      {
        customerId: loan.customer.id,
        loanId: loan.id,
        subject,
        message,
        templateName: 'APPROVAL_LETTER_EMAIL',
        attachments: [{ filename, content: pdfBuffer }],
      },
      actor,
      ipAddress
    );
  }

  /**
   * Sends a custom test or ad-hoc email directly to any email address.
   */
  async sendCustomEmail(payload: {
    to: string;
    subject: string;
    text: string;
    html?: string;
    attachments?: Array<{ filename: string; content: Buffer }>;
  }): Promise<EmailSendResult> {
    await this.refreshProviderConfig();
    return this.provider.sendEmail({
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      attachments: payload.attachments,
    });
  }

  /**
   * Bulk sends Email messages to multiple loan applications.
   */
  async sendBulkApplicationEmails(input: {
    applicationIds: string[];
    subject?: string;
    message?: string;
    templateName?: string;
    actor: AuthenticatedUser;
    ipAddress?: string;
  }) {
    const { applicationIds, subject, message, templateName, actor, ipAddress } = input;
    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      throw new Error('Please select at least one loan application.');
    }

    await this.refreshProviderConfig();

    const applications = await prisma.loanApplication.findMany({
      where: { id: { in: applicationIds } },
      include: { customer: true },
    });

    if (!applications || applications.length === 0) {
      throw new Error('No matching loan applications found for the selected IDs.');
    }

    const branding = await prisma.brandingSettings.findUnique({ where: { id: 'default' } });
    const companyName = branding?.companyName || 'Loan Finance';

    const defaultSubject = `Loan Application Status Update: {{applicationId}}`;
    const defaultTemplate = `Hello {{customerName}},\n\nYour loan application {{applicationId}} is currently {{loanStatus}}.\n\nThank you,\n{{companyName}}`;

    const subjectToUse = subject && subject.trim().length > 0 ? subject.trim() : defaultSubject;
    const messageToUse = message && message.trim().length > 0 ? message.trim() : defaultTemplate;

    const results: any[] = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const app of applications) {
      const customer = app.customer;
      if (!customer || customer.isDeleted || !customer.email) {
        failedCount++;
        results.push({
          applicationId: app.id,
          applicationNumber: app.applicationNumber,
          customerName: customer?.fullName || 'Unknown',
          recipient: customer?.email || 'N/A',
          success: false,
          status: 'FAILED',
          error: 'Customer record not found, deleted, or has no email address',
        });
        continue;
      }

      try {
        const res = await this.sendSingleEmail(
          {
            customerId: customer.id,
            loanId: app.id,
            subject: subjectToUse,
            message: messageToUse,
            templateName: templateName || 'APPLICATION_STATUS_UPDATE',
          },
          actor,
          ipAddress
        );

        if (res.status === 'SENT') {
          sentCount++;
        } else {
          failedCount++;
        }

        results.push({
          applicationId: app.id,
          applicationNumber: app.applicationNumber,
          customerName: customer.fullName,
          recipient: customer.email,
          success: res.status === 'SENT',
          status: res.status,
          error: res.error,
        });
      } catch (err: unknown) {
        failedCount++;
        const errMsg = err instanceof Error ? err.message : String(err);
        results.push({
          applicationId: app.id,
          applicationNumber: app.applicationNumber,
          customerName: customer.fullName,
          recipient: customer.email,
          success: false,
          status: 'FAILED',
          error: errMsg,
        });
      }
    }

    await auditService.record({
      actorType: 'ADMIN',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'BULK_EMAIL_APPLICATIONS_SENT',
      entity: 'LoanApplication',
      entityId: `bulk-${Date.now()}`,
      newValue: {
        total: applications.length,
        sentCount,
        failedCount,
        templateName,
      },
      ipAddress,
    });

    return {
      success: sentCount > 0 || (applications.length > 0 && failedCount === 0),
      total: applications.length,
      sentCount,
      failedCount,
      results,
    };
  }

  /**
   * Tests SMTP connection
   */
  async testSmtpConnection() {
    await this.refreshProviderConfig();
    return this.provider.verifyConnection();
  }

  /**
   * Retrieves email communication history.
   */
  async getHistory(filters: {
    customerId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.customerId) {
      where.customerId = filters.customerId;
    }
    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }
    if (filters.search && filters.search.trim()) {
      const term = filters.search.trim();
      where.OR = [
        { recipientEmail: { contains: term } },
        { subject: { contains: term } },
        { message: { contains: term } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.emailMessage.count({ where }),
      prisma.emailMessage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, fullName: true, mobile: true, email: true },
          },
          loan: {
            select: { id: true, applicationNumber: true, accountNumber: true, status: true },
          },
        },
      }),
    ]);

    return {
      data: items.map((m) => ({
        id: m.id,
        customerId: m.customerId,
        customerName: m.customer?.fullName || 'Customer',
        recipientEmail: m.recipientEmail,
        mobile: m.customer?.mobile || '—',
        applicationNumber: m.loan?.applicationNumber || '—',
        loanAccountNumber: m.loan?.accountNumber || '—',
        subject: m.subject,
        message: m.message,
        templateName: m.templateName,
        status: m.status,
        providerMessageId: m.providerMessageId,
        sentAt: m.sentAt,
        failedAt: m.failedAt,
        failureReason: m.failureReason,
        createdAt: m.createdAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  getTemplates(): EmailTemplate[] {
    return DEFAULT_EMAIL_TEMPLATES;
  }
}

export const emailService = new EmailService();
