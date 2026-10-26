# Database Schema Specification
## SIH26264 — Integrated Institution Complaint Management and Intelligence System

### 1. Entity-Relationship Overview
The database schema is modeled in PostgreSQL using Prisma ORM. It enforces relational integrity through foreign keys, check constraints, unique constraints, and B-tree indexes.

---

### 2. Table Definitions

#### 2.1 `roles`
Defines operational roles in the system.
- `id` (UUID, PK)
- `name` (VarChar, UNIQUE) — e.g., `SYSTEM_ADMIN`, `ADMINISTRATOR`, `DEPARTMENT_HEAD`, `COMPLAINT_OFFICER`, `READ_ONLY_AUDITOR`
- `description` (Text)
- `createdAt`, `updatedAt` (Timestamp)

#### 2.2 `permissions`
Granular access control capabilities.
- `id` (UUID, PK)
- `name` (VarChar, UNIQUE) — e.g., `COMPLAINTS_CREATE`, `COMPLAINTS_ASSIGN`, `COMPLAINTS_RESOLVE`, `DEPARTMENTS_MANAGE`, `AUDIT_VIEW`
- `description` (Text)
- `createdAt` (Timestamp)

#### 2.3 `role_permissions`
Many-to-many relationship mapping roles to permissions.
- `id` (UUID, PK)
- `roleId` (UUID, FK -> `roles.id`, CASCADE)
- `permissionId` (UUID, FK -> `permissions.id`, CASCADE)
- *Unique Constraint:* `(roleId, permissionId)`

#### 2.4 `departments`
Functional regulatory divisions (e.g. Academic Compliance, Faculty Shortage, Infrastructure).
- `id` (UUID, PK)
- `name` (VarChar, UNIQUE)
- `code` (VarChar, UNIQUE) — e.g. `ACAD`, `FAC`, `INFRA`, `FIN`, `GRIEV`
- `description` (Text, Nullable)
- `isActive` (Boolean, Default: `true`)
- `createdAt`, `updatedAt` (Timestamp)

#### 2.5 `institutions`
Technical colleges and universities under regulatory oversight.
- `id` (UUID, PK)
- `institutionName` (VarChar)
- `institutionCode` (VarChar, UNIQUE) — e.g. `INST-DEL-101`
- `institutionType` (VarChar) — e.g. `ENGINEERING`, `MANAGEMENT`, `POLYTECHNIC`, `PHARMACY`
- `state` (VarChar)
- `district` (VarChar)
- `address` (Text)
- `contactEmail` (VarChar, Nullable)
- `contactPhone` (VarChar, Nullable)
- `isActive` (Boolean, Default: `true`)
- `createdAt`, `updatedAt` (Timestamp)
- *Indexes:* `(state, district)`, `(institutionName)`

#### 2.6 `users`
Administrative personnel, department heads, officers, and auditors.
- `id` (UUID, PK)
- `fullName` (VarChar)
- `email` (VarChar, UNIQUE)
- `passwordHash` (VarChar)
- `roleId` (UUID, FK -> `roles.id`)
- `departmentId` (UUID, FK -> `departments.id`, Nullable)
- `isActive` (Boolean, Default: `true`)
- `lastLoginAt` (Timestamp, Nullable)
- `createdAt`, `updatedAt` (Timestamp)
- *Indexes:* `(email)`, `(roleId)`, `(departmentId)`

#### 2.7 `complaint_categories`
Taxonomy of grievances.
- `id` (UUID, PK)
- `name` (VarChar, UNIQUE)
- `code` (VarChar, UNIQUE)
- `description` (Text, Nullable)
- `isActive` (Boolean, Default: `true`)

#### 2.8 `complaints`
Primary complaint registry record.
- `id` (UUID, PK)
- `complaintNumber` (VarChar, UNIQUE) — e.g. `CMP-20261026-A1B2C`
- `title` (VarChar)
- `description` (Text)
- `categoryId` (UUID, FK -> `complaint_categories.id`)
- `priority` (Enum: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`, Default: `MEDIUM`)
- `status` (Enum: `SUBMITTED`, `UNDER_REVIEW`, `ASSIGNED`, `IN_PROGRESS`, `AWAITING_INFORMATION`, `RESOLVED`, `CLOSED`, `REOPENED`, `REJECTED`, Default: `SUBMITTED`)
- `institutionId` (UUID, FK -> `institutions.id`)
- `submittedByUserId` (UUID, FK -> `users.id`, Nullable)
- `source` (VarChar, Default: `PORTAL`) — e.g. `PORTAL`, `EMAIL`, `WRITTEN`
- `assignedDepartmentId` (UUID, FK -> `departments.id`, Nullable)
- `assignedOfficerId` (UUID, FK -> `users.id`, Nullable)
- `resolutionSummary` (Text, Nullable)
- `rejectionReason` (Text, Nullable)
- `closureReason` (Text, Nullable)
- `reopenReason` (Text, Nullable)
- `dueAt` (Timestamp, Nullable)
- `resolvedAt` (Timestamp, Nullable)
- `closedAt` (Timestamp, Nullable)
- `submittedAt` (Timestamp, Default: `now()`)
- `createdAt`, `updatedAt` (Timestamp)
- *Indexes:* `(status)`, `(priority)`, `(institutionId)`, `(assignedDepartmentId)`, `(assignedOfficerId)`, `(dueAt)`, `(submittedAt)`

#### 2.9 `complaint_assignments`
Immutable ledger of custody and transfers.
- `id` (UUID, PK)
- `complaintId` (UUID, FK -> `complaints.id`, CASCADE)
- `departmentId` (UUID, FK -> `departments.id`)
- `officerId` (UUID, FK -> `users.id`, Nullable)
- `assignedByUserId` (UUID, FK -> `users.id`)
- `assignmentType` (Enum: `INITIAL`, `REASSIGNMENT`, `TRANSFER`, `COLLABORATION`)
- `reason` (Text, Nullable)
- `startedAt` (Timestamp, Default: `now()`)
- `endedAt` (Timestamp, Nullable)
- `createdAt` (Timestamp)
- *Indexes:* `(complaintId)`, `(officerId)`, `(departmentId)`

#### 2.10 `complaint_departments`
Multi-department collaboration coordinates.
- `id` (UUID, PK)
- `complaintId` (UUID, FK -> `complaints.id`, CASCADE)
- `departmentId` (UUID, FK -> `departments.id`)
- `relationshipType` (Enum: `PRIMARY`, `COLLABORATING`, `INFORMATION_REQUESTED`)
- `addedByUserId` (UUID, FK -> `users.id`)
- `createdAt` (Timestamp)
- *Unique Constraint:* `(complaintId, departmentId)`

#### 2.11 `complaint_comments`
Investigation notes and case dialogue.
- `id` (UUID, PK)
- `complaintId` (UUID, FK -> `complaints.id`, CASCADE)
- `authorUserId` (UUID, FK -> `users.id`)
- `content` (Text)
- `visibility` (Enum: `INTERNAL`, `PUBLIC`, Default: `INTERNAL`)
- `createdAt`, `updatedAt` (Timestamp)
- *Index:* `(complaintId)`

#### 2.12 `complaint_attachments`
Uploaded evidence and case files.
- `id` (UUID, PK)
- `complaintId` (UUID, FK -> `complaints.id`, CASCADE)
- `uploadedByUserId` (UUID, FK -> `users.id`)
- `originalFilename` (VarChar)
- `storageKey` (VarChar, UNIQUE)
- `mimeType` (VarChar)
- `fileSize` (Integer)
- `createdAt` (Timestamp)
- *Index:* `(complaintId)`

#### 2.13 `complaint_relationships`
Candidate duplicate and related complaint links.
- `id` (UUID, PK)
- `complaintId` (UUID, FK -> `complaints.id`, CASCADE)
- `relatedComplaintId` (UUID, FK -> `complaints.id`, CASCADE)
- `relationshipType` (Enum: `POSSIBLE_DUPLICATE`, `RELATED`, `SAME_INSTITUTION`, `FOLLOW_UP`)
- `similarityScore` (Float) — e.g. 0.88
- `detectionMethod` (VarChar) — e.g. `HEURISTIC_TFIDF`, `TRIGRAM_MATCH`
- `status` (Enum: `PENDING`, `CONFIRMED`, `DISMISSED`, Default: `PENDING`)
- `reviewedByUserId` (UUID, FK -> `users.id`, Nullable)
- `reviewedAt` (Timestamp, Nullable)
- `reviewNotes` (Text, Nullable)
- `createdAt` (Timestamp)
- *Unique Constraint:* `(complaintId, relatedComplaintId)`
- *Index:* `(status)`, `(similarityScore)`

#### 2.14 `notifications`
In-app alert items.
- `id` (UUID, PK)
- `recipientUserId` (UUID, FK -> `users.id`, CASCADE)
- `complaintId` (UUID, FK -> `complaints.id`, SET NULL, Nullable)
- `type` (VarChar) — e.g. `ASSIGNMENT`, `TRANSFER`, `DEADLINE_WARNING`, `OVERDUE_ESCALATION`, `COMMENT`
- `title` (VarChar)
- `message` (Text)
- `readAt` (Timestamp, Nullable)
- `createdAt` (Timestamp)
- *Indexes:* `(recipientUserId, readAt)`, `(createdAt)`

#### 2.15 `audit_logs`
Immutable regulatory record of actions.
- `id` (UUID, PK)
- `actorUserId` (UUID, FK -> `users.id`, Nullable)
- `action` (VarChar) — e.g. `COMPLAINT_CREATED`, `STATUS_CHANGED`, `OFFICER_REASSIGNED`, `DUPLICATE_CONFIRMED`
- `entityType` (VarChar) — e.g. `COMPLAINT`, `USER`, `DEPARTMENT`
- `entityId` (UUID)
- `previousValues` (JSONB, Nullable)
- `newValues` (JSONB, Nullable)
- `reason` (Text, Nullable)
- `requestId` (VarChar, Nullable)
- `ipAddress` (VarChar, Nullable)
- `createdAt` (Timestamp, Default: `now()`)
- *Indexes:* `(entityType, entityId)`, `(actorUserId)`, `(action)`, `(createdAt)`

#### 2.16 `sla_policies`
Service Level Agreement parameters for deadline calculation.
- `id` (UUID, PK)
- `categoryId` (UUID, FK -> `complaint_categories.id`, Nullable)
- `priority` (Enum: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
- `firstResponseHours` (Integer, Default: 48)
- `resolutionHours` (Integer, Default: 360) # 15 days
- `escalationThresholdHours` (Integer, Default: 24)
- `isActive` (Boolean, Default: `true`)
- `createdAt`, `updatedAt` (Timestamp)
