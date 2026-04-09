// TEMPLATE: API Route Test
// Pattern:
//   - In-memory SQLite via getDb(':memory:') — no file cleanup needed
//   - Direct route handler invocation with new Request(...)
//   - beforeEach seeds DB via factories, afterEach closes it — full isolation per test
//   - Assert on: status code + json.success + response shape
//   - Test categories: auth (401), validation (400), happy path, not found (404), conflict (409)
//   - Use sealData from iron-session for real auth cookies in tests

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET, POST } from './route';
import { getDb, closeDb } from '@/lib/db';
import { buildUser, createUserInDb } from '@tests/helpers/factories';
import { sealData } from 'iron-session';

// Helper: create a real iron-session cookie for authenticated requests
async function createAuthCookie(userId: string): Promise<string> {
  const sealed = await sealData(
    { userId },
    { password: process.env.SESSION_SECRET ?? 'this-is-a-development-secret-that-is-at-least-32-chars', ttl: 3600 }
  );
  return `app-session=${sealed}`;
}

describe('Things API', () => {
  let userId: string;

  beforeEach(() => {
    getDb(':memory:');
    // Use factory — never hardcode test data
    const user = createUserInDb(buildUser());
    userId = user.id;
  });

  afterEach(() => {
    closeDb();
  });

  // -- AUTH TESTS (every protected route needs these) --

  describe('GET /api/things', () => {
    it('returns 401 without auth', async () => {
      const res = await GET(new Request('http://localhost/api/things'));
      const json = await res.json();
      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/things', () => {
    it('returns 401 without auth', async () => {
      const res = await POST(
        new Request('http://localhost/api/things', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Test' }),
        })
      );
      const json = await res.json();
      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
    });

    // -- VALIDATION TESTS --

    // it('returns 400 for invalid input', async () => {
    //   // Requires authenticated request helper — see testing skill
    //   const res = await POST(authenticatedRequest({ title: '' }));
    //   const json = await res.json();
    //   expect(res.status).toBe(400);
    //   expect(json.error.code).toBe('VALIDATION_ERROR');
    // });

    // -- HAPPY PATH --

    // it('creates thing and returns 201', async () => {
    //   const res = await POST(authenticatedRequest({ title: 'New Thing' }));
    //   const json = await res.json();
    //   expect(res.status).toBe(201);
    //   expect(json.success).toBe(true);
    //   expect(json.data.thing.title).toBe('New Thing');
    // });
  });
});
