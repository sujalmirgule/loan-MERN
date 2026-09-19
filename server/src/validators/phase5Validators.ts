import { z } from 'zod';

// --- Branding Settings Schema ---
export const updateBrandingSchema = z.object({
  companyName: z.string().trim().min(2, 'Company name must be at least 2 characters').max(100),
  appName: z.string().trim().min(2, 'App name must be at least 2 characters').max(50),
  logoUrl: z.string().trim().url('Must be a valid URL').or(z.literal('')).nullable().optional(),
  faviconUrl: z.string().trim().url('Must be a valid URL').or(z.literal('')).nullable().optional(),
  primaryColor: z.string().trim().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a valid hex color code (e.g. #047857)'),
  secondaryColor: z.string().trim().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a valid hex color code').optional(),
  email: z.string().trim().email('Must be a valid email address'),
  phone: z.string().trim().min(5, 'Phone number must be at least 5 characters').max(20),
  address: z.string().trim().min(5, 'Address must be at least 5 characters').max(250),
  website: z.string().trim().url('Must be a valid website URL'),
  termsUrl: z.string().trim().url('Must be a valid Terms URL').optional(),
  privacyUrl: z.string().trim().url('Must be a valid Privacy URL').optional(),
});

export type UpdateBrandingInput = z.infer<typeof updateBrandingSchema>;

// --- Email Settings Schema ---
export const updateEmailSettingsSchema = z.object({
  smtpHost: z.string().trim().min(1, 'SMTP Host is required'),
  smtpPort: z.coerce.number().int().min(1).max(65535),
  smtpUsername: z.string().trim().min(1, 'SMTP Username is required'),
  smtpPassword: z.string().optional(), // if provided, will be re-encrypted
  fromName: z.string().trim().min(1, 'From Name is required'),
  fromEmail: z.string().trim().email('Valid from-email is required'),
  encryption: z.enum(['NONE', 'SSL', 'STARTTLS']).default('STARTTLS'),
});

export type UpdateEmailSettingsInput = z.infer<typeof updateEmailSettingsSchema>;

export const testEmailSchema = z.object({
  toEmail: z.string().trim().email('Valid recipient email is required'),
});

// --- WhatsApp Settings Schema ---
export const updateWhatsAppSettingsSchema = z.object({
  provider: z.enum(['META', 'TWILIO', 'GUPSHUP']).default('META'),
  phoneNumber: z.string().trim().min(5, 'Phone number is required'),
  phoneNumberId: z.string().trim().optional(),
  businessAccountId: z.string().trim().optional(),
  apiEndpoint: z.string().trim().url('Valid API endpoint URL is required').or(z.literal('')).optional(),
  accessToken: z.string().optional(), // if provided, re-encrypted
  enabled: z.boolean().default(false),
});

export type UpdateWhatsAppSettingsInput = z.infer<typeof updateWhatsAppSettingsSchema>;

export const testWhatsAppSchema = z.object({
  toNumber: z.string().trim().min(10, 'Valid destination phone number is required'),
});

// --- Payment Config Schema ---
export const updatePaymentConfigSchema = z.object({
  chargeAmount: z.coerce.number().positive('Charge amount must be greater than zero'),
  chargeType: z.enum(['PROCESSING_DEPOSIT', 'VERIFICATION_FEE']).default('PROCESSING_DEPOSIT'),
  upiId: z.string().trim().min(3, 'UPI ID is required'),
  accountNumber: z.string().trim().min(5, 'Account number is required'),
  ifscCode: z.string().trim().min(4, 'IFSC code is required'),
  accountHolderName: z.string().trim().min(2, 'Account holder name is required'),
  instructions: z.string().trim().min(10, 'Instructions must be at least 10 characters'),
});

export type UpdatePaymentConfigInput = z.infer<typeof updatePaymentConfigSchema>;

// --- Customer Payment Submission Schema ---
export const submitUtrSchema = z.object({
  utr: z
    .string({ required_error: 'UTR / Transaction Reference is required' })
    .trim()
    .min(6, 'UTR reference must be at least 6 characters')
    .max(50, 'UTR reference cannot exceed 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'UTR reference must contain only alphanumeric characters, dashes or underscores'),
  paymentMethod: z.enum(['UPI', 'NET_BANKING', 'DEBIT_CARD']).default('UPI'),
  notes: z.string().trim().max(300).optional(),
});

export type SubmitUtrInput = z.infer<typeof submitUtrSchema>;

// --- Admin Payment Action Schema ---
export const rejectPaymentSchema = z.object({
  rejectionReason: z
    .string({ required_error: 'Rejection reason is mandatory' })
    .trim()
    .min(3, 'Rejection reason must be at least 3 characters')
    .max(500, 'Rejection reason cannot exceed 500 characters'),
});

export type RejectPaymentInput = z.infer<typeof rejectPaymentSchema>;

// --- Disbursement Schema ---
export const recordDisbursementSchema = z.object({
  loanId: z.string().uuid('Valid loan ID is required'),
  amount: z.coerce.number().positive('Disbursement amount must be greater than zero'),
  method: z.enum(['BANK_TRANSFER', 'UPI']),
  referenceId: z.string().trim().min(6, 'Disbursement reference/UTR is required').max(100),
  notes: z.string().trim().max(500).optional(),
});

export type RecordDisbursementInput = z.infer<typeof recordDisbursementSchema>;

// --- Support Ticket Schema ---
export const createSupportTicketSchema = z.object({
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(150),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(2000),
  category: z.enum(['KYC', 'PAYMENT', 'LOAN_APPLICATION', 'DISBURSEMENT', 'GENERAL']).default('GENERAL'),
});

export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;

export const replySupportTicketSchema = z.object({
  adminReply: z.string().trim().min(3, 'Admin reply must be at least 3 characters').max(2000),
  status: z.enum(['IN_PROGRESS', 'RESOLVED']).default('RESOLVED'),
});

export type ReplySupportTicketInput = z.infer<typeof replySupportTicketSchema>;
