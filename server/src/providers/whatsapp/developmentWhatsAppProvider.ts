import { WhatsAppProvider, WhatsAppMessagePayload, WhatsAppSendResult } from './whatsappProvider.interface';
import { logger } from '../../utils/logger';

export class DevelopmentWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'DEVELOPMENT_WHATSAPP_ADAPTER';

  isConfigured(): boolean {
    return true;
  }

  public formatPhoneNumber(raw: string): string {
    if (!raw) return '';
    const clean = raw.trim().replace(/[\s\-\(\)]/g, '');
    const digits = clean.replace(/\D/g, '');

    if (digits.length === 10) {
      return `+91${digits}`;
    }
    if (digits.length === 12 && digits.startsWith('91')) {
      return `+${digits}`;
    }
    if (digits.length === 11 && digits.startsWith('0')) {
      return `+91${digits.substring(1)}`;
    }
    if (clean.startsWith('+') && digits.length >= 10) {
      return `+${digits}`;
    }
    if (digits.length >= 10) {
      return `+${digits}`;
    }
    return clean;
  }

  async sendMessage(payload: WhatsAppMessagePayload): Promise<WhatsAppSendResult> {
    const formattedPhone = this.formatPhoneNumber(payload.to);
    const messageId = `dev_wa_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    logger.info('====================================================');
    logger.info('[WHATSAPP TEST MESSAGE]');
    logger.info(`Recipient: ${formattedPhone || payload.to}`);
    logger.info(`Template: ${payload.templateName || 'CUSTOM'}`);
    logger.info('Payload:');
    logger.info(JSON.stringify({
      recipient: formattedPhone || payload.to,
      template: payload.templateName || 'CUSTOM',
      message: payload.message,
      variables: payload.variables || {},
    }, null, 2));
    logger.info('Status: DEVELOPMENT / NOT DELIVERED');
    logger.info('Note: Development Test — Not Sent (Live Provider Pending)');
    logger.info('====================================================');

    return {
      recipient: formattedPhone || payload.to,
      status: 'FAILED',
      providerMessageId: messageId,
      error: 'Development Test — Not Sent (Live Provider Pending)',
    };
  }

  async sendBulkMessages(payloads: WhatsAppMessagePayload[]): Promise<WhatsAppSendResult[]> {
    const results: WhatsAppSendResult[] = [];
    for (const payload of payloads) {
      results.push(await this.sendMessage(payload));
    }
    return results;
  }

  async testConnection(): Promise<{ success: boolean; message: string; error?: string }> {
    return {
      success: true,
      message: 'Development WhatsApp Adapter is active (Sandbox Mode: messages are recorded locally with status "Development Test — Not Sent").',
    };
  }
}
