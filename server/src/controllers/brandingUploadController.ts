import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AppError } from '../middleware/errorHandler';

const BRANDING_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'branding');

// Ensure the branding uploads directory exists
if (!fs.existsSync(BRANDING_UPLOAD_DIR)) {
  fs.mkdirSync(BRANDING_UPLOAD_DIR, { recursive: true });
}

function getPublicUrl(req: Request, filename: string): string {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost';
  return `${proto}://${host}/uploads/branding/${filename}`;
}

export const brandingUploadController = {
  /**
   * POST /admin/settings/branding/upload-logo
   * Accepts PNG, JPG, SVG, WebP — max 2 MB.
   * Returns { url } pointing to the publicly accessible file.
   */
  async uploadLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new AppError(400, 'No file uploaded. Please select a logo image.');
      }

      const ext = path.extname(req.file.originalname).toLowerCase();
      const timestamp = Date.now();
      const hash = crypto.randomBytes(6).toString('hex');
      const filename = `logo_${timestamp}_${hash}${ext}`;
      const filepath = path.join(BRANDING_UPLOAD_DIR, filename);

      fs.writeFileSync(filepath, req.file.buffer);

      // Cache-bust via query param timestamp
      const url = `${getPublicUrl(req, filename)}?v=${timestamp}`;

      res.status(200).json({
        success: true,
        message: 'Logo uploaded successfully.',
        data: { url },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /admin/settings/branding/upload-favicon
   * Accepts PNG, JPG, SVG, WebP — max 2 MB.
   * Returns { url } pointing to the publicly accessible file.
   */
  async uploadFavicon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new AppError(400, 'No file uploaded. Please select a favicon image.');
      }

      const ext = path.extname(req.file.originalname).toLowerCase();
      const timestamp = Date.now();
      const hash = crypto.randomBytes(6).toString('hex');
      const filename = `favicon_${timestamp}_${hash}${ext}`;
      const filepath = path.join(BRANDING_UPLOAD_DIR, filename);

      fs.writeFileSync(filepath, req.file.buffer);

      const url = `${getPublicUrl(req, filename)}?v=${timestamp}`;

      res.status(200).json({
        success: true,
        message: 'Favicon uploaded successfully.',
        data: { url },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /admin/settings/branding/upload-secondary-logo
   * Accepts PNG, JPG, SVG, WebP — max 2 MB.
   * Returns { url } pointing to the publicly accessible file.
   */
  async uploadSecondaryLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new AppError(400, 'No file uploaded. Please select a secondary logo image.');
      }

      const ext = path.extname(req.file.originalname).toLowerCase();
      const timestamp = Date.now();
      const hash = crypto.randomBytes(6).toString('hex');
      const filename = `secondary_logo_${timestamp}_${hash}${ext}`;
      const filepath = path.join(BRANDING_UPLOAD_DIR, filename);

      fs.writeFileSync(filepath, req.file.buffer);

      const url = `${getPublicUrl(req, filename)}?v=${timestamp}`;

      res.status(200).json({
        success: true,
        message: 'Secondary logo uploaded successfully.',
        data: { url },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /admin/settings/branding/upload-watermark-logo
   * Accepts PNG, JPG, SVG, WebP — max 2 MB.
   * Returns { url } pointing to the publicly accessible file.
   */
  async uploadWatermarkLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new AppError(400, 'No file uploaded. Please select a watermark logo image.');
      }

      const ext = path.extname(req.file.originalname).toLowerCase();
      const timestamp = Date.now();
      const hash = crypto.randomBytes(6).toString('hex');
      const filename = `watermark_${timestamp}_${hash}${ext}`;
      const filepath = path.join(BRANDING_UPLOAD_DIR, filename);

      fs.writeFileSync(filepath, req.file.buffer);

      const url = `${getPublicUrl(req, filename)}?v=${timestamp}`;

      res.status(200).json({
        success: true,
        message: 'Watermark logo uploaded successfully.',
        data: { url },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /admin/settings/branding/upload-approval-header
   * Accepts PNG, JPG, SVG, WebP — max 2 MB.
   * Returns { url } pointing to the publicly accessible file.
   */
  async uploadApprovalHeader(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new AppError(400, 'No file uploaded. Please select an approval letter header image.');
      }

      const ext = path.extname(req.file.originalname).toLowerCase();
      const timestamp = Date.now();
      const hash = crypto.randomBytes(6).toString('hex');
      const filename = `approval_header_${timestamp}_${hash}${ext}`;
      const filepath = path.join(BRANDING_UPLOAD_DIR, filename);

      fs.writeFileSync(filepath, req.file.buffer);

      const url = `${getPublicUrl(req, filename)}?v=${timestamp}`;

      res.status(200).json({
        success: true,
        message: 'Approval letter header uploaded successfully.',
        data: { url },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /admin/settings/upi/upload-qr or /admin/settings/branding/upload-qr
   * Accepts PNG, JPG, JPEG, WebP — max 2 MB.
   * Returns { url } pointing to the publicly accessible file.
   */
  async uploadQrCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new AppError(400, 'No file uploaded. Please select a QR code image.');
      }

      const ext = path.extname(req.file.originalname).toLowerCase();
      if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
        throw new AppError(400, 'Invalid file type. Only PNG, JPG, JPEG, and WebP are allowed for QR codes.');
      }

      const timestamp = Date.now();
      const hash = crypto.randomBytes(6).toString('hex');
      const filename = `merchant_qr_${timestamp}_${hash}${ext}`;
      const filepath = path.join(BRANDING_UPLOAD_DIR, filename);

      fs.writeFileSync(filepath, req.file.buffer);

      const url = `${getPublicUrl(req, filename)}?v=${timestamp}`;

      res.status(200).json({
        success: true,
        message: 'Merchant QR code uploaded successfully.',
        data: { url },
      });
    } catch (err) {
      next(err);
    }
  },
};



