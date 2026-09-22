import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();
const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000/api';

async function request(path: string, options: { method?: string; body?: any; token?: string } = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  return {
    status: res.status,
    data,
  };
}

async function runRbacTests() {
  console.log('===============================================================');
  console.log('🔍 RUNNING GRANULAR ADMIN RBAC & PERMISSION SUITE');
  console.log('===============================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${detail ? `-> ${detail}` : ''}`);
      failed++;
    }
  }

  try {
    // Clean up any previous test admin users and ensure default admin is the only SUPER_ADMIN
    await prisma.adminUser.deleteMany({
      where: {
        email: {
          not: 'admin@loanapprove.com',
        },
      },
    });

    await prisma.adminUser.updateMany({
      where: { email: 'admin@loanapprove.com' },
      data: { role: 'SUPER_ADMIN', isActive: true },
    });

    const allAdmins = await prisma.adminUser.findMany();
    console.log('Database Admin Users before test run:', JSON.stringify(allAdmins));

    // 1. Authenticate as default Super Admin
    console.log('\n--- Test Phase 1: Super Admin Authentication ---');
    const superAdminLoginRes = await request('/auth/admin/login', {
      method: 'POST',
      body: {
        email: 'admin@loanapprove.com',
        password: process.env.SUPER_ADMIN_PASSWORD || 'Admin@123',
      },
    });

    console.log('Login Response:', JSON.stringify(superAdminLoginRes));

    const superAdminToken = superAdminLoginRes.data?.data?.token || superAdminLoginRes.data?.token;
    const superAdminUser = superAdminLoginRes.data?.data?.user || superAdminLoginRes.data?.user;

    assert(!!superAdminToken, 'Super Admin login successful and returned JWT');
    assert(
      superAdminUser?.adminRole === 'SUPER_ADMIN' || superAdminUser?.role === 'SUPER_ADMIN',
      'Super Admin user profile has SUPER_ADMIN role',
      `Got adminRole: ${superAdminUser?.adminRole}, role: ${superAdminUser?.role}`
    );

    // 2. Create Operational Admin (Customers & Loan Approvals only)
    console.log('\n--- Test Phase 2: Create Granular Operational Admin ---');
    const opsAdminPermissions = [
      'customers.view',
      'customers.create',
      'customers.edit',
      'applications.view',
      'applications.review',
      'applications.approve',
    ];

    const createOpsRes = await request('/admin/users', {
      method: 'POST',
      token: superAdminToken,
      body: {
        fullName: 'Ops Admin Tester',
        email: 'ops_admin_test@loanapprove.com',
        password: 'Password@123',
        role: 'ADMIN',
        permissions: opsAdminPermissions,
      },
    });

    assert(createOpsRes.status === 201, 'Super Admin created Ops Admin with custom permissions');

    // 3. Login as Operational Admin
    console.log('\n--- Test Phase 3: Operational Admin Login & Permissions Enforcement ---');
    const opsLoginRes = await request('/auth/admin/login', {
      method: 'POST',
      body: {
        email: 'ops_admin_test@loanapprove.com',
        password: 'Password@123',
      },
    });
    const opsToken = opsLoginRes.data?.data?.token || opsLoginRes.data?.token;
    const opsUser = opsLoginRes.data?.data?.user || opsLoginRes.data?.user;

    assert(!!opsToken, 'Ops Admin login successful');
    assert(
      Array.isArray(opsUser?.permissions) && opsUser.permissions.includes('customers.view'),
      'Ops Admin returned permissions array containing customers.view'
    );

    // 4. Ops Admin Access Allowed Endpoint
    const opsCustRes = await request('/admin/customers', { token: opsToken });
    assert(opsCustRes.status === 200, 'Ops Admin can access GET /admin/customers (permission: customers.view granted)');

    // 5. Ops Admin Blocked on Payment Verification (Missing payments.verify)
    const opsPayVerifyRes = await request('/admin/payments/fake-payment-id/verify', {
      method: 'PATCH',
      token: opsToken,
    });
    assert(
      opsPayVerifyRes.status === 403,
      'Ops Admin blocked with 403 Forbidden on PATCH /admin/payments/:id/verify',
      `Got status ${opsPayVerifyRes.status}: ${JSON.stringify(opsPayVerifyRes.data)}`
    );

    // 6. Ops Admin Blocked on Admin User Management (Missing admin_users.create)
    const opsCreateUserRes = await request('/admin/users', {
      method: 'POST',
      token: opsToken,
      body: {
        fullName: 'Hacker User',
        email: 'hacker@loanapprove.com',
        password: 'Password@123',
        role: 'STAFF',
      },
    });
    assert(
      opsCreateUserRes.status === 403,
      'Ops Admin blocked with 403 Forbidden on POST /admin/users',
      `Got status ${opsCreateUserRes.status}: ${JSON.stringify(opsCreateUserRes.data)}`
    );

    // 7. Ops Admin Blocked on Branding Update (Missing branding.manage)
    const opsBrandingRes = await request('/admin/settings/branding', {
      method: 'PUT',
      token: opsToken,
      body: {
        brandName: 'Malicious Brand',
      },
    });
    assert(
      opsBrandingRes.status === 403,
      'Ops Admin blocked with 403 Forbidden on PUT /admin/settings/branding',
      `Got status ${opsBrandingRes.status}: ${JSON.stringify(opsBrandingRes.data)}`
    );

    // 8. Create Payment Staff (Payments & Charges only)
    console.log('\n--- Test Phase 4: Create Granular Payment Staff ---');
    const staffPermissions = ['payments.view', 'payments.verify', 'charges.view'];

    const createStaffRes = await request('/admin/users', {
      method: 'POST',
      token: superAdminToken,
      body: {
        fullName: 'Payment Staff Tester',
        email: 'payment_staff_test@loanapprove.com',
        password: 'Password@123',
        role: 'STAFF',
        permissions: staffPermissions,
      },
    });

    assert(createStaffRes.status === 201, 'Super Admin created Payment Staff');
    const staffUserRecord = createStaffRes.data?.data;

    // 9. Login as Payment Staff
    console.log('\n--- Test Phase 5: Payment Staff Enforcement ---');
    const staffLoginRes = await request('/auth/admin/login', {
      method: 'POST',
      body: {
        email: 'payment_staff_test@loanapprove.com',
        password: 'Password@123',
      },
    });
    const staffToken = staffLoginRes.data?.data?.token || staffLoginRes.data?.token;

    // 10. Staff Access Allowed Endpoint
    const staffPaymentsRes = await request('/admin/payments', { token: staffToken });
    assert(staffPaymentsRes.status === 200, 'Staff can access GET /admin/payments (permission: payments.view granted)');

    // 11. Staff Blocked on Customer Directory (Missing customers.view)
    const staffCustRes = await request('/admin/customers', { token: staffToken });
    assert(
      staffCustRes.status === 403,
      'Staff blocked with 403 Forbidden on GET /admin/customers',
      `Got status ${staffCustRes.status}: ${JSON.stringify(staffCustRes.data)}`
    );

    // 12. Staff Blocked on Loan Approval (Missing applications.approve)
    const staffApproveRes = await request('/admin/loan-applications/fake-app-id/approve', {
      method: 'POST',
      token: staffToken,
    });
    assert(
      staffApproveRes.status === 403,
      'Staff blocked with 403 Forbidden on POST /admin/loan-applications/:id/approve',
      `Got status ${staffApproveRes.status}: ${JSON.stringify(staffApproveRes.data)}`
    );

    // 13. Dynamic Permission Mutation: Super Admin grants customers.view to Staff
    console.log('\n--- Test Phase 6: Dynamic Permission Propagation Without Re-login ---');
    const updateStaffRes = await request(`/admin/users/${staffUserRecord.id}`, {
      method: 'PUT',
      token: superAdminToken,
      body: {
        permissions: ['payments.view', 'payments.verify', 'charges.view', 'customers.view'],
      },
    });
    assert(updateStaffRes.status === 200, 'Super Admin updated staff permissions dynamically in DB');

    // Immediately call GET /admin/customers with existing staff token
    const staffCustAfterRes = await request('/admin/customers', { token: staffToken });
    assert(
      staffCustAfterRes.status === 200,
      'Staff immediately gains access to GET /admin/customers on next request without re-authenticating!'
    );

    // 14. Super Admin Disables Staff Account
    console.log('\n--- Test Phase 7: Account Disable & Super Admin Safeguards ---');
    const disableStaffRes = await request(`/admin/users/${staffUserRecord.id}`, {
      method: 'PUT',
      token: superAdminToken,
      body: {
        isActive: false,
      },
    });
    assert(disableStaffRes.status === 200, 'Super Admin disabled staff account');

    // Disabled staff immediately blocked
    const disabledStaffReq = await request('/admin/payments', { token: staffToken });
    assert(
      disabledStaffReq.status === 401 || disabledStaffReq.status === 403,
      'Disabled staff is immediately blocked on next API request (Status: ' + disabledStaffReq.status + ')'
    );

    // 15. Safeguard: Disabling last active super admin is blocked
    const disableSuperAdminRes = await request(`/admin/users/${superAdminUser.id}`, {
      method: 'PUT',
      token: superAdminToken,
      body: {
        isActive: false,
      },
    });
    assert(
      disableSuperAdminRes.status === 400 || disableSuperAdminRes.status === 403,
      'Super Admin safeguard blocked disabling the last active Super Admin',
      `Got status ${disableSuperAdminRes.status}: ${JSON.stringify(disableSuperAdminRes.data)}`
    );

    // Cleanup
    await prisma.adminUser.deleteMany({
      where: {
        email: {
          in: ['ops_admin_test@loanapprove.com', 'payment_staff_test@loanapprove.com'],
        },
      },
    });

    console.log('\n===============================================================');
    console.log(`🏁 RBAC TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error('💥 Test suite crashed with error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runRbacTests();
