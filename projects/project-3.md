# Project 3: Multi-Tenant Project Tracker (Difficulty: ★★★)

## Overview
SaaS-style project management with organizations, role-based access control,
webhook integrations, background job processing, and an immutable audit log.
Tests auth complexity, data isolation, async processing, and system design.

## Data Model

**Organization**: id, name, slug (unique), plan (free|pro|enterprise), created_at

**Membership**: id, org_id (FK), user_id (FK), role (owner|admin|member|viewer),
invited_by (FK→User, nullable), joined_at
- UNIQUE(org_id, user_id). Every org must have exactly 1 owner.

**User**: id, email, password_hash, display_name, created_at

**Project**: id, org_id (FK), name, description, status (active|archived),
created_by (FK→User), created_at, updated_at

**Issue**: id, project_id (FK), number (auto-increment PER PROJECT),
title, description_md, status (open|in_progress|review|closed),
priority (p0|p1|p2|p3), assignee_id (FK→User, nullable),
reporter_id (FK→User), labels (JSON string[]), due_date (nullable),
created_at, updated_at, closed_at (nullable)

**Comment**: id, issue_id (FK), author_id (FK→User), body_md, created_at, updated_at

**AuditLog**: id, org_id (FK), actor_id (FK→User), action, entity_type,
entity_id, metadata (JSON), ip_address, created_at
- IMMUTABLE. Code must never UPDATE or DELETE rows.

**Webhook**: id, org_id (FK), url, secret (HMAC-SHA256), events (JSON string[]),
active (boolean), created_by (FK→User), created_at

**WebhookDelivery**: id, webhook_id (FK), event_type, payload (JSON),
response_status (nullable), response_body (nullable, truncated),
delivered_at (nullable), attempts, next_retry_at (nullable),
status (pending|delivered|failed)

## RBAC Rules

```
owner:   everything + delete org + manage billing (stub)
admin:   manage members (except owner) + manage projects + manage webhooks
member:  create/edit issues + comment + view all org projects
viewer:  read-only access to projects and issues
```

All data queries MUST be scoped to org. No cross-tenant leakage.
Middleware enforces org context from URL: /org/:orgSlug/...

## API Routes

```
# Auth
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me                                              — includes orgs + roles

# Orgs
POST   /api/orgs                                                 — create (creator = owner)
GET    /api/orgs/:orgSlug
PATCH  /api/orgs/:orgSlug                                        — (admin+)
DELETE /api/orgs/:orgSlug                                        — (owner only)

# Members
GET    /api/orgs/:o/members
POST   /api/orgs/:o/members                                     — (admin+)
PATCH  /api/orgs/:o/members/:userId                              — change role (admin+)
DELETE /api/orgs/:o/members/:userId                              — (admin+, not owner)

# Projects
GET    /api/orgs/:o/projects
POST   /api/orgs/:o/projects                                    — (member+)
GET    /api/orgs/:o/projects/:projectId
PATCH  /api/orgs/:o/projects/:projectId                         — (admin+)
DELETE /api/orgs/:o/projects/:projectId                         — (admin+) soft-delete

# Issues
GET    /api/orgs/:o/projects/:p/issues                          — filterable, paginated
POST   /api/orgs/:o/projects/:p/issues                          — (member+)
GET    /api/orgs/:o/projects/:p/issues/:number
PATCH  /api/orgs/:o/projects/:p/issues/:number                  — (member+)
DELETE /api/orgs/:o/projects/:p/issues/:number                  — (admin+)

# Comments
GET    /api/orgs/:o/projects/:p/issues/:n/comments
POST   /api/orgs/:o/projects/:p/issues/:n/comments              — (member+)
PATCH  /api/orgs/:o/projects/:p/issues/:n/comments/:id          — (author only)
DELETE /api/orgs/:o/projects/:p/issues/:n/comments/:id          — (author or admin+)

# Webhooks
GET    /api/orgs/:o/webhooks                                    — (admin+)
POST   /api/orgs/:o/webhooks                                    — (admin+)
PATCH  /api/orgs/:o/webhooks/:id                                — (admin+)
DELETE /api/orgs/:o/webhooks/:id                                — (admin+)
GET    /api/orgs/:o/webhooks/:id/deliveries

# Audit Log
GET    /api/orgs/:o/audit-log                                   — (admin+) paginated, filterable

# Rate Limiting (global middleware)
# free: 100 req/min, pro: 500, enterprise: 2000
# Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
```

## Webhook Events
issue.created, issue.updated, issue.closed, comment.created,
member.added, member.removed, project.created, project.archived

Payloads signed HMAC-SHA256 with webhook secret.
Delivery: fire-and-forget + retry queue (3 attempts, exponential backoff).
Background processing via in-process job queue (setTimeout + DB, no Redis).

## UI Requirements
- Org switcher in header
- Dashboard per org: project list + recent activity from audit log
- Project board: Kanban (columns = status) with drag-drop
- Issue detail: markdown description, comment thread, metadata sidebar
- Member management: invite, role dropdowns, remove
- Webhook management: CRUD + delivery log with status indicators
- Audit log viewer: filterable table, expandable rows for metadata
- Settings page: org name, plan indicator (read-only)
- Responsive

## Tech Stack (enforced)
- Next.js 14+ App Router
- TypeScript strict
- PostgreSQL via pg (node-postgres) — raw SQL, typed helpers, NO ORM
- Tailwind CSS
- Vitest + @testing-library/react + supertest
- Iron-session, bcryptjs, Zod
- crypto (Node built-in) for HMAC webhook signing
- Custom in-process job queue (no Redis, no Bull)

## DO NOT Build
- Actual billing/payments
- Email sending (invites are instant-add)
- File uploads
- Real-time (WebSocket) — polling or manual refresh only
- SSO / OAuth
- Deployment config
