import { Request, Response, NextFunction } from 'express';
import { adminCustomerService } from '../services/adminCustomerService';

export class AdminCustomerController {
  /**
   * Admin: List customers with filters.
   */
  async listCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, kycStatus, state, city, page, limit } = req.query;
      const data = await adminCustomerService.listCustomers({
        search: search as string,
        kycStatus: kycStatus as string,
        state: state as string,
        city: city as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.status(200).json({ success: true, data: data.customers, pagination: data.pagination });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Get customer 360 profile.
   */
  async getCustomer360(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminCustomerService.getCustomer360(req.params.id as string);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const adminCustomerController = new AdminCustomerController();
