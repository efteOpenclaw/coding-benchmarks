---
name: test-pg-mem
description: In-memory PostgreSQL testing with pg-mem — no real server needed. Pool adapter, schema setup, test isolation with TRUNCATE. Use when writing tests for PostgreSQL-backed code.
globs: "**/tests/helpers/**,**/vitest.config.*,**/vitest.setup.*,**/*.test.ts"
---

# Testing PostgreSQL Without a Server — pg-mem

## Install

```bash
npm install -D pg-mem
```

## Test setup (copy this to tests/helpers/setup.ts)

```typescript
import { beforeAll, afterEach, afterAll } from 'vitest';
import { newDb } from 'pg-mem';

// Create in-memory PostgreSQL and expose as standard pg.Pool
const mem = newDb();
const { Pool } = mem.adapters.createPg();
export const testPool = new Pool();

// Monkey-patch the app's pool to use pg-mem
// In your db.ts, export a setPool(p) function for test injection
import { setPool, initDb, closePool } from '@/lib/db';

beforeAll(async () => {
  setPool(testPool);
  await initDb();  // Creates all tables
});

afterEach(async () => {
  // Truncate all tables between tests — fast, resets state
  await testPool.query('TRUNCATE users, pages, page_revisions, page_locks CASCADE');
});

afterAll(async () => {
  await testPool.end();
});
```

## db.ts must support pool injection

```typescript
import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

// For tests: inject pg-mem pool
export function setPool(p: Pool): void {
  pool = p;
}

export async function closePool(): Promise<void> {
  if (pool) { await pool.end(); pool = null; }
}
```

## vitest.config.ts — wire up the setup file

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/helpers/setup.ts'],
    globals: true,
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests'),
    },
  },
});
```

## pg-mem limitations (work around these)

| Feature | Supported? | Workaround |
|---|---|---|
| CRUD, constraints, indexes | Yes | — |
| NOW(), INTERVAL | Yes | — |
| Transactions (BEGIN/COMMIT) | Yes | — |
| RETURNING * | Yes | — |
| $1 parameterization | Yes | — |
| TIMESTAMPTZ | Partial | Treated as TIMESTAMP, no timezone math |
| to_tsvector / full-text search | No | Use ILIKE fallback in test environment |
| ON DELETE CASCADE | Yes | — |

## Rules

1. ALWAYS use pg-mem for tests — never require a running PostgreSQL server.
2. ALWAYS add `setPool()` to db.ts so tests can inject the in-memory pool.
3. ALWAYS use TRUNCATE CASCADE between tests (not DELETE — faster).
4. For full-text search: use ILIKE in tests, to_tsvector in production. Guard with `process.env.NODE_ENV`.
5. Factory functions must be async (pg queries return Promises).
6. **NEVER call `closePool()` or `initDb()` in individual test files.** The setup file manages the pool lifecycle globally. If a route test calls `closePool()` in `afterEach`, it destroys the pg-mem pool — then the next `initDb()` creates a real Pool from `DATABASE_URL` which fails without a running PostgreSQL server. Only `tests/helpers/setup.ts` should touch the pool lifecycle.
7. Route tests must import the route handler and call it directly — the pg-mem pool injected by setup.ts is already active. Do NOT reinitialize the database per test file.
