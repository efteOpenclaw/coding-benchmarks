---
name: revision-history
description: Page revision storage, ordering, restore-as-new, and diff comparison. Use when building version history, revisions API, or diff views.
globs: "**/revisions/**,**/lib/diff.*,**/lib/db.ts"
---

# Revision History — Storage, Ordering, Restore, Diff

## Data model

```sql
CREATE TABLE page_revisions (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  content_markdown TEXT NOT NULL,
  content_html TEXT NOT NULL,
  edited_by TEXT NOT NULL REFERENCES users(id),
  edit_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_revisions_page ON page_revisions(page_id, created_at DESC);
```

Latest revision = current content. Query: `ORDER BY created_at DESC LIMIT 1`.

## Restore = create new revision (not mutation)

```typescript
// POST /api/pages/:slug/revisions/:revId/restore
export async function POST(req: Request, { params }: { params: { slug: string; revId: string } }) {
  const oldRevision = await getRevisionById(params.revId);
  if (!oldRevision) return errorResponse('NOT_FOUND', 'Revision not found', 404);

  // Restore = copy content as a new revision (preserves history)
  const newRevision = await createRevision({
    page_id: oldRevision.page_id,
    content_markdown: oldRevision.content_markdown,
    content_html: oldRevision.content_html,
    edited_by: session.userId,
    edit_summary: `Restored from revision ${params.revId}`,
  });
  return successResponse({ revision: newRevision }, 201);
}
```

## Diff between revisions

```typescript
import { createTwoFilesPatch } from 'diff';

export function diffRevisions(older: string, newer: string): string {
  return createTwoFilesPatch('previous', 'current', older, newer);
}
```

## Rules

1. Latest revision = `ORDER BY created_at DESC LIMIT 1`. Never store a "current" pointer.
2. Restore = INSERT new revision with old content. NEVER update/delete existing revisions.
3. Always store both `content_markdown` (source) and `content_html` (rendered).
4. Render HTML at write time (not read time) — consistent rendering, faster reads.
5. Always include `edit_summary` on restore: `"Restored from revision {id}"`.
