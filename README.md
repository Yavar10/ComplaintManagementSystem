# SIH26264 — Integrated Institution Complaint Management and Intelligence System

An enterprise-grade, database-backed regulatory complaint intelligence and lifecycle management web application designed for higher and technical education regulatory bodies (e.g., AICTE, State Technical Directorates).

---

## 🏛️ Problem Statement: SIH26264
Regulatory authorities receive thousands of multi-faceted complaints regarding technical institutions (e.g. ghost faculty, safety and lab deficiencies, illegal fee extortion, academic non-compliance). Managing these requires:
- Coordinated multi-departmental investigation without record duplication.
- Deterministic, explainable duplicate and related complaint detection.
- SLA deadline calculation, automated alerts, and proactive overdue escalation.
- Immutable audit trails tracking every status transition and custody change.
- Real-time institutional compliance analytics.

---

## 🚀 Key Features

| Capability | Implementation |
|---|---|
| **Deterministic Duplicate Detection** | Hybrid explainable algorithm combining title character bigrams, description TF-IDF token overlap, identical institution matching, and grievance taxonomy weights. |
| **Human-in-the-Loop Review** | Centralized Duplicate Review Center. Artificial intelligence suggests candidate matches with explainability signals; human officers confirm or dismiss. AI never auto-merges or deletes complaints. |
| **Multi-Department Coordination** | Single canonical complaint record with `complaint_departments` coordination links (`PRIMARY`, `COLLABORATING`, `INFORMATION_REQUESTED`). |
| **Strict State Machine Workflow** | Finite state machine enforcing due process: `SUBMITTED` &rarr; `UNDER_REVIEW` &rarr; `ASSIGNED` &rarr; `IN_PROGRESS` &rarr; `RESOLVED` &rarr; `CLOSED` / `REOPENED` / `REJECTED`. |
| **SLA Monitoring & Escalation** | Idempotent background job (`slaMonitor.ts`) scanning for approaching deadlines and overdue breaches, automatically alerting officers and escalating to Department Heads. |
| **Role-Based Access Control** | Server-side enforcement across 5 roles: `SYSTEM_ADMIN`, `ADMINISTRATOR`, `DEPARTMENT_HEAD`, `COMPLAINT_OFFICER`, and `READ_ONLY_AUDITOR`. Non-admins are scoped strictly to their department jurisdiction. |
| **Immutable Audit Trail** | Every mutating action (creation, status advance, reassignment, resolution) records an immutable audit log with actor ID, IP address, and JSON diffs. |

---

## 🛠️ Technology Stack

- **Frontend:** React 19, JavaScript, Vite 8, Tailwind CSS v4, Lucide React, React Router, Recharts, TanStack Query.
- **Backend:** Node.js, Express.js, TypeScript, Prisma ORM, Zod validation, cookie-based JWT authentication, Helmet, Rate Limiter.
- **Database:** PostgreSQL (with embedded zero-friction development runner fallback for instant Windows startup).
- **Testing:** Vitest, Supertest integration test suite (14/14 automated tests passing).

---

## ⚡ Quickstart Guide (Windows PowerShell)

### 1. Backend Setup & Database Seeding
Open PowerShell in the backend directory:
```powershell
cd d:\Projects\inno\backend
npm install
npm run db:push
npm run db:seed
npm run dev
```
*The backend starts at `http://localhost:5000` with the health endpoint at `http://localhost:5000/api/v1/health`.*

### 2. Frontend Launch
In a second PowerShell terminal:
```powershell
cd d:\Projects\inno\frontend
npm install
npm run dev
```
*Visit `http://localhost:5173` in your browser.*

### 3. Run Automated Tests
```powershell
cd d:\Projects\inno\backend
npm test
```

---

## 👥 Evaluation Demo Accounts

All pre-seeded demo accounts share the development password: `Password@123`. The login screen features convenient one-click quick-fill buttons for evaluation:

| Role | Email | Password | Primary Scope |
|---|---|---|---|
| **SYSTEM_ADMIN** | `sysadmin@aicte.gov.in` | `Password@123` | Full administrative control, user provisioning, audit inspection |
| **ADMINISTRATOR** | `admin@aicte.gov.in` | `Password@123` | Cross-department intake, assignment, duplicate review, SLA oversight |
| **DEPARTMENT_HEAD** | `head.academic@aicte.gov.in` | `Password@123` | Academic Compliance division head, officer assignment, workload monitoring |
| **COMPLAINT_OFFICER** | `officer.academic@aicte.gov.in` | `Password@123` | Investigating officer, evidence uploads, internal notes, resolution draft |
| **READ_ONLY_AUDITOR** | `auditor@aicte.gov.in` | `Password@123` | Read-only inspection of cases, audit logs, and analytics export |

---

## 📚 Project Documentation

Complete architectural and operational specifications are available in the [`docs/`](./docs) directory:

1. [Requirements & Setup Guide](./docs/REQUIREMENTS_AND_SETUP.md) — Prerequisites, detailed installation, troubleshooting.
2. [Architectural Decision Records (ADRs)](./docs/DECISIONS.md) — 35 formal decision records documenting technical choices.
3. [System Architecture](./docs/ARCHITECTURE.md) — 3-tier architecture diagram, request lifecycle, design patterns.
4. [Database Schema Specification](./docs/DATABASE_SCHEMA.md) — Relational model, tables, constraints, foreign keys, indexes.
5. [REST API Specification](./docs/API_SPECIFICATION.md) — Endpoints under `/api/v1`, request/response payloads, status codes.
6. [Business Workflows & State Machine](./docs/BUSINESS_WORKFLOWS.md) — State transition matrix, duplicate detection formulation, collaboration.
7. [Security Architecture & Controls](./docs/SECURITY.md) — Threat modeling, RBAC, input sanitization, attachment quarantine.
8. [Implementation Plan & Progress](./docs/IMPLEMENTATION_PLAN.md) — 11 development phases and verification checklists.
9. [Cloud Deployment & Hosting Guide](./docs/DEPLOYMENT_GUIDE.md) — Step-by-step instructions for Vercel, Render, Neon, Docker, and Nginx.

---

## 📄 License
Developed for the Smart India Hackathon 2026 (SIH26264).
