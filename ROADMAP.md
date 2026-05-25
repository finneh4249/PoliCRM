# PoliCRM — Political Operating System Roadmap

> **North Star**: Ship fast, operational, and boring before polishing.
> Avoid rebuilding a bloated "everything platform". Build modularly.
> Treat data architecture — not UI — as the core strategic asset.

---

## Architecture Principles

```
Frontend Apps (React / Next.js)
        ↓
Unified API Layer (Rust / Axum)
        ↓
Core Political Database (SQLite → PostgreSQL)
        ↓
Specialized Services (Stripe, Postmark, Twilio, Auth0)
```

**We build:** Core CRM, person graph, memberships, interactions, permissions, audit logs, workflows.
**We don't build:** Payment processing, email delivery infrastructure, SMS gateways, auth from scratch.

---

## What We Prioritise vs Outsource

| Function            | Build / Outsource        | Priority     |
| ------------------- | ------------------------ | ------------ |
| CRM (persons)       | Build                    | ★★★ Critical |
| Memberships         | Build                    | ★★★ Critical |
| Permissions / RBAC  | Build                    | ★★★ Critical |
| Audit logs          | Build                    | ★★★ Critical |
| Tagging / workflows | Build                    | ★★★ Critical |
| Donations           | Stripe (outsource)       | ★★★ Critical |
| Email delivery      | Postmark (outsource)     | ★★★ Critical |
| Auth                | Firebase Auth (outsource)| ★★★ Critical |
| SMS                 | Twilio (outsource)       | ★★ High      |
| Events / RSVPs      | Build (Phase 4)          | ★★ High      |
| Canvassing          | Build (Phase 4)          | ★★ High      |
| Website CMS         | Separate repo            | ★★ High      |
| Analytics           | PostHog + Build          | ★ Medium     |
| Internal governance | Build (Phase 7)          | ★ Medium     |
| Community / forums  | Third-party (Discourse)  | ★ Low        |
| Knowledgebase       | Third-party (Notion)     | ★ Low        |

---

## Phase 1: Core Relational API — The Person Graph ✅ In Progress
*Goal: The unified graph of people + activity. This IS the platform. Get it right.*

### 1.1 Persons & Identity
- [x] Unified `Person` model (UUID primary key)
- [x] AES-256-GCM field-level encryption on all PII (name, email, phone, address)
- [x] SHA-256 blind index on email for encrypted-but-searchable lookup
- [x] `primary_state` / `primary_zip` plaintext for geo-filtering
- [x] `external_identities` table (NationBuilder / Stripe / Auth0 ID decoupling)
- [x] Direct NationBuilder API importer (idempotent, transactional, deduplication)
- [ ] Person update (`PATCH /persons/{id}`) with re-encryption
- [ ] Soft-delete (`DELETE /persons/{id}` → sets `deleted_at`)
- [ ] Search by state, zip, or email blind index
- [ ] Cursor-based pagination on `GET /persons`

### 1.2 Parties & Branches
- [ ] `Party` CRUD — hierarchical (Federal → State → Local branch)
- [ ] Branch tree query endpoint
- [ ] Branch membership count

### 1.3 Memberships
- [ ] `POST /persons/{id}/memberships` — assign to branch
- [ ] `GET /persons/{id}/memberships` — full history (overlapping identities supported)
- [ ] `PATCH /memberships/{id}` — status lifecycle: `active → lapsed → resigned → suspended`
- [ ] Lapsed detection query (renewal_date < today)

### 1.4 Interactions — Event Sourcing
> Every touchpoint a person has with the party is an immutable interaction record.
- [ ] `POST /persons/{id}/interactions` — log any event
- [ ] Predefined types: `donation`, `volunteer_shift`, `event_rsvp`, `canvass`, `aec_check`, `email_open`, `petition_signed`, `phone_call`, `branch_meeting`
- [ ] `GET /persons/{id}/interactions` — full timeline
- [ ] Filter by type and date range

### 1.5 Tags
- [ ] `tags` table (`name`, `color`, `description`)
- [ ] `person_tags` junction table
- [ ] `POST /persons/{id}/tags`, `DELETE /persons/{id}/tags/{tag_id}`
- [ ] Tag-based person search

---

## Phase 2: Authentication & RBAC
*Goal: Lock down every endpoint. Permissions matter more than you think — factional risk is real.*

### 2.1 Token Validation
- [ ] Firebase Auth middleware (extract `uid` from JWT, validate on every request)
- [ ] `users` table: Firebase UID → internal user + role mapping
- [ ] All unauthenticated requests → `401`

### 2.2 Role Hierarchy
- [ ] Roles: `sys_admin` → `state_secretary` → `branch_organiser` → `volunteer` → `read_only`
- [ ] Branch-scoped access: a `branch_organiser` can only see persons in their branch
- [ ] State/federal separation in permission checks
- [ ] `user_permissions` table for granular field-level overrides

### 2.3 User Management
- [ ] `GET /users/me`
- [ ] `POST /users` (admin only)
- [ ] `PATCH /users/{id}/role` (admin only)
- [ ] Approval chains for sensitive operations (data export, mass delete)

---

## Phase 3: Audit Logging & Compliance
*Goal: Electoral compliance obligations and accountability. Immutable by design.*

### 3.1 Immutable Audit Log
- [ ] `audit_logs` table: `user_id`, `action`, `target_type`, `target_id`, `diff_json`, `ip_address`, `timestamp`
- [ ] Middleware auto-logs all `POST/PATCH/DELETE` mutations
- [ ] PII access audit: log every `GET /persons/{id}` read
- [ ] `GET /audit-logs` — admin-only log viewer with filtering

### 3.2 Data Compliance (APPs / GDPR-equivalent)
- [ ] Right to be forgotten: `POST /persons/{id}/erase` — wipes PII, keeps anonymised record
- [ ] Data export: `GET /persons/{id}/export` — full data package
- [ ] Configurable retention policies (auto-delete lapsed non-members after N years)
- [ ] Encryption key rotation tooling (re-encrypt all records without downtime)

### 3.3 AEC Compliance
- [ ] Enrolled/unenrolled member count by federal division
- [ ] Member list export for AEC annual return
- [ ] Duplicate detection and merge tooling

---

## Phase 4: Events, Canvassing & Volunteering
*Goal: Workflow-centric. Map the full volunteer journey.*

```
Petition signer
  → Auto-tagged by issue/geography
  → Invited to local event
  → Attends event (logged as interaction)
  → Volunteer onboarding
  → Task assignment
  → Branch integration
  → Leadership pipeline
```

### 4.1 Events
- [ ] `events` table: `title`, `location`, `date`, `branch_id`, `capacity`
- [ ] `POST /events`, `GET /events`, `GET /events/{id}`
- [ ] `POST /events/{id}/rsvp` — logs `event_rsvp` interaction on person
- [ ] `POST /events/{id}/attend` — marks attendance, logs `event_attended`

### 4.2 Canvassing
- [ ] Walk list generation: persons filtered by geo + tag
- [ ] Doorknock result logging → `canvass` interaction with metadata (`contacted` / `not_home` / `refused`)
- [ ] Phone banking list + call result logging

### 4.3 Volunteer Management
- [ ] Volunteer availability and skills (stored via tags or dedicated table)
- [ ] Shift scheduling and assignment
- [ ] `volunteer_shift` interaction logging

---

## Phase 5: Integrations — Commodity Functions via Best-of-Breed
*Don't build what exists. Integrate it.*

### 5.1 Stripe — Donations & Memberships
- [ ] Stripe Checkout for membership fee and donation pages
- [ ] Webhook handler: `payment_intent.succeeded` → creates `donation` interaction
- [ ] Membership renewal payments linked to `Membership` record
- [ ] Refund handling

### 5.2 Postmark — Email
- [ ] Transactional emails: membership confirmation, renewal reminder, event RSVP
- [ ] Bulk broadcast queue (segment by tag, send via Postmark batch)
- [ ] Webhook: `email_open` / `click` → logged as interaction on person

### 5.3 Twilio — SMS
- [ ] Mobilisation SMS broadcast by tag/geo segment
- [ ] SMS reply handling
- [ ] Logged as `sms_sent` / `sms_replied` interaction

---

## Phase 6: Automation & Workflows
*Goal: Accelerate real political workflows without manual toil.*

### 6.1 Background Jobs
- [ ] Async job runner (Tokio task queue)
- [ ] Nightly lapsed-membership detection
- [ ] Renewal reminders (trigger Postmark email + log interaction)
- [ ] Event reminder scheduler

### 6.2 Tag-Based Triggers
- [ ] Trigger rules in DB: `IF tag = 'volunteer-interested' THEN log interaction`
- [ ] Webhook output: trigger external services on tag events

### 6.3 Workflow Pipelines
- [ ] Workflow templates: define multi-step journeys (Petition → Event → Onboard → Deploy)
- [ ] Person workflow state tracking
- [ ] Automated progression on interaction events

---

## Phase 7: Political Differentiators
*Only build this once Phase 1–3 are fully stable. This is the strategic moat.*

- [ ] **Decentralised branch governance**: branch-level motions, quorum tracking, voting records
- [ ] **Policy deliberation system**: member proposals, amendments, recorded votes
- [ ] **Internal democracy tooling**: STV ballot engine for internal elections
- [ ] **Volunteer skill graph**: match skills to campaign needs
- [ ] **Member reputation system**: contribution score across interactions
- [ ] **Faction transparency system**: declared affiliations, voting alignment tracking
- [ ] **Issue-based organising**: tag persons by policy interest, auto-segment outreach
- [ ] **Proposal pipeline**: draft → review → vote → ratify → publish

---

## Phase 8: Public & Campaign Infrastructure
*These MUST stay separate from the organising backend. They evolve at different speeds.*

### 8.1 Public Website (separate repo)
- [ ] Next.js public site: media releases, policy, join form, petition form
- [ ] Join form → `POST /persons` + `POST /persons/{id}/memberships`
- [ ] Petition form → `POST /persons` + `POST /persons/{id}/interactions` (`petition_signed`)

### 8.2 Internal Portal (separate repo)
- [ ] Organiser dashboard: member management, branch ops, canvassing tools
- [ ] Branch-scoped auth token from PoliCRM API

### 8.3 Campaign App (separate repo)
- [ ] Mobile-first canvassing / phone banking interface
- [ ] Offline-capable walk list with sync on reconnect

---

## Phase 9: Analytics & Reporting
- [ ] Real-time dashboard: member count by state, growth, active volunteers
- [ ] AEC compliance report: enrolled/unenrolled by electorate
- [ ] Membership health: lapsed rate, renewal rate, churn over time
- [ ] Interaction analytics: most engaged members, campaign effectiveness
- [ ] PostHog for frontend behavioural analytics

---

## Phase 10: NationBuilder Migration
*This is where projects become disasters. Do NOT big-bang migrate.*

- [x] **Step 1**: Direct NationBuilder API importer running in parallel ✅
- [ ] **Step 2**: Normalise + clean imported data (dedup, merge, retag)
- [ ] **Step 3**: Identity reconciliation (NB ID → internal UUID via `external_identities`)
- [ ] **Step 4**: Run parallel systems — PoliCRM primary, NB as read-only fallback
- [ ] **Step 5**: Migrate workflows one at a time: Memberships → Events → Emails → Canvassing → Governance
- [ ] **Step 6**: Freeze NationBuilder writes (read-only legacy)
- [ ] **Step 7**: Full cutover, cancel NationBuilder subscription

---

## Cleanup (Ongoing)
- [ ] Delete legacy Python backend once all functionality is ported to Rust
- [ ] Migrate SQLite → PostgreSQL for production
- [ ] Docker Compose update for Rust backend
- [ ] CI/CD: `cargo test` + `cargo clippy` on every PR
- [ ] Move secrets from `.env` to cloud secrets manager

---

## Team / Governance
> The real problem is governance, not code.

| Role                  | Purpose                                    |
| --------------------- | ------------------------------------------ |
| Product owner         | Decides priorities, owns the roadmap       |
| Technical lead        | Architecture decisions, schema integrity   |
| Operations lead       | Maps workflows, defines interaction types  |
| Security/privacy lead | Compliance, encryption, audit obligations  |
| UX lead               | Prevents admin hell, owns internal portal  |
| Data architect        | Guards schema — no ad-hoc column additions |

**Without clear authority, this roadmap becomes committee-designed sludge.**
