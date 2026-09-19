import { Request, Response, NextFunction } from 'express';
import { settingsService } from '../services/settingsService';
import {
  updateBrandingSchema,
  updateEmailSettingsSchema,
  testEmailSchema,
  updateWhatsAppSettingsSchema,
  testWhatsAppSchema,
  updatePaymentConfigSchema,
} from '../validators/phase5Validators';
import { AppError } from '../middleware/errorHandler';

export class SettingsController {
  async getPublicConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await settingsService.getPublicConfig();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getBrandingSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await settingsService.getBrandingSettings();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async updateBrandingSettings(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Unauthorized');
      const input = updateBrandingSchema.parse(req.body);
      const data = await settingsService.updateBrandingSettings(input, req.user, req.ip);
      res.status(200).json({ success: true, message: 'Branding settings updated successfully', data });
    } catch (err) {
      next(err);
    }
  }

  async getEmailSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await settingsService.getEmailSettings();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async updateEmailSettings(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Unauthorized');
      const input = updateEmailSettingsSchema.parse(req.body);
      const data = await settingsService.updateEmailSettings(input, req.user, req.ip);
      res.status(200).json({ success: true, message: 'Email settings saved successfully', data });
    } catch (err) {
      next(err);
    }
  }

  async sendTestEmail(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Unauthorized');
      const input = testEmailSchema.parse(req.body);
      const result = await settingsService.sendTestEmail(input.toEmail, req.user, req.ip);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getWhatsAppSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await settingsService.getWhatsAppSettings();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async updateWhatsAppSettings(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Unauthorized');
      const input = updateWhatsAppSettingsSchema.parse(req.body);
      const data = await settingsService.updateWhatsAppSettings(input, req.user, req.ip);
      res.status(200).json({ success: true, message: 'WhatsApp configuration updated', data });
    } catch (err) {
      next(err);
    }
  }

  async sendTestWhatsApp(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Unauthorized');
      const input = testWhatsAppSchema.parse(req.body);
      const result = await settingsService.sendTestWhatsApp(input.toNumber, req.user, req.ip);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getPaymentConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await settingsService.getPaymentConfig();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async updatePaymentConfig(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Unauthorized');
      const input = updatePaymentConfigSchema.parse(req.body);
      const data = await settingsService.updatePaymentConfig(input, req.user, req.ip);
      res.status(200).json({ success: true, message: 'Payment configuration updated', data });
    } catch (err) {
      next(err);
    }
  }
}

export const settingsController = new SettingsController();
