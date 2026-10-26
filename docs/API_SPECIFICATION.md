# REST API Specification (/api/v1)
## SIH26264 — Integrated Institution Complaint Management and Intelligence System

All API endpoints are prefixed with `/api/v1`. Endpoints enforce JWT authentication (via cookie) and Role-Based Access Control unless designated as public.

---

### 1. Standard Response Formats

#### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

#### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      { "field": "institutionId", "message": "Required" }
    ]
  }
}
```

---

### 2. Endpoints by Domain

#### 2.1 Authentication & Profile
- `POST /auth/login`
  - Body: `{ email, password }`
  - Sets HttpOnly auth cookie; returns user profile and permissions.
- `POST /auth/logout`
  - Clears auth cookie.
- `GET /auth/me`
  - Returns current authenticated user and resolved permissions.

#### 2.2 User Management (Requires `SYSTEM_ADMIN`)
- `GET /users` — Paginated user listing with department and role filters.
- `POST /users` — Create user account with role and department assignment.
- `GET /users/:id` — Retrieve user profile and activity summary.
- `PATCH /users/:id` — Update user details.
- `PATCH /users/:id/status` — Toggle user active state (`isActive: boolean`).

#### 2.3 Departments
- `GET /departments` — List all active departments.
- `POST /departments` — Create new department (`SYSTEM_ADMIN`).
- `GET /departments/:id` — Get department details, assigned officers, and active caseload.
- `PATCH /departments/:id` — Update department name or code (`SYSTEM_ADMIN`).

#### 2.4 Institutions
- `GET /institutions` — Query institutions with search (`q`), state, district, and type filters.
- `POST /institutions` — Register institution (`ADMINISTRATOR` or `SYSTEM_ADMIN`).
- `GET /institutions/:id` — Retrieve institution profile, contact info, and compliance score.
- `PATCH /institutions/:id` — Update institution records.
- `GET /institutions/:id/complaints` — Historical complaints associated with this institution.

#### 2.5 Complaints Lifecycle
- `GET /complaints`
  - Query parameters: `page`, `limit`, `search`, `status`, `priority`, `categoryId`, `institutionId`, `departmentId`, `isOverdue`.
  - Scoped by user department if caller is `DEPARTMENT_HEAD` or `COMPLAINT_OFFICER`.
- `POST /complaints`
  - Body: `{ title, description, categoryId, priority, institutionId, source }`
  - Generates unique complaint reference, calculates SLA deadline, triggers duplicate detection.
- `GET /complaints/:id`
  - Complete complaint details including current assignment, categories, SLA status, and metrics.
- `PATCH /complaints/:id`
  - Update complaint metadata (restricted to Administrators).
- `GET /complaints/:id/history`
  - Timeline of transitions, reassignments, and audit actions for this case.
- `POST /complaints/:id/transition`
  - Body: `{ targetStatus, reason }`
  - Enforces finite state machine rules.
- `POST /complaints/:id/resolve`
  - Body: `{ resolutionSummary, findings, supportingEvidenceIds }`
  - Sets status to `RESOLVED` and records resolution timestamp.
- `POST /complaints/:id/close`
  - Body: `{ closureReason }`
  - Transitions to terminal `CLOSED` state.
- `POST /complaints/:id/reopen`
  - Body: `{ reopenReason }`
  - Reopens resolved complaint for further investigation.

#### 2.6 Assignments & Department Collaboration
- `GET /complaints/:id/assignments` — Full history of all officers and departments assigned.
- `POST /complaints/:id/assignments`
  - Body: `{ departmentId, officerId, reason, priority }`
  - Closes active assignment, creates new assignment ledger, and transitions status to `ASSIGNED`.
- `POST /complaints/:id/transfer`
  - Body: `{ targetDepartmentId, reason }`
  - Formal jurisdictional transfer between departments.
- `POST /complaints/:id/collaborators`
  - Body: `{ departmentId, relationshipType: "COLLABORATING" | "INFORMATION_REQUESTED" }`
  - Adds secondary department for joint review without duplicating complaint.

#### 2.7 Investigation Notes & Evidence Attachments
- `GET /complaints/:id/comments` — Chronological investigation notes.
- `POST /complaints/:id/comments`
  - Body: `{ content, visibility }`
- `POST /complaints/:id/attachments`
  - Form-Data: `file` (multipart upload)
  - Stores file securely in uploads repository and records metadata.
- `GET /complaints/:id/attachments` — List attachments for this complaint.
- `GET /attachments/:id/download` — Authorized file streaming endpoint.

#### 2.8 Duplicate & Related Complaint Review
- `GET /complaints/:id/related` — Retrieves candidate related complaints with similarity scores.
- `POST /complaints/:id/detect-related` — Triggers fresh duplicate detection calculation on demand.
- `GET /complaint-relationships` — Centralized queue of pending duplicate pairs across the system.
- `POST /complaint-relationships/:id/review`
  - Body: `{ action: "CONFIRMED" | "DISMISSED", reviewNotes }`
  - Records officer review decision.

#### 2.9 In-App Notifications
- `GET /notifications` — List notifications for authenticated user (supports `unreadOnly=true`).
- `PATCH /notifications/:id/read` — Mark single notification as read.
- `POST /notifications/read-all` — Mark all user notifications as read.

#### 2.10 Real-Time Analytics
- `GET /analytics/overview` — High-level KPI summary (total, open, overdue, resolved, compliance rate).
- `GET /analytics/complaints-by-status` — Count breakdown by status.
- `GET /analytics/complaints-by-department` — Caseload and resolution stats grouped by department.
- `GET /analytics/complaints-by-category` — Distribution across grievance categories.
- `GET /analytics/institution-trends` — Top institutions by complaint frequency and repeat allegations.
- `GET /analytics/sla-performance` — Average resolution time (hours) and SLA breach percentages.
- `GET /analytics/export` — Authorized CSV export of complaints matching query filters.

#### 2.11 Audit Logs & Diagnostics
- `GET /audit-logs` — Query immutable system audit trail with filters on `entityType`, `actorUserId`, and `action`.
- `GET /health` — System status, database connectivity, and timestamp.
