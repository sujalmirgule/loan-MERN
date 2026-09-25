import { Request, Response, NextFunction } from 'express';
import { prisma } from '../services/db';
import { auditService } from '../services/auditService';

export class PaymentConfigAdvancedController {
  /**
   * Safe Public Payment Methods Configuration (GET /api/public/payment-methods)
   * Only exposes safe non-sensitive configuration for customer view.
   */
  async getPublicPaymentMethods(req: Request, res: Response, next: NextFunction) {
    try {
      const [upi, bank] = await Promise.all([
        prisma.uPISettings.findUnique({ where: { id: 'default' } }),
        prisma.bankSettings.findUnique({ where: { id: 'default' } }),
      ]);

      const isUpiEnabled = Boolean(upi?.upiEnabled && upi?.upiId);
      const isBankEnabled = bank?.bankEnabled ?? true;
      const isMerchantVpaEnabled = Boolean(upi?.otherUpiEnabled && (upi?.otherUpiId || upi?.upiId));

      res.json({
        success: true,
        paymentMethods: {
          upi: isUpiEnabled,
          bankTransfer: isBankEnabled,
          merchantVpa: isMerchantVpaEnabled,
        },
        data: {
          paymentMethod: 'UPI',
          enabled: isUpiEnabled,
          upiVpa: upi?.upiId || '',
          merchantName: (upi as any)?.merchantName || '',
          qrCodeUrl: upi?.qrCodeUrl || null,
          supportedApps: ['Google Pay', 'PhonePe', 'Paytm', 'BHIM UPI', 'Other UPI Apps'],
        },
        upi: {
          enabled: isUpiEnabled,
          vpa: upi?.upiId || '',
          displayName: (upi as any)?.merchantName || '',
          qrCodeUrl: upi?.qrCodeUrl || null,
          merchantVpaEnabled: isMerchantVpaEnabled,
          merchantVpa: upi?.otherUpiId || upi?.upiId || '',
        },
        bank: {
          enabled: isBankEnabled,
          accountHolder: bank?.accountHolder || 'Financial Services Pvt Ltd',
          accountNumber: bank?.accountNumber || '50200084729104',
          bankName: bank?.bankName || 'HDFC Bank',
          ifsc: bank?.ifsc || 'HDFC0000060',
          branch: bank?.branch || 'Fort, Mumbai',
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // --- DYNAMIC PAYMENT METHODS ENABLE/DISABLE (Admin) ---
  async getPaymentMethods(req: Request, res: Response, next: NextFunction) {
    try {
      const [upi, bank] = await Promise.all([
        prisma.uPISettings.findUnique({ where: { id: 'default' } }),
        prisma.bankSettings.findUnique({ where: { id: 'default' } }),
      ]);

      res.json({
        success: true,
        data: {
          upi: upi?.upiEnabled ?? true,
          bankTransfer: bank?.bankEnabled ?? true,
          merchantVpa: upi?.otherUpiEnabled ?? true,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async updatePaymentMethods(req: Request, res: Response, next: NextFunction) {
    try {
      const { upi, bankTransfer, merchantVpa } = req.body;

      const upiUpdates: { upiEnabled?: boolean; otherUpiEnabled?: boolean } = {};
      if (typeof upi === 'boolean') upiUpdates.upiEnabled = upi;
      if (typeof merchantVpa === 'boolean') upiUpdates.otherUpiEnabled = merchantVpa;

      const bankUpdates: { bankEnabled?: boolean } = {};
      if (typeof bankTransfer === 'boolean') bankUpdates.bankEnabled = bankTransfer;

      const [updatedUpi, updatedBank] = await prisma.$transaction([
        prisma.uPISettings.upsert({
          where: { id: 'default' },
          update: upiUpdates,
          create: {
            id: 'default',
            upiEnabled: upi ?? true,
            upiId: 'pay@company',
            otherUpiEnabled: merchantVpa ?? true,
            otherUpiId: 'company@upi',
          },
        }),
        prisma.bankSettings.upsert({
          where: { id: 'default' },
          update: bankUpdates,
          create: {
            id: 'default',
            bankEnabled: bankTransfer ?? true,
            accountHolder: 'Financial Services Pvt Ltd',
            accountNumber: '50200084729104',
            bankName: 'HDFC Bank',
            ifsc: 'HDFC0000060',
            branch: 'Fort, Mumbai',
          },
        }),
      ]);

      await auditService.record({
        actorType: 'ADMIN',
        actorId: req.user?.id,
        actorName: req.user?.email || 'Admin',
        action: 'UPDATE_PAYMENT_METHODS',
        entity: 'PAYMENT_CONFIG',
        entityId: 'default',
        newValue: {
          upi: updatedUpi.upiEnabled,
          bankTransfer: updatedBank.bankEnabled,
          merchantVpa: updatedUpi.otherUpiEnabled,
        },
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        message: 'Payment methods configuration updated successfully',
        data: {
          upi: updatedUpi.upiEnabled,
          bankTransfer: updatedBank.bankEnabled,
          merchantVpa: updatedUpi.otherUpiEnabled,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // --- SINGLE UPI SETTINGS (Admin) ---
  async getUpiSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const upi = await prisma.uPISettings.findUnique({ where: { id: 'default' } });
      res.json({
        success: true,
        data: {
          ...upi,
          merchantName: (upi as any)?.merchantName || 'Financial Services',
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async updateUpiSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        upiEnabled,
        enabled,
        upiId,
        merchantName,
        qrCodeUrl,
        gpayEnabled,
        gpayId,
        phonepeEnabled,
        phonepeId,
        paytmEnabled,
        paytmId,
        otherUpiEnabled,
        otherUpiId,
      } = req.body;

      const effectiveUpiEnabled = upiEnabled !== undefined ? upiEnabled : enabled;

      const upi = await prisma.uPISettings.upsert({
        where: { id: 'default' },
        update: {
          ...(effectiveUpiEnabled !== undefined && { upiEnabled: effectiveUpiEnabled }),
          ...(upiId !== undefined && { upiId }),
          ...(merchantName !== undefined && { merchantName }),
          ...(qrCodeUrl !== undefined && { qrCodeUrl }),
          ...(gpayEnabled !== undefined && { gpayEnabled }),
          ...(gpayId !== undefined && { gpayId }),
          ...(phonepeEnabled !== undefined && { phonepeEnabled }),
          ...(phonepeId !== undefined && { phonepeId }),
          ...(paytmEnabled !== undefined && { paytmEnabled }),
          ...(paytmId !== undefined && { paytmId }),
          ...(otherUpiEnabled !== undefined && { otherUpiEnabled }),
          ...(otherUpiId !== undefined && { otherUpiId }),
        },
        create: {
          id: 'default',
          upiEnabled: upiEnabled ?? true,
          upiId: upiId || 'pay@company',
          merchantName: merchantName || 'Financial Services',
          qrCodeUrl: qrCodeUrl || null,
          gpayEnabled: gpayEnabled ?? true,
          gpayId: gpayId || 'company.gpay@okaxis',
          phonepeEnabled: phonepeEnabled ?? true,
          phonepeId: phonepeId || 'company@ybl',
          paytmEnabled: paytmEnabled ?? true,
          paytmId: paytmId || 'company@paytm',
          otherUpiEnabled: otherUpiEnabled ?? true,
          otherUpiId: otherUpiId || 'company@upi',
        },
      });

      res.json({ success: true, message: 'UPI settings updated successfully', data: upi });
    } catch (err) {
      next(err);
    }
  }

  // --- BANK SETTINGS ---
  async getBankSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const bank = await prisma.bankSettings.findUnique({ where: { id: 'default' } });
      res.json({ success: true, data: bank });
    } catch (err) {
      next(err);
    }
  }

  async updateBankSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const { bankEnabled, accountHolder, accountNumber, bankName, ifsc, branch } = req.body;

      const bank = await prisma.bankSettings.upsert({
        where: { id: 'default' },
        update: {
          ...(bankEnabled !== undefined && { bankEnabled }),
          ...(accountHolder !== undefined && { accountHolder }),
          ...(accountNumber !== undefined && { accountNumber }),
          ...(bankName !== undefined && { bankName }),
          ...(ifsc !== undefined && { ifsc }),
          ...(branch !== undefined && { branch }),
        },
        create: {
          id: 'default',
          bankEnabled: bankEnabled ?? true,
          accountHolder: accountHolder || 'Financial Services Pvt Ltd',
          accountNumber: accountNumber || '50200084729104',
          bankName: bankName || 'HDFC Bank',
          ifsc: ifsc || 'HDFC0000060',
          branch: branch || 'Fort, Mumbai',
        },
      });

      res.json({ success: true, message: 'Bank transfer settings updated successfully', data: bank });
    } catch (err) {
      next(err);
    }
  }

  // --- PAYMENT LINKS ---
  async listPaymentLinks(req: Request, res: Response, next: NextFunction) {
    try {
      const links = await prisma.paymentLink.findMany({
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: links });
    } catch (err) {
      next(err);
    }
  }

  async createPaymentLink(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, url, description, status } = req.body;
      if (!title || !url) {
        return res.status(400).json({ success: false, message: 'Title and URL are required' });
      }

      const link = await prisma.paymentLink.create({
        data: {
          title,
          url,
          description: description || null,
          status: status || 'ACTIVE',
        },
      });

      res.status(201).json({ success: true, message: 'Payment link created', data: link });
    } catch (err) {
      next(err);
    }
  }

  async updatePaymentLink(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { title, url, description, status } = req.body;

      const link = await prisma.paymentLink.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(url !== undefined && { url }),
          ...(description !== undefined && { description }),
          ...(status !== undefined && { status }),
        },
      });

      res.json({ success: true, message: 'Payment link updated', data: link });
    } catch (err) {
      next(err);
    }
  }

  async deletePaymentLink(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await prisma.paymentLink.delete({ where: { id } });
      res.json({ success: true, message: 'Payment link deleted' });
    } catch (err) {
      next(err);
    }
  }

  async bulkDeletePaymentLinks(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'ids array is required' });
      }

      const result = await prisma.paymentLink.deleteMany({
        where: { id: { in: ids } },
      });

      res.json({
        success: true,
        message: `Successfully deleted ${result.count} payment link(s).`,
        count: result.count,
      });
    } catch (err) {
      next(err);
    }
  }


  /**
   * Backwards compatible: Get all active payment options matching frontend contracts.
   */
  async getActivePaymentOptions(req: Request, res: Response, next: NextFunction) {
    try {
      const [upi, bank, links, config] = await Promise.all([
        prisma.uPISettings.findUnique({ where: { id: 'default' } }),
        prisma.bankSettings.findUnique({ where: { id: 'default' } }),
        prisma.paymentLink.findMany({ where: { status: 'ACTIVE' } }),
        prisma.paymentConfig.findUnique({ where: { id: 'default' } }),
      ]);

      const branding = await prisma.brandingSettings.findUnique({ where: { id: 'default' } });
      const merchantName = (upi as any)?.merchantName || branding?.companyName || 'Financial Services';

      const isUpiEnabled = upi?.upiEnabled ?? true;
      const isBankEnabled = bank?.bankEnabled ?? true;
      const isMerchantVpaEnabled = upi?.otherUpiEnabled ?? true;

      res.json({
        success: true,
        data: {
          feeAmount: config?.chargeAmount || 1250,
          feeType: config?.chargeType || 'PROCESSING_FEE',
          paymentMethods: {
            upi: isUpiEnabled,
            bankTransfer: isBankEnabled,
            merchantVpa: isMerchantVpaEnabled,
          },
          upi: {
            enabled: isUpiEnabled,
            primaryUpiId: upi?.upiId || 'pay@company',
            merchantName,
            apps: [
              { name: 'UPI', enabled: isUpiEnabled, id: upi?.upiId || 'pay@company' },
              { name: 'Google Pay', enabled: upi?.gpayEnabled ?? true, id: upi?.gpayId || 'company.gpay@okaxis' },
              { name: 'PhonePe', enabled: upi?.phonepeEnabled ?? true, id: upi?.phonepeId || 'company@ybl' },
              { name: 'Paytm', enabled: upi?.paytmEnabled ?? true, id: upi?.paytmId || 'company@paytm' },
            ].filter((a) => a.enabled),
            qrCodeUrl: upi?.qrCodeUrl || '/assets/qr-sample.png',
            merchantVpa: {
              enabled: isMerchantVpaEnabled,
              vpa: upi?.otherUpiId || upi?.upiId || 'pay@company',
            },
          },
          bank: {
            enabled: isBankEnabled,
            accountHolder: bank?.accountHolder || branding?.companyName || 'Financial Services Pvt Ltd',
            accountNumber: bank?.accountNumber || '50200084729104',
            bankName: bank?.bankName || 'HDFC Bank',
            ifsc: bank?.ifsc || 'HDFC0000060',
            branch: bank?.branch || 'Fort, Mumbai',
          },
          paymentLinks: links.map((l) => ({
            id: l.id,
            title: l.title,
            url: l.url,
            description: l.description,
          })),
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const paymentConfigAdvancedController = new PaymentConfigAdvancedController();
