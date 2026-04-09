---
name: test-api-routes
description: API route test patterns — auth tests (401), validation tests (400), happy path, not-found (404), conflict (409), cookie assertions, error message parity. Use when writing route.test.ts files.
globs: "**/api/**/route.test.ts"
---

# Testing API Routes

## Template — PostgreSQL projects (pg-mem)

**The test setup file (`tests/helpers/setup.ts`) manages the pool lifecycle. Do NOT call `initDb()`, `closePool()`, or `setPool()` in route tests.** The pg-mem pool is already injected and tables are truncated between tests automatically.

```typescript
import { describe, it, expect } from 'vitest';
import { POST } from './route';
import { createUserInDb } from '@tests/helpers/factories';
import { createAuthCookie } from '@tests/helpers/auth';

function makeRequest(body: Record<string, unknown>, cookie?: string): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  return new Request('http://localhost/api/endpoint', {
    method: 'POST', headers, body: JSON.stringify(body),
  });
}

describe('POST /api/endpoint', () => {
  // NO beforeEach/afterEach for pool — setup.ts handles it

  it('returns 401 without auth', async () => {
    const res = await POST(makeRequest({ title: 'Test' }));
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe('UNAUTHORIZED');
  });

  it('creates and returns 201', async () => {
    const user = await createUserInDb();
    const cookie = await createAuthCookie(user.id);
    const res = await POST(makeRequest({ title: 'New Item' }, cookie));
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.data.title).toBe('New Item');
  });
});
```

## Template — SQLite projects (better-sqlite3)

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from './route';
import { getDb, closeDb } from '@/lib/db';
import { createUserInDb } from '@tests/helpers/factories';
import { createAuthCookie } from '@tests/helpers/auth';

describe('POST /api/tasks', () => {
  beforeEach(() => { getDb(':memory:'); });
  afterEach(() => { closeDb(); });

  it('returns 401 without auth', async () => {
    const res = await POST(new Request('http://localhost/api/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test' }),
    }));
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe('UNAUTHORIZED');
  });

  it('creates and returns 201', async () => {
    const user = createUserInDb();
    const cookie = await createAuthCookie(user.id);
    const res = await POST(new Request('http://localhost/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ title: 'New Task' }),
    }));
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.data.task.title).toBe('New Task');
  });
});
```

## Checklist — test ALL of these for every route

```
□ 401 without session cookie
□ 400 for each invalid input (use it.each for boundaries)
□ Happy path with correct status + response shape
□ 404 for missing resource
□ 404 for another user's resource (not 403)
□ 409 for conflicts (duplicate email, etc.)
□ Response does NOT contain password_hash
□ Login/register set session cookie (check set-cookie header)
□ Login returns same error for wrong-email and wrong-password
```
