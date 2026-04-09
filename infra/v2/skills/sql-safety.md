---
name: sql-safety
description: Parameterized queries, column name whitelisting for dynamic UPDATE/ORDER BY, typed wrapper functions. Use when writing database query functions in lib/db.ts.
globs: "**/lib/db.ts,**/db.ts"
---

# SQL Safety — Parameterized Queries + Column Whitelists

## Parameterized queries (always)

```typescript
// SAFE — parameterized
const stmt = getDb().prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?');
return stmt.get(id, userId) as TaskRow | undefined;

// UNSAFE — string interpolation
const sql = `SELECT * FROM tasks WHERE id = '${id}'`;  // SQL injection!
```

## Column whitelist for dynamic UPDATE

```typescript
const UPDATABLE = new Set(['title', 'description', 'status', 'priority', 'due_date']);

export function updateTask(id: string, userId: string, updates: Record<string, string | null | undefined>): TaskRow | undefined {
  const existing = getTaskById(id, userId);
  if (!existing) return undefined;

  const fields: string[] = [];
  const values: (string | null)[] = [];
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && UPDATABLE.has(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }
  if (fields.length === 0) return existing;

  fields.push("updated_at = datetime('now')");
  values.push(id, userId);
  return getDb().prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ? AND user_id = ? RETURNING *`).get(...values) as TaskRow | undefined;
}
```

## Column whitelist for dynamic ORDER BY

```typescript
const SORT_MAP: Record<string, string> = {
  due_date: 'due_date ASC NULLS LAST',
  created_at: 'created_at DESC',
  priority: "CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END",
};
const orderBy = SORT_MAP[sortParam] ?? SORT_MAP['created_at'];
```

## Rules

1. NEVER string interpolation for values. Always `?` (SQLite) or `$1` (PostgreSQL).
2. ALWAYS whitelist column names for UPDATE SET and ORDER BY.
3. Use `crypto.randomUUID()` for IDs — no `uuid` package needed.
4. Use `RETURNING *` for INSERT/UPDATE operations.
5. Enable `WAL` mode and `foreign_keys` on connection init.
