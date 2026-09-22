import { z } from 'zod';

export const LoanStatusEnum = z.enum([
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'DOCUMENTS_REQUIRED',
  'ON_HOLD',
  'APPROVED',
  'REJECTED',
  'OFFER_PENDING_CUSTOMER',
  'OFFER_ACCEPTED',
  'OFFER_REJECTED',
]);

export type LoanStatus = z.infer<typeof LoanStatusEnum>;

export const createLoanApplicationSchema = z.object({
  amount: z.coerce
    .number({ required_error: 'Loan amount is required' })
    .positive('Loan amount must be greater than zero')
    .finite('Loan amount must be a valid number'),
  tenureMonths: z.coerce
    .number({ required_error: 'Tenure in months is required' })
    .int('Tenure must be a whole number of months')
    .positive('Tenure must be greater than zero'),
  purpose: z
    .string({ required_error: 'Loan purpose is required' })
    .trim()
    .min(3, 'Purpose must be at least 3 characters')
    .max(500, 'Purpose cannot exceed 500 characters'),
});

export type CreateLoanApplicationInput = z.infer<typeof createLoanApplicationSchema>;

export const adminFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  status: z.enum([...LoanStatusEnum.options, 'PENDING']).optional(),
  state: z.string().trim().optional(),
  city: z.string().trim().optional(),
  loanType: z.string().trim().optional(),
  dateFilter: z.enum(['TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'LAST_30_DAYS', 'CUSTOM']).optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
});

export type AdminFilterInput = z.infer<typeof adminFilterSchema>;

export const holdApplicationSchema = z.object({
  holdReason: z
    .string({ required_error: 'Hold reason is mandatory' })
    .trim()
    .min(3, 'Hold reason must be at least 3 characters')
    .max(500, 'Hold reason cannot exceed 500 characters'),
});

export type HoldApplicationInput = z.infer<typeof holdApplicationSchema>;

export const rejectApplicationSchema = z
  .object({
    rejectionReason: z.string().trim().min(3, 'Rejection reason must be at least 3 characters').optional(),
    reason: z.string().trim().min(3, 'Rejection reason must be at least 3 characters').optional(),
    adminRemark: z.string().trim().optional(),
  })
  .refine((data) => !!(data.rejectionReason || data.reason), {
    message: 'Rejection reason is mandatory',
    path: ['rejectionReason'],
  });

export type RejectApplicationInput = z.infer<typeof rejectApplicationSchema>;

export const modifyAmountSchema = z.object({
  proposedAmount: z.coerce
    .number({ required_error: 'Proposed loan amount is required' })
    .positive('Proposed loan amount must be greater than zero')
    .finite('Proposed loan amount must be a valid number'),
});

export type ModifyAmountInput = z.infer<typeof modifyAmountSchema>;

export const requestDocumentsSchema = z.object({
  documentType: z.enum([
    'AADHAAR_FRONT',
    'AADHAAR_BACK',
    'PAN',
    'INCOME_PROOF',
    'BANK_STATEMENT',
    'OTHER',
  ]),
  title: z
    .string({ required_error: 'Document title is required' })
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title cannot exceed 100 characters'),
  description: z.string().trim().max(500).optional(),
});

export type RequestDocumentsInput = z.infer<typeof requestDocumentsSchema>;
