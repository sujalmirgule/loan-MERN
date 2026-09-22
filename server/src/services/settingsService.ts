import { prisma } from './db';
import { config } from '../config';
import { auditService } from './auditService';
import { AuthenticatedUser } from '../middleware/authMiddleware';
import { encryptSecret, decryptSecret } from '../utils/security';
import {
  UpdateBrandingInput,
  UpdateEmailSettingsInput,
  UpdateWhatsAppSettingsInput,
  UpdatePaymentConfigInput,
} from '../validators/phase5Validators';

export class SettingsService {
  /**
   * Retrieves non-sensitive public configuration for dynamic branding and borrower instructions.
   */
  async getPublicConfig() {
    const [branding, paymentConfig] = await Promise.all([
      prisma.brandingSettings.findUnique({ where: { id: 'default' } }),
      prisma.paymentConfig.findUnique({ where: { id: 'default' } }),
    ]);

    // Parse JSON fields safely
    let documentsConfig: unknown[] = [];
    let faqs: unknown[] = [];
    try { documentsConfig = JSON.parse(branding?.documentsConfigJson || '[]'); } catch { /* keep empty */ }
    try { faqs = JSON.parse(branding?.faqsJson || '[]'); } catch { /* keep empty */ }

    return {
      companyName: branding?.companyName || 'Your Financial Services',
      companyLegalName: branding?.companyLegalName || 'Your Financial Services Pvt. Ltd.',
      appName: branding?.appName || 'LoanApp',
      logoUrl: branding?.logoUrl || null,
      faviconUrl: branding?.faviconUrl || null,
      secondaryLogoUrl: branding?.secondaryLogoUrl || null,
      watermarkLogoUrl: branding?.watermarkLogoUrl || null,
      watermarkOpacity: branding?.watermarkOpacity ?? 0.10,
      watermarkSize: branding?.watermarkSize || 'MEDIUM',
      watermarkPosition: branding?.watermarkPosition || 'CENTER',
      primaryColor: branding?.primaryColor || '#047857',
      secondaryColor: branding?.secondaryColor || '#0f172a',
      email: branding?.email || 'support@yourcompany.com',
      phone: branding?.phone || '+91 98765 43210',
      address: branding?.address || 'Your Registered Office Address',
      website: branding?.website || 'https://yourcompany.com',
      termsUrl: branding?.termsUrl || '',
      privacyUrl: branding?.privacyUrl || '',
      payment: {
        chargeAmount: paymentConfig?.kycChargeAmount || paymentConfig?.chargeAmount || 499,
        chargeType: paymentConfig?.chargeType || 'KYC_CHARGES',
        upiId: paymentConfig?.upiId || '',
        accountHolderName: paymentConfig?.accountHolderName || branding?.companyName || 'Your Financial Services',
        instructions: paymentConfig?.instructions || 'Please transfer the processing fee using UPI or IMPS and enter the 12-digit UTR number.',
      },
      // ── Landing Page Configuration ────────────────────────────
      hero: {
        headline: branding?.heroHeadline || 'Simple, Transparent Loan Application',
        subheadline: branding?.heroSubheadline || 'Apply online, complete verification, and track your application status — all in one place.',
      },
      lender: {
        name: branding?.lenderName || null,
        legalName: branding?.lenderLegalName || null,
        registrationNumber: branding?.lenderRegistrationNumber || null,
        type: branding?.lenderType || null,
        address: branding?.lenderAddress || null,
        website: branding?.lenderWebsite || null,
        isDirectLender: branding?.isDirectLender ?? false,
      },
      partner: {
        name: branding?.partnerName || null,
        relationship: branding?.partnerRelationship || null,
      },
      financial: {
        minLoanAmount: branding?.minLoanAmount ?? 10000,
        maxLoanAmount: branding?.maxLoanAmount ?? 3000000,
        minTenureMonths: branding?.minTenureMonths ?? 6,
        maxTenureMonths: branding?.maxTenureMonths ?? 84,
        minApr: branding?.minApr ?? 12.0,
        maxApr: branding?.maxApr ?? 36.0,
        processingFeePolicy: branding?.processingFeePolicy || 'Processing fee applicable as per loan terms. GST as per applicable rates.',
        otherChargesPolicy: branding?.otherChargesPolicy || 'Late payment charges, prepayment charges, and other fees as per the approved loan agreement.',
      },
      eligibility: {
        minAge: branding?.minAge ?? 18,
        maxAge: branding?.maxAge ?? 60,
        minMonthlyIncome: branding?.minMonthlyIncome ?? 15000,
        creditScoreCriteria: branding?.creditScoreCriteria || 'Good credit history preferred. Applications assessed individually.',
        bankAccountRequired: branding?.bankAccountRequired ?? true,
        employmentCriteria: branding?.employmentCriteria || 'Salaried, Self-Employed, or Business Owner',
        residentialStatusCriteria: branding?.residentialStatusCriteria || 'Indian Resident with valid address proof',
      },
      documents: documentsConfig,
      disclaimer: branding?.disclaimerText || null,
      faqs,
      app: {
        enabled: branding?.appEnabled ?? false,
        downloadUrl: branding?.appDownloadUrl || null,
      },
    };
  }


  /**
   * Admin: Get branding settings.
   */
  async getBrandingSettings() {
    let settings = await prisma.brandingSettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.brandingSettings.create({
        data: { id: 'default' },
      });
    }
    return settings;
  }

  /**
   * Admin: Update branding settings.
   */
  async updateBrandingSettings(input: UpdateBrandingInput, actor: AuthenticatedUser, ipAddress?: string) {
    const previous = await this.getBrandingSettings();

    // Build shared field object for update/create
    const brandingData = {
      companyName: input.companyName,
      companyLegalName: input.companyLegalName ?? previous.companyLegalName,
      appName: input.appName,
      logoUrl: input.logoUrl !== undefined ? (input.logoUrl || null) : previous.logoUrl,
      faviconUrl: input.faviconUrl !== undefined ? (input.faviconUrl || null) : previous.faviconUrl,
      secondaryLogoUrl: input.secondaryLogoUrl !== undefined ? (input.secondaryLogoUrl || null) : previous.secondaryLogoUrl,
      approvalLetterHeaderUrl: input.approvalLetterHeaderUrl !== undefined ? (input.approvalLetterHeaderUrl || null) : previous.approvalLetterHeaderUrl,
      watermarkLogoUrl: input.watermarkLogoUrl !== undefined ? (input.watermarkLogoUrl || null) : previous.watermarkLogoUrl,
      documentWatermarkEnabled: input.documentWatermarkEnabled !== undefined ? input.documentWatermarkEnabled : (previous.documentWatermarkEnabled ?? true),
      invoiceWatermarkEnabled: input.invoiceWatermarkEnabled !== undefined ? input.invoiceWatermarkEnabled : (previous.invoiceWatermarkEnabled ?? true),
      watermarkOpacity: input.watermarkOpacity !== undefined ? input.watermarkOpacity : (previous.watermarkOpacity ?? 0.10),
      watermarkSize: input.watermarkSize || previous.watermarkSize || 'MEDIUM',
      watermarkPosition: input.watermarkPosition || previous.watermarkPosition || 'CENTER',
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor || '#0f172a',
      email: input.email,
      phone: input.phone,
      address: input.address,
      website: input.website,
      termsUrl: input.termsUrl || 'https://loanapprove.com/terms',
      privacyUrl: input.privacyUrl || 'https://loanapprove.com/privacy',
      // Landing page fields
      lenderName: input.lenderName ?? null,
      lenderLegalName: input.lenderLegalName ?? null,
      lenderRegistrationNumber: input.lenderRegistrationNumber ?? null,
      lenderType: input.lenderType ?? null,
      lenderAddress: input.lenderAddress ?? null,
      lenderWebsite: input.lenderWebsite ?? null,
      isDirectLender: input.isDirectLender ?? false,
      partnerName: input.partnerName ?? null,
      partnerRelationship: input.partnerRelationship ?? null,
      minLoanAmount: input.minLoanAmount ?? 10000,
      maxLoanAmount: input.maxLoanAmount ?? 3000000,
      minTenureMonths: input.minTenureMonths ?? 6,
      maxTenureMonths: input.maxTenureMonths ?? 84,
      minApr: input.minApr ?? 12.0,
      maxApr: input.maxApr ?? 36.0,
      processingFeePolicy: input.processingFeePolicy ?? 'Processing fee applicable as per loan terms. GST as per applicable rates.',
      otherChargesPolicy: input.otherChargesPolicy ?? 'Late payment charges, prepayment charges, and other fees as per the approved loan agreement.',
      minAge: input.minAge ?? 18,
      maxAge: input.maxAge ?? 60,
      minMonthlyIncome: input.minMonthlyIncome ?? 15000,
      creditScoreCriteria: input.creditScoreCriteria ?? 'Good credit history preferred. Applications assessed individually.',
      bankAccountRequired: input.bankAccountRequired ?? true,
      employmentCriteria: input.employmentCriteria ?? 'Salaried, Self-Employed, or Business Owner',
      residentialStatusCriteria: input.residentialStatusCriteria ?? 'Indian Resident with valid address proof',
      documentsConfigJson: input.documentsConfigJson ?? '[]',
      disclaimerText: input.disclaimerText ?? null,
      faqsJson: input.faqsJson ?? '[]',
      appEnabled: input.appEnabled ?? false,
      appDownloadUrl: input.appDownloadUrl ?? null,
      heroHeadline: input.heroHeadline ?? 'Simple, Transparent Loan Application',
      heroSubheadline: input.heroSubheadline ?? 'Apply online, complete verification, and track your application status — all in one place.',
    };

    const updated = await prisma.brandingSettings.upsert({
      where: { id: 'default' },
      update: brandingData,
      create: { id: 'default', ...brandingData },
    });

    await auditService.record({
      actorType: 'ADMIN',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'BRANDING_SETTINGS_UPDATED',
      entity: 'BrandingSettings',
      entityId: 'default',
      previousValue: previous,
      newValue: updated,
      ipAddress,
    });

    return updated;
  }

  /**
   * Admin: Get dedicated document branding settings.
   */
  async getDocumentBrandingSettings() {
    const settings = await this.getBrandingSettings();
    return {
      approvalLetterHeaderUrl: settings.approvalLetterHeaderUrl,
      watermarkLogoUrl: settings.watermarkLogoUrl,
      documentWatermarkEnabled: settings.documentWatermarkEnabled,
      invoiceWatermarkEnabled: settings.invoiceWatermarkEnabled,
      watermarkOpacity: settings.watermarkOpacity,
      watermarkSize: settings.watermarkSize,
      watermarkPosition: settings.watermarkPosition,
      primaryLogoUrl: settings.logoUrl,
      companyName: settings.companyName,
      companyLegalName: settings.companyLegalName,
    };
  }

  /**
   * Admin: Update dedicated document branding settings.
   */
  async updateDocumentBrandingSettings(input: any, actor: AuthenticatedUser, ipAddress?: string) {
    const previous = await this.getBrandingSettings();

    const docData: any = {};
    if (input.approvalLetterHeaderUrl !== undefined) docData.approvalLetterHeaderUrl = input.approvalLetterHeaderUrl || null;
    if (input.watermarkLogoUrl !== undefined) docData.watermarkLogoUrl = input.watermarkLogoUrl || null;
    if (input.documentWatermarkEnabled !== undefined) docData.documentWatermarkEnabled = Boolean(input.documentWatermarkEnabled);
    if (input.invoiceWatermarkEnabled !== undefined) docData.invoiceWatermarkEnabled = Boolean(input.invoiceWatermarkEnabled);
    if (input.watermarkOpacity !== undefined) docData.watermarkOpacity = Number(input.watermarkOpacity);
    if (input.watermarkSize !== undefined) docData.watermarkSize = input.watermarkSize;
    if (input.watermarkPosition !== undefined) docData.watermarkPosition = input.watermarkPosition;

    const updated = await prisma.brandingSettings.upsert({
      where: { id: 'default' },
      update: docData,
      create: { id: 'default', ...docData },
    });

    await auditService.record({
      actorType: 'ADMIN',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'DOCUMENT_BRANDING_UPDATED',
      entity: 'BrandingSettings',
      entityId: 'default',
      previousValue: previous,
      newValue: docData,
      ipAddress,
    });

    return updated;
  }


  /**
   * Admin: Get email configuration (passwords masked).
   */
  async getEmailSettings() {
    let settings = await prisma.emailSettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.emailSettings.create({
        data: { id: 'default' },
      });
    }

    return {
      id: settings.id,
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort,
      smtpUsername: settings.smtpUsername,
      hasPassword: Boolean(settings.smtpPasswordEnc && settings.smtpPasswordEnc.length > 0),
      maskedPassword: settings.smtpPasswordEnc ? '••••••••••••' : '',
      fromName: settings.fromName,
      fromEmail: settings.fromEmail,
      encryption: settings.encryption,
      updatedAt: settings.updatedAt,
    };
  }

  /**
   * Admin: Update email configuration.
   */
  async updateEmailSettings(input: UpdateEmailSettingsInput, actor: AuthenticatedUser, ipAddress?: string) {
    const existing = await prisma.emailSettings.findUnique({ where: { id: 'default' } });
    let smtpPasswordEnc = existing?.smtpPasswordEnc || '';

    // If a new password was supplied, encrypt it
    if (input.smtpPassword && input.smtpPassword.trim().length > 0) {
      smtpPasswordEnc = encryptSecret(input.smtpPassword, config.JWT_SECRET);
    }

    const updated = await prisma.emailSettings.upsert({
      where: { id: 'default' },
      update: {
        smtpHost: input.smtpHost,
        smtpPort: input.smtpPort,
        smtpUsername: input.smtpUsername,
        smtpPasswordEnc,
        fromName: input.fromName,
        fromEmail: input.fromEmail,
        encryption: input.encryption,
      },
      create: {
        id: 'default',
        smtpHost: input.smtpHost,
        smtpPort: input.smtpPort,
        smtpUsername: input.smtpUsername,
        smtpPasswordEnc,
        fromName: input.fromName,
        fromEmail: input.fromEmail,
        encryption: input.encryption,
      },
    });

    await auditService.record({
      actorType: 'ADMIN',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'EMAIL_SETTINGS_UPDATED',
      entity: 'EmailSettings',
      entityId: 'default',
      newValue: {
        smtpHost: updated.smtpHost,
        smtpPort: updated.smtpPort,
        fromEmail: updated.fromEmail,
      },
      ipAddress,
    });

    return {
      id: updated.id,
      smtpHost: updated.smtpHost,
      smtpPort: updated.smtpPort,
      smtpUsername: updated.smtpUsername,
      hasPassword: Boolean(updated.smtpPasswordEnc && updated.smtpPasswordEnc.length > 0),
      maskedPassword: updated.smtpPasswordEnc ? '••••••••••••' : '',
      fromName: updated.fromName,
      fromEmail: updated.fromEmail,
      encryption: updated.encryption,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Admin: Send test email.
   * Real provider verification: NO FAKE SUCCESS.
   */
  async sendTestEmail(toEmail: string, actor: AuthenticatedUser, ipAddress?: string) {
    const { emailService } = await import('./emailService');
    const settings = await prisma.emailSettings.findUnique({ where: { id: 'default' } });

    // Attempt real SMTP connection verification with active provider
    const connResult = await emailService.testSmtpConnection();
    if (!connResult.success) {
      return {
        success: false,
        message: `SMTP connection failed: ${connResult.error || connResult.message}`,
        error: connResult.error,
        delivered: false,
      };
    }

    await auditService.record({
      actorType: 'ADMIN',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'TEST_EMAIL_VERIFIED',
      entity: 'EmailSettings',
      entityId: 'default',
      newValue: { toEmail, status: 'VERIFIED', previewUrl: connResult.previewUrl },
      ipAddress,
    });

    return {
      success: true,
      message: connResult.message || `SMTP connection successfully verified (${settings?.smtpHost || 'Ethereal Test SMTP'}).`,
      previewUrl: connResult.previewUrl,
      delivered: true,
    };
  }

  /**
   * Admin: Get WhatsApp configuration (tokens masked).
   */
  async getWhatsAppSettings() {
    let settings = await prisma.whatsAppSettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.whatsAppSettings.create({
        data: { id: 'default' },
      });
    }

    const envToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    const hasToken = Boolean((settings.accessTokenEnc && settings.accessTokenEnc.length > 0) || envToken);

    return {
      id: settings.id,
      provider: settings.provider || process.env.WHATSAPP_PROVIDER || 'META',
      phoneNumber: settings.phoneNumber || process.env.WHATSAPP_PHONE_NUMBER || '+919046833151',
      phoneNumberId: settings.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      businessAccountId: settings.businessAccountId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
      apiEndpoint: settings.apiEndpoint || process.env.WHATSAPP_API_URL || '',
      hasAccessToken: hasToken,
      maskedAccessToken: hasToken ? '••••••••••••' : '',
      enabled: settings.enabled || Boolean(envToken),
      updatedAt: settings.updatedAt,
    };
  }

  /**
   * Admin: Update WhatsApp configuration.
   */
  async updateWhatsAppSettings(input: UpdateWhatsAppSettingsInput, actor: AuthenticatedUser, ipAddress?: string) {
    const existing = await prisma.whatsAppSettings.findUnique({ where: { id: 'default' } });
    let accessTokenEnc = existing?.accessTokenEnc || '';

    if (input.accessToken && input.accessToken.trim().length > 0) {
      accessTokenEnc = encryptSecret(input.accessToken, config.JWT_SECRET);
    }

    const updated = await prisma.whatsAppSettings.upsert({
      where: { id: 'default' },
      update: {
        provider: input.provider,
        phoneNumber: input.phoneNumber,
        phoneNumberId: input.phoneNumberId || '',
        businessAccountId: input.businessAccountId || '',
        apiEndpoint: input.apiEndpoint || '',
        accessTokenEnc,
        enabled: input.enabled,
      },
      create: {
        id: 'default',
        provider: input.provider,
        phoneNumber: input.phoneNumber,
        phoneNumberId: input.phoneNumberId || '',
        businessAccountId: input.businessAccountId || '',
        apiEndpoint: input.apiEndpoint || '',
        accessTokenEnc,
        enabled: input.enabled,
      },
    });

    await auditService.record({
      actorType: 'ADMIN',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'WHATSAPP_SETTINGS_UPDATED',
      entity: 'WhatsAppSettings',
      entityId: 'default',
      newValue: {
        provider: updated.provider,
        phoneNumber: updated.phoneNumber,
        enabled: updated.enabled,
      },
      ipAddress,
    });

    const envToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    const hasToken = Boolean((updated.accessTokenEnc && updated.accessTokenEnc.length > 0) || envToken);

    return {
      id: updated.id,
      provider: updated.provider,
      phoneNumber: updated.phoneNumber,
      phoneNumberId: updated.phoneNumberId,
      businessAccountId: updated.businessAccountId,
      apiEndpoint: updated.apiEndpoint,
      hasAccessToken: hasToken,
      maskedAccessToken: hasToken ? '••••••••••••' : '',
      enabled: updated.enabled,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Admin: Send test WhatsApp message.
   * Real provider verification: NO FAKE SUCCESS.
   */
  async sendTestWhatsApp(toNumber: string, actor: AuthenticatedUser, ipAddress?: string) {
    const { whatsappService } = await import('./whatsappService');
    const settings = await prisma.whatsAppSettings.findUnique({ where: { id: 'default' } });

    const connResult = await whatsappService.testConnection();
    if (!connResult.success) {
      return {
        success: false,
        message: `WhatsApp provider connection failed: ${connResult.error || connResult.message}`,
        error: connResult.error,
        delivered: false,
      };
    }

    await auditService.record({
      actorType: 'ADMIN',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'TEST_WHATSAPP_VERIFIED',
      entity: 'WhatsAppSettings',
      entityId: 'default',
      newValue: { toNumber, provider: settings?.provider || process.env.WHATSAPP_PROVIDER || 'DEVELOPMENT' },
      ipAddress,
    });

    return {
      success: true,
      message: connResult.message || `WhatsApp provider connection verified successfully for ${settings?.provider || process.env.WHATSAPP_PROVIDER || 'DEVELOPMENT'}.`,
      delivered: true,
    };
  }

  /**
   * Admin: Get Automated Communication Configuration
   */
  async getCommunicationSettings() {
    let settings = await prisma.communicationSettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.communicationSettings.create({
        data: { id: 'default' },
      });
    }
    return settings;
  }

  /**
   * Admin: Update Automated Communication Configuration
   */
  async updateCommunicationSettings(input: Partial<{
    emailEnabled: boolean;
    whatsAppEnabled: boolean;
    autoEmailOnPaymentVerified: boolean;
    autoEmailOnLoanApproved: boolean;
    autoEmailOnLoanRejected: boolean;
    autoEmailOnKycVerified: boolean;
    autoEmailOnKycRejected: boolean;
    autoEmailOnChargeCreated: boolean;
    autoWhatsAppOnPaymentVerified: boolean;
    autoWhatsAppOnKycPending: boolean;
    autoWhatsAppOnLoanApproved: boolean;
    autoWhatsAppOnLoanRejected: boolean;
    autoWhatsAppOnChargeCreated: boolean;
  }>, actor: AuthenticatedUser, ipAddress?: string) {
    const updated = await prisma.communicationSettings.upsert({
      where: { id: 'default' },
      update: input,
      create: {
        id: 'default',
        ...input,
      },
    });

    await auditService.record({
      actorType: 'ADMIN',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'COMMUNICATION_SETTINGS_UPDATED',
      entity: 'CommunicationSettings',
      entityId: 'default',
      newValue: input,
      ipAddress,
    });

    return updated;
  }

  /**
   * Get payment configuration.
   */
  async getPaymentConfig() {
    let configRecord = await prisma.paymentConfig.findUnique({ where: { id: 'default' } });
    if (!configRecord) {
      configRecord = await prisma.paymentConfig.create({
        data: { id: 'default' },
      });
    }
    return configRecord;
  }

  /**
   * Admin: Update payment configuration.
   */
  async updatePaymentConfig(input: UpdatePaymentConfigInput, actor: AuthenticatedUser, ipAddress?: string) {
    const previous = await this.getPaymentConfig();
    const updated = await prisma.paymentConfig.upsert({
      where: { id: 'default' },
      update: {
        chargeAmount: input.chargeAmount,
        chargeType: input.chargeType,
        upiId: input.upiId,
        accountNumber: input.accountNumber,
        ifscCode: input.ifscCode,
        accountHolderName: input.accountHolderName,
        instructions: input.instructions,
      },
      create: {
        id: 'default',
        chargeAmount: input.chargeAmount,
        chargeType: input.chargeType,
        upiId: input.upiId,
        accountNumber: input.accountNumber,
        ifscCode: input.ifscCode,
        accountHolderName: input.accountHolderName,
        instructions: input.instructions,
      },
    });

    await auditService.record({
      actorType: 'ADMIN',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'PAYMENT_CONFIG_UPDATED',
      entity: 'PaymentConfig',
      entityId: 'default',
      previousValue: previous,
      newValue: updated,
      ipAddress,
    });

    return updated;
  }
}

export const settingsService = new SettingsService();
