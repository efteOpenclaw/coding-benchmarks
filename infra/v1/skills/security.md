---
name: security
description: Security best practices for fullstack web apps. Use when implementing authentication, sessions, password hashing, input validation, database queries, authorization, cookie configuration, or handling secrets and environment variables. Covers OWASP Top 10, iron-session, bcrypt, Zod validation, SQL injection prevention, CSRF, and error handling without information leakage.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Security Skill — Fullstack Applications

You are building a fullstack web application. Follow this guide to produce secure code that handles authentication, authorization, input validation, and secrets management correctly.

---

## 1. Session Management

### Use iron-session correctly

iron-session encrypts and signs cookies using the `@hapi/iron` protocol. It is stateless and recommended by the Next.js documentation.

```typescript
// lib/session.ts
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

interface SessionData {
  userId: string | null;
}

export const sessionOptions = {
  password: process.env.SESSION_SECRET!, // minimum 32 characters
  cookieName: "app_session",
  ttl: 60 * 60 * 24, // 24 hours
  cookieOptions: {
    httpOnly: true,                                   // blocks XSS cookie theft
    secure: process.env.NODE_ENV === "production",    // HTTPS only in prod
    sameSite: "lax" as const,                         // CSRF protection
    path: "/",
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
```

### Critical mistakes to avoid

- **NEVER** implement your own session encoding (base64, JSON, etc.). Use iron-session's encryption.
- **NEVER** hardcode the session secret. Load from `process.env.SESSION_SECRET`.
- **NEVER** set `httpOnly: false` — this exposes cookies to JavaScript/XSS.
- **NEVER** forget `await session.save()` after modifying session data.
- **NEVER** rely solely on middleware for auth checks — always verify at the data access layer.

### Password rotation

```typescript
// Zero-downtime secret rotation
const sessionOptions = {
  password: {
    1: process.env.SESSION_SECRET_OLD!,   // decrypts existing cookies
    2: process.env.SESSION_SECRET_NEW!,   // encrypts new cookies (highest number)
  },
};
```

---

## 2. Password Hashing

### Use bcryptjs with cost factor 10+

```typescript
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10; // minimum 10, 12 for higher security

// Hashing
const hash = await bcrypt.hash(password, SALT_ROUNDS);

// Verification (timing-safe internally)
const valid = await bcrypt.compare(password, hash);
```

### Rules

- **NEVER** store passwords in plain text or with reversible encoding.
- **NEVER** use MD5, SHA-1, or SHA-256 alone for passwords.
- **NEVER** write your own comparison logic — `bcrypt.compare()` is timing-safe.
- **ALWAYS** cap password length (max 128 chars) to prevent bcrypt DoS.
- **ALWAYS** return generic error on failed login: "Invalid email or password" (don't reveal which was wrong).

---

## 3. Input Validation with Zod

### Validate ALL inputs server-side

```typescript
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email().max(255).toLowerCase().trim(),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(["todo", "in_progress", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  due_date: z.string().datetime().nullable().optional(),
});
```

### Using validation in route handlers

```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0].message,
          },
        },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    // proceed with validated data...
  } catch (error) {
    return Response.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 }
    );
  }
}
```

### Rules

- **ALWAYS** validate on the server, even if you also validate on the client.
- **ALWAYS** use `.safeParse()` not `.parse()` to handle errors gracefully.
- **NEVER** return Zod's raw error object to the client (may leak schema details).
- **NEVER** trust `formData`, `searchParams`, URL params, or any client-provided data.
- **ALWAYS** cap string lengths to prevent oversized payloads.

---

## 4. SQL Injection Prevention

### Always use parameterized queries

```typescript
// CORRECT: Parameterized with ? placeholders
const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

// CORRECT: Parameterized INSERT
db.prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)").run(id, email, hash);

// CORRECT: Parameterized UPDATE
db.prepare("UPDATE tasks SET title = ?, status = ? WHERE id = ? AND user_id = ?")
  .run(title, status, taskId, userId);
```

### Dynamic queries — whitelist column names

When building dynamic UPDATE or ORDER BY clauses, **never interpolate user input as column names**:

```typescript
// DANGEROUS — field name injection
for (const [key, value] of Object.entries(updates)) {
  fields.push(`${key} = ?`);  // key comes from user input!
  values.push(value);
}

// SAFE — whitelist allowed columns
const ALLOWED_UPDATE_FIELDS = ["title", "description", "status", "priority", "due_date"];

for (const [key, value] of Object.entries(updates)) {
  if (!ALLOWED_UPDATE_FIELDS.includes(key)) continue;
  if (value !== undefined) {
    fields.push(`${key} = ?`);
    values.push(value);
  }
}
```

### Dynamic ORDER BY — whitelist sort columns

```typescript
// DANGEROUS — sort column injection
const sql = `SELECT * FROM tasks ORDER BY ${sortColumn} DESC`;

// SAFE — map to allowed columns
const SORT_MAP: Record<string, string> = {
  due_date: "due_date",
  created_at: "created_at",
  priority: "priority",
};
const safeColumn = SORT_MAP[sortColumn] ?? "created_at";
const sql = `SELECT * FROM tasks ORDER BY ${safeColumn} DESC`;
```

### Rules

- **NEVER** use string concatenation or template literals to build SQL with user data.
- **NEVER** use `db.exec()` with user-provided data (it does not support parameters).
- **ALWAYS** use `db.prepare()` with `?` placeholders for values.
- **ALWAYS** whitelist column names for dynamic field references (UPDATE SET, ORDER BY).

---

## 5. Authorization

### Check at the data access layer, not just middleware

```typescript
// Every data-accessing function must verify ownership
export function getTaskById(taskId: string, userId: string): Task | undefined {
  return db.prepare(
    "SELECT * FROM tasks WHERE id = ? AND user_id = ?"
  ).get(taskId, userId) as Task | undefined;
}

// Return 404 (not 403) to prevent resource enumeration
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session.userId) {
    return Response.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const task = getTaskById(params.id, session.userId);
  if (!task) {
    return Response.json(
      { success: false, error: { code: "NOT_FOUND", message: "Task not found" } },
      { status: 404 }  // 404, not 403 — don't reveal the resource exists
    );
  }

  return Response.json({ success: true, data: { task } });
}
```

### Rules

- **ALWAYS** pull user ID from the server-side session, never from the request body.
- **ALWAYS** verify ownership in every data access function.
- **ALWAYS** return 404 (not 403) when a user accesses another user's resource.
- **NEVER** expose internal/sequential IDs without ownership checks.
- **NEVER** rely only on middleware — check auth at the data layer too.

---

## 6. Environment Variables & Secrets

### Validate at startup with Zod — throw on failure

```typescript
// lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  DATABASE_URL: z.string().min(1).default("file:./data/app.db"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

// Use safeParse + throw — NEVER console.error + process.exit
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(
    `Invalid environment variables:\n${
      parsed.error.issues.map(i => `  ${i.path}: ${i.message}`).join('\n')
    }\nSee .env.example for required values.`
  );
}

export const env = parsed.data;
```

**Why throw instead of console.error?** Console statements violate the zero-console production rule. Thrown errors surface automatically in Next.js dev server and build output.

### Provide .env.example

```bash
# .env.example (committed to git — NO real values)
# Generate secret with: openssl rand -base64 32
SESSION_SECRET=generate-a-32-char-secret-here
DATABASE_URL=file:./data/app.db
NODE_ENV=development
```

### .gitignore (mandatory)

```
.env
.env.local
.env.production
.env*.local
*.db
```

### Rules

- **NEVER** hardcode secrets in source code — not even as "development defaults".
- **NEVER** prefix secrets with `NEXT_PUBLIC_` (exposes them to the browser).
- **NEVER** log environment variables or session contents.
- **ALWAYS** provide `.env.example` with placeholder values.
- **ALWAYS** validate env vars at startup with Zod — fail fast, not at runtime.

---

## 7. Error Handling Without Information Leakage

### Generic errors for authentication

```typescript
// WRONG — reveals whether email exists
return { error: "No account found with that email" };
return { error: "Incorrect password" };

// CORRECT — same message for both cases
return { error: "Invalid email or password" };
```

### Never leak internals

```typescript
export async function POST(request: Request) {
  try {
    // ... business logic
  } catch (error) {
    // Log the real error server-side (or use structured logger)
    // NEVER return error.message or error.stack to the client
    return Response.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 }
    );
  }
}
```

### Rules

- **NEVER** return stack traces, SQL errors, or internal paths to the client.
- **NEVER** reveal whether a specific email exists (use generic "invalid credentials").
- **NEVER** use `console.error(error)` in production — use a structured logger or omit.
- **ALWAYS** return a consistent error shape: `{ success: false, error: { code, message } }`.
- **ALWAYS** separate user-facing messages from internal diagnostic details.

---

## 8. Cookie Configuration Reference

| Flag | Required Value | Why |
|------|---------------|-----|
| `httpOnly` | `true` | Prevents JavaScript access. Blocks XSS cookie theft. **Never false.** |
| `secure` | `true` in prod | Cookie only sent over HTTPS. Prevents network interception. |
| `sameSite` | `"lax"` | Cookie not sent on cross-origin POST. Primary CSRF defense. |
| `maxAge` | shortest practical | Limits exposure window. 24h for sessions, 7d max. |
| `path` | `"/"` | Scope of the cookie. Keep as `/` unless restricting. |

---

## 9. Pre-Flight Security Checklist

Before marking implementation as complete, verify every item:

```
□ Session uses iron-session with encrypted cookies (not custom base64/JSON)
□ Session secret loaded from env var, minimum 32 characters, no hardcoded fallback
□ Cookies: httpOnly=true, secure=true (prod), sameSite=lax
□ Passwords hashed with bcryptjs (rounds >= 10)
□ Login returns generic "Invalid email or password" for both wrong email and wrong password
□ All inputs validated server-side with Zod
□ All SQL queries use parameterized statements (? placeholders)
□ Dynamic column names (UPDATE SET, ORDER BY) use whitelists, not user input
□ Authorization checked at data access layer, not just middleware
□ Every resource access verifies user ownership (user_id match)
□ Non-owned resources return 404, not 403
□ .env.example provided with placeholders (no real secrets)
□ .env* files in .gitignore
□ No NEXT_PUBLIC_ prefix on any secret values
□ Error responses don't leak stack traces, SQL errors, or internal paths
□ No console.error with error objects in production code
□ Response never includes passwordHash or other sensitive fields
□ Env vars validated at startup with Zod
```
