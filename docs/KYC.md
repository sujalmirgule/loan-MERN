# KYC & Document Management Specification

This document details the KYC (Know Your Customer) and document management architecture implemented for the **Loan Approve** platform.

---

## 1. Overview & Regulatory Context

In accordance with regulatory fintech compliance in India, identity verification and income documentation must precede loan agreement execution and fund disbursement. The platform maintains non-destructive document versioning, strict access control, and immutable audit logs.

---

## 2. Customer Profile Management

### 2.1 Profile Fields & Mutability
| Field | Type | Mutability | Security Treatment |
|---|---|---|---|
| `id` | UUID | Immutable | Internal identifier |
| `mobile` | String (10 digits) | **Immutable** | Primary login credential |
| `fullName` | String (3–100 chars) | Editable | Sanitized & validated |
| `email` | String | Editable | Trimmed & lowercased |
| `address` | String | Editable | Minimum 5 chars |
| `state` | String | Editable | Indian state dataset |
| `city` | String | Editable | Cascaded from selected state |
| `aadhaar` | String (12 digits) | Editable | **Masked (`XXXX XXXX 1234`) & HMAC-encrypted** |
| `monthlyIncome` | Float | Editable | Verified against income proof |
| `status` | String | Admin controlled | `ACTIVE`, `SUSPENDED`, `ARCHIVED` |
| `kycStatus` | String | System/Admin | `PENDING`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `REUPLOAD_REQUIRED` |

### 2.2 Aadhaar Number Protection
- **Storage**: Full plaintext Aadhaar is **never stored** in raw format. It is stored as an HMAC-SHA256 digest (`aadhaarEncrypted`) for fast uniqueness checks, and formatted as `XXXX XXXX 1234` (`aadhaarMasked`) for UI display.
- **Tokens & Logs**: Aadhaar is strictly excluded from JWT payloads, URL parameters, console logs, error messages, and audit payloads.
- **Audit Logs**: Profile updates record that Aadhaar was modified (`aadhaarUpdated: true`) with the masked representation only.

---

## 3. KYC Workflow & Document Categories

### 3.1 Document Categories
- `AADHAAR_FRONT`: Front side showing photo and name. (Mandatory)
- `AADHAAR_BACK`: Back side showing registered address. (Mandatory)
- `PAN`: Permanent Account Number card. (Mandatory)
- `INCOME_PROOF`: Salary slips, Form 16, or ITR.
- `BANK_STATEMENT`: 3–6 months bank statements.
- `OTHER`: Specific documents requested by the compliance officer.

### 3.2 Overall KYC Status State Machine
```text
         [Registration]
               │
               ▼
          ┌─────────┐
          │ PENDING │
          └────┬────┘
               │ (Customer uploads first doc)
               ▼
        ┌──────────────┐
   ┌───►│ UNDER_REVIEW │◄─────────────────┐
   │    └──────┬───────┘                  │
   │           │                          │ (Customer re-uploads)
   │  ┌────────┴────────┐                 │
   │  │ (Admin Review)  │                 │
   │  ▼                 ▼                 │
┌──────────┐   ┌───────────────────┐      │
│ APPROVED │   │ REUPLOAD_REQUIRED ├──────┘
└──────────┘   └────────┬──────────┘
                        │
                        ▼ (Admin Rejection)
                   ┌──────────┐
                   │ REJECTED │
                   └──────────┘
```

1. **PENDING**: Initial state upon registration before any document upload.
2. **UNDER_REVIEW**: Triggered automatically when documents are submitted or re-uploaded.
3. **REUPLOAD_REQUIRED**: Triggered when the verification officer flags an unreadable/cropped document with mandatory correction feedback.
4. **APPROVED**: Automatically derived when `AADHAAR_FRONT`, `AADHAAR_BACK`, and `PAN` are all marked `APPROVED`, or explicitly overridden by Admin.
5. **REJECTED**: KYC review denied.

---

## 4. Document Versioning & Archival

- **Non-Destructive Versioning**: Every re-upload increments the version counter (`v1`, `v2`, `v3`) for that specific document category.
- **Audit Preservation**: Older document versions are marked with `isCurrentVersion: false` and kept in the database and disk storage to ensure regulatory compliance.
- **Storage Paths**: Generated storage keys follow the pattern:
  `documents/{customerId}/{documentType}/{uuid}-v{version}.{ext}`

---

## 5. Security & Access Control

- **IDOR Protection**: Every customer document request enforces `document.customerId === authenticatedUser.id`. Customers cannot inspect or download other users' documents.
- **No Public Directories**: The uploads directory is not exposed as static web assets. All files are streamed through authenticated endpoints:
  - Customer: `GET /api/customer/documents/:id/file`
  - Admin: `GET /api/admin/kyc/documents/:id/file`
- **File Validation**:
  - Size Limit: 10 MB per file.
  - Allowed MIME Types: `application/pdf`, `image/jpeg`, `image/jpg`, `image/png`.
  - Extension matching and magic byte safety verification.

---

## 6. Audit Logging

Every critical event is recorded in the immutable `AuditLog` table:
- `PROFILE_UPDATED`: Customer profile changes (excluding raw Aadhaar).
- `DOCUMENT_UPLOADED`: Customer initial document submission.
- `DOCUMENT_REUPLOADED`: Customer versioned document resubmission.
- `DOCUMENT_VIEWED`: Admin viewing document binary for review.
- `DOCUMENT_APPROVED`: Admin approving document.
- `DOCUMENT_REJECTED`: Admin rejecting document with mandatory reason.
- `DOCUMENT_REUPLOAD_REQUESTED`: Admin requesting re-upload with mandatory feedback.
- `ADDITIONAL_DOCUMENT_REQUESTED`: Admin issuing extra document requirement to customer.
- `KYC_APPROVED`: KYC marked as complete.
- `KYC_REJECTED`: KYC marked as rejected.
