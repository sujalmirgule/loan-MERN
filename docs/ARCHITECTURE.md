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
1. `AdminUser`: Administrative credentials and access control (Single ADMIN role).
2. `Customer`: Borrower profile, masked Aadhaar, location, monthly income, and overall `kycStatus`.
3. `LoanApplication`: Requested/approved amounts, terms, and state machine lifecycle.
4. `LoanDocument`: Uploaded KYC/income verification documents with status flags, versioning (`v1`, `v2`), and storage keys.
5. `DocumentRequest`: Admin-initiated additional document requirements for customers.
6. `LoanAgreement`: Versioned digital agreements with audit timestamps and user agent recording.
7. `Disbursement`: Manual payment recording (Bank Transfer / UPI) with UTR references.
8. `EMISchedule`: Breakdown of installments, principal, interest, due dates, and status.
9. `Payment`: Borrower repayments, transaction references, receipts, and balances.
10. `Notification`: In-app notification center for all critical loan lifecycle events.
11. `AuditLog`: Immutable audit trail tracking administrative and customer modifications.
12. `BrandingSettings`: White-label configuration (colors, logo, company name, contact info).
13. `SupportTicket`: Customer support ticket management.

## 4. Document & Storage Architecture (Phase 3)
- **Storage Provider Abstraction**: Implemented via `IStorageProvider` and `LocalStorageProvider` located in `server/src/providers/storage/`. Files are isolated outside public web roots and accessed through authenticated streaming endpoints.
- **Document Versioning**: Every document re-upload increments the version number while archiving the prior version record for regulatory auditability (`isCurrentVersion: false`).
- **KYC Engine**: Automatically coordinates customer `kycStatus` (`PENDING`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `REUPLOAD_REQUIRED`) based on active document states and reviewer actions.
- **IDOR Protection**: Strict ownership validation (`document.customerId === authenticatedUser.id`) prevents cross-customer data leakage.
- **Related Documentation**:
  - [KYC Specification](file:///docs/KYC.md)
  - [Document Storage Architecture](file:///docs/DOCUMENT_STORAGE.md)
  - [Authentication & Security Specification](file:///docs/AUTHENTICATION.md)
