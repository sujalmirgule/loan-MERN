import { z } from 'zod';

export const DOCUMENT_TYPES = [
  'AADHAAR_FRONT',
  'AADHAAR_BACK',
  'PAN',
  'INCOME_PROOF',
  'BANK_STATEMENT',
  'SALARY_SLIP',
  'ADDRESS_PROOF',
  'OTHER',
] as const;

export type DocumentType = typeof DOCUMENT_TYPES[number];

export const KYC_DOCUMENT_TYPES = ['AADHAAR_FRONT', 'AADHAAR_BACK'] as const;
export type KycDocumentType = typeof KYC_DOCUMENT_TYPES[number];

export const LOAN_DOCUMENT_TYPES = [
  'PAN',
  'INCOME_PROOF',
  'BANK_STATEMENT',
  'SALARY_SLIP',
  'ADDRESS_PROOF',
  'OTHER',
] as const;
export type LoanDocumentType = typeof LOAN_DOCUMENT_TYPES[number];

export const uploadDocumentSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES, {
    errorMap: () => ({
      message: `Invalid document type. Allowed types: ${DOCUMENT_TYPES.join(', ')}`,
    }),
  }),
  loanId: z.string().optional(),
});

export const documentReviewSchema = z
  .object({
    action: z.enum(['APPROVE', 'REJECT', 'REQUEST_REUPLOAD'], {
      required_error: 'Review action is required (APPROVE, REJECT, REQUEST_REUPLOAD)',
    }),
    reason: z.string().optional(),
  })
  .refine(
    (data) => {
      if ((data.action === 'REJECT' || data.action === 'REQUEST_REUPLOAD') && (!data.reason || data.reason.trim().length === 0)) {
        return false;
      }
      return true;
    },
    {
      message: 'A rejection reason is mandatory when rejecting or requesting re-upload.',
      path: ['reason'],
    }
  );

export const requestAdditionalDocumentSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES).default('OTHER'),
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title cannot exceed 100 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
});

export const kycDecisionSchema = z
  .object({
    status: z.enum(['APPROVED', 'VERIFIED', 'REJECTED', 'UNDER_REVIEW', 'REUPLOAD_REQUIRED'], {
      required_error: 'KYC status is required',
    }),
    reason: z.string().optional(),
  })
  .refine(
    (data) => {
      if ((data.status === 'REJECTED' || data.status === 'REUPLOAD_REQUIRED') && (!data.reason || data.reason.trim().length === 0)) {
        return false;
      }
      return true;
    },
    {
      message: 'A reason is required when marking KYC as REJECTED or requesting correction.',
      path: ['reason'],
    }
  );
