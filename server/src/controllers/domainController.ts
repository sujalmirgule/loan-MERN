import { Request, Response, NextFunction } from 'express';
import { prisma } from '../services/db';

export class DomainController {
  async listDomains(req: Request, res: Response, next: NextFunction) {
    try {
      const domains = await prisma.domain.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { customers: true, loans: true },
          },
        },
      });
      res.json({ success: true, data: domains });
    } catch (err) {
      next(err);
    }
  }

  async createDomain(req: Request, res: Response, next: NextFunction) {
    try {
      const { domainName, helplineNumber, contactEmail, description, isActive } = req.body;
      if (!domainName) {
        return res.status(400).json({ success: false, message: 'Domain name is required' });
      }

      const domain = await prisma.domain.create({
        data: {
          domainName: domainName.toLowerCase().trim(),
          helplineNumber: helplineNumber || '+91 8042054797',
          contactEmail: contactEmail || 'contact@loanapprove.com',
          description: description || null,
          isActive: isActive ?? true,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Domain created successfully',
        data: domain,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateDomain(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { helplineNumber, contactEmail, description, isActive } = req.body;

      const domain = await prisma.domain.update({
        where: { id },
        data: {
          ...(helplineNumber !== undefined && { helplineNumber }),
          ...(contactEmail !== undefined && { contactEmail }),
          ...(description !== undefined && { description }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      res.json({
        success: true,
        message: 'Domain updated successfully',
        data: domain,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteDomain(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await prisma.domain.delete({ where: { id } });
      res.json({ success: true, message: 'Domain deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public domain resolver for multi-tenant branding:
   * GET /api/public/domain-config?host=mudramantra.in
   */
  async getDomainConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const host = (req.query.host as string) || req.hostname || 'loanapprove.com';
      const cleanHost = host.replace(/^www\./, '').toLowerCase();

      const domain = await prisma.domain.findFirst({
        where: { domainName: cleanHost, isActive: true },
      });

      const branding = await prisma.brandingSettings.findUnique({ where: { id: 'default' } });

      res.json({
        success: true,
        data: {
          domain: domain?.domainName || cleanHost,
          appName: domain?.domainName ? domain.domainName.split('.')[0].toUpperCase() : branding?.appName || 'LoanApp',
          companyName: branding?.companyName || 'Your Financial Services',
          helplineNumber: domain?.helplineNumber || branding?.phone || '+91 1800 000 000',
          contactEmail: domain?.contactEmail || branding?.email || 'support@yourcompany.com',
          primaryColor: branding?.primaryColor || '#2563EB',
          secondaryColor: branding?.secondaryColor || '#7C3AED',
          logoUrl: branding?.logoUrl,
          faviconUrl: branding?.faviconUrl,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const domainController = new DomainController();
