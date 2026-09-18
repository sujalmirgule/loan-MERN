import { z } from 'zod';
import { normalizeMobile } from '../utils/security';

export const customerRegisterSchema = z
  .object({
    fullName: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name cannot exceed 100 characters'),
    mobile: z
      .string({ required_error: 'Mobile number is required' })
      .trim()
      .transform((val) => normalizeMobile(val))
      .refine((val) => /^[6-9]\d{9}$/.test(val), {
        message: 'Mobile number must be a valid 10-digit Indian mobile number',
      }),
    email: z
      .string({ required_error: 'Email address is required' })
      .trim()
      .toLowerCase()
      .email('Invalid email address format'),
    address: z
      .string({ required_error: 'Residential address is required' })
      .trim()
      .min(5, 'Address must be at least 5 characters')
      .max(255, 'Address cannot exceed 255 characters'),
    state: z
      .string({ required_error: 'State is required' })
      .trim()
      .min(2, 'Please select a valid state'),
    city: z
      .string({ required_error: 'City is required' })
      .trim()
      .min(2, 'Please select a valid city'),
    aadhaar: z
      .string({ required_error: 'Aadhaar number is required' })
      .trim()
      .transform((val) => val.replace(/\D/g, ''))
      .refine((val) => /^\d{12}$/.test(val), {
        message: 'Aadhaar number must be exactly 12 digits',
      }),
    monthlyIncome: z
      .number({ required_error: 'Monthly income is required', invalid_type_error: 'Monthly income must be a number' })
      .positive('Monthly income must be greater than zero')
      .max(100000000, 'Monthly income exceeds allowable limit'),
  })
  .strict();

export const customerLoginSchema = z
  .object({
    mobile: z
      .string({ required_error: 'Mobile number is required' })
      .trim()
      .transform((val) => normalizeMobile(val))
      .refine((val) => /^[6-9]\d{9}$/.test(val), {
        message: 'Mobile number must be a valid 10-digit Indian mobile number',
      }),
  })
  .strict();

export const adminLoginSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Invalid email format'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(6, 'Password must be at least 6 characters'),
  })
  .strict();


export type CustomerRegisterInput = z.infer<typeof customerRegisterSchema>;
export type CustomerLoginInput = z.infer<typeof customerLoginSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
