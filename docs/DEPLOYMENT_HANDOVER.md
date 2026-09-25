# Client Deployment & Handover Guide

This guide details the step-by-step procedure for deploying the **Loan Approve** platform for a new client (or migrating across cloud database providers such as Aiven MySQL, AWS RDS, GCP Cloud SQL, or Azure Database for MySQL).

---

## Architecture Design

The Loan Approve application source code is 100% decoupled from client-specific database credentials and host environments. The core architecture follows:

```
Application (TypeScript / Express / React)
        ↓ Reads at startup
Environment Variables (server/.env)
        ↓ Resolves DATABASE_URL
Prisma Client
        ↓ Connects via SSL / TCP
Target Client MySQL Database (Aiven / AWS / GCP)
```

---

## Step-by-Step Client Onboarding Procedure

To deploy the same application codebase for a new client (e.g. **Client A**, **Client B**, or **Client C**):

### Step 1: Provision the MySQL Database
Create a dedicated MySQL 8.0+ database instance (e.g., on Aiven MySQL, AWS RDS, GCP Cloud SQL). Obtain the connection URI format:
```
mysql://<username>:<password>@<hostname>:<port>/<database_name>?ssl-mode=REQUIRED
```

### Step 2: Configure Environment Variables
Copy the production environment template:
```bash
cp server/.env.example server/.env
```
Edit `server/.env` with the client's infrastructure parameters:
```env
NODE_ENV=production
PORT=5000
CLIENT_URL=https://loans.clientdomain.com
DATABASE_URL="mysql://client_user:SecureClientPass123!@aiven-host.aivencloud.com:12345/loan_approve_db?ssl-mode=REQUIRED"
JWT_SECRET=your_client_specific_unique_32_plus_character_jwt_secret
ADMIN_EMAIL=admin@clientdomain.com
ADMIN_PASSWORD=InitialSecureAdminPassword123!
SEED_DEMO_DATA=false
```

### Step 3: Generate Prisma Client
```bash
cd server
npm run prisma:generate
```

### Step 4: Execute Production Database Migrations
Deploy the complete MySQL table structures, indexes, foreign keys, and constraints:
```bash
npx prisma migrate deploy
```
*(Note: Never run `npx prisma migrate dev` in a production environment)*

### Step 5: Seed Initial Production System Configuration
Seed the master Super Admin user and initial system configuration defaults (Branding, Multi-Tenant Domains, Payment Config, Master Charges):
```bash
npx prisma db seed
```
*(With `SEED_DEMO_DATA=false`, this seeds ONLY system settings and the hashed admin user — ZERO fake customer or loan records are created)*

### Step 6: Build Server & Frontend SPA
```bash
# From workspace root
npm run build
```

### Step 7: Launch Application
```bash
cd server
npm start
```
*(Or launch using PM2 / systemd / Docker container)*

---

## Verifying Client Isolation

To switch the application to point to another client's database (e.g., **Client B**):
1. Stop the application server process.
2. Update `DATABASE_URL` in `server/.env` to Client B's database URI.
3. Update `CLIENT_URL` and `ADMIN_EMAIL` in `server/.env`.
4. Execute `npx prisma migrate deploy` and `npx prisma db seed`.
5. Restart the application server.

**Result**: The application connects cleanly to Client B's database with 0 code modifications.
