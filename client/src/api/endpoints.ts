export const API_ENDPOINTS = {
  HEALTH: '/health',
  AUTH: {
    CUSTOMER_LOGIN: '/auth/customer/login',
    CUSTOMER_REGISTER: '/auth/customer/register',
    ADMIN_LOGIN: '/auth/admin/login',
    VERIFY: '/auth/verify',
  },
  CUSTOMERS: {
    PROFILE: '/customers/profile',
    UPDATE: '/customers/profile',
    LIST: '/admin/customers',
    DETAIL: (id: string) => `/admin/customers/${id}`,
  },
  LOANS: {
    APPLY: '/loans/apply',
    ESTIMATE: '/loans/estimate',
    LIST: '/loans',
    DETAIL: (id: string) => `/loans/${id}`,
    CANCEL: (id: string) => `/loans/${id}/cancel`,
    ACCEPT_OFFER: (id: string) => `/loans/${id}/accept-offer`,
    REJECT_OFFER: (id: string) => `/loans/${id}/reject-offer`,
    SIGN_AGREEMENT: (id: string) => `/loans/${id}/agreement/sign`,
  },
  ADMIN_LOANS: {
    LIST: '/admin/loans',
    DETAIL: (id: string) => `/admin/loans/${id}`,
    REVIEW: (id: string) => `/admin/loans/${id}/review`,
    MODIFY_AMOUNT: (id: string) => `/admin/loans/${id}/modify-amount`,
    DISBURSE: (id: string) => `/admin/loans/${id}/disburse`,
  },
  DOCUMENTS: {
    UPLOAD: '/documents/upload',
    LIST: '/documents',
    REVIEW: (id: string) => `/admin/documents/${id}/review`,
  },
  PAYMENTS: {
    EMIS: '/payments/emis',
    PAY_EMI: '/payments/pay',
    RECEIPT: (id: string) => `/payments/${id}/receipt`,
  },
  NOTIFICATIONS: {
    LIST: '/notifications',
    MARK_READ: (id: string) => `/notifications/${id}/read`,
  },
  REPORTS: {
    EXPORT_EXCEL: '/admin/reports/export/excel',
    EXPORT_PDF: '/admin/reports/export/pdf',
  },
  BRANDING: {
    GET: '/settings/branding',
    UPDATE: '/admin/settings/branding',
  },
  AUDIT: {
    LIST: '/admin/audit-logs',
  },
  SUPPORT: {
    CREATE_TICKET: '/support/tickets',
    LIST_TICKETS: '/support/tickets',
  },
};
