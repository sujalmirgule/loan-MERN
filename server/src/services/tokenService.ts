import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';

export type UserRole = 'CUSTOMER' | 'ADMIN';

export interface TokenPayload {
  sub: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Issues a signed JWT access token containing only minimal non-sensitive claims (sub and role).
 */
export function generateAuthToken(userId: string, role: UserRole): string {
  const payload = {
    sub: userId,
    role,
  };

  const options: SignOptions = {
    expiresIn: (config.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
    issuer: 'loan-approve-platform',
  };

  return jwt.sign(payload, config.JWT_SECRET, options);
}

/**
 * Validates token signature and expiration, returning parsed payload.
 */
export function verifyAuthToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET, {
      issuer: 'loan-approve-platform',
    }) as TokenPayload;

    if (!decoded.sub || !decoded.role) {
      throw new AppError(401, 'Invalid authentication token claims');
    }

    return decoded;
  } catch (err: unknown) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError(401, 'Authentication token has expired. Please sign in again.');
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new AppError(401, 'Invalid authentication token');
    }
    throw err;
  }
}
