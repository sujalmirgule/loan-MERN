import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { config } from '../config';

export class AppError extends Error {
  public statusCode: number;
  public errors?: Array<{ field?: string; message: string }> | string;

  constructor(statusCode: number, message: string, errors?: Array<{ field?: string; message: string }> | string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle Zod Schema Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
    });
    return;
  }

  // Handle Known Application Errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors
        ? {
            errors: err.errors,
            error: typeof err.errors === 'string' ? err.errors : undefined,
            code: typeof err.errors === 'string' ? err.errors : undefined,
          }
        : {}),
    });
    return;
  }

  // Handle Unknown Internal Server Errors
  logger.error(`Unhandled exception on ${req.method} ${req.url}:`, err);

  const isProduction = config.NODE_ENV === 'production';

  res.status(500).json({
    success: false,
    message: isProduction ? 'An unexpected server error occurred' : (err instanceof Error ? err.message : 'Internal Server Error'),
    ...(!isProduction && err instanceof Error ? { stack: err.stack } : {}),
  });
}
