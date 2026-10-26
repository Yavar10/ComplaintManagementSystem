# SIH26264 — Implementation Plan
## Integrated Institution Complaint Management and Intelligence System

### System Overview
This project delivers a production-grade, database-backed regulatory complaint intelligence and lifecycle management web application for technical education regulators (e.g., AICTE). It automates complaint submission, role-based review and multi-department coordination, transparent deadline/SLA escalation, deterministic duplicate and related complaint detection, audit logging, and institutional trend analytics.

---

### Implementation Phases & Status

#### Phase 1: Repository Inspection and Architecture Planning — [COMPLETED]
- [x] Inspect existing `frontend/` (Vite 8, React 19, vanilla CSS scaffolding) and empty `backend/`.
- [x] Establish strict frontend/backend separation.
- [x] Create comprehensive architecture documentation in `docs/`:
  - `REQUIREMENTS_AND_SETUP.md`
  - `DECISIONS.md`
  - `ARCHITECTURE.md`
  - `DATABASE_SCHEMA.md`
  - `API_SPECIFICATION.md`
  - `BUSINESS_WORKFLOWS.md`
  - `SECURITY.md`
  - `IMPLEMENTATION_PLAN.md`

#### Phase 2: Database Foundation — [COMPLETED]
- [x] Initialize Node.js TypeScript project in `backend/`.
- [x] Define Prisma Schema (`backend/prisma/schema.prisma`):
  - `users`, `roles`, `permissions`, `role_permissions`
  - `departments`, `institutions`
  - `complaints`, `complaint_categories`, `complaint_assignments`, `complaint_departments`
  - `complaint_comments`, `complaint_attachments`, `complaint_relationships`
  - `notifications`, `audit_logs`, `sla_policies`
- [x] Configure database connectivity supporting native PostgreSQL and zero-config development runner.
- [x] Synchronize database schema via `prisma db push` and verify schema constraints, indexes, and foreign keys.
- [x] Create deterministic database seed script (`backend/prisma/seed.ts`) populating demo accounts, departments, sample institutions, categories, SLA policies, and realistic test complaints.

#### Phase 3: Backend Foundation — [COMPLETED]
- [x] Configure Express.js server with TypeScript, CORS, helmet, cookie-parser, and rate limiting.
- [x] Implement central error handling, request logging, and health endpoint (`/api/v1/health`).
- [x] Implement secure session/cookie-based JWT authentication (`POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`).
- [x] Implement role-based and department-scoped authorization middleware (`authorizeRoles`, `restrictAuditorModifications`).
- [x] Implement audit logging middleware and service (`auditService.ts`).

#### Phase 4: Core Complaint APIs — [COMPLETED]
- [x] Implement CRUD for Institutions (`/api/v1/institutions`) with search, state, and type filters.
- [x] Implement CRUD for Departments (`/api/v1/departments`).
- [x] Implement Complaint Creation with atomic unique reference numbers (`CMP-YYYYMMDD-XXXXX`).
- [x] Implement Complaint retrieval with server-side pagination, multi-criteria filtering, and role scoping.
- [x] Implement atomic status transition engine enforcing state machine rules (`SUBMITTED` -> `UNDER_REVIEW` -> `ASSIGNED` -> `IN_PROGRESS` -> `RESOLVED` -> `CLOSED` / `REOPENED` / `REJECTED`).
- [x] Implement assignment engine with assignment history preservation in transactional boundaries.

#### Phase 5: Frontend Integration & Application Shell — [COMPLETED]
- [x] Install frontend dependencies (`react-router-dom`, `lucide-react`, `@tanstack/react-query`, `recharts`, `react-hook-form`, `zod`, `tailwindcss` v4, `@tailwindcss/vite`).
- [x] Build high-density professional regulatory layout: Sidebar, Header, User Profile, Notifications bell, Theme styling.
- [x] Implement Auth Context and protected route guards.
- [x] Implement Login Page with role selector quick-fill for local testing.
- [x] Build Executive Dashboard with real-time KPI metrics, department workloads, category breakdown charts, and critical overdue complaints.
- [x] Build Complaint Registry with search, filter drawers, status/priority badges, pagination, and sorting.
- [x] Build Complaint Submission Form with dynamic institution selection, category, priority, and file uploads.
- [x] Build Comprehensive Complaint Detail View with timeline, assignment switcher, notes, attachments, and action bar.

#### Phase 6: Explainable Duplicate & Related Complaint Detection — [COMPLETED]
- [x] Implement text normalisation (tokenisation, lowercasing, stop-word removal, whitespace stripping).
- [x] Implement deterministic hybrid similarity scoring:
  - Title similarity (Dice bigram coefficient)
  - Description TF-IDF / token overlap
  - Institution match bonus (+20%)
  - Category match weight (+10%)
- [x] Persist candidate relationships (`complaint_relationships`) with similarity score and explanation breakdown.
- [x] Build frontend Duplicate Review Center with side-by-side comparison and human confirmation/dismissal actions.
- [x] Enforce that artificial intelligence never merges or deletes complaints automatically.

#### Phase 7: Investigation, Notes, Attachments & Multi-Department Collaboration — [COMPLETED]
- [x] Implement internal investigation notes (`/api/v1/complaints/:id/comments`).
- [x] Implement secure local attachment storage with mime-type checking, file size limits, and authenticated streaming (`/api/v1/complaints/:id/attachments` and `/api/v1/attachments/:id/download`).
- [x] Implement multi-department collaboration (`complaint_departments`) allowing primary and collaborating departmental co-investigation.
- [x] Implement formal resolution and closure flows requiring mandatory findings summary and evidence checks.

#### Phase 8: Notifications Engine & SLA Deadline Scheduler — [COMPLETED]
- [x] Implement in-app persistent notifications (`/api/v1/notifications`).
- [x] Build background SLA monitoring job (`backend/src/jobs/slaMonitor.ts`):
  - First-response target verification
  - Resolution deadline tracking
  - Warning alert triggers (within 24h before deadline)
  - Escalation alert to department heads for overdue cases
- [x] Ensure idempotency to prevent duplicate notification spam.

#### Phase 9: Analytics, Administration & Audit Logs — [COMPLETED]
- [x] Implement database-aggregated analytics endpoints (`/api/v1/analytics/*`).
- [x] Build interactive Analytics dashboard with resolution times, category distribution, institution repeat offender trends, and SLA compliance rates.
- [x] Implement CSV export for compliant records and analytical reports (`GET /api/v1/analytics/export`).
- [x] Build User Management and Department Administration panels for `SYSTEM_ADMIN`.
- [x] Build Audit Trail viewer (`/api/v1/audit-logs`) with search and JSON change diff inspection.

#### Phase 10: Testing, Hardening & Verification — [COMPLETED]
- [x] Backend automated test suite (Supertest/Vitest): 14/14 tests passing.
  - Auth & permission boundaries
  - Status transition state machine
  - Atomic transactions on reassignment
  - Duplicate detection engine
  - SLA monitoring idempotency
- [x] Frontend production build validation (`npm run build`: built in 429ms).
- [x] End-to-end verification of complaint lifecycle across multiple roles.

#### Phase 11: Documentation & Delivery — [COMPLETED]
- [x] Verify that all documentation files accurately reflect the final code and commands.
- [x] Update root `README.md` with quickstart instructions and architecture links.
- [x] Final delivery report prepared.
