import { EmailProvider, EmailPayload, EmailSendResult } from './emailProvider.interface';
import { logger } from '../../utils/logger';

export class DevelopmentEmailProvider implements EmailProvider {
  readonly name = 'DEVELOPMENT_EMAIL_ADAPTER';

  isConfigured(): boolean {
    return true;
  }

  async sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
    const messageId = `dev_mail_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const attachCount = payload.attachments?.length || 0;

    logger.info('====================================================');
    logger.info('[EMAIL DEVELOPMENT TEST MESSAGE]');
    logger.info(`Recipient: ${payload.to}`);
    logger.info(`From: ${payload.fromName || 'System'} <${payload.fromEmail || 'notifications@loanapprove.com'}>`);
    logger.info(`Subject: ${payload.subject}`);
    logger.info(`Attachments: ${attachCount} file(s)`);
    logger.info('Body:');
    logger.info(payload.text || payload.html || '(empty body)');
    logger.info('Status: DEVELOPMENT_SANDBOX_LOGGED (Not Sent to External Inbox)');
    logger.info('====================================================');

    return {
      recipient: payload.to,
      status: 'SENT',
      messageId,
      providerNote: 'Development Test Adapter — Local Sandbox Logged',
    };
  }

  async sendBulkEmails(payloads: EmailPayload[]): Promise<EmailSendResult[]> {
    const results: EmailSendResult[] = [];
    for (const payload of payloads) {
      results.push(await this.sendEmail(payload));
    }
    return results;
  }

  async verifyConnection(): Promise<{ success: boolean; message: string; previewUrl?: string; error?: string }> {
    return {
      success: true,
      message: 'Development Email Sandbox Adapter is active. Messages are safely captured in server logs.',
    };
  }
}
