import { z } from 'zod';
import { normalizeEmail } from '../utils/security';

export const updateProfileSchema = z.object({
  fullName: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(3, 'Full name must be at least 3 characters')
    .max(100, 'Full name cannot exceed 100 characters')
    .regex(/^[a-zA-Z\s.'-]+$/, 'Name can only contain letters, spaces, dots, and hyphens'),
  fatherName: z
    .string()
    .trim()
    .max(100, 'Father / Guardian name cannot exceed 100 characters')
    .optional()
    .nullable()
    .or(z.literal('')),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address format')
    .transform(normalizeEmail),
  address: z
    .string({ required_error: 'Address is required' })
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
  monthlyIncome: z.coerce
    .number({ required_error: 'Monthly income is required' })
    .positive('Monthly income must be greater than zero')
    .min(1000, 'Monthly income must be at least ₹1,000'),
  aadhaar: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const digits = val.replace(/\D/g, '');
        return digits.length === 12;
      },
      { message: 'Aadhaar number must be exactly 12 digits' }
    ),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
