---
name: api-route-pattern
description: Standard route handler pattern — auth check, Zod validation, database call, response helpers. Use when creating or editing any API route handler.
globs: "**/app/api/**/route.ts"
---

# API Route Pattern

Every route handler follows this exact structure:

```typescript
import { successResponse, errorResponse } from '@/lib/api-response';
import { createThingSchema } from '@/lib/validators';
import { getDb, createThing } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/session';

export async function POST(req: Request): Promise<NextResponse> {
  try {
    getDb();
    const session = await getSessionFromRequest(req);
    if (!session.userId) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const body = await req.json();
    const parsed = createThingSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    const thing = createThing({ user_id: session.userId, ...parsed.data });
    return successResponse({ thing }, 201);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
```

## Rules

1. Always `try/catch` wrapping the entire handler.
2. Always auth check first. Return `errorResponse('UNAUTHORIZED', ...)` — never throw.
3. Always `.safeParse()`. Never `.parse()`.
4. Always use `successResponse()` / `errorResponse()` — never raw `Response.json`.
5. Return 404 for another user's resource (not 403 — prevents enumeration).
6. POST returns 201. GET/PATCH/DELETE return 200.
