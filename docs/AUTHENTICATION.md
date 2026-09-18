# Authentication & Authorization Specification: Loan Approve

## 1. Overview
Loan Approve implements a multi-role, token-based authentication and server-side authorization architecture designed for financial applications. The system strictly separates **Customer** and **Administrator** access, enforces input normalization, protects sensitive personal data (Aadhaar, income), and maintains an immutable audit trail.

---

## 2. Roles
Only two distinct roles exist on the platform:
- `CUSTOMER`: Borrowers who register, apply for loans, sign agreements, and manage repayments.
- `ADMIN`: Platform operations personnel who review KYC documents, approve/reject loans, adjust offers, and record manual disbursements.

---

## 3. Customer Authentication Flow
### A. Registration
1. Borrower submits: Full Name, Mobile Number (10 digits), Email Address, Residential Address, State, City, Aadhaar Number (12 digits), and Monthly Income.
2. System checks for duplicate mobile numbers. If an active or archived record exists, returns HTTP 409 (`Mobile number already registered`).
3. State and City are validated against the official Indian state-city dataset.
4. Aadhaar is encrypted using HMAC-SHA256 for duplicate tracking and masked (`XXXX XXXX 1234`) for display. Full Aadhaar is never exposed in API payloads or JWT tokens.
5. Customer status defaults to `ACTIVE` with `isDeleted = false`.
6. System records a `CUSTOMER_REGISTER` audit entry.
7. System generates a signed JWT token containing `{ sub: customerId, role: "CUSTOMER" }` and returns it alongside safe profile information.

### B. Login (Passwordless Mobile Flow)
1. Customer enters 10-digit mobile number.
2. Backend queries database for customer with matching normalized mobile.
3. If not found, returns HTTP 404 (`Customer account not found. Please register first.`).
4. If `status !== 'ACTIVE'` or `isDeleted === true`, returns HTTP 403 (`Account deactivated or suspended`).
5. Generates signed JWT token and returns safe profile data.
6. Records `CUSTOMER_LOGIN` audit event.

### C. Future OTP Extension Point
The authentication architecture is abstracted in `authService.ts`. To introduce SMS OTP verification in future releases without architectural rework:
- Add `requestOtp(mobile)` endpoint creating an OTP challenge record.
- In `loginCustomer`, require `otp` parameter and verify against the challenge record before calling `generateAuthToken`.

---

## 4. Administrator Authentication Flow
1. Administrator signs in with Email and Password.
2. Backend queries `AdminUser` table by lowercase trimmed email.
3. Passwords are verified against salted bcrypt hashes (`bcryptjs.compare`).
4. If user not found or password does not match, returns generic HTTP 401 (`Invalid email or password.`) to prevent email enumeration.
5. On success, updates `lastLoginAt`, records `ADMIN_LOGIN_SUCCESS` audit event, and issues an admin JWT token (`role: "ADMIN"`).
6. Failed attempts log `ADMIN_LOGIN_FAILED` in `AuditLog`.

---

## 5. Security & Authorization Enforcement
- **Token Security**: Tokens contain only `{ sub: userId, role: "CUSTOMER" | "ADMIN" }`. No PII, Aadhaar, email, or income is included in claims.
- **Server-Side Authorization**:
  - `authenticate`: Extracts Bearer token, verifies signature, verifies database record is active and not deleted.
  - `requireCustomer`: Restricts route to `role === 'CUSTOMER'`, rejecting admins or unauthenticated calls.
  - `requireAdmin`: Restricts route to `role === 'ADMIN'`, rejecting customers with HTTP 403.
- **Rate Limiting**: Authentication endpoints are protected by `authLimiter` allowing up to 20 requests per 15 minutes per IP.
- **IDOR Protection**: All resource operations verify that `req.user.id === resource.customerId`.

---

## 6. API Endpoints
| Method | Path | Auth Required | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/customer/register` | No | Public | Register new customer account |
| `POST` | `/api/auth/customer/login` | No | Public | Passwordless customer login via mobile |
| `POST` | `/api/auth/admin/login` | No | Public | Administrator email + password login |
| `GET` | `/api/auth/me` | Yes (Bearer) | Any | Returns current user profile without secrets |
| `POST` | `/api/auth/logout` | Yes (Bearer) | Any | Invalidate session & record audit log |
| `GET` | `/api/customers/profile` | Yes (Bearer) | `CUSTOMER` | Customer profile management |
| `GET` | `/api/admin/status` | Yes (Bearer) | `ADMIN` | Admin portal access verification |
