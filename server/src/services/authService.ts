import { prisma } from './db';
import { AppError } from '../middleware/errorHandler';
import { CustomerRegisterInput } from '../validators/authValidators';
import { maskAadhaar, hashAadhaar, verifyPassword } from '../utils/security';
import { generateAuthToken, UserRole } from './tokenService';
import { auditService } from './auditService';
import { config } from '../config';

export interface SafeCustomerUser {
  id: string;
  role: 'CUSTOMER';
  fullName: string;
  mobile: string;
  email: string;
  address: string;
  state: string;
  city: string;
  aadhaarMasked: string;
  monthlyIncome: number;
  status: string;
  createdAt: Date;
}

export interface SafeAdminUser {
  id: string;
  role: 'ADMIN';
  fullName: string;
  email: string;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export const authService = {
  /**
   * Registers a new customer account, validates mobile uniqueness, and returns safe profile with JWT token.
   */
  async registerCustomer(input: CustomerRegisterInput, ipAddress?: string) {
    // 1. Check duplicate mobile number
    const existingCustomer = await prisma.customer.findUnique({
      where: { mobile: input.mobile },
    });

    if (existingCustomer) {
      if (existingCustomer.isDeleted) {
        throw new AppError(409, 'This mobile number was associated with an archived account. Please contact support.');
      }
      throw new AppError(409, 'Mobile number already registered. Please sign in instead.');
    }

    // 2. Prepare masked and encrypted Aadhaar
    const aadhaarMasked = maskAadhaar(input.aadhaar);
    const aadhaarEncrypted = hashAadhaar(input.aadhaar, config.JWT_SECRET);

    // 3. Create customer record
    const customer = await prisma.customer.create({
      data: {
        fullName: input.fullName,
        mobile: input.mobile,
        email: input.email,
        address: input.address,
        state: input.state,
        city: input.city,
        aadhaarEncrypted,
        aadhaarMasked,
        monthlyIncome: input.monthlyIncome,
        status: 'ACTIVE',
        isDeleted: false,
      },
    });

    // 4. Record audit event
    await auditService.record({
      actorType: 'CUSTOMER',
      actorId: customer.id,
      actorName: customer.fullName,
      action: 'CUSTOMER_REGISTER',
      entity: 'Customer',
      entityId: customer.id,
      newValue: {
        id: customer.id,
        fullName: customer.fullName,
        mobile: customer.mobile,
        email: customer.email,
        state: customer.state,
        city: customer.city,
      },
      ipAddress,
    });

    // 5. Generate authentication token
    const token = generateAuthToken(customer.id, 'CUSTOMER');

    const safeProfile: SafeCustomerUser = {
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
      createdAt: customer.createdAt,
    };

    return {
      token,
      user: safeProfile,
    };
  },

  /**
   * Passwordless customer login via verified mobile number.
   */
  async loginCustomer(mobile: string, ipAddress?: string) {
    const customer = await prisma.customer.findUnique({
      where: { mobile },
    });

    if (!customer || customer.isDeleted) {
      throw new AppError(404, 'Customer account not found with this mobile number. Please register first.');
    }

    if (customer.status !== 'ACTIVE') {
      throw new AppError(403, 'Your account has been deactivated or suspended. Please contact customer support.');
    }

    // Record audit event
    await auditService.record({
      actorType: 'CUSTOMER',
      actorId: customer.id,
      actorName: customer.fullName,
      action: 'CUSTOMER_LOGIN',
      entity: 'Customer',
      entityId: customer.id,
      ipAddress,
    });

    const token = generateAuthToken(customer.id, 'CUSTOMER');

    const safeProfile: SafeCustomerUser = {
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
      createdAt: customer.createdAt,
    };

    return {
      token,
      user: safeProfile,
    };
  },

  /**
   * Administrator email + password login with bcrypt hash verification.
   */
  async loginAdmin(email: string, password: string, ipAddress?: string) {
    const admin = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (!admin || !admin.isActive) {
      await auditService.record({
        actorType: 'SYSTEM',
        actorName: 'Unknown / Admin Candidate',
        action: 'ADMIN_LOGIN_FAILED',
        entity: 'AdminUser',
        entityId: email,
        ipAddress,
      });
      throw new AppError(401, 'Invalid email or password.');
    }

    const isMatch = await verifyPassword(password, admin.passwordHash);

    if (!isMatch) {
      await auditService.record({
        actorType: 'ADMIN',
        actorId: admin.id,
        actorName: admin.fullName,
        action: 'ADMIN_LOGIN_FAILED',
        entity: 'AdminUser',
        entityId: admin.id,
        ipAddress,
      });
      throw new AppError(401, 'Invalid email or password.');
    }

    // Update last login timestamp
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    await auditService.record({
      actorType: 'ADMIN',
      actorId: admin.id,
      actorName: admin.fullName,
      action: 'ADMIN_LOGIN_SUCCESS',
      entity: 'AdminUser',
      entityId: admin.id,
      ipAddress,
    });

    const token = generateAuthToken(admin.id, 'ADMIN');

    const safeProfile: SafeAdminUser = {
      id: admin.id,
      role: 'ADMIN',
      fullName: admin.fullName,
      email: admin.email,
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
    };

    return {
      token,
      user: safeProfile,
    };
  },

  /**
   * Retrieves safe profile for the currently authenticated user session.
   */
  async getCurrentUser(userId: string, role: UserRole) {
    if (role === 'CUSTOMER') {
      const customer = await prisma.customer.findUnique({
        where: { id: userId },
      });

      if (!customer || customer.isDeleted) {
        throw new AppError(401, 'Customer account does not exist or has been deleted');
      }

      if (customer.status !== 'ACTIVE') {
        throw new AppError(403, 'Account is suspended or deactivated');
      }

      const safeProfile: SafeCustomerUser = {
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
        createdAt: customer.createdAt,
      };

      return safeProfile;
    }

    if (role === 'ADMIN') {
      const admin = await prisma.adminUser.findUnique({
        where: { id: userId },
      });

      if (!admin || !admin.isActive) {
        throw new AppError(401, 'Administrator account does not exist or has been deactivated');
      }

      const safeProfile: SafeAdminUser = {
        id: admin.id,
        role: 'ADMIN',
        fullName: admin.fullName,
        email: admin.email,
        lastLoginAt: admin.lastLoginAt,
        createdAt: admin.createdAt,
      };

      return safeProfile;
    }

    throw new AppError(403, 'Unrecognized user role');
  },
};
