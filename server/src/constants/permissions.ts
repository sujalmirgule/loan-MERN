/**
 * Granular RBAC Permissions Catalog and Default Role Presets
 * Format: MODULE.ACTION
 */

export interface PermissionDefinition {
  key: string;
  module: string;
  action: string;
  label: string;
  description: string;
  isHighPrivilege?: boolean;
}

export interface PermissionModuleGroup {
  moduleId: string;
  moduleLabel: string;
  description: string;
  permissions: PermissionDefinition[];
}

export const PERMISSIONS: PermissionDefinition[] = [
  // --- 1. CUSTOMERS ---
  {
    key: 'customers.view',
    module: 'customers',
    action: 'view',
    label: 'View Customers',
    description: 'View customer directory, profiles, search, and Customer 360 overview',
  },
  {
    key: 'customers.create',
    module: 'customers',
    action: 'create',
    label: 'Add Customer',
    description: 'Manually register and onboard new customer records',
  },
  {
    key: 'customers.edit',
    module: 'customers',
    action: 'edit',
    label: 'Edit Customer',
    description: 'Update customer personal, contact, and address details',
  },
  {
    key: 'customers.delete',
    module: 'customers',
    action: 'delete',
    label: 'Archive / Delete Customer',
    description: 'Suspend, archive, or remove customer accounts',
    isHighPrivilege: true,
  },

  // --- 2. LOAN APPLICATIONS ---
  {
    key: 'applications.view',
    module: 'applications',
    action: 'view',
    label: 'View Applications',
    description: 'Inspect loan applications list, details, status, and timeline',
  },
  {
    key: 'applications.review',
    module: 'applications',
    action: 'review',
    label: 'Review / Underwrite',
    description: 'Initiate application review, put on hold, request documents, or propose counter-offers',
  },
  {
    key: 'applications.approve',
    module: 'applications',
    action: 'approve',
    label: 'Approve Loans',
    description: 'Sanction and grant final approval for borrower loan requests',
    isHighPrivilege: true,
  },
  {
    key: 'applications.reject',
    module: 'applications',
    action: 'reject',
    label: 'Reject Loans',
    description: 'Decline loan applications with regulatory rejection reasons',
    isHighPrivilege: true,
  },

  // --- 3. KYC VERIFICATION ---
  {
    key: 'kyc.view',
    module: 'kyc',
    action: 'view',
    label: 'View KYC',
    description: 'Inspect borrower KYC status, Aadhaar, PAN, and identity details',
  },
  {
    key: 'kyc.verify',
    module: 'kyc',
    action: 'verify',
    label: 'Verify KYC',
    description: 'Approve KYC status and verify submitted identity credentials',
  },
  {
    key: 'kyc.reject',
    module: 'kyc',
    action: 'reject',
    label: 'Reject KYC',
    description: 'Mark KYC as rejected with specific compliance remarks',
  },
  {
    key: 'kyc.correction',
    module: 'kyc',
    action: 'correction',
    label: 'Request KYC Correction',
    description: 'Request borrower to re-upload clear Aadhaar/PAN documents',
  },

  // --- 4. DOCUMENTS ---
  {
    key: 'documents.view',
    module: 'documents',
    action: 'view',
    label: 'View Documents',
    description: 'Browse customer document list and preview uploaded files',
  },
  {
    key: 'documents.download',
    module: 'documents',
    action: 'download',
    label: 'Download Documents',
    description: 'Download original document files and complete Customer ZIP dossiers',
  },
  {
    key: 'documents.verify',
    module: 'documents',
    action: 'verify',
    label: 'Verify Documents',
    description: 'Mark uploaded verification documents as approved',
  },
  {
    key: 'documents.reject',
    module: 'documents',
    action: 'reject',
    label: 'Reject Documents',
    description: 'Reject unreadable/invalid documents and request corrections',
  },

  // --- 5. PAYMENTS & DISBURSEMENTS ---
  {
    key: 'payments.view',
    module: 'payments',
    action: 'view',
    label: 'View Payments',
    description: 'View customer payments, pending UTR transactions, and receipts',
  },
  {
    key: 'payments.verify',
    module: 'payments',
    action: 'verify',
    label: 'Verify Payments',
    description: 'Confirm UTRs and mark payments as SUCCESS/PAID',
    isHighPrivilege: true,
  },
  {
    key: 'payments.reject',
    module: 'payments',
    action: 'reject',
    label: 'Reject Payments',
    description: 'Decline invalid payment submissions and mark as FAILED',
    isHighPrivilege: true,
  },

  // --- 6. CHARGES & SPECIFIC FEES ---
  {
    key: 'charges.view',
    module: 'charges',
    action: 'view',
    label: 'View Charges',
    description: 'Inspect global charge catalog, application fee records, and invoices',
  },
  {
    key: 'charges.create',
    module: 'charges',
    action: 'create',
    label: 'Issue Charges',
    description: 'Create new fee items and issue custom charges to borrower applications',
  },
  {
    key: 'charges.edit',
    module: 'charges',
    action: 'edit',
    label: 'Edit Charges',
    description: 'Modify fee amounts, due dates, remarks, or cancel pending charges',
    isHighPrivilege: true,
  },
  {
    key: 'charges.send',
    module: 'charges',
    action: 'send',
    label: 'Send Reminders / Invoices',
    description: 'Dispatch fee notifications, payment reminders, and GST invoices to borrowers',
  },

  // --- 7. UPI & BANK SETTINGS ---
  {
    key: 'upi.view',
    module: 'upi',
    action: 'view',
    label: 'View UPI & Bank Details',
    description: 'View configured receiving bank accounts, merchant UPI IDs, and payment links',
  },
  {
    key: 'upi.manage',
    module: 'upi',
    action: 'manage',
    label: 'Manage UPI & Bank Accounts',
    description: 'Configure corporate bank accounts, UPI IDs, QR codes, and payment links',
    isHighPrivilege: true,
  },

  // --- 8. COMMUNICATION ---
  {
    key: 'communication.whatsapp',
    module: 'communication',
    action: 'whatsapp',
    label: 'Send WhatsApp',
    description: 'Dispatch direct and bulk WhatsApp alerts to loan borrowers',
  },
  {
    key: 'communication.email',
    module: 'communication',
    action: 'email',
    label: 'Send Email',
    description: 'Send custom emails, tax invoices, and sanction letters',
  },
  {
    key: 'communication.history',
    module: 'communication',
    action: 'history',
    label: 'View Communication History',
    description: 'Inspect all sent WhatsApp and Email communication audit logs',
  },

  // --- 9. MULTI-TENANT DOMAINS ---
  {
    key: 'domains.view',
    module: 'domains',
    action: 'view',
    label: 'View Domains',
    description: 'View connected frontend domains, host mappings, and registration metrics',
  },
  {
    key: 'domains.manage',
    module: 'domains',
    action: 'manage',
    label: 'Manage Domains',
    description: 'Add new websites, configure tenant helpline numbers, and update domain configs',
    isHighPrivilege: true,
  },

  // --- 10. WEBSITE BRANDING ---
  {
    key: 'branding.view',
    module: 'branding',
    action: 'view',
    label: 'View Branding',
    description: 'View active brand settings, color palettes, and public metadata',
  },
  {
    key: 'branding.manage',
    module: 'branding',
    action: 'manage',
    label: 'Manage Branding & Theme',
    description: 'Upload logos, update primary/secondary colors, change legal company entity',
    isHighPrivilege: true,
  },

  // --- 11. REPORTS & ACTIVITY LOGS ---
  {
    key: 'reports.view',
    module: 'reports',
    action: 'view',
    label: 'View Reports',
    description: 'Access financial summaries, conversion metrics, and disbursement dashboards',
  },
  {
    key: 'reports.export',
    module: 'reports',
    action: 'export',
    label: 'Export Reports',
    description: 'Export customer datasets and financial reports to Excel/CSV',
  },
  {
    key: 'activity_logs.view',
    module: 'activity_logs',
    action: 'view',
    label: 'View Audit Logs',
    description: 'Inspect system-wide security, authentication, and operational audit trail',
  },

  // --- 12. ADMIN USER MANAGEMENT ---
  {
    key: 'admin_users.view',
    module: 'admin_users',
    action: 'view',
    label: 'View Admin Users',
    description: 'Browse staff and administrator accounts, roles, and status',
  },
  {
    key: 'admin_users.create',
    module: 'admin_users',
    action: 'create',
    label: 'Create Admin User',
    description: 'Create new staff or administrator accounts with custom permissions',
    isHighPrivilege: true,
  },
  {
    key: 'admin_users.edit',
    module: 'admin_users',
    action: 'edit',
    label: 'Edit Admin User & Permissions',
    description: 'Modify admin permissions, roles, and password credentials',
    isHighPrivilege: true,
  },
  {
    key: 'admin_users.disable',
    module: 'admin_users',
    action: 'disable',
    label: 'Disable / Enable Admin',
    description: 'Suspend or restore administrator console login access',
    isHighPrivilege: true,
  },

  // --- 13. SYSTEM SETTINGS ---
  {
    key: 'settings.view',
    module: 'settings',
    action: 'view',
    label: 'View System Settings',
    description: 'Inspect email SMTP, WhatsApp API, and automated communication triggers',
  },
  {
    key: 'settings.manage',
    module: 'settings',
    action: 'manage',
    label: 'Manage System Settings',
    description: 'Configure SMTP credentials, WhatsApp API tokens, and platform settings',
    isHighPrivilege: true,
  },
];

export const PERMISSION_GROUPS: PermissionModuleGroup[] = [
  {
    moduleId: 'customers',
    moduleLabel: 'Customers',
    description: 'Customer directory, 360 view, and profile management',
    permissions: PERMISSIONS.filter((p) => p.module === 'customers'),
  },
  {
    moduleId: 'applications',
    moduleLabel: 'Loan Applications',
    description: 'Loan origination, underwriting, review, approvals, and rejections',
    permissions: PERMISSIONS.filter((p) => p.module === 'applications'),
  },
  {
    moduleId: 'kyc',
    moduleLabel: 'KYC Verification',
    description: 'Identity compliance, Aadhaar/PAN validation, and override decisions',
    permissions: PERMISSIONS.filter((p) => p.module === 'kyc'),
  },
  {
    moduleId: 'documents',
    moduleLabel: 'Document Management',
    description: 'Borrower document vault, downloads, verification, and rejection',
    permissions: PERMISSIONS.filter((p) => p.module === 'documents'),
  },
  {
    moduleId: 'payments',
    moduleLabel: 'Payments & Verification',
    description: 'Payment records, UTR verification, and disbursements',
    permissions: PERMISSIONS.filter((p) => p.module === 'payments'),
  },
  {
    moduleId: 'charges',
    moduleLabel: 'Charges & Fees',
    description: 'Application fees, custom charge issuance, and reminders',
    permissions: PERMISSIONS.filter((p) => p.module === 'charges'),
  },
  {
    moduleId: 'upi',
    moduleLabel: 'UPI & Bank Accounts',
    description: 'Receiving bank accounts, merchant QR codes, and payment links',
    permissions: PERMISSIONS.filter((p) => p.module === 'upi'),
  },
  {
    moduleId: 'communication',
    moduleLabel: 'Customer Communication',
    description: 'Direct/bulk WhatsApp, custom emails, and history',
    permissions: PERMISSIONS.filter((p) => p.module === 'communication'),
  },
  {
    moduleId: 'domains',
    moduleLabel: 'Websites & Multi-Domain',
    description: 'Frontend websites, domain routing, and tenant overrides',
    permissions: PERMISSIONS.filter((p) => p.module === 'domains'),
  },
  {
    moduleId: 'branding',
    moduleLabel: 'Website Branding & Theme',
    description: 'White-label identity, logo upload, favicon, and dynamic CSS palette',
    permissions: PERMISSIONS.filter((p) => p.module === 'branding'),
  },
  {
    moduleId: 'reports',
    moduleLabel: 'Reports & Analytics',
    description: 'Operational summary reports and Excel/CSV dataset exports',
    permissions: PERMISSIONS.filter((p) => p.module === 'reports'),
  },
  {
    moduleId: 'activity_logs',
    moduleLabel: 'Audit Logs',
    description: 'System security audit trail and administrator activity timeline',
    permissions: PERMISSIONS.filter((p) => p.module === 'activity_logs'),
  },
  {
    moduleId: 'admin_users',
    moduleLabel: 'Admin Users & RBAC',
    description: 'Team accounts, granular permission matrices, and role governance',
    permissions: PERMISSIONS.filter((p) => p.module === 'admin_users'),
  },
  {
    moduleId: 'settings',
    moduleLabel: 'System Settings',
    description: 'SMTP mailer, WhatsApp gateways, and automation triggers',
    permissions: PERMISSIONS.filter((p) => p.module === 'settings'),
  },
];

export const ALL_PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

/**
 * Sensible default permission presets for each role
 */
export const ROLE_PRESETS: Record<'SUPER_ADMIN' | 'ADMIN' | 'STAFF', string[]> = {
  SUPER_ADMIN: [...ALL_PERMISSION_KEYS],
  ADMIN: [
    'customers.view',
    'customers.create',
    'customers.edit',
    'applications.view',
    'applications.review',
    'applications.approve',
    'applications.reject',
    'kyc.view',
    'kyc.verify',
    'kyc.reject',
    'kyc.correction',
    'documents.view',
    'documents.download',
    'documents.verify',
    'documents.reject',
    'payments.view',
    'charges.view',
    'charges.create',
    'charges.edit',
    'charges.send',
    'upi.view',
    'communication.whatsapp',
    'communication.email',
    'communication.history',
    'domains.view',
    'branding.view',
    'reports.view',
    'reports.export',
    'activity_logs.view',
    'settings.view',
  ],
  STAFF: [
    'customers.view',
    'applications.view',
    'applications.review',
    'kyc.view',
    'documents.view',
    'documents.download',
    'payments.view',
    'charges.view',
    'communication.history',
    'reports.view',
  ],
};
