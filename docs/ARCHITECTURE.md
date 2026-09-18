# Architecture Specification: Loan Approve Platform

## 1. System Topology
The platform consists of two principal application tiers:
1. **Client Tier**: Single Page Application built on React 18, Vite, and Tailwind CSS. Provides a mobile-first experience for borrowers with fixed bottom navigation and an administrative portal with collapsible sidebar navigation.
2. **Backend API Tier**: Express REST API implemented in TypeScript, backed by Prisma ORM connecting to an embedded SQLite database configured with Write-Ahead Logging (WAL) and strict foreign key integrity constraints.

## 2. Security Foundation
- **Security Headers**: Managed via `helmet` across all API responses.
- **CORS Protection**: Restricted to authorized origins (`CLIENT_URL`) with credentials enabled.
- **Rate Limiting**: Baseline rate limiting (300 requests / 15 min globally, 20 requests / 15 min for auth endpoints).
- **Error Sanitization**: Centralized `errorHandler` blocks raw database queries or stack traces from reaching clients in production mode.
- **Data Privacy**: Aadhaar numbers are stored encrypted and displayed strictly masked (`XXXX XXXX 1234`).

## 3. Database Entities (12 Normalized Models)
1. `AdminUser`: Administrative credentials and access control.
2. `Customer`: Borrower profile, masked Aadhaar, location, income.
3. `LoanApplication`: Requested/approved amounts, terms, and state machine lifecycle.
4. `LoanDocument`: Uploaded KYC/income verification documents with status flags.
5. `LoanAgreement`: Versioned digital agreements with audit timestamps and user agent recording.
6. `Disbursement`: Manual payment recording (Bank Transfer / UPI) with UTR references.
7. `EMISchedule`: Breakdown of installments, principal, interest, due dates, and status.
8. `Payment`: Borrower repayments, transaction references, receipts, and balances.
9. `Notification`: In-app notification center for all critical loan lifecycle events.
10. `AuditLog`: Immutable audit trail tracking administrative modifications.
11. `BrandingSettings`: White-label configuration (colors, logo, company name, contact info).
12. `SupportTicket`: Customer support ticket management.
