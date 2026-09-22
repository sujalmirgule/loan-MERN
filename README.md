# Loan Approve — Loan Management & Finance Platform

Loan Approve is a full-stack loan management and finance platform designed to manage customer onboarding, KYC verification, loan documents, payments, UTR verification, invoices, underwriting, loan approval, and administrative operations through a secure customer portal and admin dashboard.

---

## 1. Project Overview

Loan Approve provides two major interfaces designed for distinct operational roles:

### 1. Customer Portal
A mobile-first, stage-gated web experience for borrowers to:
- **Register & Authenticate**: Passwordless, mobile-based login with phone number verification.
- **Complete Identity KYC**: Mandatory upload of Aadhaar Front and Aadhaar Back documents.
- **Stage-Aware Payments**: View and settle currently active applicable fees (e.g. KYC Verification Fee) via UPI and QR code.
- **Submit Real UTR References**: Enter 12-digit transaction references for administrative payment verification.
- **Track Verification Status**: Real-time visibility into payment verification states and underwriting reviews.
- **Access GST Invoices**: Download dynamic, immutable PDF tax invoices generated 1:1 upon verified payments.
- **Upload Loan Documents**: Upload PAN card, bank statements, income certificates, and supplementary files with progressive tracking (0/4 → 4/4).
- **Manage Loan Applications**: View application status, real-time lifecycle timeline, EMI breakdowns, and download official 2-page Loan Approval Letters upon sanction.

### 2. Admin Operations Command Center
A comprehensive management console for compliance leads, underwriters, and administrators to:
- **Customer 360 Workspace**: Review borrower profiles, masked identity data, document archives, and comprehensive audit logs.
- **KYC Queue (`/admin/kyc`)**: Real-time queue displaying customer KYC status, document previews, payment status, and full UTR numbers without requiring upfront payment for queue visibility.
- **Payment & UTR Verification**: Verify submitted transaction references, generate immutable invoices, and track payment histories.
- **Granular Fee Configuration**: Manage global charges (KYC charge, Processing Fee, Interest Rate), customer-specific charges (GST, Stamp Duty, TDS, Insurance, Late Fee), and the optional Before-Loan "Loan Document Upload Fee".
- **Loan Underwriting Console**: Perform underwriting workflows (Start Review, Modify Amount, Request Additional Documents, Put on Hold, Approve, or Reject with mandatory decline reasons).
- **Sanction & Letter Issuance**: Generate official 2-page Loan Approval Letters with custom branding, watermarks, dynamic loan terms, and digital seals.
- **Domain & Branding Controls**: Manage multi-tenant branding, custom logos, watermarks, email templates, and WhatsApp notification rails.

---

## 2. Core Business Workflow

The platform operates on a strict sequential state machine ensuring complete regulatory and underwriting compliance:

```text
Customer Signup / Login
        ↓
Click "Apply for Loan"
        ↓
KYC Status Check
        ↓
[KYC Not Approved] ──→ Block Loan Form ──→ Direct to /customer/kyc
                                                    ↓
                                      Upload Aadhaar Front + Back
                                                    ↓
                                      KYC Case Enters Admin Queue (/admin/kyc)
                                                    ↓
                                      KYC Verification Fee Becomes Active
                                                    ↓
                                      UPI / QR Payment & UTR Submission
                                                    ↓
                                      Admin Verifies Payment Reference
                                                    ↓
                                      Immutable GST Tax Invoice Generated
                                                    ↓
                                      Admin Explicitly Approves KYC
                                                    ↓
                                      [KYC Status = APPROVED / VERIFIED]
                                                    ↓
                                      Loan Documents Unlocked (/customer/documents)
                                      • PAN Card (Required)
                                      • Bank Statement (Required)
                                      • Income Proof (Required)
                                      • Other Documents (Optional)
                                                    ↓
                                      Optional Loan Document Upload Fee (if enabled by Admin)
                                                    ↓
                                      Customer Submits Loan Application (/customer/apply)
                                                    ↓
                                      Loan Status: SUBMITTED → UNDER_REVIEW
                                                    ↓
                                      Admin Underwriting & Offer Decision
                                                    ↓
                                      Applicable Stage-Specific Loan Charges
                                                    ↓
                                      Loan Approval & 2-Page Sanction Letter Generation
```

> [!IMPORTANT]
> **Authoritative Business Gate**: **`NO APPROVED KYC = NO LOAN APPLICATION`**  
> A borrower cannot open or submit a loan application until their identity verification has been reviewed, payment verified, and explicitly approved by an administrator.

---

## 3. Customer Portal Features

### Authentication & Routing
- Dedicated `/customer/login` and `/customer/register` portals strictly separated from administrative routes.
- Mobile-based authentication with input sanitization, 10-digit validation, and state persistence.
- Client route guards (`CustomerRoute`, `CustomerPublicOnlyRoute`) preventing unauthorized cross-portal access.

### Customer Dashboard (`/customer/dashboard`)
- Real-time greeting with masked borrower details (Aadhaar: `XXXX-XXXX-1234`, Mobile: `+91 98XXXXXX33`).
- Identity & Verification status cards with dynamic progress percentages.
- Active loan summary displaying requested amount, sanctioned amount, tenure, and estimated EMI.
- Borrower journey timeline with real-time status indicators (1500ms sync).

### "Apply for Loan" Entry Gate (`/customer/apply`)
- **Backend Gate**: `POST /api/customer/loan-applications` checks customer KYC status; rejects unapproved requests with `403 KYC_REQUIRED`.
- **Frontend Prerequisite Card**: Displays *"Complete KYC First"* with an actionable *"Complete KYC"* button routing to `/customer/kyc`.
- **One Active Loan Rule**: Prevents duplicate active loan applications per customer profile.

### Identity KYC Center (`/customer/kyc`)
- Mandatory upload of both **Aadhaar Front** and **Aadhaar Back** documents.
- File validation (PDF, JPG, PNG up to 10MB) with secure local/cloud storage.
- Displays *"Identity KYC Verified!"* banner with *"Continue to Loan Documents"* CTA upon approval (zero redirect loops).

### Loan Documents Center (`/customer/documents`)
- 4-tier document upload checklist:
  1. PAN Card (*Required*)
  2. Bank Statement (*Required*)
  3. Income Proof / Salary Slip (*Required*)
  4. Other Documents (*Optional*)
- Progressive completion counter (`0/4` → `4/4`).
- Version history preservation allowing re-uploads while archiving previous versions for audit.

### Stage-Aware Payments Page (`/customer/payments`)
- **Stage 0 (Pre-KYC Documents)**: Clean empty state (*"No payment is currently required"*). No premature fees, processing charges, or GST cards.
- **Stage 1 (Both Aadhaar Uploaded)**: KYC Verification Fee becomes visible and payable with the backend-configured amount.
- **Stage 2 (UTR Submitted)**: Card updates to `UNDER_VERIFICATION` displaying the submitted transaction reference.
- **Stage 3 (Verified)**: Card transitions to `PAID` with one-click view/download of the official tax invoice.
- **Stage 4+ (Subsequent Loan Fees)**: Displays only admin-activated charges or enabled Before-Loan upload fees.

### Invoices & Financial Documents
- 1:1 Idempotent Tax Invoice generation per verified charge.
- Dynamic PDF rendering with company branding, tax breakdown (18% GST), customer details, and payment timestamp.

---

## 4. Admin Dashboard Features

### Customer 360 Workspace (`/admin/customers`)
- Complete borrower registry with multi-parameter search (Name, Mobile, Email, State, KYC Status).
- Customer detail workspace: profile overview, loan applications, uploaded documents, fee ledger, and audit history.

### Admin KYC Queue (`/admin/kyc`)
- Displays all customers who have uploaded Aadhaar Front + Back in `UNDER_REVIEW` state.
- **Immediate Visibility**: Appearance in queue does **not** depend on payment completion.
- Distinct badges for `KYC Status`, `Payment Status` (`NOT_PAID`, `UNDER_VERIFICATION`, `PAID`), and `UTR Status` (`NOT_SUBMITTED`, `SUBMITTED`, `VERIFIED`).
- Full UTR inspection without truncation.
- Document review modal for individual file verification, re-upload request, or rejection with notes.
- Explicit KYC Approval action button unlocking the borrower's loan documents flow.

### Payment Management & UTR Verification (`/admin/payments`)
- Centralized transaction registry displaying submitted UTRs, payment methods, and timestamps.
- One-click payment verification triggering automated invoice creation and customer notification.
- Duplicate UTR prevention blocking customer reuse of previously submitted references.

### Granular Charges & Fees Engine (`/admin/charges`)
- **Global Settings**: KYC Charge Amount, Processing Fee, Standard Interest Rate.
- **Customer/Application Specific Charges**:
  - Processing Fee
  - GST (18%)
  - Stamp Duty
  - TDS Charges
  - Insurance Fee
  - Late Payment Fee
  - Payment Fee
- **Admin Activation Gate**: Configured charges remain hidden from borrowers until explicitly dispatched/activated (`sentAt !== null`) by administrators.

### Before-Loan "Loan Document Upload Fee"
- Separate toggleable fee setting (`ON` / `OFF`) with configurable amount (default: ₹999, `OFF`).
- When `ON`, becomes visible to the customer only after mandatory loan documents (PAN, Bank Statement, Income Proof) are completed.

### Underwriting & Loan Approval Operations (`/admin/loans`)
- State machine transitions: `DRAFT` → `SUBMITTED` → `UNDER_REVIEW` → `APPROVED` / `REJECTED` / `DOCUMENTS_REQUIRED` / `ON_HOLD`.
- Direct loan sanction dialog with auto-calculated EMI schedule and manual interest/tenure override.
- Rejection dialog requiring mandatory regulatory decline reasons.

### Official Loan Approval Letter Issuance
- Automatic generation of the official **2-Page Loan Approval Letter PDF** upon sanction:
  - Header with custom company branding and digital certificate seal.
  - Dynamic loan summary: Application Number, Approval Number, Sanctioned Amount, Tenure, EMI, Interest Rate.
  - Masked identity parameters: PAN, Masked Aadhaar, Verified Bank Name & IFSC.
  - Dynamic repayment schedule overview and legal terms.
  - Security watermark and verifiable digital QR code.

---

## 5. Payment & Charge Lifecycle

| Stage | Trigger / Condition | Visible Customer Charges | Payment Action |
|:---:|---|---|---|
| **Stage 0** | Account created, KYC documents not uploaded | None (*"No payment is currently required"*) | Blocked |
| **Stage 1** | Aadhaar Front + Back uploaded | **KYC Verification Charge** (Active) | UPI / QR Pay + Submit UTR |
| **Stage 2** | Customer submits 12-digit UTR | KYC Verification Charge (`UNDER_VERIFICATION`) | Awaiting Admin Verification |
| **Stage 3** | Admin verifies transaction reference | KYC Verification Charge (`PAID`) | Download GST Tax Invoice |
| **Stage 4** | Admin approves KYC | KYC Charge (`PAID`); Loan Documents Unlocked | Proceed to Loan Documents |
| **Stage 5** | Required Loan Documents (PAN, Bank, Income) uploaded | **Loan Document Upload Fee** (*Only if Admin enabled*) | Pay Fee (if enabled) |
| **Stage 6** | Loan Underwriting / Sanction | **Processing Fee, GST, Stamp Duty** (*Only if Admin activated*) | Pay Activated Fees |

---

## 6. Security & Access Control

- **Role-Based Access Control (RBAC)**: Strict permission boundaries separating `CUSTOMER` and `ADMIN` (Super Admin, Underwriter, Support) roles.
- **Backend IDOR Protection**: Document streaming, invoice downloads, and payment endpoints validate customer ID ownership against the authenticated JWT context.
- **Server-Side Authorization**: Business rules (KYC gating, charge availability, loan submission) are enforced in Express services; client UI states are not trusted.
- **Data Protection & Masking**: Aadhaar numbers are masked (`XXXX-XXXX-1234`) across dashboards and public responses; sensitive configuration secrets are excluded from responses.
- **Immutable Audit Trail**: Key lifecycle events (KYC submission, document review, UTR submission, payment verification, loan approval) log timestamped `AuditLog` records.
- **Rate Limiting & Headers**: Express rate limiting on sensitive auth endpoints and Helmet security headers.

---

## 7. Real-Time Data Synchronization

The application implements active real-time polling synchronization (**1500ms intervals**) via TanStack Query across critical operational workflows:
- Customer uploads Aadhaar → Admin KYC Queue updates immediately.
- Customer submits UTR → Admin view displays UTR reference in real time.
- Admin verifies payment → Customer Payments page unlocks invoice download.
- Admin approves KYC → Customer portal immediately unlocks Loan Documents.
- Admin activates fee → Customer fee ledger displays active charge.

---

## 8. Technology Stack

### Frontend Client
- **Core Framework**: [React 18](https://react.dev/) + [Vite 6](https://vitejs.dev/) + [TypeScript 5.7](https://www.typescriptlang.org/)
- **Styling & UI**: [Tailwind CSS 3.4](https://tailwindcss.com/) + [shadcn/ui primitives](https://ui.shadcn.com/) + [Lucide React Icons](https://lucide.dev/)
- **State & Data Fetching**: [TanStack Query v5](https://tanstack.com/query)
- **Routing**: [React Router v7](https://reactrouter.com/)
- **Forms & Validation**: [React Hook Form](https://react-hook-form.com/) + [Zod 3.24](https://zod.dev/)
- **Charts & Visualizations**: [Recharts 2.15](https://recharts.org/)
- **Testing**: [Vitest 2.1](https://vitest.dev/) + [Testing Library](https://testing-library.com/) + [JSDOM](https://github.com/jsdom/jsdom)

### Backend Server
- **Runtime & Framework**: [Node.js 20+](https://nodejs.org/) + [Express 4.21](https://expressjs.com/) + [TypeScript 5.7](https://www.typescriptlang.org/)
- **Database & ORM**: [SQLite (WAL mode)](https://www.sqlite.org/) + [Prisma ORM 6.1](https://www.prisma.io/)
- **Authentication**: [JSON Web Tokens (JWT)](https://jwt.io/) + [bcryptjs](https://github.com/dcodeIO/bcrypt.js)
- **File & Document Processing**: [Multer](https://github.com/expressjs/multer) + [PDFKit 0.20](https://pdfkit.org/) + [Archiver 8.0](https://www.archiverjs.com/) + [QRCode](https://github.com/soldair/node-qrcode)
- **Communication Rails**: [Nodemailer](https://nodemailer.com/) (SMTP / Ethereal) + WhatsApp Notification Client
- **Testing**: [Vitest 2.1](https://vitest.dev/) + [Supertest 7.0](https://github.com/ladjs/supertest)

---

## 9. Project Structure

```text
Loan-Approve/
├── client/
│   ├── public/                      # Static assets & favicon
│   ├── src/
│   │   ├── __tests__/               # Frontend unit & integration test suites (12 files, 71 tests)
│   │   ├── api/                     # API client instance, endpoints & typed API connectors
│   │   ├── components/              # Reusable UI primitives & customer/admin components
│   │   │   ├── admin/               # Admin modals, document viewers & queue cards
│   │   │   ├── customer/            # Customer registration forms & loan doc sections
│   │   │   └── ui/                  # shadcn/ui components (Card, Button, Dialog, Badge, Input, Table)
│   │   ├── constants/               # Permissions & lookup constants
│   │   ├── contexts/                # AuthContext & BrandingContext
│   │   ├── hooks/                   # Custom React hooks (useBrandTitle, etc.)
│   │   ├── layouts/                 # CustomerLayout (mobile nav) & AdminLayout (dark sidebar)
│   │   ├── lib/                     # Styling utilities & formatters (clsx, tailwind-merge)
│   │   ├── pages/                   # Application views
│   │   │   ├── admin/               # 20+ Admin views (KYC Queue, Loans, Payments, Charges, Branding)
│   │   │   ├── customer/            # Customer views (Home, Apply, KYC, Documents, Payments, Agreement)
│   │   │   └── LandingPage.tsx      # Public responsive fintech homepage
│   │   ├── routes/                  # Protected RouteGuards (CustomerRoute, AdminRoute, RBAC)
│   │   ├── App.tsx                  # Root routing configuration
│   │   ├── index.css                # Global CSS & Tailwind design tokens
│   │   └── main.tsx                 # Client entry point
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── server/
│   ├── prisma/
│   │   ├── schema.prisma            # Prisma schema (20+ entities)
│   │   └── seed.ts                  # Database seeder with reference records
│   ├── src/
│   │   ├── constants/               # Permissions, roles, and status constants
│   │   ├── controllers/             # Express route controllers (Auth, KYC, Loans, Payments, Charges)
│   │   ├── middleware/              # Authentication, Error handling, Rate limiting, Upload middleware
│   │   ├── providers/               # Storage, Email (Ethereal/SMTP), WhatsApp, UPI providers
│   │   ├── routes/                  # Modular route definitions (adminRoutes, customerRoutes)
│   │   ├── services/                # Core business services (adminKyc, specificCharges, pdf, loanApp)
│   │   ├── utils/                   # Domain resolver, calculation helpers
│   │   ├── validators/              # Zod validation schemas
│   │   ├── app.ts                   # Express application setup
│   │   └── server.ts                # Server startup & port binding
│   ├── tests/                       # Backend test suites (13 files, 192 tests)
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
│
├── .gitignore
└── README.md
```

---

## 10. Local Development Setup

### Prerequisites
- **Node.js**: `v20.x` or higher (Recommended: `v20.x` / `v22.x`)
- **npm**: `v10.x` or higher
- **Git**: `v2.x` or higher

### 1. Clone Repository
```bash
git clone https://github.com/sujalmirgule/loan-MERN.git
cd loan-MERN
```

### 2. Backend Setup
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Generate Prisma Client & initialize database
npm run prisma:generate
npm run prisma:migrate

# (Optional) Seed initial demo accounts and configurations
npm run prisma:seed

# Start backend development server (Port 5000)
npm run dev
```

### 3. Frontend Setup
```bash
# In a separate terminal, navigate to client directory
cd client

# Install dependencies
npm install

# Start frontend development server (Port 5173)
npm run dev
```

### 4. Access Application
- **Customer Portal**: `http://localhost:5173`
- **Admin Console**: `http://localhost:5173/admin/login`
- **Backend API**: `http://localhost:5000/api/health`

---

## 11. Testing & Quality Verification

### Run Server Test Suite
```bash
cd server
npm test
```
*Executes all 13 test suites covering 192 unit and integration tests:*
- KYC & Aadhaar document validation
- Immediate Admin KYC queue logic
- UTR validation and duplicate detection
- 1:1 Tax Invoice PDF generation
- 2-Page Loan Approval Letter PDF rendering
- Gated customer charge lifecycle & Before-Loan fee logic
- IDOR and granular RBAC security

### Run Client Test Suite
```bash
cd client
npm test
```
*Executes all 12 frontend test suites covering 71 component and routing tests:*
- Customer authentication & registration validation
- Apply for Loan KYC prerequisite card
- Customer documents upload and progress counters
- Dynamic EMI calculator and landing page interactions
- Admin underwriting, approval, and rejection modals

### TypeScript Type Check
```bash
# Server typecheck
cd server && npx tsc --noEmit

# Client typecheck
cd client && npx tsc --noEmit
```

---

## 12. Default Demo Credentials

### Administrator Command Center
- **URL**: `http://localhost:5173/admin/login`
- **Email**: `admin@loanapprove.com`
- **Password**: `Admin@123`

### Reference Borrower Account
- **URL**: `http://localhost:5173/customer/login`
- **Mobile Number**: `9876543210`
