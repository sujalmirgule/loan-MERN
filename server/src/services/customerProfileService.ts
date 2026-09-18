import { prisma } from './db';
import { AppError } from '../middleware/errorHandler';
import { auditService } from './auditService';
import { maskAadhaar, hashAadhaar } from '../utils/security';
import { config } from '../config';
import { UpdateProfileInput } from '../validators/customerValidators';

export const customerProfileService = {
  /**
   * Retrieves the full safe profile for the authenticated customer.
   */
  async getProfile(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer || customer.isDeleted) {
      throw new AppError(404, 'Customer profile not found');
    }

    if (customer.status !== 'ACTIVE') {
      throw new AppError(403, 'Account is inactive or suspended');
    }

    return {
      id: customer.id,
      role: 'CUSTOMER',
      fullName: customer.fullName,
      mobile: customer.mobile,
      email: customer.email,
      address: customer.address,
      state: customer.state,
      city: customer.city,
      aadhaarMasked: customer.aadhaarMasked,
      monthlyIncome: customer.monthlyIncome,
      status: customer.status,
      kycStatus: customer.kycStatus,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  },

  /**
   * Updates customer profile fields. Mobile number remains immutable.
   */
  async updateProfile(
    customerId: string,
    input: UpdateProfileInput,
    ipAddress?: string
  ) {
    const existing = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!existing || existing.isDeleted) {
      throw new AppError(404, 'Customer profile not found');
    }

    if (existing.status !== 'ACTIVE') {
      throw new AppError(403, 'Account is inactive or suspended');
    }

    // Build update payload
    const updateData: {
      fullName: string;
      email: string;
      address: string;
      state: string;
      city: string;
      monthlyIncome: number;
      aadhaarMasked?: string;
      aadhaarEncrypted?: string;
    } = {
      fullName: input.fullName,
      email: input.email,
      address: input.address,
      state: input.state,
      city: input.city,
      monthlyIncome: input.monthlyIncome,
    };

    let aadhaarChanged = false;
    if (input.aadhaar) {
      const cleaned = input.aadhaar.replace(/\D/g, '');
      const newMasked = maskAadhaar(cleaned);
      const newEncrypted = hashAadhaar(cleaned, config.JWT_SECRET);

      if (newEncrypted !== existing.aadhaarEncrypted) {
        updateData.aadhaarMasked = newMasked;
        updateData.aadhaarEncrypted = newEncrypted;
        aadhaarChanged = true;
      }
    }

    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: updateData,
    });

    // Record audit log - Never log full Aadhaar numbers
    await auditService.record({
      actorType: 'CUSTOMER',
      actorId: existing.id,
      actorName: updated.fullName,
      action: 'PROFILE_UPDATED',
      entity: 'Customer',
      entityId: existing.id,
      previousValue: {
        fullName: existing.fullName,
        email: existing.email,
        address: existing.address,
        state: existing.state,
        city: existing.city,
        monthlyIncome: existing.monthlyIncome,
        aadhaarMasked: existing.aadhaarMasked,
      },
      newValue: {
        fullName: updated.fullName,
        email: updated.email,
        address: updated.address,
        state: updated.state,
        city: updated.city,
        monthlyIncome: updated.monthlyIncome,
        aadhaarMasked: updated.aadhaarMasked,
        aadhaarUpdated: aadhaarChanged,
      },
      ipAddress,
    });

    return {
      id: updated.id,
      role: 'CUSTOMER',
      fullName: updated.fullName,
      mobile: updated.mobile,
      email: updated.email,
      address: updated.address,
      state: updated.state,
      city: updated.city,
      aadhaarMasked: updated.aadhaarMasked,
      monthlyIncome: updated.monthlyIncome,
      status: updated.status,
      kycStatus: updated.kycStatus,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  },
};
