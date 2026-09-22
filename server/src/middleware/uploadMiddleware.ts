import multer from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
]);

// Branding-specific mime types (logo / favicon)
const BRANDING_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/svg+xml',
  'image/webp',
]);

const BRANDING_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.svg',
  '.webp',
]);

const MAX_BRANDING_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

// Use memory storage so we can validate and stream directly to our storage provider
const memoryStorage = multer.memoryStorage();

export const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(
        new AppError(
          400,
          `Unsupported file extension "${ext}". Allowed types are: PDF, JPG, JPEG, PNG.`
        )
      );
    }

    if (!ALLOWED_MIME_TYPES.has(mime)) {
      return cb(
        new AppError(
          400,
          `Unsupported file MIME type "${mime}". Allowed types are: PDF, JPG, JPEG, PNG.`
        )
      );
    }

    cb(null, true);
  },
});

/**
 * Separate multer instance for branding assets (logo / favicon).
 * Accepts PNG, JPG, SVG, WebP — max 2 MB.
 */
export const brandingUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_BRANDING_FILE_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();

    if (!BRANDING_EXTENSIONS.has(ext)) {
      return cb(
        new AppError(
          400,
          `Unsupported file type "${ext}". Branding assets must be PNG, JPG, SVG, or WebP.`
        )
      );
    }

    if (!BRANDING_MIME_TYPES.has(mime)) {
      return cb(
        new AppError(
          400,
          `Unsupported MIME type "${mime}". Branding assets must be PNG, JPG, SVG, or WebP.`
        )
      );
    }

    cb(null, true);
  },
});

/**
 * Express middleware wrapper to catch Multer errors (e.g. LIMIT_FILE_SIZE)
 * and normalize them into consistent API error responses.
 */
export function handleUpload(fieldName: string) {
  const uploadSingle = upload.single(fieldName);

  return (req: Request, res: Response, next: NextFunction) => {
    uploadSingle(req, res, (err: unknown) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(
              new AppError(400, 'File too large. Maximum permitted file size is 10 MB.')
            );
          }
          return next(new AppError(400, `File upload error: ${err.message}`));
        }
        return next(err);
      }
      next();
    });
  };
}

/**
 * Express middleware wrapper for branding asset uploads.
 */
export function handleBrandingUpload(fieldName: string) {
  const uploadSingle = brandingUpload.single(fieldName);

  return (req: Request, res: Response, next: NextFunction) => {
    uploadSingle(req, res, (err: unknown) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(
              new AppError(400, 'File too large. Branding assets must be 2 MB or smaller.')
            );
          }
          return next(new AppError(400, `File upload error: ${err.message}`));
        }
        return next(err);
      }
      next();
    });
  };
}
