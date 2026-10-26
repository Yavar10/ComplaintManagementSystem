# System Architecture
## SIH26264 — Integrated Institution Complaint Management and Intelligence System

### 1. High-Level Architecture Overview
The system follows a clean, decoupled 3-tier architecture:
1. **Presentation Layer:** React 19 Single-Page Application (SPA) powered by Vite, utilizing TanStack Query for state management, Tailwind CSS for styling, and Lucide React icons.
2. **Application / Business Logic Layer:** Express.js REST API structured as domain modules, enforced with TypeScript, Zod schema validation, cookie-based JWT authentication, and role-based access control.
3. **Data & Persistence Layer:** PostgreSQL database accessed through Prisma ORM with explicit transaction boundaries, foreign key integrity, index optimization, and deterministic seed data.

```
+-------------------------------------------------------------------------+
|                              Client Browser                             |
|  React 19 SPA + Vite + Tailwind CSS + Lucide Icons + TanStack Query     |
+------------------------------------+------------------------------------+
                                     |
                          HTTPS REST JSON Requests
                         (Cookie-Based JWT Token)
                                     |
                                     v
+-------------------------------------------------------------------------+
|                           Backend Application                           |
|  Express.js (Node.js + TypeScript)                                      |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  | Middleware Pipeline: Helmet -> CORS -> CookieParser -> RateLimit |  |
|  | -> Request Logger -> Auth Guard -> Permission Guard -> Zod Validator|
|  +---------------------------------+---------------------------------+  |
|                                    |                                    |
|                                    v                                    |
|  +-------------------------------------------------------------------+  |
|  | Domain Modules & Controllers:                                     |  |
|  | - Auth Module          - Complaint Lifecycle Module               |  |
|  | - Department Module    - Assignment & Coordination Module         |  |
|  | - Institution Module   - Duplicate Detection Engine               |  |
|  | - Notes & Attachments  - SLA Deadline Monitor & Background Job    |  |
|  | - Notification Module  - Analytics & Aggregations Module          |  |
|  | - Audit Trail Module   - Health & Diagnostics Module              |  |
|  +---------------------------------+---------------------------------+  |
|                                    |                                    |
|                                    v                                    |
|  +-------------------------------------------------------------------+  |
|  | Service Layer (Business Logic & Interactive Prisma Transactions)  |  |
|  +---------------------------------+---------------------------------+  |
|                                    |                                    |
|                                    v                                    |
|  +-------------------------------------------------------------------+  |
|  | Prisma ORM Client & Schema Mappings                               |  |
|  +---------------------------------+---------------------------------+  |
+------------------------------------+------------------------------------+
                                     |
                          PostgreSQL Wire Protocol
                                     |
                                     v
+-------------------------------------------------------------------------+
|                           PostgreSQL Database                           |
|  - Users & Roles                 - Complaints & History                 |
|  - Departments & Institutions    - Multi-Department Coordination        |
|  - Assignments (Immutable)       - Relationships & Similarity Scores    |
|  - Notes & Attachment Metadata   - SLA Policies & Notifications         |
|  - Immutable Audit Logs          - B-Tree Indexes & Foreign Keys        |
+-------------------------------------------------------------------------+
```

---

### 2. Request Lifecycle
A typical request follows this unidirectional execution path:
1. **User Interaction:** Client UI initiates an action (e.g., reassigning an officer to a complaint).
2. **API Client (`apiClient.js`):** Issues an HTTP `POST /api/v1/complaints/:id/assignments` with JSON payload and credentials cookie.
3. **Perimeter Middleware:**
   - `helmet` applies Content-Security-Policy and XSS prevention headers.
   - `cors` verifies request origin against `CLIENT_URL`.
   - `rateLimiter` restricts abusive traffic.
   - `cookieParser` extracts the JWT authentication cookie.
4. **Authentication & Authorization Guard:**
   - `authenticate` verifies token signature, claims, and checks if user is still active in the database.
   - `authorizePermission` checks whether the user's role has permission (e.g., `COMPLAINTS_ASSIGN`).
   - For department heads and officers, department scoping is applied to ensure jurisdiction boundaries.
5. **Validation Guard:**
   - Zod schema validates the request body (`departmentId`, `officerId`, `reason`).
6. **Controller Layer:**
   - Unpacks validated payload and delegates to the `assignmentService`.
7. **Service Layer & Transaction Boundary:**
   - Executes inside `prisma.$transaction`:
     - Closes existing active assignment (`endedAt = now`).
     - Inserts new `complaint_assignments` record.
     - Updates `complaints` row (`assignedDepartmentId`, `assignedOfficerId`, `status = ASSIGNED`).
     - Inserts an immutable `audit_logs` record.
     - Emits an in-app `notifications` record to the assigned officer.
8. **HTTP Response:**
   - Returns structured JSON `{ success: true, data: complaint }` with HTTP 200/201.
9. **UI Reaction:**
   - TanStack Query invalidates cache, updates local state, and triggers an alert toast.

---

### 3. Key Design Patterns
- **Transactional State Transitions:** Status updates and reassignments occur strictly inside database transactions to prevent partial updates.
- **Explainable Heuristic Matching:** Duplicate detection utilizes text tokenization and weighted similarity metrics rather than non-deterministic black-box LLMs.
- **Fail-Safe Soft Deactivation:** Users and departments are deactivated (`isActive: false`) rather than deleted, preserving full attribution on historical records.
- **Protected File Streaming:** Attachments are stored with random storage keys in a quarantined directory and served only after role authorization checks.
