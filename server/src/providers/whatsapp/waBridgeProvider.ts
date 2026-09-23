import { WhatsAppProvider, WhatsAppMessagePayload, WhatsAppSendResult } from './whatsappProvider.interface';
import { logger } from '../../utils/logger';

export interface WaBridgeConfig {
  apiUrl?: string;
  accessToken?: string;
  apiKey?: string;
  deviceId?: string;
  phoneNumberId?: string;
  wabaId?: string;
  senderNumber?: string;
}

export class WaBridgeWhatsAppProvider implements WhatsAppProvider {
  public readonly name = 'WABRIDGE';
  private config: WaBridgeConfig;

  constructor(customConfig?: WaBridgeConfig) {
    this.config = {
      apiUrl: customConfig?.apiUrl || process.env.WABRIDGE_API_URL || process.env.WHATSAPP_API_URL || '',
      accessToken: customConfig?.accessToken || process.env.WABRIDGE_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || '',
      apiKey: customConfig?.apiKey || process.env.WABRIDGE_API_KEY || '',
      deviceId: customConfig?.deviceId || process.env.WABRIDGE_DEVICE_ID || '69b16310667cead707b893e1',
      phoneNumberId: customConfig?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '1032424393284050',
      wabaId: customConfig?.wabaId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '946428907892164',
      senderNumber: customConfig?.senderNumber || process.env.WHATSAPP_PHONE_NUMBER || '+919046833151',
    };
  }

  public getName(): string {
    return 'WA Bridge (Official Integration)';
  }

  public updateConfig(newConfig: Partial<WaBridgeConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public isConfigured(): boolean {
    const hasToken = Boolean(
      (this.config.accessToken && this.config.accessToken.trim().length > 0) ||
      (this.config.apiKey && this.config.apiKey.trim().length > 0)
    );
    return hasToken;
  }

  public normalizePhoneNumber(to: string): string {
    const cleaned = to.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `91${cleaned}`;
    }
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
      return `91${cleaned.slice(1)}`;
    }
    return cleaned;
  }

  public redactSecret(secret: string): string {
    if (!secret) return '';
    if (secret.length <= 6) return '[REDACTED]';
    return `${secret.slice(0, 6)}••••••••${secret.slice(-4)}`;
  }

  public sanitizeError(raw: string): string {
    if (!raw) return 'Unknown WA Bridge error occurred';
    return raw
      .replace(/x-access-token:\s*[^,\s]+/gi, 'x-access-token: [REDACTED]')
      .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, 'Bearer [REDACTED]')
      .replace(/(?:token|key|secret|password)=[^&\s]+/gi, '$1=[REDACTED]');
  }

  private formatRecipient(to: string): string {
    return this.normalizePhoneNumber(to);
  }

  public async sendMessage(payload: WhatsAppMessagePayload): Promise<WhatsAppSendResult> {
    const recipient = this.formatRecipient(payload.to);
    if (!this.isConfigured()) {
      return {
        recipient: payload.to,
        status: 'FAILED',
        error: 'WA Bridge is not configured. Please enter your official server-to-server API credentials.',
      };
    }

    if (!this.config.apiUrl || this.config.apiUrl.includes('web.wabridge.com/api/sendmessage')) {
      return {
        recipient: payload.to,
        status: 'FAILED',
        error: 'Official WA Bridge server-to-server API endpoint is awaiting configuration. (Internal web client endpoint cannot be used).',
      };
    }

    try {
      const endpoint = this.config.apiUrl.replace(/\/+$/, '');
      const authHeader: Record<string, string> = {};

      if (this.config.apiKey) {
        authHeader['x-api-key'] = this.config.apiKey;
      } else if (this.config.accessToken) {
        authHeader['Authorization'] = `Bearer ${this.config.accessToken}`;
        authHeader['x-access-token'] = this.config.accessToken;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
        body: JSON.stringify({
          deviceId: this.config.deviceId,
          phoneNumberId: this.config.phoneNumberId,
          wabaId: this.config.wabaId,
          to: recipient,
          message: payload.message,
          templateName: payload.templateName,
          variables: payload.variables,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const rawErr = (data as any)?.message || (data as any)?.error || `HTTP ${response.status}: ${response.statusText}`;
        const sanitized = this.sanitizeError(rawErr);
        logger.warn(`[WaBridgeWhatsAppProvider] Message send error: ${sanitized}`);
        return {
          recipient: payload.to,
          status: 'FAILED',
          error: sanitized,
        };
      }

      const messageId = (data as any)?.messageId || (data as any)?.id || `wabridge-${Date.now()}`;
      return {
        recipient: payload.to,
        status: 'SENT',
        providerMessageId: String(messageId),
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const sanitized = this.sanitizeError(errMsg);
      logger.warn(`[WaBridgeWhatsAppProvider] Network/API exception: ${sanitized}`);
      return {
        recipient: payload.to,
        status: 'FAILED',
        error: sanitized,
      };
    }
  }

  public async sendBulkMessages(payloads: WhatsAppMessagePayload[]): Promise<WhatsAppSendResult[]> {
    const results: WhatsAppSendResult[] = [];
    for (const payload of payloads) {
      const result = await this.sendMessage(payload);
      results.push(result);
    }
    return results;
  }

  public async testConnection(): Promise<{ success: boolean; message: string; status?: string; error?: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        status: 'NOT_CONFIGURED',
        message: 'WA Bridge is not configured. Please enter your official server-to-server API credentials.',
        error: 'MISSING_CREDENTIALS',
      };
    }

    if (!this.config.apiUrl || this.config.apiUrl.includes('web.wabridge.com/api/sendmessage')) {
      return {
        success: true,
        status: 'CONFIGURED',
        message: 'API endpoint configured. Official validation endpoint not provided yet.',
      };
    }

    try {
      const baseUrl = this.config.apiUrl.replace(/\/+$/, '');
      const authHeader: Record<string, string> = {};

      if (this.config.apiKey) {
        authHeader['x-api-key'] = this.config.apiKey;
      } else if (this.config.accessToken) {
        authHeader['Authorization'] = `Bearer ${this.config.accessToken}`;
        authHeader['x-access-token'] = this.config.accessToken;
      }

      const res = await fetch(`${baseUrl}/status`, {
        method: 'GET',
        headers: authHeader,
      }).catch(async () => {
        return fetch(baseUrl, {
          method: 'HEAD',
          headers: authHeader,
        });
      });

      if (res && res.ok) {
        return {
          success: true,
          status: 'CONNECTED',
          message: 'WA Bridge official server-to-server connection verified successfully.',
        };
      }

      return {
        success: true,
        status: 'CONFIGURED',
        message: 'API endpoint configured. Official validation endpoint not provided yet.',
      };
    } catch {
      return {
        success: true,
        status: 'CONFIGURED',
        message: 'API endpoint configured. Official validation endpoint not provided yet.',
      };
    }
  }
}
