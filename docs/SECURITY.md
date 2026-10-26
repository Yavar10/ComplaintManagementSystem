# Security Architecture & Controls
## SIH26264 — Integrated Institution Complaint Management and Intelligence System

### 1. Threat Model & Security Posture
Technical education regulatory platforms handle high-sensitivity allegations (corruption, academic fraud, safety violations). The system enforces defense-in-depth across the application perimeter, business logic layer, and database storage.

---

### 2. Authentication & Credential Management
- **Password Storage:** Hashed with `bcryptjs` using 12 salt rounds. Passwords are never stored or logged in plain text.
- **Session Tokens:** Signed JWT tokens containing user ID, role, and department jurisdiction.
- **Transport Security:** Tokens are delivered strictly via `HttpOnly`, `SameSite=Lax` cookies, preventing malicious JavaScript access and mitigating Cross-Site Scripting (XSS) token exfiltration.
- **Credential Quarantine:** All database connection strings and JWT signing keys are managed strictly within backend `.env` files and never packaged into frontend client bundles.

---

### 3. Role-Based Access Control (RBAC) & Data Scoping
- **Server-Side Enforcement:** Every mutating endpoint verifies permissions via `authorizePermission(...)` or `authorizeRole(...)`. Client-side route guards are treated purely as UI conveniences.
- **Departmental Scoping:**
  - `DEPARTMENT_HEAD` and `COMPLAINT_OFFICER` users are strictly constrained by SQL query filters matching their assigned `departmentId`.
  - Attempts to view, edit, or transition complaints outside an officer's assigned department return HTTP 403 Forbidden.
- **Auditor Restrictions:** `READ_ONLY_AUDITOR` accounts have strictly read-only capabilities; POST, PATCH, and DELETE operations are denied at the middleware layer.

---

### 4. Input Sanitization & Attack Prevention
- **SQL Injection:** Neutralized by Prisma ORM's parameterized query engine. Raw queries (`$queryRaw`) use tagged template literals with automatic parameter binding.
- **Cross-Site Scripting (XSS):** React automatically escapes HTML strings rendered in JSX. Response headers enforced by `helmet` provide Content Security Policy (CSP) and frameguard protections.
- **Cross-Site Request Forgery (CSRF):** Protected via `SameSite=Lax` cookie policy, customized request headers (`X-Requested-With`), and strict CORS origin whitelisting (`CLIENT_URL`).
- **Brute Force Protection:** Express rate limiting (`express-rate-limit`) throttles authentication endpoints (`/api/v1/auth/login`) to 10 attempts per 15-minute window per IP.

---

### 5. Attachment & File Upload Security
- **Quarantined Storage:** Uploaded evidence files are placed in `backend/uploads/` (outside any web server document root).
- **Randomized Storage Keys:** Files are renamed on disk to cryptographic UUID storage keys (`crypto.randomUUID() + ext`) preventing direct file access and directory traversal attacks (`../../etc/passwd`).
- **File Validation:**
  - Size capped at 10 MB.
  - MIME-type whitelist strictly enforced (`application/pdf`, `image/png`, `image/jpeg`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`).
  - Executable extensions (`.exe`, `.sh`, `.bat`, `.js`, `.php`) are rejected immediately.
- **Authorized Streaming:** Files are only retrieved via `GET /api/v1/attachments/:id/download` after verifying that the requesting user has valid access to the parent complaint.

---

### 6. Audit Trail & Non-Repudiation
- Critical events (intake, assignment change, status transition, closure, duplicate review decision) generate an immutable record in `audit_logs` inside the same database transaction.
- Audit records store the actor user ID, client IP address, timestamp, previous JSON values, and new JSON values.
- Audit logs cannot be modified or deleted via ordinary API endpoints.
