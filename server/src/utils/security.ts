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
 * Masks PAN number showing only the last 4 characters (XXXXX 1234F).
 */
export function maskPAN(pan: string): string {
  const cleaned = pan.replace(/\s+/g, '').toUpperCase();
  if (cleaned.length < 4) return 'XXXXX0000X';
  return `XXXXX${cleaned.slice(-4)}`;
}

/**
 * Securely hashes Aadhaar using HMAC-SHA256 for duplicate detection without storing plain text.
 */
export function hashAadhaar(aadhaar: string, secret: string): string {
  const cleaned = aadhaar.replace(/\D/g, '');
  return crypto.createHmac('sha256', secret).update(cleaned).digest('hex');
}

/**
 * Encrypts sensitive credentials (SMTP password, WhatsApp access token) using AES-256-GCM.
 */
export function encryptSecret(plainText: string, secretKey: string): string {
  if (!plainText) return '';
  const key = crypto.createHash('sha256').update(secretKey).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts sensitive credentials encrypted with AES-256-GCM.
 */
export function decryptSecret(cipherText: string, secretKey: string): string {
  if (!cipherText || !cipherText.includes(':')) return '';
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 3) return '';
    const [ivHex, tagHex, encryptedHex] = parts;
    const key = crypto.createHash('sha256').update(secretKey).digest();
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final('utf8');
  } catch {
    return '';
  }
}
