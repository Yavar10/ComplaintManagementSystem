# Architectural Decision Records (ADRs)
## SIH26264 — Integrated Institution Complaint Management and Intelligence System

### ADR-01: Retain Existing Vite + React JavaScript Frontend
- **Status:** Accepted
- **Context:** The repository already contains an initial Vite + React frontend in JavaScript.
- **Decision:** Retain and build directly upon the existing JavaScript React frontend rather than replacing it with a new project or converting to TypeScript.
- **Reasoning:** Minimizes disruption, complies with repository constraints, avoids re-scaffolding overhead, and ensures smooth integration.
- **Alternatives Considered:** Complete migration to Next.js or TypeScript React.
- **Trade-offs:** Lack of static type checking in frontend; mitigated by Zod validation schemas for forms and API responses.
- **Consequences:** Frontend development proceeds with modular standard ECMAScript modules (.jsx) and standard Vite configuration.
- **Date:** 2026-10-26

---

### ADR-02: Strict Directory Separation for Frontend and Backend
- **Status:** Accepted
- **Context:** Clean separation of concerns between client UI and business logic/database layers is required.
- **Decision:** Isolate all backend server code, models, and migrations in `backend/` and UI code in `frontend/`.
- **Reasoning:** Prevents credential leaks, keeps dependencies decoupled, and enables independent build pipelines.
- **Alternatives Considered:** Monolithic single package.json or Next.js fullstack single folder.
- **Trade-offs:** Requires running two separate development servers or a root orchestrator.
- **Consequences:** Backend secrets and Prisma artifacts are physically quarantined from client bundle generation.
- **Date:** 2026-10-26

---

### ADR-03: REST API with Versioning (/api/v1)
- **Status:** Accepted
- **Context:** Frontend and backend communication contract needs to be predictable, testable, and maintainable.
- **Decision:** Implement JSON-based RESTful API under the `/api/v1` namespace.
- **Reasoning:** Industry standard, easy to inspect with browser network tools, seamless testing with Supertest, and allows future v2 iterations.
- **Alternatives Considered:** GraphQL, tRPC.
- **Trade-offs:** Slightly more boilerplate controllers compared to tRPC.
- **Consequences:** Standard HTTP verbs and status codes (200, 201, 400, 401, 403, 404, 409, 500) strictly enforced across all modules.
- **Date:** 2026-10-26

---

### ADR-04: Modular Service-Oriented Backend Architecture
- **Status:** Accepted
- **Context:** High-complexity complaint lifecycle with multiple domains (complaints, assignments, departments, duplicate review, SLA, analytics).
- **Decision:** Structure backend by domain modules (`modules/<domain>/{controller, service, routes, validation}.ts`).
- **Reasoning:** Keeps business logic isolated from HTTP routing concerns, facilitates unit testing of services, and prevents controller bloat.
- **Alternatives Considered:** Anemic MVC pattern or single giant routes file.
- **Trade-offs:** More files created initially.
- **Consequences:** Highly maintainable codebase with explicit transaction boundaries in service layers.
- **Date:** 2026-10-26

---

### ADR-05: PostgreSQL as Primary Relational Database
- **Status:** Accepted
- **Context:** Complaint records require strong ACID compliance, relational integrity, foreign keys, transaction rollbacks, and complex analytical grouping.
- **Decision:** Use PostgreSQL as the relational persistence engine.
- **Reasoning:** Native support for JSON columns, full-text search, trigram matching (`pg_trgm`), robust constraints, and reliable transactional concurrency.
- **Alternatives Considered:** MongoDB, SQLite, MySQL.
- **Trade-offs:** Requires a PostgreSQL instance; mitigated by supporting both local PostgreSQL services and embedded zero-config PostgreSQL for seamless development.
- **Consequences:** Full schema enforcement, foreign key cascades/restrictions, and atomic complaint assignments.
- **Date:** 2026-10-26

---

### ADR-06: Prisma ORM for Data Access and Migrations
- **Status:** Accepted
- **Context:** Need type-safe database queries, schema-as-code documentation, and automated migration management.
- **Decision:** Use Prisma ORM (`prisma/schema.prisma`).
- **Reasoning:** Auto-generated TypeScript types, declarative migrations, intuitive nested relational querying, and transaction helpers.
- **Alternatives Considered:** TypeORM, Knex, Drizzle.
- **Trade-offs:** Engine binary download overhead; occasionally less flexible than raw SQL for highly specific analytical queries (supplemented by `$queryRaw`).
- **Consequences:** Schema acts as the single source of truth for all database tables and relationships.
- **Date:** 2026-10-26

---

### ADR-07: Server-Side Validation and Business Rules
- **Status:** Accepted
- **Context:** Client-side validations can be bypassed; regulatory integrity demands tamper-proof request vetting.
- **Decision:** Validate all incoming HTTP payloads and query params using Zod schemas on the backend before controller execution.
- **Reasoning:** Strong security posture; prevents malformed payloads and injection vectors at the perimeter.
- **Alternatives Considered:** Manual conditional checks or Joi.
- **Trade-offs:** Duplication of validation rules between React Hook Form and backend Zod schemas.
- **Consequences:** Consistent 400 Bad Request error schemas with field-level issues returned to client.
- **Date:** 2026-10-26

---

### ADR-08: Secure Cookie-Based JWT Authentication
- **Status:** Accepted
- **Context:** Storing JWTs or sensitive session tokens in localStorage exposes users to Cross-Site Scripting (XSS) credential theft.
- **Decision:** Issue signed JWT tokens within an `HttpOnly`, `SameSite=Lax`, `Secure` (in production) cookie.
- **Reasoning:** Immune to JavaScript read access in the browser; automatically attached to authorized API calls.
- **Alternatives Considered:** LocalStorage bearer tokens, server-side memory sessions.
- **Trade-offs:** Requires CORS `credentials: true` and CSRF protection headers.
- **Consequences:** High security profile for institutional officers and administrative personnel.
- **Date:** 2026-10-26

---

### ADR-09: Password Hashing with Argon2 / Bcrypt
- **Status:** Accepted
- **Context:** User passwords must be protected against rainbow tables and brute force attacks.
- **Decision:** Use `bcryptjs` with salt rounds = 12.
- **Reasoning:** Battle-tested standard, pure JavaScript compatibility avoids native Windows C++ build tool failures on developer machines.
- **Alternatives Considered:** Plain SHA256 (insecure), Argon2 (requires native compilation).
- **Trade-offs:** Slightly higher CPU cost during login; completely acceptable for regulatory officer login volumes.
- **Consequences:** Passwords never stored in plain text; deterministic seed passwords hashed on init.
- **Date:** 2026-10-26

---

### ADR-10: Hierarchical Role-Based Access Control (RBAC)
- **Status:** Accepted
- **Context:** Different actors (System Admin, Admin, Department Head, Officer, Auditor) possess distinct capabilities.
- **Decision:** Enforce server-side RBAC middleware (`authorizeRole(...)` and `authorizePermission(...)`) on every route.
- **Reasoning:** Prevents privilege escalation and unauthorized transitions.
- **Alternatives Considered:** Client-only routing guards (unsafe).
- **Trade-offs:** Every endpoint must declare its minimum permission requirement.
- **Consequences:** Unauthenticated requests receive 401; unauthorized requests receive 403 Forbidden.
- **Date:** 2026-10-26

---

### ADR-11: Department-Level Data Scoping
- **Status:** Accepted
- **Context:** Department heads and officers must only view and modify complaints assigned to their jurisdiction, while Admins view system-wide.
- **Decision:** Scope Prisma queries automatically by `user.departmentId` for non-admin roles in complaint retrieval and modification services.
- **Reasoning:** Guarantees data privacy between institutional regulatory divisions.
- **Alternatives Considered:** Trusting frontend department filters in request parameters.
- **Trade-offs:** Slightly more complex WHERE clauses in services.
- **Consequences:** Impossible for a Department Head to inspect or mutate records outside their jurisdiction.
- **Date:** 2026-10-26

---

### ADR-12: Protected Local File Storage with Abstraction Layer
- **Status:** Accepted
- **Context:** Evidence documents contain sensitive grievance allegations and cannot be served publicly.
- **Decision:** Store files in a non-public local directory (`backend/uploads/`) with hashed storage keys; serve strictly through an authenticated streaming endpoint (`GET /api/v1/attachments/:id/download`).
- **Reasoning:** Zero dependency on paid cloud buckets (S3/GCS) during development, while preserving strict authorization before file streaming.
- **Alternatives Considered:** Serving from Vite `public/` directory (critical security breach).
- **Trade-offs:** Disk space bounded by local host storage.
- **Consequences:** Confidentiality preserved; easily swappable for S3 adapter in production.
- **Date:** 2026-10-26

---

### ADR-13: Immutable Audit Logging
- **Status:** Accepted
- **Context:** Regulatory oversight requires verifiable records of who altered complaint status, assignments, or closures.
- **Decision:** Persist an `audit_logs` record inside the same database transaction as any significant mutating action.
- **Reasoning:** Non-repudiation and transparency for institutional compliance.
- **Alternatives Considered:** Application log files (e.g. Winston logs to disk).
- **Trade-offs:** Additional table storage growth.
- **Consequences:** Dedicated Audit Trail UI allows auditors and admins to inspect historical timeline and JSON diffs.
- **Date:** 2026-10-26

---

### ADR-14: Environment Variable and Secret Management
- **Status:** Accepted
- **Context:** Secrets (database URLs, JWT secrets, cookie keys) must never be committed to git or exposed to frontend code.
- **Decision:** Store backend configuration in `backend/.env` (gitignored) and provide `backend/.env.example`. Frontend config restricted to `VITE_API_URL`.
- **Reasoning:** Follows 12-factor app methodology and prevents credential leakage.
- **Alternatives Considered:** Hardcoded default credentials.
- **Trade-offs:** Developers must copy `.env.example` to `.env` upon initial setup.
- **Consequences:** Clear documentation provided in setup guide.
- **Date:** 2026-10-26

---

### ADR-15: Concurrency-Safe Complaint Number Generation
- **Status:** Accepted
- **Context:** Generating complaint numbers by `COUNT(*) + 1` causes duplicate key collisions under concurrent submissions.
- **Decision:** Generate alphanumeric complaint numbers formatted as `CMP-YYYYMMDD-XXXXX` utilizing timestamp + crypto random sequence + database unique index check.
- **Reasoning:** Guarantees collision resistance without blocking global sequence locks.
- **Alternatives Considered:** Auto-increment integer ID (exposes total complaint volume).
- **Trade-offs:** Longer human-readable identifier.
- **Consequences:** Clean, professional complaint identifiers displayed in reports and UI.
- **Date:** 2026-10-26

---

### ADR-16: Historical Assignment Tracking (`complaint_assignments`)
- **Status:** Accepted
- **Context:** Reassigning a complaint must not overwrite previous officer/department handling history.
- **Decision:** Maintain a dedicated `complaint_assignments` ledger with `startedAt`, `endedAt`, `reason`, `assignedByUserId`, and `assignmentType`.
- **Reasoning:** Preserves complete accountability for every officer who held custody of a case.
- **Alternatives Considered:** Overwriting `assignedOfficerId` directly on the `complaints` record.
- **Trade-offs:** Requires two table updates during reassignment.
- **Consequences:** Assignment updates executed inside a Prisma interactive transaction.
- **Date:** 2026-10-26

---

### ADR-17: Multi-Department Coordination Model (`complaint_departments`)
- **Status:** Accepted
- **Context:** Complex grievances (e.g., fraudulent fees + inadequate infrastructure) require multiple departments without cloning complaint rows.
- **Decision:** Use a many-to-many link table (`complaint_departments`) designating `PRIMARY`, `COLLABORATING`, or `INFORMATION_REQUESTED` roles.
- **Reasoning:** Prevents record duplication while allowing collaborating officers to add investigation notes and view files.
- **Alternatives Considered:** Duplicating complaints per department.
- **Trade-offs:** Slightly more complex permission check for officers.
- **Consequences:** Single ground truth complaint maintained across cross-departmental reviews.
- **Date:** 2026-10-26

---

### ADR-18: Complaint Relationship Modeling (`complaint_relationships`)
- **Status:** Accepted
- **Context:** Tracking related or duplicate complaints requires pairwise linking with confidence scores and review status.
- **Decision:** Model pairs in `complaint_relationships` with fields: `complaintId`, `relatedComplaintId`, `relationshipType`, `similarityScore`, `detectionMethod`, and `status`.
- **Reasoning:** Unidirectional canonical ordering (min ID, max ID) avoids redundant symmetric pairs.
- **Alternatives Considered:** Merging records into one row.
- **Trade-offs:** Need to query relationships where complaint is either source or target.
- **Consequences:** Supports human review workflow (CONFIRMED / DISMISSED / PENDING).
- **Date:** 2026-10-26

---

### ADR-19: Explicit State Machine for Complaint Status Transitions
- **Status:** Accepted
- **Context:** Arbitrary status transitions (e.g. SUBMITTED directly to CLOSED) undermine investigative due process.
- **Decision:** Implement a strict transition validation matrix in `complaintStateMachine.ts`.
- **Reasoning:** Enforces regulatory procedures; mandates closure and rejection justification reasons.
- **Alternatives Considered:** Unrestricted status dropdown updates.
- **Trade-offs:** Rejects out-of-order transitions with explicit HTTP 400 errors.
- **Consequences:** Clean state integrity throughout the system.
- **Date:** 2026-10-26

---

### ADR-20: Dynamic SLA Policy and Deadline Calculation
- **Status:** Accepted
- **Context:** High-priority or student welfare complaints have shorter resolution deadlines than routine administrative inquiries.
- **Decision:** Compute `dueAt` by matching category and priority against active `sla_policies` records upon complaint submission.
- **Reasoning:** Eliminates hardcoded magic numbers; allows administrative policy tuning.
- **Alternatives Considered:** Fixed 30-day constant for all complaints.
- **Trade-offs:** Database lookup during complaint creation.
- **Consequences:** Accurate overdue flagging and priority-aware escalation.
- **Date:** 2026-10-26

---

### ADR-21: Transactional Boundaries on Mutating Operations
- **Status:** Accepted
- **Context:** Multi-step actions (e.g. status transition + assignment update + audit log creation) must never partially succeed.
- **Decision:** Wrap composite operations in Prisma `$transaction` blocks.
- **Reasoning:** Guarantees database consistency even if network or server exceptions occur midway.
- **Alternatives Considered:** Sequential independent async queries.
- **Trade-offs:** Holds database connections slightly longer during transaction execution.
- **Consequences:** Zero orphaned audit records or half-assigned complaints.
- **Date:** 2026-10-26

---

### ADR-22: Soft Deactivation Policy
- **Status:** Accepted
- **Context:** Regulatory integrity demands that users, departments, and institutions are never permanently deleted from historical records.
- **Decision:** Use `isActive` boolean flags for soft deactivation on users, departments, and institutions.
- **Reasoning:** Prevents foreign key constraint violations and maintains historical audit trail fidelity.
- **Alternatives Considered:** Hard DELETE cascades.
- **Trade-offs:** Queries must filter by `isActive: true` where active-only listings are requested.
- **Consequences:** Historical actions remain fully attributable to deactivated officers.
- **Date:** 2026-10-26

---

### ADR-23: Deterministic Explainable Duplicate Detection
- **Status:** Accepted
- **Context:** AI hallucination and opaque "black box" decisions are unacceptable in legal and regulatory grievance systems.
- **Decision:** Implement an explainable multi-signal similarity algorithm: Title Jaccard/Levenshtein + Description TF-IDF token overlap + Institution matching + Category weight.
- **Reasoning:** 100% deterministic, explainable to human officers with clear signal breakdown, and requires zero paid third-party API keys.
- **Alternatives Considered:** Pure external LLM embeddings (expensive, network dependent, unexplainable).
- **Trade-offs:** Slightly lower semantic nuance than multi-billion parameter LLMs; completely sufficient for duplicate identification.
- **Consequences:** Displays clear reason codes ("Same Institution (+40%)", "High description overlap (+35%)", etc.).
- **Date:** 2026-10-26

---

### ADR-24: Text Normalization Pipeline
- **Status:** Accepted
- **Context:** Raw grievance text contains varying casing, punctuation, formatting, and noisy stop words.
- **Decision:** Run text through a normalization pipeline (lowercase, regex punctuation removal, whitespace collapse, standard English stop-word filtering).
- **Reasoning:** Dramatically increases duplicate detection accuracy across varied complainant writing styles.
- **Alternatives Considered:** Comparing raw uncleaned strings.
- **Trade-offs:** Minimal CPU preprocessing per complaint.
- **Consequences:** Robust token vectors for text comparison.
- **Date:** 2026-10-26

---

### ADR-25: Weighted Similarity Scoring Formulation
- **Status:** Accepted
- **Context:** Matching complaints requires balancing title, body text, institution identity, and category.
- **Decision:** Define composite score:
  `Score = (0.35 * TitleSimilarity) + (0.35 * DescriptionSimilarity) + (0.20 * InstitutionMatch) + (0.10 * CategoryMatch)`.
- **Reasoning:** Institution match is necessary but not sufficient; text similarity confirms actual topical duplication.
- **Alternatives Considered:** Equal 25% weights.
- **Trade-offs:** Can be tuned via configuration constants.
- **Consequences:** Scores above 0.70 flagged as `POSSIBLE_DUPLICATE`; 0.40–0.69 flagged as `RELATED`.
- **Date:** 2026-10-26

---

### ADR-26: Mandatory Human Review for Duplicate Resolution
- **Status:** Accepted
- **Context:** Two complaints from the same college regarding different incidents must never be merged automatically.
- **Decision:** Candidate relationships are surfaced in a "Duplicate Review Center" for authorized officers to confirm or dismiss; AI never merges or deletes complaints automatically.
- **Reasoning:** Protects complainant rights and adheres to administrative legal standards.
- **Alternatives Considered:** Automatic auto-closing of duplicate complaints.
- **Trade-offs:** Requires human officer sign-off.
- **Consequences:** Total accountability with reviewer identity and timestamp stored.
- **Date:** 2026-10-26

---

### ADR-27: Optional Pluggable Vector Embedding Extension Hook
- **Status:** Accepted
- **Context:** Future deployments may wish to connect an internal vector database or embedding model.
- **Decision:** Design the similarity engine with an interface `SimilarityEngine` allowing a local or remote embedding provider to be plugged in via configuration without altering core workflows.
- **Reasoning:** Future-proofs the system without adding vendor lock-in.
- **Alternatives Considered:** Tightly coupling an external OpenAI/HuggingFace API.
- **Trade-offs:** Minimal interface abstraction overhead.
- **Consequences:** Clean pluggable architecture.
- **Date:** 2026-10-26

---

### ADR-28: Prohibition of Automated Deletion or Merging
- **Status:** Accepted
- **Context:** Deleting a complaint permanently removes legal records of institutional grievances.
- **Decision:** Explicitly forbid automated complaint merging, closure, or record deletion in code.
- **Reasoning:** Regulatory compliance mandates complete preservation of every submitted case.
- **Alternatives Considered:** Soft merging into parent complaint.
- **Trade-offs:** Distinct complaint IDs preserved.
- **Consequences:** Relationship records link related cases without destroying individual history.
- **Date:** 2026-10-26

---

### ADR-29: Persistent In-App Notification System
- **Status:** Accepted
- **Context:** Officers and heads need alerts when assigned cases, approaching deadlines, or receiving notes.
- **Decision:** Store notifications in a dedicated `notifications` table with read tracking (`readAt`), delivered via REST API and polling.
- **Reasoning:** Reliable, persistent across sessions, and requires no external email server setup during development.
- **Alternatives Considered:** WebSockets only (missed if user is offline), external SMTP (fails if SMTP is unconfigured).
- **Trade-offs:** Notifications retrieved via frontend polling interval / page transitions.
- **Consequences:** High reliability without external service dependencies.
- **Date:** 2026-10-26

---

### ADR-30: Background SLA Deadline & Overdue Monitoring Job
- **Status:** Accepted
- **Context:** Complaints approaching or exceeding deadlines require timely alerts and escalation.
- **Decision:** Implement a periodic background runner (`slaMonitor.ts`) executed via standard Node timer or triggered on startup and demand.
- **Reasoning:** Scans database for approaching due dates and sends idempotent notifications.
- **Alternatives Considered:** External BullMQ / Redis queue (requires Redis server setup).
- **Trade-offs:** In-process timer runs within the backend Node process.
- **Consequences:** No external Redis dependency required for local development.
- **Date:** 2026-10-26

---

### ADR-31: Database-Aggregated Real-Time Analytics
- **Status:** Accepted
- **Context:** Dashboard and reporting KPIs must reflect real database records without stale caches.
- **Decision:** Compute analytics via targeted SQL aggregations (Prisma `groupBy` and `$queryRaw`) with date and department filtering.
- **Reasoning:** High precision, accurate metrics, zero discrepancy between registry records and KPI cards.
- **Alternatives Considered:** Pre-aggregated cron rollup tables.
- **Trade-offs:** Slight query latency under large datasets; mitigated by appropriate indexes on status, dates, and department foreign keys.
- **Consequences:** Live updates on every complaint modification.
- **Date:** 2026-10-26

---

### ADR-32: Server-Side Pagination and Sorting
- **Status:** Accepted
- **Context:** Loading thousands of complaints into client memory degrades browser performance.
- **Decision:** Enforce `page`, `limit` (max 100), `sortBy`, and `sortOrder` on all collection endpoints.
- **Reasoning:** Scales smoothly to tens of thousands of institutional records.
- **Alternatives Considered:** Client-side filtering of full dataset.
- **Trade-offs:** Slightly more state management in React table hooks.
- **Consequences:** Fast page load times and minimal memory footprint.
- **Date:** 2026-10-26

---

### ADR-33: Integration Testing with Supertest and Separate Test DB
- **Status:** Accepted
- **Context:** Need automated verification that role boundaries, state transitions, and duplicate calculations function correctly.
- **Decision:** Use Vitest + Supertest to test API routes end-to-end against test endpoints.
- **Reasoning:** Tests real HTTP status codes, validation middleware, and database operations.
- **Alternatives Considered:** Unit testing controller functions in isolation with mocks.
- **Trade-offs:** Requires database connection during test runs.
- **Consequences:** High confidence in real-world application reliability.
- **Date:** 2026-10-26

---

### ADR-34: Deterministic Development Seed Data
- **Status:** Accepted
- **Context:** Development and evaluation require realistic institutional data, categories, users of all roles, and realistic complaints.
- **Decision:** Create an idempotent seed script (`prisma/seed.ts`) populating standard AICTE-style technical institutes, regulatory departments, role-mapped demo users, and complaints in various lifecycle states.
- **Reasoning:** Allows immediate testing and demonstrable hackathon presentation without manual data entry.
- **Alternatives Considered:** Blank empty database on first run.
- **Trade-offs:** Seed script must be kept in sync with schema updates.
- **Consequences:** Instant demonstration readiness.
- **Date:** 2026-10-26

---

### ADR-35: Explicit Exclusion of Unverified External Third-Party APIs
- **Status:** Accepted
- **Context:** Developing in local environments without active internet government API tokens (e.g., DigiLocker, official AICTE ERP, SMS gateways).
- **Decision:** Implement complete self-contained local models and mock adapters for external integrations.
- **Reasoning:** Prevents runtime failures, crashes, or build blocks due to missing external proprietary API keys.
- **Alternatives Considered:** Hardcoding calls to live government portals.
- **Trade-offs:** Live external identity verification simulated through local institutional database.
- **Consequences:** 100% self-contained and reproducible.
- **Date:** 2026-10-26
