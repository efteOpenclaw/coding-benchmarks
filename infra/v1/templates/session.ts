// TEMPLATE: Session Management (iron-session)
// Pattern:
//   - iron-session with encrypted cookies — NEVER custom base64/JWT/manual encoding
//   - Typed SessionData interface
//   - Secret from env var SESSION_SECRET — NEVER hardcoded in production
//   - Two getters: getSession() for Server Components, getSessionFromRequest() for Route Handlers
//   - Cookie flags: httpOnly=true, secure=true in prod, sameSite='lax'

import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  userId?: string;
}

const sessionOptions = {
  password: process.env.SESSION_SECRET ?? 'this-is-a-development-secret-that-is-at-least-32-chars',
  cookieName: 'app-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
  },
};

// For Server Components (uses next/headers cookies)
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

// For Route Handlers (parses cookie from Request object)
export async function getSessionFromRequest(req: Request): Promise<IronSession<SessionData>> {
  const cookieHeader = req.headers.get('cookie') ?? '';
  const cookieMap = new Map<string, string>();
  cookieHeader.split(';').forEach((c) => {
    const [key, ...rest] = c.trim().split('=');
    if (key) cookieMap.set(key, rest.join('='));
  });

  function get(name: string): { name: string; value: string } | undefined {
    const value = cookieMap.get(name);
    return value ? { name, value } : undefined;
  }

  function set(): void { /* no-op for request-only reads */ }

  return getIronSession<SessionData>(
    { get, set } as Awaited<ReturnType<typeof cookies>>,
    sessionOptions
  );
}
