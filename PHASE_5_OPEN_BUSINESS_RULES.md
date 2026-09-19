# LOAN APPROVE — PHASE 5: OPEN BUSINESS RULES & CONFIGURABLE ARCHITECTURE

This document records business rules that are architecturally decoupled and configurable in the system rather than hardcoded with arbitrary values.

---

### 1. Exact Payment Charge Amount
- **Current Default**: ₹500 (configurable via `PaymentConfig` model).
- **Architecture**: Admin can dynamically update the charge amount and charge type (`PROCESSING_DEPOSIT` / `VERIFICATION_FEE`) in System Settings without code changes or restarts.

### 2. Payment Charge Calculation Rule
- **Current Default**: Fixed nominal deposit.
- **Architecture**: Pluggable into loan calculation layer; can support percentage of requested amount or fixed amount based on loan tier.

### 3. Payment Provider
- **Current Default**: Direct UPI / IMPS with customer UTR submission and admin verification.
- **Architecture**: Ready for gateway integration (Razorpay / Cashfree / PayU) via standard webhook / payment status contract.

### 4. Exact EMI Interest / Rate Formula
- **Current Default**: Reducing Balance EMI calculation:
  $$EMI = \frac{P \times r \times (1+r)^n}{(1+r)^n - 1}$$
  where $P$ is principal, $r$ is monthly interest rate, and $n$ is tenure in months.
- **Architecture**: Stored on `LoanApplication` with support for `interestType` (PERCENTAGE / FIXED) and `interestCalcMethod` (REDUCING_BALANCE / SIMPLE).

### 5. Re-application After Loan is Closed (One Approved Loan Rule)
- **Current Rule**: A customer/mobile can have only **ONE** active approved loan (`status: 'APPROVED'` or active repayment).
- **Configurability**: Once a loan is marked `CLOSED` or fully repaid, policy on whether the borrower is immediately eligible for a new loan is parameterized in the business validation service.

### 6. Payment Link Expiry
- **Architecture**: Timestamped `createdAt` on payment records with configurable expiry duration (default: 48 hours).

### 7. Refund Policy
- **Architecture**: Payment charge refund status can be marked if an application is subsequently cancelled or rejected.

### 8. Late Fees & Penalties
- **Architecture**: `EMISchedule` includes `status` ('UPCOMING', 'DUE', 'PAID', 'PARTIALLY_PAID', 'OVERDUE') with pluggable penalty calculation hooks.

### 9. EMI Due Date Rules
- **Current Default**: 5th day of each calendar month following disbursement.
- **Configurability**: Parameterized in `EMISchedule` generation service.

### 10. SMS Provider
- **Architecture**: Abstracted via `NotificationService`; can connect to Twilio, Gupshup, or MSG91.

### 11. WhatsApp Provider
- **Current Default**: Provider-agnostic configuration supporting Meta Cloud API, Twilio, or Gupshup with test ping capabilities and masked token storage.

### 12. Final Agreement Template
- **Current Default**: Standard fintech loan agreement template with dynamic variables (Borrower Name, Loan Amount, Tenure, EMI, Interest Rate, Date, IP).
- **Architecture**: Admin-configurable HTML/markdown agreement content template in database.

### 13. Exact Email Templates
- **Architecture**: Structured HTML email templates with dynamic brand tokens (Company Name, Logo, Support Email, Phone) triggered across 10 lifecycle events.
