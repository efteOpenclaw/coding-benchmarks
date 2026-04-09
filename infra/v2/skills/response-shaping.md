---
name: response-shaping
description: Consistent API response envelope with typed helpers, explicit field selection to prevent data leakage. Use when creating lib/api-response.ts or returning data from any route handler.
globs: "**/lib/api-response.ts,**/api-response.ts,**/app/api/**/route.ts"
---

# Response Shaping — Envelope + Field Selection

## Response helpers (copy this)

```typescript
import { NextResponse } from 'next/server';

interface SuccessResponse<T> { success: true; data: T; }
interface ErrorResponse { success: false; error: { code: string; message: string; }; }

export function successResponse<T>(data: T, status = 200): NextResponse<SuccessResponse<T>> {
  return NextResponse.json({ success: true as const, data }, { status });
}

export function errorResponse(code: string, message: string, status: number): NextResponse<ErrorResponse> {
  return NextResponse.json({ success: false as const, error: { code, message } }, { status });
}
```

## Explicit field selection (security critical)

```typescript
// ALWAYS — pick exactly the fields you want to return
return successResponse({
  user: { id: user.id, email: user.email, created_at: user.created_at }
});

// NEVER — spread leaks future sensitive fields
const { password_hash, ...rest } = user;
return successResponse({ user: rest });  // if someone adds api_key to User, it leaks
```

## Rules

1. Always use `successResponse()` / `errorResponse()`. Never manual `Response.json` or `NextResponse.json`.
2. Explicit field selection in every response — list each field by name.
3. Standard codes: VALIDATION_ERROR 400, UNAUTHORIZED 401, NOT_FOUND 404, CONFLICT 409, INTERNAL_ERROR 500.
