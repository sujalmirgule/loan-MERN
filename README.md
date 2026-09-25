# 🏦 Loan Approve — Enterprise Digital Lending & Financial Operations Platform

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-18.3.1-blue.svg)](https://react.dev/)
[![Prisma Version](https://img.shields.io/badge/prisma-6.19.3-indigo.svg)](https://www.prisma.io/)
[![Database](https://img.shields.io/badge/database-MySQL_8.0-orange.svg)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)]()

**Loan Approve** is an end-to-end, enterprise-grade Digital Lending and Loan Operations Platform engineered for financial institutions, NBFCs, direct lenders, and lending facilitators. The platform automates the complete borrower lifecycle — from instant customer registration, digital KYC verification, document management, loan application underwriting, and multi-tier fee clearance to sanction letter generation (PDF), tax invoice issuance (PDF), WhatsApp notification delivery, and real-time operational reporting.

---

## 📑 Table of Contents

1. [Executive Overview & Platform Architecture](#-executive-overview--platform-architecture)
2. [Technology Stack & Dependency Specifications](#-technology-stack--dependency-specifications)
3. [Prerequisites & System Requirements](#-prerequisites--system-requirements)
4. [Environment Variables Reference](#-environment-variables-reference)
5. [WhatsApp Integration Guide (Very Detailed)](#-whatsapp-integration-guide-very-detailed)
6. [SMTP / Email Integration Guide (Very Detailed)](#-smtp--email-integration-guide-very-detailed)
7. [MySQL & Aiven Cloud Database Architecture](#-mysql--aiven-cloud-database-architecture)
8. [Database Verification & Monitoring Queries](#-database-verification--monitoring-queries)
9. [Local Development Walkthrough](#-local-development-walkthrough)
10. [Production Deployment & Build Walkthrough](#-production-deployment--build-walkthrough)
11. [Troubleshooting & Frequently Asked Questions](#-troubleshooting--frequently-asked-questions)
12. [Security & Compliance Principles](#-security--compliance-principles)

---

## 🏛️ Executive Overview & Platform Architecture

Loan Approve is built using a decoupled **Single-Page Application (SPA) + RESTful Micro-Backend** pattern.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT / FRONTEND LAYER                         │
│   React 18.3.1 + Vite 6.0.5 + TypeScript 5.7.2 + TailwindCSS 3.4.17   │
│   • Customer Portal (/customer/*)  • Admin Console (/admin/*)         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP REST + Bearer JWT Token
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        API & BACKEND SERVICES                          │
│        Node.js v18+ / Express 4.21.2 + TypeScript + PDFKit             │
│   • Auth & RBAC Middleware        • Underwriting & Loan Pipeline       │
│   • PDF Generator Engine          • WhatsApp & Email Communication     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Prisma ORM 6.19.3
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       PERSISTENCE / DATABASE                           │
│              Production MySQL 8.0 Cloud (Aiven MySQL)                  │
│   • AdminUser  • Customer  • LoanApplication  • Charge  • Invoice      │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Platform Capabilities
- **Customer Portal**: Self-service onboarding, mobile-only OTP/Passwordless auth, Aadhaar/PAN document uploads, loan application tracking, fee clearance ledger, downloadable Sanction Letters & Tax Invoices.
- **Admin Command Center**: Executive KPI analytics, underwriting decision queue (Approve / Reject / Modify Offer / Put on Hold / Request Documents), granular RBAC (Super Admin, Admin, Staff), customer 360 view, payment UTR verification, charge management, and system domain branding controls.
- **Dynamic Document Generation Engine**: Server-side PDF rendering using `PDFKit` for official 2-Page Loan Approval Letters and 1-Page Tax Payment Invoices. Dynamically pulls company name, legal entity name, logo, address, contact, and background watermark settings from MySQL.
- **Communication Gateway**: Dual WhatsApp provider abstraction (Meta Cloud API / WABridge) and SMTP email integration for transactional notifications.

---

## 🛠️ Technology Stack & Dependency Specifications

### Frontend Application (`/client`)
- **Core Framework**: React `18.3.1` with TypeScript `5.7.2`
- **Build Tool**: Vite `6.0.5`
- **Routing**: React Router DOM `7.1.1`
- **State & Data Fetching**: TanStack React Query `5.62.8`
- **Form Management**: React Hook Form `7.54.2` + Zod `3.24.1` + `@hookform/resolvers` `3.9.1`
- **UI & Styling**: TailwindCSS `3.4.17` + Lucide React `0.469.0` + Recharts `2.15.0`
- **Testing**: Vitest `2.1.8` + Testing Library React `16.1.0` + JSDOM `25.0.1`

### Backend Application (`/server`)
- **Runtime Environment**: Node.js `v18.0.0` or higher (`v20.x` recommended)
- **HTTP Server**: Express `4.21.2`
- **ORM / Database Engine**: Prisma Client & CLI `6.19.3`
- **Document Generator**: PDFKit `0.16.0`
- **Authentication**: JsonWebToken `9.0.2` + bcryptjs `2.4.3`
- **Validation**: Zod `3.24.1`
- **Email Delivery**: Nodemailer `6.10.0`
- **HTTP Communications**: Axios `1.7.9`
- **Testing Suite**: Vitest `2.1.9` + Supertest `7.0.0`

---

## 📋 Prerequisites & System Requirements

Before setting up or deploying Loan Approve, ensure the following software is installed on the host operating system:

| Component | Minimum Version | Recommended Version | Verification Command |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v18.0.0` | `v20.18.0` (LTS) | `node -v` |
| **npm** | `v9.0.0` | `v10.8.0` | `npm -v` |
| **MySQL Server** | `v8.0.0` | `v8.0.35+` or Aiven Cloud MySQL | `mysql --version` |
| **Git** | `v2.30.0` | `v2.40.0+` | `git --version` |

---

## 🔑 Environment Variables Reference

Environment variables must be configured in `server/.env` for local execution or supplied via deployment environment secret managers (e.g. Render, Railway, AWS ECS, Docker).

> ⚠️ **CRITICAL SECURITY REQUIREMENT**: Never commit `.env` files containing real production passwords, API keys, or connection URIs to version control. Always copy from `.env.example`.

### Server Environment Variables (`/server/.env`)

| Variable Name | Required | Default / Example | Purpose & Description | Secret? |
| :--- | :---: | :--- | :--- | :---: |
| `PORT` | Optional | `5000` | Port number on which Express HTTP server listens | No |
| `NODE_ENV` | **Required** | `production` / `development` | Operating environment mode | No |
| `CLIENT_URL` | **Required** | `https://loanapprove.com` | Allowed CORS origin for frontend single-page application | No |
| `DATABASE_URL` | **Required** | `mysql://user:pass@host:17819/db?ssl-mode=REQUIRED` | MySQL connection string for Prisma ORM | **YES** |
| `JWT_SECRET` | **Required** | `min_32_chars_random_secret_string` | HMAC secret key used to sign and verify JWT auth tokens | **YES** |
| `JWT_EXPIRES_IN` | Optional | `7d` | Expiration window for issued JWT tokens | No |
| `ADMIN_EMAIL` | **Required** | `admin@loanapprove.com` | Default Master Admin email created during database seeding | No |
| `ADMIN_PASSWORD` | **Required** | `SecureAdminPassword123!` | Password assigned to initial Master Admin on seed | **YES** |
| `SEED_DEMO_DATA` | **Required** | `false` | Seeding guard: `false` = seeds admin/defaults only; `true` = seeds demo records | No |
| `UPLOAD_DIR` | Optional | `./uploads` | Local directory path for storing uploaded customer documents | No |
| `MAX_FILE_SIZE_MB` | Optional | `10` | Maximum allowable file upload size limit in megabytes | No |
| `EMAIL_PROVIDER` | **Required** | `smtp` / `ethereal` / `development` | Active email provider backend engine | No |
| `SMTP_HOST` | If `smtp` | `smtp.your-provider.com` | Hostname of production SMTP relay server | No |
| `SMTP_PORT` | If `smtp` | `587` / `465` | Network port for SMTP server (`587` for STARTTLS, `465` for SSL) | No |
| `SMTP_USER` | If `smtp` | `notifications@loanapprove.com` | Username for authenticating with SMTP relay | **YES** |
| `SMTP_PASSWORD` | If `smtp` | `your_smtp_app_password` | Password or App Password for SMTP authentication | **YES** |
| `SMTP_FROM_NAME` | Optional | `"Loan Approve Desk"` | Display sender name shown in recipient inbox | No |
| `SMTP_FROM_EMAIL`| Optional | `"notifications@loanapprove.com"` | Return path email address for outgoing communications | No |
| `SMTP_SECURE` | Optional | `false` | Set `true` if connecting over implicit SSL (port `465`) | No |
| `WHATSAPP_PROVIDER`| **Required**| `meta` / `wabridge` / `development` | Active WhatsApp messaging engine | No |
| `WHATSAPP_API_URL` | If `meta` | `https://graph.facebook.com/v18.0` | Base endpoint URL for Meta Cloud API | No |
| `WHATSAPP_API_VERSION`| Optional | `v18.0` | API version string for Meta Graph API calls | No |
| `WHATSAPP_PHONE_NUMBER_ID`| If `meta` | `1032424393284050` | Meta Phone Number ID associated with WhatsApp sender | No |
| `WHATSAPP_BUSINESS_ACCOUNT_ID`| If `meta`| `946428907892164` | Meta Business Account ID (WABA ID) | No |
| `WHATSAPP_PHONE_NUMBER`| If `meta` | `+919876543210` | Sender WhatsApp phone number with country code | No |
| `WHATSAPP_ACCESS_TOKEN`| If `meta` | `EAAG...` | Permanent System User Access Token for Meta Graph API | **YES** |

### Client Environment Variables (`/client/.env`)

| Variable Name | Required | Default / Example | Purpose & Description | Exposed to Browser? |
| :--- | :---: | :--- | :--- | :---: |
| `VITE_API_URL` | Optional | `/api` / `https://api.loanapprove.com/api` | Base API endpoint prefix used by frontend `apiClient` | **Yes** (Bundled) |

---

## 💬 WhatsApp Integration Guide (Very Detailed)

Loan Approve includes a production-ready WhatsApp notification system supporting both the official **Meta Cloud API** (`WHATSAPP_PROVIDER=meta`) and **WABridge Gateway** (`WHATSAPP_PROVIDER=wabridge`), with fallback to a console sandbox logger in development (`WHATSAPP_PROVIDER=development`).

### 1. Account & Credential Setup (Meta Cloud API)
1. **Meta for Developers Account**: Navigate to [developers.facebook.com](https://developers.facebook.com/) and register a business developer account.
2. **Create App**: Select App Type **Business** and name it `Loan Approve Messaging`.
3. **Add WhatsApp Product**: In the app dashboard, locate **WhatsApp** and click **Set up**.
4. **Link Phone Number**: Add a dedicated phone number. Complete OTP verification to obtain the `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_BUSINESS_ACCOUNT_ID`.
5. **System User Token**:
   - Go to Meta Business Manager -> **Business Settings** -> **Users** -> **System Users**.
   - Create a System User with role **Admin**.
   - Assign the `Loan Approve Messaging` app to the system user.
   - Click **Generate Token**, select permissions `whatsapp_business_messaging` and `whatsapp_business_management`, and choose **Never expire**.
   - Copy the generated token into `WHATSAPP_ACCESS_TOKEN`.

### 2. Standard Approved Message Templates
WhatsApp requires pre-approved message templates for business-initiated conversations. Create the following templates in Meta WhatsApp Manager:

#### Template 1: Loan Application Approval (`loan_approval_notification`)
- **Header**: Text (`LOAN APPROVAL NOTICE`)
- **Category**: Utility
- **Body**:
  ```text
  Dear {{1}}, congratulations! Your loan application {{2}} has been APPROVED for Rs. {{3}}/-. Please log into your portal to review and accept your loan terms.
  ```
- **Variables**: `{{1}}` = Customer Name, `{{2}}` = Application Number, `{{3}}` = Approved Amount

#### Template 2: KYC Clearance Notice (`kyc_status_notification`)
- **Header**: Text (`KYC VERIFICATION UPDATE`)
- **Category**: Utility
- **Body**:
  ```text
  Hello {{1}}, your KYC verification status has been updated to: {{2}}. Log into your Loan Approve account to view details.
  ```
- **Variables**: `{{1}}` = Customer Name, `{{2}}` = Status (`APPROVED` / `REJECTED`)

#### Template 3: Charge Payment Invoice Receipt (`charge_invoice_receipt`)
- **Header**: Text (`PAYMENT RECEIPT`)
- **Category**: Utility
- **Body**:
  ```text
  Dear {{1}}, payment of Rs. {{2}}/- for {{3}} (Receipt: {{4}}) has been verified. Download your official tax invoice in your dashboard.
  ```
- **Variables**: `{{1}}` = Customer Name, `{{2}}` = Amount, `{{3}}` = Charge Type, `{{4}}` = Invoice Number

### 3. Application Events Triggering WhatsApp Dispatch
- Customer Registration (Welcome Message)
- KYC Status Verification / Document Re-upload Request
- Loan Application Approval / Offer Modification
- Payment Verification & Invoice Generation

### 4. Troubleshooting WhatsApp Integration
- **Error `401 Unauthorized`**: Indicates expired or invalid `WHATSAPP_ACCESS_TOKEN`. Ensure a System User token with permanent duration is used.
- **Error `400 Bad Request (100: Invalid Parameter)`**: Verify recipient mobile number is formatted with international country code without spaces (e.g. `919876543210`).
- **Template Mismatch Error `132001`**: Occurs if variable placeholder counts in payload do not match approved template structure in Meta dashboard.

---

## ✉️ SMTP / Email Integration Guide (Very Detailed)

Email dispatch is managed by `Nodemailer` (`/server/src/services/emailService.ts`).

### 1. Supported Email Engine Modes
- **`EMAIL_PROVIDER=smtp`**: Uses custom SMTP server (Gmail, SendGrid, Amazon SES, Mailgun, Postmark, cPanel SMTP).
- **`EMAIL_PROVIDER=ethereal`**: Automatically creates disposable test inbox on Ethereal.email and logs preview URLs to console.
- **`EMAIL_PROVIDER=development`**: Intercepts outgoing emails and logs subject/content to server log without sending.

### 2. Gmail SMTP Setup Example
If using Gmail for outgoing transactional emails:
1. Enable **2-Step Verification** in your Google Account security settings.
2. Generate an **App Password**: Go to **App Passwords**, select App: *Mail*, Device: *Other (Loan Approve)*, and click *Generate*.
3. Copy the 16-character generated code.
4. Configure `.env`:
   ```env
   EMAIL_PROVIDER=smtp
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your.email@gmail.com
   SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx
   SMTP_FROM_NAME="Loan Approve Desk"
   SMTP_FROM_EMAIL=your.email@gmail.com
   SMTP_SECURE=false
   ```

### 3. Application Events Triggering Emails
- Borrower Registration Verification
- KYC Approval / Re-upload Notices
- Loan Sanction Letter Delivery (attaches Approval Letter PDF)
- Tax Invoice Delivery (attaches Invoice PDF)
- Admin Support Ticket Replies

---

## 🗄️ MySQL & Aiven Cloud Database Architecture

The backend persistence layer uses **MySQL 8.0** connected through **Prisma ORM 6.19.3**.

```
Backend Code (TypeScript) ──> Prisma Client ──> Connection Pool ──> Aiven MySQL Cloud (Port 17819)
```

### 1. Production Migration & Deployment Process

> 🛑 **CRITICAL PRODUCTION DATABASE RULES**:
> 1. **NEVER run `npx prisma migrate dev` on a production database**. `migrate dev` creates new migrations and can attempt database resets.
> 2. **NEVER run `npx prisma migrate reset` or `npx prisma db push --force-reset` on production**. This will drop tables and destroy live data.
> 3. **ALWAYS use `npx prisma migrate deploy` for production database updates**.

To safely apply migrations and seed production system defaults:
```bash
# Step 1: Generate Prisma Client types
npx prisma generate

# Step 2: Apply pending schema migrations safely
npx prisma migrate deploy

# Step 3: Seed system defaults (Master Admin & Default Branding)
npx prisma db seed
```

---

## 📊 Database Verification & Monitoring Queries

To verify database tables and data state on Aiven MySQL or local MySQL server:

### 1. Connecting via MySQL CLI
```bash
mysql -h mysql-212fa3e9-bharatmirgule080-641c.j.aivencloud.com -P 17819 -u avnadmin -p --ssl-mode=REQUIRED defaultdb
```

### 2. Table Count & Schema Verification Query
```sql
USE defaultdb;

-- List all tables in current database
SHOW TABLES;

-- Count total tables in database
SELECT COUNT(*) AS total_tables 
FROM information_schema.tables 
WHERE table_schema = DATABASE();
```

### 3. Record Count Audit Queries
```sql
-- Verify Master Admin Account (MUST return 1)
SELECT id, email, fullName, role, isActive, lastLoginAt FROM AdminUser;

-- Count Borrower Accounts
SELECT COUNT(*) AS total_customers FROM Customer;

-- Count Active Loan Applications
SELECT status, COUNT(*) AS application_count FROM LoanApplication GROUP BY status;

-- Count Documents Uploaded
SELECT documentType, COUNT(*) AS doc_count FROM LoanDocument GROUP BY documentType;

-- Count Verified Charges & Payments
SELECT status, COUNT(*) AS payment_count FROM Payment GROUP BY status;

-- Verify Branding Settings (MUST return 1 record with id = 'default')
SELECT id, companyName, companyLegalName, email, phone, address FROM BrandingSettings;
```

---

## 💻 Local Development Walkthrough

### 1. Clone Repository & Install Dependencies
```bash
git clone https://github.com/sujalmirgule/loan-MERN.git
cd Loan-Approve

# Install Server Dependencies
cd server
npm install

# Install Client Dependencies
cd ../client
npm install
```

### 2. Configure Local Environment
Create `server/.env` with your local or test MySQL credentials:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
DATABASE_URL="mysql://root:password@localhost:3306/loan_approve_dev"
JWT_SECRET=local_development_secret_key_32_characters_long
ADMIN_EMAIL=admin@loanapprove.com
ADMIN_PASSWORD=Admin@123
SEED_DEMO_DATA=false
EMAIL_PROVIDER=ethereal
WHATSAPP_PROVIDER=development
```

### 3. Initialize Local Database
```bash
cd server
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

### 4. Run Development Servers
```bash
# Terminal 1: Run Express Server (Port 5000)
cd server
npm run dev

# Terminal 2: Run Vite Frontend (Port 5173)
cd client
npm run dev
```
Open `http://localhost:5173` in your browser. Log into Admin Console at `http://localhost:5173/admin/login` using credentials `admin@loanapprove.com` / `Admin@123`.

---

## 🚀 Production Deployment & Build Walkthrough

### 1. Build Verification Commands
```bash
# Build Backend TypeScript
cd server
npm run build

# Build Frontend Production Bundle
cd ../client
npm run build
```

### 2. Production Server Execution
```bash
cd server
NODE_ENV=production npm start
```

---

## ❓ Troubleshooting & Frequently Asked Questions

### Q1: Admin Dashboard remains stuck on skeleton loader.
- **Cause**: Missing or invalid Authorization header in request, or unhandled 401 token expiration.
- **Fix**: Log out and re-authenticate via `/admin/login`. Ensure `adminService.getDashboard` robustly handles payload unwrapping.

### Q2: Prisma fails with `P2002 Unique constraint failed`.
- **Cause**: Attempting to insert a duplicate unique field (e.g. mobile, email, applicationNumber).
- **Fix**: Check that customer mobile numbers and loan numbers are unique before invoking create calls.

### Q3: Generated PDF shows missing images or boxes instead of logo.
- **Cause**: Inaccessible or invalid image URL / Base64 string in `BrandingSettings`.
- **Fix**: Update `logoUrl` or `watermarkLogoUrl` in Admin Branding settings with a valid HTTPS image URL or long Base64 string.

---

## 🛡️ Security & Compliance Principles

1. **Authentication & Authorization**: Role-Based Access Control (RBAC) enforced via JWT tokens. `SUPER_ADMIN` holds administrative bypass, while `ADMIN` and `STAFF` operate under explicit granular permission scopes (`customers.view`, `applications.approve`, etc.).
2. **Data Encryption**: Borrower passwords are hashed using `bcryptjs` with salt factor 10. Sensitive identity data (Aadhaar & PAN numbers) are stored encrypted at rest.
3. **No Secret Commits**: Environment files `.env` are strictly ignored by `.gitignore`. Templates `.env.example` contain only placeholder configuration.

---

### 📝 Maintainer Handover Confirmation
- **Project Name**: Loan Approve Enterprise Platform
- **Master Admin Account**: `admin@loanapprove.com`
- **Database Engine**: Production MySQL 8.0 Cloud (Aiven MySQL)
- **Deployment Status**: Production-Ready & Verified
