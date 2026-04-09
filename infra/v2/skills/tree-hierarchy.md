---
name: tree-hierarchy
description: Page tree with parent_id, slug generation, max depth validation, breadcrumb queries. Use when building hierarchical pages, tree navigation, or breadcrumbs.
globs: "**/lib/db.ts,**/PageTree.*,**/Breadcrumb.*,**/pages/**"
---

# Tree Hierarchy — Pages with Parent/Child

## Data model

```sql
parent_id TEXT REFERENCES pages(id) ON DELETE SET NULL
-- ON DELETE SET NULL = children become root pages when parent deleted
-- Max depth enforced in application code, not SQL
```

## Slug generation from title

```typescript
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}
// "My Cool Page!" → "my-cool-page"
```

## Max depth validation (max 5)

```typescript
async function getPageDepth(pageId: string): Promise<number> {
  let depth = 0;
  let currentId: string | null = pageId;
  while (currentId) {
    const { rows } = await pool.query('SELECT parent_id FROM pages WHERE id = $1', [currentId]);
    if (!rows[0]) break;
    currentId = rows[0].parent_id;
    depth++;
    if (depth > 5) break;
  }
  return depth;
}

// Before setting parent_id:
const parentDepth = await getPageDepth(parentId);
if (parentDepth >= 5) return errorResponse('VALIDATION_ERROR', 'Max nesting depth is 5', 400);
```

## Breadcrumb query (ancestors)

```typescript
async function getBreadcrumbs(pageId: string): Promise<{ id: string; title: string; slug: string }[]> {
  const crumbs: { id: string; title: string; slug: string }[] = [];
  let currentId: string | null = pageId;
  while (currentId) {
    const { rows } = await pool.query(
      'SELECT id, title, slug, parent_id FROM pages WHERE id = $1', [currentId]
    );
    if (!rows[0]) break;
    crumbs.unshift({ id: rows[0].id, title: rows[0].title, slug: rows[0].slug });
    currentId = rows[0].parent_id;
  }
  return crumbs;
}
```

## Full-text search (PostgreSQL)

```typescript
// Add a tsvector column or use to_tsvector inline:
const { rows } = await pool.query(
  `SELECT p.*, ts_rank(to_tsvector('english', pr.content_markdown), plainto_tsquery($1)) AS rank
   FROM pages p
   JOIN page_revisions pr ON pr.page_id = p.id
   WHERE to_tsvector('english', pr.content_markdown) @@ plainto_tsquery($1)
   ORDER BY rank DESC`,
  [query]
);
// For simple cases, ILIKE works but doesn't use indexes:
// WHERE pr.content_markdown ILIKE '%' || $1 || '%'
```

## Rules

1. Slug must be URL-safe: lowercase, hyphens, no special chars.
2. Enforce max depth 5 in application code before INSERT/UPDATE.
3. ON DELETE SET NULL for parent_id — orphaned children become root pages.
4. Breadcrumbs: walk up parent_id chain, collect ancestors, reverse.
5. Prefer `to_tsvector` + `plainto_tsquery` for search over ILIKE.
