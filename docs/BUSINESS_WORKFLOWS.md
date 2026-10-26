# Regulatory Business Workflows & State Machine
## SIH26264 — Integrated Institution Complaint Management and Intelligence System

### 1. Complaint State Machine Transitions

The lifecycle of every complaint is governed by a deterministic finite state machine (FSM). Unauthorized jumps (e.g. from `SUBMITTED` directly to `RESOLVED` without investigation) are strictly blocked by the backend validation layer.

```
                    +-----------------------+
                    |       SUBMITTED       |
                    +-----------+-----------+
                                |
             +------------------+------------------+
             |                                     |
             v                                     v
+-------------------------+             +-------------------------+
|      UNDER_REVIEW       |             |        REJECTED         | (Mandatory Reason)
+------------+------------+             +-------------------------+
             |
             v
+-------------------------+
|        ASSIGNED         |
+------------+------------+
             |
             v
+-------------------------+
|       IN_PROGRESS       |<-------------------+
+------------+------------+                    |
             |                                 |
             +------------------+              |
             |                  |              |
             v                  v              |
+-----------------------+  +-------------------+-----+
| AWAITING_INFORMATION  |  |    RESOLVED             | (Findings & Evidence Required)
+------------+----------+  +------------+------------+
             |                          |
             +--------------------------+
                                        |
             +--------------------------+--------------------------+
             |                                                     |
             v                                                     v
+-------------------------+                               +-------------------------+
|         CLOSED          | (Terminal regulatory closure) |        REOPENED         | (Mandatory Reason)
+-------------------------+                               +------------+------------+
                                                                       |
                                                                       +-----> (Returns to IN_PROGRESS)
```

#### Allowed Transitions Matrix
| Current State | Permitted Next States | Trigger Action / Role | Conditions & Prerequisites |
|---|---|---|---|
| `SUBMITTED` | `UNDER_REVIEW`, `REJECTED` | Intake review by Administrator | Initial validation of jurisdiction |
| `UNDER_REVIEW` | `ASSIGNED`, `REJECTED` | Department assignment | Must assign department and optionally officer |
| `ASSIGNED` | `IN_PROGRESS` | Officer opens case & begins review | Assignment accepted by officer |
| `IN_PROGRESS` | `AWAITING_INFORMATION`, `RESOLVED`, `ASSIGNED` (Reassign) | Investigation updates | Resolving requires formal findings summary |
| `AWAITING_INFORMATION`| `IN_PROGRESS` | Response received | Information added to case notes |
| `RESOLVED` | `CLOSED`, `REOPENED` | Final regulatory review | Closure requires confirmation; Reopen requires reason |
| `REOPENED` | `IN_PROGRESS` | Case reopened for new investigation | Assigned back to department |
| `REJECTED` | None (Terminal) | Administrator rejection | Non-appealable or invalid jurisdiction |
| `CLOSED` | None (Terminal) | Administrator closure | Legally completed case |

---

### 2. Duplicate Detection Workflow

1. **Complaint Ingestion:** Upon submission of complaint $C_{new}$, the similarity pipeline is triggered asynchronously or inline.
2. **Candidate Retrieval:** Complaints matching the same institution or sharing top TF-IDF keywords are retrieved as candidate set $\{C_1, \dots, C_k\}$.
3. **Similarity Formulation:**
   $$\text{Score} = 0.35 \times S_{\text{title}} + 0.35 \times S_{\text{desc}} + 0.20 \times M_{\text{inst}} + 0.10 \times M_{\text{cat}}$$
   - $S_{\text{title}}$: Dice/Jaccard character and word ngram similarity.
   - $S_{\text{desc}}$: TF-IDF cosine token overlap between normalized text.
   - $M_{\text{inst}}$: $1.0$ if identical institution ID, else $0.0$.
   - $M_{\text{cat}}$: $1.0$ if identical grievance category, else $0.0$.
4. **Classification:**
   - $\text{Score} \ge 0.70$: Flagged as `POSSIBLE_DUPLICATE`.
   - $0.40 \le \text{Score} < 0.70$: Flagged as `RELATED`.
5. **Relationship Persistence:** Candidate pairs are saved in `complaint_relationships` with status `PENDING`.
6. **Human Review in Dashboard:**
   - Reviewer opens the **Duplicate Review Center**.
   - Inspects side-by-side complaints, match explanation, and highlighted shared keywords.
   - Chooses **CONFIRM** (marks as verified duplicate/related, links cases without deletion) or **DISMISS** (marks false positive).
   - Under no circumstances does the system automatically merge, overwrite, or delete either complaint.

---

### 3. Multi-Department Collaboration Workflow

1. **Primary Assignment:** Complaint is assigned to the primary handling department (e.g., *Faculty & Staffing*).
2. **Cross-Jurisdiction Discovery:** During investigation, the officer discovers related violations in another domain (e.g., *Infrastructure & Facilities*).
3. **Add Collaborator:** The handling officer or Administrator invites the secondary department using `POST /complaints/:id/collaborators` with type `COLLABORATING`.
4. **Shared Workspace:**
   - Both departments see the complaint in their departmental workspaces.
   - Collaborating officers can post internal notes (`complaint_comments`) and view evidence attachments.
   - Custody and primary closure authority remain with the primary department.
5. **Formal Transfer Option:** If the case fundamentally belongs to another department, a formal `POST /complaints/:id/transfer` closes the previous department assignment and formally transfers ownership, recording the transition in `complaint_assignments`.

---

### 4. SLA Monitoring and Escalation Workflow

1. **Policy Matching:** Upon creation, complaint priority and category look up target hours in `sla_policies`:
   - `CRITICAL`: 24h first response, 72h resolution.
   - `HIGH`: 48h first response, 168h (7 days) resolution.
   - `MEDIUM`: 72h first response, 360h (15 days) resolution.
   - `LOW`: 96h first response, 720h (30 days) resolution.
2. **Deadline Computation:** Sets `dueAt = submittedAt + resolutionHours`.
3. **Scheduled SLA Monitor (`slaMonitor.ts`):**
   - Runs periodically (every hour or on demand).
   - Identifies complaints where `status NOT IN ('RESOLVED', 'CLOSED', 'REJECTED')`.
   - **Warning Trigger:** If `now() + 24h >= dueAt`, creates a `DEADLINE_WARNING` notification for the assigned officer.
   - **Overdue Trigger:** If `now() >= dueAt`, flags complaint as overdue and issues an `OVERDUE_ESCALATION` notification to both the officer and the Department Head.
   - **Idempotency Guard:** Checks whether an overdue alert of this type has already been emitted within the current escalation window to prevent duplicate notification spam.
