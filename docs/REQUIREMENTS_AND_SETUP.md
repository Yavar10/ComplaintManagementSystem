# Requirements and Setup Guide
## SIH26264 — Integrated Institution Complaint Management and Intelligence System

This document provides complete instructions for developers and evaluators to install, configure, run, and test the application from a clean development environment on Windows (PowerShell) or Linux/macOS.

---

### A. Project Overview
- **Problem Statement:** SIH26264 — Integrated Dashboard for Institution-Related Complaints.
- **Purpose:** A centralized, multi-department complaint tracking, duplicate detection, and institutional intelligence platform designed for higher and technical education regulatory bodies (such as AICTE / State Technical Directorates).
- **Key Capabilities:**
  - Automated complaint registration with atomic unique complaint numbering.
  - Role-based workflows (System Admin, Admin, Department Head, Complaint Officer, Read-Only Auditor).
  - Multi-department cross-jurisdictional collaboration without complaint record duplication.
  - Deterministic and explainable duplicate/related complaint detection with human review workflow.
  - Proactive SLA deadline calculation, warning alerts, and automated overdue escalation.
  - Immutable audit trail tracking every transition, reassignment, and closure.
  - Real-time database-driven analytics and CSV reporting.

---

### B. Software Prerequisites
Tested and verified on Windows 11 with PowerShell 5.1 / 7+:
- **Node.js:** v20.x or v22.x or v24.x (Tested: `v24.22.0`).
- **npm:** v10.x or v12.x (Tested: `12.2.0`).
- **PostgreSQL:** v14, v15, v16, or v17 (Native PostgreSQL or the built-in embedded development runner).
- **Git:** v2.x (Tested: `Git for Windows 2.x`).

---

### C. Project Structure
```text
inno/
├── frontend/                   # React 19 + Vite 8 Client Application
│   ├── public/                 # Static assets and icons
│   ├── src/
│   │   ├── components/         # Reusable UI primitives (Buttons, Badges, Modals, Tables)
│   │   ├── features/           # Domain-specific UI modules
│   │   │   ├── auth/           # Login form, Auth Context, Route Guards
│   │   │   ├── dashboard/      # Executive KPI overview & charts
│   │   │   ├── complaints/     # Registry, submission form, detail view, timeline
│   │   │   ├── institutions/   # Institution directory & compliance profiles
│   │   │   ├── duplicates/     # Duplicate review center
│   │   │   ├── notifications/  # Notification center drawer
│   │   │   ├── analytics/      # Deep dive charts & CSV export
│   │   │   └── admin/          # User & department administration
│   │   ├── services/           # Axios/Fetch API client abstractions
│   │   ├── App.jsx             # Top-level routing and layout provider
│   │   ├── main.jsx            # Application entry point
│   │   └── index.css           # Styling & design system tokens
│   ├── package.json
│   └── vite.config.js
│
├── backend/                    # Node.js + Express + TypeScript Backend
│   ├── prisma/
│   │   ├── schema.prisma       # Complete relational database model
│   │   └── seed.ts             # Deterministic seed script with demo data
│   ├── src/
│   │   ├── config/             # Environment, DB, and constants configuration
│   │   ├── middleware/         # Auth, RBAC, error handling, validation, audit
│   │   ├── modules/            # Domain modules (auth, complaints, institutions, etc.)
│   │   ├── services/           # Reusable services (duplicate engine, SLA monitor)
│   │   ├── app.ts              # Express application setup
│   │   └── server.ts           # Server bootstrap and background job initiator
│   ├── tests/                  # Supertest API and integration tests
│   ├── tsconfig.json
│   └── package.json
│
├── docs/                       # Architecture, Decisions, APIs, Security Docs
│   ├── REQUIREMENTS_AND_SETUP.md
│   ├── DECISIONS.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── API_SPECIFICATION.md
│   ├── BUSINESS_WORKFLOWS.md
│   ├── SECURITY.md
│   └── IMPLEMENTATION_PLAN.md
│
├── .gitignore
└── README.md
```

---

### D. Installation Instructions (Step-by-Step)

#### 1. Open Project Root
Open PowerShell in the project directory:
```powershell
cd D:\Projects\inno
```

#### 2. Install Backend Dependencies
```powershell
cd backend
npm install
```

#### 3. Configure Backend Environment
Copy the example environment file and adjust if necessary:
```powershell
cp .env.example .env
```
Default configuration in `backend/.env`:
```text
DATABASE_URL="postgresql://postgres:password@localhost:5432/inno_complaints?schema=public"
PORT=5000
NODE_ENV=development
JWT_SECRET=sih2026_super_secure_institutional_secret_key_minimum_32_characters
CLIENT_URL=http://localhost:5173
```

#### 4. Configure Database and Run Migrations
Run the database migrations and generate the Prisma client:
```powershell
npx prisma db push
```
*(Or `npx prisma db push --skip-generate` if the backend dev server is already running, avoiding Windows file-locking on `query_engine-windows.dll.node`)*

#### 5. Seed the Database
Populate standard AICTE departments, sample technical institutions, demo users, categories, SLA policies, and realistic sample complaints:
```powershell
npm run db:seed
```

#### 6. Install Frontend Dependencies
Open a second PowerShell terminal:
```powershell
cd D:\Projects\inno\frontend
npm install
```

#### 7. Start the Backend Server
In the `backend` terminal:
```powershell
npm run dev
```
The backend starts on `http://localhost:5000` with the health check available at `http://localhost:5000/api/v1/health`.

#### 8. Start the Frontend Application
In the `frontend` terminal:
```powershell
npm run dev
```
The Vite development server runs on `http://localhost:5173`.

---

### E. PostgreSQL Setup Details
If running an external PostgreSQL instance (e.g. standard PostgreSQL for Windows):
1. Create the database:
   ```powershell
   # In psql or pgAdmin:
   CREATE DATABASE inno_complaints;
   ```
2. Verify credentials match `backend/.env`:
   ```text
   DATABASE_URL="postgresql://<username>:<password>@localhost:5432/inno_complaints?schema=public"
   ```
3. Run `npx prisma db push` to synchronize the schema.
4. Run `npm run db:seed` to insert initial seed data.

*Note: Migrations define structural schema alterations, while seed scripts populate deterministic initial baseline data.*

---

### F. Environment Variables Reference

#### Backend (`backend/.env`)
| Variable | Required | Description | Example / Default |
|---|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/inno_complaints` |
| `PORT` | No | HTTP server listen port | `5000` |
| `NODE_ENV` | Yes | Environment (`development` / `production`) | `development` |
| `JWT_SECRET` | Yes | Cryptographic secret for signing JWTs | Minimum 32-character secure string |
| `JWT_EXPIRES_IN` | No | Token lifetime | `24h` |
| `CLIENT_URL` | Yes | Allowed CORS origin for frontend | `http://localhost:5173` |
| `UPLOAD_DIR` | No | Path to store local evidence uploads | `./uploads` |

#### Frontend (`frontend/.env`)
| Variable | Required | Description | Example / Default |
|---|---|---|---|
| `VITE_API_URL` | No | Backend API base URL | `http://localhost:5000/api/v1` |

---

### G. Starting the Application
Two terminals are used:
1. **Terminal 1 (Backend):**
   ```powershell
   cd D:\Projects\inno\backend
   npm run dev
   ```
2. **Terminal 2 (Frontend):**
   ```powershell
   cd D:\Projects\inno\frontend
   npm run dev
   ```
Visit `http://localhost:5173` in your browser.

---

### H. Demo Accounts (For Development & Evaluation)
The seed script generates five pre-configured demo accounts covering all operational roles. Each account has the default development password: `Password@123`.

| Role | Email | Password | Scope & Primary Capabilities |
|---|---|---|---|
| **SYSTEM_ADMIN** | `sysadmin@aicte.gov.in` | `Password@123` | Full administrative control, user/dept management, audit logs |
| **ADMINISTRATOR** | `admin@aicte.gov.in` | `Password@123` | Cross-department intake, assignment, duplicate review, SLA oversight |
| **DEPARTMENT_HEAD** | `head.academic@aicte.gov.in` | `Password@123` | Academic Compliance department head, officer assignment, workload monitoring |
| **COMPLAINT_OFFICER** | `officer.academic@aicte.gov.in` | `Password@123` | Investigating officer, investigation notes, document uploads, resolution |
| **READ_ONLY_AUDITOR** | `auditor@aicte.gov.in` | `Password@123` | Read-only inspection of cases, audit logs, and analytics export |

*Security Warning: These credentials are strictly intended for local development and demonstration.*

---

### I. Tests and Verification
- Run backend automated test suite:
  ```powershell
  cd D:\Projects\inno\backend
  npm test
  ```
- Build frontend for production verification:
  ```powershell
  cd D:\Projects\inno\frontend
  npm run build
  ```
- Check backend health endpoint:
  ```powershell
  Invoke-RestMethod http://localhost:5000/api/v1/health
  ```

---

### J. Troubleshooting Common Issues
1. **PostgreSQL Connection Refused:**
   - Verify that your PostgreSQL service is running.
   - Test connectivity with `psql -U postgres -h localhost` or verify `DATABASE_URL` in `backend/.env`.
2. **CORS Errors:**
   - Ensure `CLIENT_URL` in `backend/.env` exactly matches the Vite URL (`http://localhost:5173`).
3. **Port 5000 or 5173 Already in Use:**
   - Change `PORT` in `backend/.env` (e.g., `PORT=5001`) and update `VITE_API_URL` accordingly.
4. **Missing Uploads Directory:**
   - The backend automatically creates `backend/uploads/` on bootstrap if it does not exist.

---

### K. Known Limitations
- Background SLA jobs run inside the Node process timer; in multi-replica production clusters, an external distributed scheduler (such as Redis/BullMQ or pg-boss) is recommended.
- Evidence attachments are stored on protected local disk; production deployment should swap to an S3/GCS signed-URL object storage provider.
- Live external integrations with AICTE legacy ERP systems or National Academic Depository are simulated locally.
