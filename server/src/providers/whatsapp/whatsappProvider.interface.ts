export interface WhatsAppMessagePayload {
  to: string; // E.164 or Indian 10-digit formatted mobile
  message: string;
  templateName?: string;
  variables?: Record<string, string>;
}

export interface WhatsAppSendResult {
  recipient: string;
  status: 'SENT' | 'FAILED';
  providerMessageId?: string;
  error?: string;
}

export interface WhatsAppProvider {
  readonly name: string;
  isConfigured(): boolean;
  sendMessage(payload: WhatsAppMessagePayload): Promise<WhatsAppSendResult>;
  sendBulkMessages(payloads: WhatsAppMessagePayload[]): Promise<WhatsAppSendResult[]>;
  testConnection(): Promise<{ success: boolean; message: string; error?: string }>;
}
