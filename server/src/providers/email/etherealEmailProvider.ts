import nodemailer, { Transporter, TestAccount } from 'nodemailer';
import { EmailProvider, EmailPayload, EmailSendResult } from './emailProvider.interface';
import { logger } from '../../utils/logger';

export interface EtherealConfig {
  user?: string;
  pass?: string;
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
}

export class EtherealEmailProvider implements EmailProvider {
  readonly name = 'ETHEREAL_TEST_SMTP';
  private config: EtherealConfig;
  private transporter: Transporter | null = null;
  private initializingPromise: Promise<void> | null = null;
  private testAccount: TestAccount | null = null;

  constructor(config: EtherealConfig = {}) {
    this.config = {
      user: config.user || process.env.ETHEREAL_USER || process.env.SMTP_USER || '',
      pass: config.pass || process.env.ETHEREAL_PASS || process.env.SMTP_PASSWORD || '',
      fromEmail: config.fromEmail || process.env.EMAIL_FROM || 'notifications@loanapprove.com',
      fromName: config.fromName || process.env.EMAIL_FROM_NAME || 'Loan Approve Test Desk',
      replyTo: config.replyTo || process.env.EMAIL_REPLY_TO || 'support@loanapprove.com',
    };
  }

  public updateConfig(newConfig: Partial<EtherealConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.transporter = null;
    this.initializingPromise = null;
  }

  private async ensureTransporter(): Promise<Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    if (this.initializingPromise) {
      await this.initializingPromise;
      if (this.transporter) return this.transporter;
    }

    this.initializingPromise = (async () => {
      try {
        let user = this.config.user;
        let pass = this.config.pass;

        // If credentials not provided in .env, automatically create Ethereal sandbox account
        if (!user || !pass) {
          logger.info('[EtherealEmailProvider] Creating new on-demand Ethereal test account...');
          const account = await nodemailer.createTestAccount();
          this.testAccount = account;
          user = account.user;
          pass = account.pass;
          logger.info(`[EtherealEmailProvider] Provisioned test account: ${account.user}`);
        }

        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user,
            pass,
          },
          tls: {
            rejectUnauthorized: false,
          },
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 5000,
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Failed to initialize Ethereal transporter';
        logger.error('[EtherealEmailProvider] Initialization error', { error: errMsg });
        this.transporter = null;
        throw err;
      }
    })();

    await this.initializingPromise;
    if (!this.transporter) {
      throw new Error('Could not establish Ethereal SMTP transporter');
    }
    return this.transporter;
  }

  public isConfigured(): boolean {
    return true; // Ethereal auto-provisions sandbox account if credentials not explicitly provided
  }

  async sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
    try {
      const transporter = await this.ensureTransporter();

      const fromName = payload.fromName || this.config.fromName || 'Loan Approve Test Desk';
      const fromEmail = payload.fromEmail || this.config.fromEmail || (this.testAccount?.user ?? 'notifications@loanapprove.com');

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

      const info = await transporter.sendMail(mailOptions);
      const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;

      logger.info('====================================================');
      logger.info(`[ETHEREAL TEST EMAIL DISPATCHED]`);
      logger.info(`Recipient: ${payload.to}`);
      logger.info(`Subject: ${payload.subject}`);
      logger.info(`Message ID: ${info.messageId}`);
      if (previewUrl) {
        logger.info(`Preview URL: ${previewUrl}`);
      }
      logger.info('====================================================');

      return {
        recipient: payload.to,
        status: 'SENT',
        messageId: info.messageId,
        previewUrl: typeof previewUrl === 'string' ? previewUrl : undefined,
        providerNote: 'Delivered to Ethereal Test SMTP Sandbox',
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Ethereal SMTP dispatch failure';
      logger.error('Ethereal send failure', { recipient: payload.to, error: errMsg });
      return {
        recipient: payload.to,
        status: 'FAILED',
        error: errMsg,
        providerNote: 'Ethereal SMTP connection failed',
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

  async verifyConnection(): Promise<{ success: boolean; message: string; previewUrl?: string; error?: string }> {
    try {
      const transporter = await this.ensureTransporter();
      await transporter.verify();
      return {
        success: true,
        message: 'Ethereal SMTP connection successfully verified (smtp.ethereal.email:587).',
        previewUrl: this.testAccount ? `https://ethereal.email/messages` : undefined,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to connect to Ethereal SMTP server';
      return {
        success: false,
        message: 'Ethereal SMTP verification failed.',
        error: errMsg,
      };
    }
  }
}
