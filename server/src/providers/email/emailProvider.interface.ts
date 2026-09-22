export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface EmailPayload {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface EmailSendResult {
  recipient: string;
  status: 'SENT' | 'FAILED';
  messageId?: string;
  previewUrl?: string;
  providerNote?: string;
  error?: string;
}

export interface EmailProvider {
  readonly name: string;
  isConfigured(): boolean;
  sendEmail(payload: EmailPayload): Promise<EmailSendResult>;
  sendBulkEmails(payloads: EmailPayload[]): Promise<EmailSendResult[]>;
  verifyConnection(): Promise<{ success: boolean; message: string; previewUrl?: string; error?: string }>;
}

