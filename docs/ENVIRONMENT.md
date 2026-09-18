# Environment Configuration Guide

## Server Environment Variables (`server/.env`)
| Variable | Default Value | Purpose |
| :--- | :--- | :--- |
| `NODE_ENV` | `development` | Operating mode (`development`, `test`, `production`) |
| `PORT` | `5000` | HTTP listening port for Express API |
| `CLIENT_URL` | `http://localhost:5173` | Allowed CORS origin for frontend |
| `DATABASE_URL` | `"file:./dev.db"` | Prisma connection string for SQLite database |
| `JWT_SECRET` | *(string, min 16 chars)* | Secret signing key for JWT session tokens |
| `ADMIN_EMAIL` | `admin@loanapprove.com` | Default admin email for bootstrap/seed |
| `ADMIN_PASSWORD` | `Admin@123456` | Default admin password for bootstrap/seed |
| `UPLOAD_DIR` | `./uploads` | Storage destination for uploaded borrower documents |
| `MAX_FILE_SIZE_MB` | `10` | Maximum allowable file size per upload |

## Client Environment Variables (`client/.env`)
| Variable | Default Value | Purpose |
| :--- | :--- | :--- |
| `VITE_API_URL` | `/api` | Base path or URL for backend REST API requests |
| `VITE_APP_NAME` | `"Loan Approve"` | Application title rendered in header |
