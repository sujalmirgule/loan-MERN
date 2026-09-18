export const API_ENDPOINTS = {
  HEALTH: '/health',
  AUTH: {
    CUSTOMER_REGISTER: '/auth/customer/register',
    CUSTOMER_LOGIN: '/auth/customer/login',
    ADMIN_LOGIN: '/auth/admin/login',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
  },
  CUSTOMERS: {
    PROFILE: '/customer/profile',
    UPDATE: '/customer/profile',
    LIST: '/admin/customers',
    DETAIL: (id: string) => `/admin/customers/${id}`,
  },
  CUSTOMER_DOCS: {
    LIST: '/customer/documents',
    UPLOAD: '/customer/documents',
    DETAIL: (id: string) => `/customer/documents/${id}`,
    FILE: (id: string) => `/customer/documents/${id}/file`,
    REUPLOAD: (id: string) => `/customer/documents/${id}/reupload`,
  },
  ADMIN: {
    STATUS: '/admin/status',
    KYC_LIST: '/admin/kyc',
    KYC_DETAIL: (id: string) => `/admin/kyc/${id}`,
    REVIEW_DOCUMENT: (id: string) => `/admin/kyc/documents/${id}/review`,
    DOCUMENT_FILE: (id: string) => `/admin/kyc/documents/${id}/file`,
    REQUEST_DOCUMENT: (id: string) => `/admin/kyc/${id}/request-document`,
    KYC_DECISION: (id: string) => `/admin/kyc/${id}/decision`,
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
