import nodemailer, { Transporter } from 'nodemailer';
import { EmailProvider, EmailPayload, EmailSendResult } from './emailProvider.interface';
import { logger } from '../../utils/logger';

export interface SmtpConfig {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
}

export class SmtpEmailProvider implements EmailProvider {
  readonly name = 'SMTP_NODEMAILER';
  private config: SmtpConfig;
  private transporter: Transporter | null = null;

  constructor(config: SmtpConfig = {}) {
    this.config = {
      host: config.host || process.env.SMTP_HOST || '',
      port: config.port || (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587),
      user: config.user || process.env.SMTP_USER || '',
      pass: config.pass || process.env.SMTP_PASSWORD || '',
      fromEmail: config.fromEmail || process.env.SMTP_FROM_EMAIL || process.env.EMAIL_FROM || 'notifications@loanapprove.com',
      fromName: config.fromName || process.env.SMTP_FROM_NAME || process.env.EMAIL_FROM_NAME || 'Loan Approve Desk',
      replyTo: config.replyTo || process.env.EMAIL_REPLY_TO || 'support@loanapprove.com',
    };
    this.initTransporter();
  }

  public updateConfig(newConfig: Partial<SmtpConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.initTransporter();
  }

  private initTransporter() {
    if (this.config.host) {
      const isSecure = process.env.SMTP_SECURE === 'true' || this.config.port === 465;
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port || 587,
        secure: isSecure,
        auth: this.config.user ? { user: this.config.user, pass: this.config.pass } : undefined,
        tls: { rejectUnauthorized: false },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
      } as any);
    } else {
      this.transporter = null;
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.config.host && this.transporter);
  }

  async sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
    if (!this.isConfigured() || !this.transporter) {
      return {
        recipient: payload.to,
        status: 'FAILED',
        error: 'EMAIL_PROVIDER_NOT_CONFIGURED',
      };
    }

    const fromName = payload.fromName || this.config.fromName || 'Notification Service';
    const fromEmail = payload.fromEmail || this.config.fromEmail || 'notifications@yourcompany.com';

    try {
      const mailOptions: any = {
        from: `"${fromName}" <${fromEmail}>`,
        to: payload.to,
        replyTo: payload.replyTo || this.config.replyTo,
        subject: payload.subject,
        text: payload.text,
        html: payload.html || (payload.text ? `<p style="white-space: pre-line;">${payload.text}</p>` : undefined),
      };

      if (payload.attachments && payload.attachments.length > 0) {
        mailOptions.attachments = payload.attachments.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        }));
      }

      const info = await this.transporter.sendMail(mailOptions);

      return {
        recipient: payload.to,
        status: 'SENT',
        messageId: info.messageId,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'SMTP dispatch failure';
      logger.error('SMTP send failure', { recipient: payload.to, error: errMsg });
      return {
        recipient: payload.to,
        status: 'FAILED',
        error: errMsg,
      };
    }
  }

  async sendBulkEmails(payloads: EmailPayload[]): Promise<EmailSendResult[]> {
    const results: EmailSendResult[] = [];
    for (const payload of payloads) {
      const res = await this.sendEmail(payload);
      results.push(res);
    }
    return results;
  }

  async verifyConnection(): Promise<{ success: boolean; message: string; error?: string }> {
    if (!this.isConfigured() || !this.transporter) {
      return {
        success: false,
        message: 'SMTP credentials are not configured.',
        error: 'EMAIL_PROVIDER_NOT_CONFIGURED',
      };
    }

    try {
      await this.transporter.verify();
      return {
        success: true,
        message: 'SMTP connection verified successfully.',
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to connect to SMTP server';
      return {
        success: false,
        message: 'SMTP verification failed.',
        error: errMsg,
      };
    }
  }
}
