# LOAN APPROVE — Production-Grade Fintech Loan Management Platform

## 1. Overview
**Loan Approve** is an end-to-end, production-grade fintech loan management platform designed for real customers and financial operations administrators. It combines a mobile-first responsive customer experience with an administrative command center, strict state machine transitions, decimal-safe financial calculations, immutable audit logging, manual disbursement tracking, and white-label branding.

---

## 2. Architecture
```text
loan-approve/
├── client/          # React 18, TypeScript, Vite, Tailwind CSS, Lucide, Recharts
│   ├── src/
│   │   ├── api/     # Centralized API client and endpoints
│   │   ├── components/ # Accessible UI component library (shadcn/ui primitives)
│   │   ├── layouts/ # CustomerLayout (mobile bottom nav) & AdminLayout (sidebar)
│   │   ├── pages/   # Customer and Admin route views
│   │   └── lib/     # Formatter, masking, and styling utilities
├── server/          # Express, TypeScript, Prisma ORM, SQLite (WAL mode), Zod
│   ├── src/
│   │   ├── config/  # Validated environment loader
│   │   ├── controllers/ # HTTP route handlers
│   │   ├── middleware/  # Helmet, CORS, Rate Limit, Error Handler
│   │   ├── routes/  # REST API endpoints
│   │   ├── services/# Database singleton & business services
│   │   └── utils/   # Structured logging and helper tools
│   └── prisma/      # Schema (12 entities), migrations, seed script
├── docs/            # Technical architecture and environmental specifications
└── package.json     # Monorepo orchestrator scripts
```

---

## 3. Prerequisites
- **Node.js**: v20+ (Tested on v24.14.0)
- **npm**: v10+ (Tested on v11.9.0)
- **Git**: v2.40+

---

## 4. Getting Started

### Installation
From the root directory:
```bash
# 1. Install root dependencies
npm install

# 2. Install client and server dependencies
npm install --prefix client
npm install --prefix server
```

### Database Setup
```bash
# Push Prisma schema to SQLite dev.db
npm run prisma:migrate --prefix server

# Seed database with initial Admin and default branding
npm run prisma:seed --prefix server
```

### Running in Development
To run both backend and frontend concurrently:
```bash
npm run dev
```
- **Frontend Portal**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`
- **API Health Check**: `http://localhost:5000/api/health`

---

## 5. Verification & Testing
```bash
# Run tests across frontend and backend
npm run test

# Run strict linter across frontend and backend
npm run lint

# Build production bundles
npm run build
```

---

## 6. Seed Credentials (Development)
- **Admin Email**: `admin@loanapprove.com`
- **Admin Password**: `Admin@123456`
