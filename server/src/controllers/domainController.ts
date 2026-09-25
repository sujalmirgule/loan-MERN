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
      const domain = await prisma.domain.findUnique({
        where: { id },
        include: { _count: { select: { customers: true, loans: true } } },
      });

      if (!domain) {
        return res.status(404).json({ success: false, message: 'Domain not found' });
      }

      if (domain._count.customers > 0 || domain._count.loans > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete domain '${domain.domainName}' because it has ${domain._count.customers} associated customer(s) and ${domain._count.loans} loan(s). Please deactivate it instead.`,
        });
      }

      await prisma.domain.delete({ where: { id } });
      res.json({ success: true, message: `Domain '${domain.domainName}' deleted successfully.` });
    } catch (err) {
      next(err);
    }
  }

  async bulkDeleteDomains(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'ids array is required' });
      }

      const domains = await prisma.domain.findMany({
        where: { id: { in: ids } },
        include: { _count: { select: { customers: true, loans: true } } },
      });

      const safeToDelete = domains
        .filter((d) => d._count.customers === 0 && d._count.loans === 0)
        .map((d) => d.id);

      if (safeToDelete.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'None of the selected domains can be deleted because all have active customers or loans associated with them.',
        });
      }

      const result = await prisma.domain.deleteMany({
        where: { id: { in: safeToDelete } },
      });

      res.json({
        success: true,
        message: `Successfully deleted ${result.count} domain(s). ${domains.length - safeToDelete.length > 0 ? `${domains.length - safeToDelete.length} domain(s) skipped due to foreign key relationships.` : ''}`,
        count: result.count,
      });
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
