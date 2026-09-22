import { WhatsAppProvider, WhatsAppMessagePayload, WhatsAppSendResult } from './whatsappProvider.interface';
import { logger } from '../../utils/logger';

export interface MetaWhatsAppConfig {
  apiUrl?: string;
  apiVersion?: string;
  accessToken?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
}

export class MetaWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'META_CLOUD_API';
  private config: MetaWhatsAppConfig;

  constructor(config: MetaWhatsAppConfig = {}) {
    this.config = {
      apiUrl: config.apiUrl || process.env.WHATSAPP_API_URL || '',
      apiVersion: config.apiVersion || process.env.WHATSAPP_API_VERSION || 'v18.0',
      accessToken: config.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || '',
      phoneNumberId: config.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      businessAccountId: config.businessAccountId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    };
  }

  public updateConfig(newConfig: Partial<MetaWhatsAppConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public isConfigured(): boolean {
    return Boolean(this.config.accessToken && (this.config.phoneNumberId || this.config.apiUrl));
  }

  /**
   * Normalizes phone numbers to standard E.164 / Indian country code without duplication.
   * Examples:
   * 9876543210 -> +919876543210
   * 919876543210 -> +919876543210
   * +919876543210 -> +919876543210
   * 09876543210 -> +919876543210
   */
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
    // Meta Cloud API expects recipient number without leading '+'
    const recipientDigits = formattedPhone.replace(/^\+/, '');

    if (!this.isConfigured()) {
      return {
        recipient: formattedPhone || payload.to,
        status: 'FAILED',
        error: 'WHATSAPP_PROVIDER_NOT_CONFIGURED',
      };
    }

    const apiVersion = this.config.apiVersion || process.env.WHATSAPP_API_VERSION || 'v18.0';
    const endpoint =
      this.config.apiUrl ||
      `https://graph.facebook.com/${apiVersion}/${this.config.phoneNumberId}/messages`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientDigits,
          type: 'text',
          text: { preview_url: false, body: payload.message },
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        messages?: Array<{ id: string }>;
        error?: { message: string; code?: number; error_subcode?: number; fbtrace_id?: string };
      };

      if (!response.ok) {
        const errMsg = data.error?.message || `WhatsApp Provider HTTP ${response.status}`;
        logger.error('WhatsApp message delivery failure', {
          recipient: formattedPhone,
          error: errMsg,
          code: data.error?.code,
        });
        return {
          recipient: formattedPhone || payload.to,
          status: 'FAILED',
          error: errMsg,
        };
      }

      return {
        recipient: formattedPhone || payload.to,
        status: 'SENT',
        providerMessageId: data.messages?.[0]?.id || `wa_${Date.now()}`,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Network failure contacting WhatsApp provider';
      logger.error('WhatsApp transmission exception', { error: errMsg });
      return {
        recipient: formattedPhone || payload.to,
        status: 'FAILED',
        error: errMsg,
      };
    }
  }

  async sendBulkMessages(payloads: WhatsAppMessagePayload[]): Promise<WhatsAppSendResult[]> {
    const results: WhatsAppSendResult[] = [];
    for (const payload of payloads) {
      const res = await this.sendMessage(payload);
      results.push(res);
    }
    return results;
  }

  async testConnection(): Promise<{ success: boolean; message: string; error?: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'WhatsApp provider credentials are not configured.',
        error: 'WHATSAPP_PROVIDER_NOT_CONFIGURED',
      };
    }

    try {
      const apiVersion = this.config.apiVersion || process.env.WHATSAPP_API_VERSION || 'v18.0';
      const testUrl =
        this.config.apiUrl ||
        `https://graph.facebook.com/${apiVersion}/${this.config.phoneNumberId}`;
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const errMsg = (data as any)?.error?.message || `HTTP ${response.status}`;
        return {
          success: false,
          message: 'Failed to verify WhatsApp credentials with Meta API.',
          error: errMsg,
        };
      }

      return {
        success: true,
        message: 'Successfully verified connection to WhatsApp Cloud API.',
      };
    } catch (err: unknown) {
      return {
        success: false,
        message: 'Failed to establish connection to WhatsApp provider.',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
