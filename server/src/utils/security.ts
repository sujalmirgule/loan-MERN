import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SALT_ROUNDS = 10;

/**
 * Hashes a plain-text password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
}

/**
 * Compares a plain-text password against a bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Normalizes email address by trimming whitespace and converting to lowercase.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Normalizes 10-digit Indian mobile number by stripping non-digit characters and leading +91 or 0.
 */
export function normalizeMobile(mobile: string): string {
  let cleaned = mobile.replace(/\D/g, '');
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
}

/**
 * Masks Aadhaar number showing only the last 4 digits (XXXX XXXX 1234).
 */
export function maskAadhaar(aadhaar: string): string {
  const cleaned = aadhaar.replace(/\D/g, '');
  if (cleaned.length < 4) return 'XXXX XXXX XXXX';
  const last4 = cleaned.slice(-4);
  return `XXXX XXXX ${last4}`;
}

/**
 * Securely hashes Aadhaar using HMAC-SHA256 for duplicate detection without storing plain text.
 */
export function hashAadhaar(aadhaar: string, secret: string): string {
  const cleaned = aadhaar.replace(/\D/g, '');
  return crypto.createHmac('sha256', secret).update(cleaned).digest('hex');
}
