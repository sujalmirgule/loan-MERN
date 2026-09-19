# LOAN APPROVE — PHASE 5: COMPLETE CUSTOMER + ADMIN DEMO-READY IMPLEMENTATION PLAN

## 1. Current Architecture
- **Server**: Node.js, Express, TypeScript, SQLite with WAL mode, Prisma ORM.
- **Client**: React 18, Vite 6, TypeScript 5.7, Tailwind CSS 3.4, Lucide React, TanStack Query v5, React Router v7, React Hook Form, Zod, Recharts 2.15.
- **Security**: Helmet, strict CORS, express-rate-limit, Bcrypt hashing, HMAC-SHA256 Aadhaar deduplication, AES/crypto encryption, JWT Bearer authentication, Role guards (`requireCustomer`, `requireAdmin`), strict IDOR validation, anti-tampering guards.
- **Audit**: Immutable append-only `AuditLog` model recording every state change and critical action.

---

## 2. Existing Functionality Discovered (Phases 1–4)
- **Auth**: Customer registration (with Aadhaar HMAC deduplication), passwordless customer login, admin login with email/password, current user session check (`/api/auth/me`), logout.
- **Customer Profile**: View profile, edit profile (mobile read-only, Aadhaar masked).
- **Documents & KYC**: Document upload (PDF, JPG, PNG up to 10MB), metadata retrieval, secure file streaming, versioning and re-upload.
- **Loan Applications**: Customer loan creation, listing, detail view with IDOR guard, offer review (admin modify amount, customer accept/reject offer).
- **Admin KYC**: Customer KYC review list, document approval/rejection with reason, document request, manual KYC decision override.
- **Admin Loans**: Loan queue with filters, review start, document request, hold with reason, direct reject with reason, direct approve.
- **Current Baseline Status**: 81 server tests passing, 20 client tests passing, 0 lint errors, 0 build errors.

---

## 3. Phase 5 Gaps Identified
1. **Customer Dashboard**: Currently a static placeholder (`CustomerHome.tsx`). Needs dynamic greeting, KYC status card with CTA, active loan summary, payment tracker, visual timeline, notifications, and quick actions.
2. **Customer KYC Page**: Dedicated `/customer/kyc` with document checklist, masked Aadhaar/PAN, status tracking, and camera/upload CTA.
3. **Payment Flow**:
   - Customer payment page `/customer/payment/:loanId` with configurable fee, instructions, UPI details, UTR submission, duplicate prevention.
   - Admin payment queue `/admin/payments` with UTR inspection.
   - Server-side atomic transaction upon payment verification that marks payment `PAID`, verifies **One Approved Loan Rule**, automatically transitions loan to `APPROVED`, creates agreement, generates EMI schedule, logs audit, and notifies customer.
4. **One Approved Loan Rule**: Enforcing server-side that a customer/mobile cannot have more than 1 active approved loan simultaneously.
5. **Loan Agreement**: Customer agreement page `/customer/agreement/:loanId` with configurable legal terms, acceptance checkbox, legal acceptance lock, and timestamp/IP logging.
6. **Disbursement**: Admin disbursement recorder `/admin/disbursements` (Bank Transfer / UPI with UTR), customer loan detail disbursement card & notification.
7. **Dynamic Branding**: Centralized public config `GET /api/public/config`, admin branding editor `/admin/settings/branding`, live CSS primary color variable updates, and dynamic document title.
8. **Email Settings**: Admin SMTP configuration `/admin/settings/email`, masked passwords, test email sender, notification event integration.
9. **WhatsApp Settings**: Admin WhatsApp API configuration `/admin/settings/whatsapp`, masked tokens, test WhatsApp sender, notification event integration.
10. **Admin Dashboard**: Primary demo page currently a placeholder (`AdminDashboard.tsx`). Needs 12 dynamic KPI cards, customer funnel visualization, and real-time tracking table with search/filters.
11. **Admin Customers**: Dedicated `/admin/customers` list and `/admin/customers/:id` 360 customer profile with complete chronological audit timeline.
12. **Admin Reports**: Dedicated `/admin/reports` with Customer, Loan, Payment, Disbursement reports; downloadable CSV and PDF/printable report.
13. **Admin Audit Logs**: Dedicated `/admin/audit-logs` viewer with search and multi-field filters.
14. **Support Ticket System**: Customer ticket submission & list `/customer/support`, Admin ticket management & reply `/admin/support`.

---

## 4. Implementation Plan

### Step 1: Database Extensions (Prisma)
- Add `EmailSettings`, `WhatsAppSettings`, `PaymentConfig` models.
- Enhance `Payment` model with `paymentType`, `verifiedBy`, `verifiedAt`, `rejectionReason`.
- Enhance `LoanApplication` model with `paymentStatus`.
- Run Prisma db push & generate.

### Step 2: Backend Services & Controllers
- Create `settingsService.ts`: Public branding, admin branding, email SMTP config with encryption, WhatsApp API config with encryption, payment config.
- Create `paymentService.ts`: UTR submission, duplicate check, atomic verification with **One Approved Loan Rule** check and automatic loan approval, rejection.
- Create `agreementService.ts`: Agreement generation and customer acceptance.
- Create `disbursementService.ts`: Record disbursement (Bank Transfer / UPI), log audit, customer notification.
- Create `dashboardService.ts`: Admin 12 KPI aggregates, customer funnel stats, recent activity; Customer dashboard summary.
- Create `adminCustomerService.ts`: Customer directory listing, 360 customer detail with chronological audit timeline.
- Create `reportsService.ts`: Summary statistics and CSV/Excel export.
- Create `supportService.ts`: Customer ticket submission, admin ticket queue, reply and status update.
- Create `notificationService.ts`: Dynamic in-app notifications, mark read, trigger hooks for email & WhatsApp.

### Step 3: Backend Routes & Middleware
- Mount `/api/public/config` for public branding access.
- Mount customer routes: `/api/customer/dashboard`, `/api/customer/kyc`, `/api/customer/payments/*`, `/api/customer/loans/:id/agreement`, `/api/customer/notifications/*`, `/api/customer/support/tickets`.
- Mount admin routes: `/api/admin/dashboard`, `/api/admin/customers/*`, `/api/admin/payments/*`, `/api/admin/disbursements/*`, `/api/admin/reports/*`, `/api/admin/audit-logs`, `/api/admin/settings/*`, `/api/admin/support/tickets/*`, `/api/admin/notifications`.

### Step 4: Frontend Dynamic Branding System
- Create `BrandingContext.tsx` fetching `/api/public/config`.
- Dynamically apply document title, favicon, company name, logo, and CSS primary color.

### Step 5: Frontend Customer Pages
- `CustomerHome.tsx`: Complete dynamic dashboard.
- `CustomerKycPage.tsx`: Dedicated KYC checklist and status.
- `CustomerPaymentPage.tsx`: Payment charge, UPI instructions, UTR submission.
- `CustomerAgreementPage.tsx`: Loan agreement review and legal acceptance.
- `CustomerNotificationsPage.tsx`: In-app notification center.
- `CustomerSupportPage.tsx`: FAQ and support ticket center.

### Step 6: Frontend Admin Pages
- `AdminDashboard.tsx`: Dynamic KPIs, funnel chart, tracking table.
- `AdminCustomersPage.tsx` & `AdminCustomerDetailPage.tsx`: Directory & 360 profile with audit timeline.
- `AdminPaymentsPage.tsx`: Payment verification queue and UTR approval.
- `AdminDisbursementsPage.tsx`: Disbursement recorder and list.
- `AdminReportsPage.tsx`: Interactive reports and CSV/PDF export.
- `AdminAuditLogsPage.tsx`: Audit log search and filter table.
- `AdminBrandingSettings.tsx`: Live branding customizer.
- `AdminEmailSettings.tsx`: SMTP config and test email.
- `AdminWhatsAppSettings.tsx`: WhatsApp config and test message.
- `AdminSupportPage.tsx`: Ticket resolution center.
- `AdminNotificationsPage.tsx`: Notification alerts.

### Step 7: Testing & Verification
- Unit & integration tests for all new endpoints (`phase5.test.ts`).
- Component & route tests for new UI flows (`Phase5.test.tsx`).
- Full lint and build validation (`npm run lint`, `npm run build`, `npm test`).
- Git checkpoint commit and push to `main`.
