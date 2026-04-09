---
name: session-auth
description: iron-session encrypted cookie setup with two getter functions. Use when creating lib/session.ts or implementing login/register/logout routes.
globs: "**/lib/session.ts,**/api/auth/**/route.ts"
---

# Session Auth — iron-session Setup

```typescript
import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  userId?: string;
}

const sessionOptions = {
  password: process.env.SESSION_SECRET ?? 'dev-secret-at-least-32-characters-long-here',
  cookieName: 'app-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
  },
};

// Server Components
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();  // MUST await in Next.js 14+
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

// Route Handlers (parses cookie from Request)
export async function getSessionFromRequest(req: Request): Promise<IronSession<SessionData>> {
  const cookieHeader = req.headers.get('cookie') ?? '';
  const cookieMap = new Map<string, string>();
  cookieHeader.split(';').forEach((c) => {
    const [key, ...rest] = c.trim().split('=');
    if (key) cookieMap.set(key, rest.join('='));
  });
  function get(name: string) {
    const value = cookieMap.get(name);
    return value ? { name, value } : undefined;
  }
  function set(): void { /* no-op */ }
  return getIronSession<SessionData>({ get, set } as Awaited<ReturnType<typeof cookies>>, sessionOptions);
}
```

## Rules

1. NEVER custom session encoding (base64, JWT, manual). Use iron-session encryption.
2. NEVER hardcode the secret in production. Load from `process.env.SESSION_SECRET`.
3. Always `httpOnly: true`. Always `sameSite: 'lax'`.
4. Generic auth errors: `"Invalid email or password"` for both wrong-email and wrong-password.
5. Use `await bcrypt.hash(password, 10)` — async, not `hashSync` (blocks event loop).
