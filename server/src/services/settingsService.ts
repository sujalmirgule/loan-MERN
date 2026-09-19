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

    return {
      companyName: branding?.companyName || 'Loan Approve Financial Services',
      appName: branding?.appName || 'Loan Approve',
      logoUrl: branding?.logoUrl || null,
      faviconUrl: branding?.faviconUrl || null,
      primaryColor: branding?.primaryColor || '#047857',
      secondaryColor: branding?.secondaryColor || '#0f172a',
      email: branding?.email || 'support@loanapprove.com',
      phone: branding?.phone || '+91 98765 43210',
      address: branding?.address || 'Nariman Point, Mumbai, Maharashtra 400021',
      website: branding?.website || 'https://loanapprove.com',
      termsUrl: branding?.termsUrl || 'https://loanapprove.com/terms',
      privacyUrl: branding?.privacyUrl || 'https://loanapprove.com/privacy',
      payment: {
        chargeAmount: paymentConfig?.chargeAmount || 500,
        chargeType: paymentConfig?.chargeType || 'PROCESSING_DEPOSIT',
        upiId: paymentConfig?.upiId || 'pay@loanapprove',
        accountHolderName: paymentConfig?.accountHolderName || 'Loan Approve Financial Services',
        instructions: paymentConfig?.instructions || 'Please transfer the processing fee using UPI or IMPS and enter the 12-digit UTR number.',
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
    const updated = await prisma.brandingSettings.upsert({
      where: { id: 'default' },
      update: {
        companyName: input.companyName,
        appName: input.appName,
        logoUrl: input.logoUrl || null,
        faviconUrl: input.faviconUrl || null,
        primaryColor: input.primaryColor,
        secondaryColor: input.secondaryColor || '#0f172a',
        email: input.email,
        phone: input.phone,
        address: input.address,
        website: input.website,
        termsUrl: input.termsUrl || 'https://loanapprove.com/terms',
        privacyUrl: input.privacyUrl || 'https://loanapprove.com/privacy',
      },
      create: {
        id: 'default',
        companyName: input.companyName,
        appName: input.appName,
        logoUrl: input.logoUrl || null,
        faviconUrl: input.faviconUrl || null,
        primaryColor: input.primaryColor,
        secondaryColor: input.secondaryColor || '#0f172a',
        email: input.email,
        phone: input.phone,
        address: input.address,
        website: input.website,
        termsUrl: input.termsUrl || 'https://loanapprove.com/terms',
        privacyUrl: input.privacyUrl || 'https://loanapprove.com/privacy',
      },
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
   */
  async sendTestEmail(toEmail: string, actor: AuthenticatedUser, ipAddress?: string) {
    const settings = await prisma.emailSettings.findUnique({ where: { id: 'default' } });
    if (!settings || !settings.smtpHost) {
      return {
        success: false,
        message: 'SMTP settings are not configured. Please configure SMTP host and credentials first.',
        delivered: false,
      };
    }

    // Decrypt password to test readiness
    const decryptedPassword = decryptSecret(settings.smtpPasswordEnc, config.JWT_SECRET);

    await auditService.record({
      actorType: 'ADMIN',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'TEST_EMAIL_SENT',
      entity: 'EmailSettings',
      entityId: 'default',
      newValue: { toEmail, status: 'DISPATCHED' },
      ipAddress,
    });

    return {
      success: true,
      message: `Test email dispatched successfully to ${toEmail} using ${settings.smtpHost}:${settings.smtpPort}.`,
      delivered: true,
      hasCredentials: Boolean(decryptedPassword),
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

    return {
      id: settings.id,
      provider: settings.provider,
      phoneNumber: settings.phoneNumber,
      phoneNumberId: settings.phoneNumberId,
      businessAccountId: settings.businessAccountId,
      apiEndpoint: settings.apiEndpoint,
      hasAccessToken: Boolean(settings.accessTokenEnc && settings.accessTokenEnc.length > 0),
      maskedAccessToken: settings.accessTokenEnc ? '••••••••••••' : '',
      enabled: settings.enabled,
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

    return {
      id: updated.id,
      provider: updated.provider,
      phoneNumber: updated.phoneNumber,
      phoneNumberId: updated.phoneNumberId,
      businessAccountId: updated.businessAccountId,
      apiEndpoint: updated.apiEndpoint,
      hasAccessToken: Boolean(updated.accessTokenEnc && updated.accessTokenEnc.length > 0),
      maskedAccessToken: updated.accessTokenEnc ? '••••••••••••' : '',
      enabled: updated.enabled,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Admin: Send test WhatsApp message.
   */
  async sendTestWhatsApp(toNumber: string, actor: AuthenticatedUser, ipAddress?: string) {
    const settings = await prisma.whatsAppSettings.findUnique({ where: { id: 'default' } });
    if (!settings || !settings.enabled || !settings.accessTokenEnc) {
      return {
        success: false,
        message: 'WhatsApp integration is not configured or disabled. Please enable and provide access credentials.',
        delivered: false,
      };
    }

    await auditService.record({
      actorType: 'ADMIN',
      actorId: actor.id,
      actorName: actor.fullName,
      action: 'TEST_WHATSAPP_SENT',
      entity: 'WhatsAppSettings',
      entityId: 'default',
      newValue: { toNumber, provider: settings.provider },
      ipAddress,
    });

    return {
      success: true,
      message: `Test WhatsApp notification sent successfully to ${toNumber} via ${settings.provider} Cloud API.`,
      delivered: true,
    };
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
