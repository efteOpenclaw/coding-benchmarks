---
name: postgresql-patterns
description: PostgreSQL via pg (node-postgres) — connection pooling, async queries, $1 parameterization, transactions, test isolation. Use when writing db.ts with PostgreSQL or pg driver.
globs: "**/lib/db.ts,**/db.ts,**/pool.ts"
---

# PostgreSQL Patterns — pg (node-postgres)

## Connection pool (copy this)

```typescript
import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) { await pool.end(); pool = null; }
}
```

## Parameterized queries — always $1, $2, $3

```typescript
// SAFE
const { rows } = await pool.query('SELECT * FROM pages WHERE slug = $1', [slug]);

// UNSAFE — SQL injection!
const { rows } = await pool.query(`SELECT * FROM pages WHERE slug = '${slug}'`);
```

## Transactions — use client checkout

```typescript
const client = await getPool().connect();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO pages ... VALUES ($1, $2)', [id, title]);
  await client.query('INSERT INTO page_revisions ... VALUES ($1, $2)', [revId, pageId]);
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

## Test isolation — create/drop per test suite

```typescript
beforeAll(async () => {
  // Point pool at test database
  process.env.DATABASE_URL = 'postgresql://localhost:5432/test_db';
  await initDb(); // Creates tables
});
afterEach(async () => {
  // Truncate all tables between tests
  await getPool().query('TRUNCATE users, pages, page_revisions, page_locks CASCADE');
});
afterAll(async () => {
  await closePool();
});
```

## Rules

1. ALWAYS use Pool, never single Client for request handling.
2. ALWAYS `$1` parameterization. NEVER string interpolation for values.
3. ALWAYS use transactions for multi-table writes.
4. ALWAYS `client.release()` in finally block.
5. Use `RETURNING *` for INSERT/UPDATE.
6. Use `NOW()` for timestamps (not `datetime('now')`).
7. Use `TIMESTAMPTZ` for all timestamp columns.
