---
name: page-locking
description: Edit lock acquisition, release, expiry, and conflict handling. Use when building page/document locking APIs or lock status UI.
globs: "**/lock/**,**/locks/**,**/lib/db.ts"
---

# Page Locking — Acquire, Release, Expire

## Data model

```sql
CREATE TABLE page_locks (
  page_id TEXT PRIMARY KEY REFERENCES pages(id) ON DELETE CASCADE,
  locked_by TEXT NOT NULL REFERENCES users(id),
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);
```

One lock per page (PRIMARY KEY on page_id). Auto-expires after 5 minutes.

## Acquire lock

```typescript
// Always clean expired locks first, then INSERT (fails if already locked)
await pool.query('DELETE FROM page_locks WHERE expires_at < NOW()');
try {
  const { rows } = await pool.query(
    `INSERT INTO page_locks (page_id, locked_by, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '5 minutes') RETURNING *`,
    [pageId, userId]
  );
  return rows[0]; // Success
} catch {
  return null; // Already locked by someone else
}
```

## Release lock (owner only)

```typescript
const result = await pool.query(
  'DELETE FROM page_locks WHERE page_id = $1 AND locked_by = $2',
  [pageId, userId]
);
return result.rowCount > 0;
```

## API responses

```typescript
// GET /api/pages/:slug/lock — check status
{ locked: false }
{ locked: true, locked_by: { id, display_name }, expires_at: "..." }

// POST /api/pages/:slug/lock — acquire
// 200: { locked: true, lock: { page_id, locked_by, expires_at } }
// 409: { error: { code: 'CONFLICT', message: 'Page is locked by another user' } }

// DELETE /api/pages/:slug/lock — release
// 200: { success: true }
// 404: { error: { code: 'NOT_FOUND', message: 'No active lock' } }
```

## Rules

1. ALWAYS delete expired locks before checking/acquiring.
2. Only the lock owner can release (WHERE locked_by = $userId).
3. Use UNIQUE constraint on page_id — database enforces one lock per page.
4. Return 409 Conflict when lock already held by another user.
5. Release locks on WebSocket disconnect (user left without releasing).
