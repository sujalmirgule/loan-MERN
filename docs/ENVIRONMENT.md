# Production Environment Configuration Guide

## Overview

The **Loan Approve** platform is engineered for zero-code multi-tenant / multi-client deployment. Switching database instances (e.g. Aiven MySQL, AWS RDS, GCP Cloud SQL) or deploying for a new client requires **NO modifications** to application source code or build artifacts. All client-specific infrastructure secrets and targets are injected via standard environment variables.

---

## Server Production Environment Variables (`server/.env`)

| Variable | Type / Example | Required | Purpose |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `production` | **Yes** | Operating mode (`production`, `development`, `test`) |
| `PORT` | `5000` | **Yes** | HTTP listening port for Express API |
| `CLIENT_URL` | `https://clienta-loans.com` | **Yes** | Authorized origin URL for CORS policy and PDF verification links |
| `DATABASE_URL` | `"mysql://user:pass@host:3306/dbname"` | **Yes** | Prisma MySQL database connection URL |
| `JWT_SECRET` | `32+ random characters` | **Yes** | Cryptographic key for signing JWT authentication tokens |
| `JWT_EXPIRES_IN` | `7d` | **No** | Expiration lifetime for JWT tokens (default: `7d`) |
| `ADMIN_EMAIL` | `admin@clienta-loans.com` | **Yes** | Email for the initial production Super Admin account |
| `ADMIN_PASSWORD` | `SecurePassword123!` | **Yes** | Secure password for initial Super Admin seeding |
| `UPLOAD_DIR` | `./uploads` | **No** | Filesystem storage path for uploaded customer KYC documents |
| `MAX_FILE_SIZE_MB` | `10` | **No** | Maximum file upload size limit in MB (default: `10`) |
| `SEED_DEMO_DATA` | `false` | **Yes** | Controls seeding (`false` for production, `true` for dev/demo) |

### Communication Service Overrides (Optional / Client Specific)
| Variable | Type / Example | Purpose |
| :--- | :--- | :--- |
| `EMAIL_PROVIDER` | `smtp` | Email service mode (`smtp`, `ethereal`, `development`) |
| `SMTP_HOST` | `smtp.mailgun.org` | Primary outbound SMTP host |
| `SMTP_PORT` | `587` | Outbound SMTP TLS/SSL port |
| `SMTP_USER` | `postmaster@domain.com` | Outbound SMTP username |
| `SMTP_PASSWORD` | `secret` | Outbound SMTP password |
| `SMTP_FROM_EMAIL` | `notifications@domain.com` | Default sender email address |
| `SMTP_FROM_NAME` | `"Client A Loan Services"` | Default sender display name |
| `WHATSAPP_PROVIDER` | `meta` | WhatsApp integration mode (`meta`, `wabridge`, `development`) |
| `WHATSAPP_PHONE_NUMBER_ID` | `1032424...` | Meta WhatsApp Cloud API Phone Number ID |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | `9464289...` | Meta Business Account ID |
| `WHATSAPP_ACCESS_TOKEN` | `EAAG...` | Meta Graph API bearer access token |

---

## Security Mandates

1. **Database Secrets Isolation**: Infrastructure secrets (`DATABASE_URL`, DB passwords, DB hosts) are strictly managed via host environment variables / secret managers. They are **NEVER** exposed via the Admin Panel API or stored in client-facing databases.
2. **Repository Protection**: Neither `.env` nor production credential files are committed to version control. Standard templates (`.env.example`) contain placeholders only.
