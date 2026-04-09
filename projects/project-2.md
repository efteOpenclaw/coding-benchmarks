# Project 2: Collaborative Notes Wiki (Difficulty: ★★☆)

## Overview
Multi-user markdown wiki with real-time presence indicators,
version history, and tree-based page hierarchy. Tests state management,
WebSocket integration, and temporal data patterns.

## Data Model

**User**: id, email, password_hash, display_name, avatar_url (nullable), created_at

**Page**: id, slug (unique, URL-safe, auto-from-title), title,
parent_id (self-FK, nullable, max depth 5), created_by (FK→User),
created_at, updated_at

**PageRevision**: id, page_id (FK), content_markdown, content_html (rendered),
edited_by (FK→User), edit_summary (nullable), created_at

**PageLock**: page_id (FK, unique), locked_by (FK→User), locked_at,
expires_at (5 min, auto-renewable)

Latest revision = current page content.

## API Routes

```
# Auth (same as P1)
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

# Pages
GET    /api/pages                            — list all (flat, with parent_id)
POST   /api/pages                            — create page + initial revision
GET    /api/pages/:slug                      — page with current revision
PATCH  /api/pages/:slug                      — update metadata (title, parent_id)
DELETE /api/pages/:slug                      — delete page (cascade children configurable)

# Revisions
POST   /api/pages/:slug/revisions           — save new revision
GET    /api/pages/:slug/revisions            — list revision history
GET    /api/pages/:slug/revisions/:revId     — get specific revision
POST   /api/pages/:slug/revisions/:revId/restore — restore as new current

# Locks
POST   /api/pages/:slug/lock                — acquire edit lock
DELETE /api/pages/:slug/lock                — release lock
GET    /api/pages/:slug/lock                — check lock status
```

## WebSocket Events

```
Connection: ws://localhost:3000/api/ws?token={session_token}

Server → Client:
  presence:update    { users: [{ id, display_name, current_page }] }
  page:updated       { slug, revision_id, edited_by }
  lock:acquired      { slug, locked_by }
  lock:released      { slug }

Client → Server:
  presence:page      { slug }
  presence:leave     {}
```

## UI Requirements
- Sidebar: collapsible page tree, drag to reorder/reparent
- Page view: rendered markdown with auto-generated TOC from headings
- Edit mode: split-pane (markdown left, live preview right)
- Lock indicator: "X is editing" banner when locked by another user
- Presence: avatars showing who's on which page
- Revision history: list view + diff between any two revisions
- Create page: modal with title + optional parent
- Full-text search across page content
- Breadcrumb navigation from page hierarchy
- Responsive

## Tech Stack (enforced)
- Next.js 14+ App Router
- TypeScript strict
- PostgreSQL via pg (node-postgres) — raw SQL, typed helpers, NO ORM
- Tailwind CSS
- Vitest + @testing-library/react + supertest
- Iron-session, bcryptjs, Zod
- ws (npm) for WebSocket (custom server.ts wrapping Next.js)
- marked or remark for markdown→HTML
- diff or jsdiff for revision diffs

## DO NOT Build
- Real-time collaborative editing (no CRDT/OT — lock-based only)
- Image uploads within pages
- Page-level permissions (all auth users can edit all)
- Comments / annotations
- Export (PDF, etc.)
