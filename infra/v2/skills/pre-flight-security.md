---
name: pre-flight-security
description: Security verification checklist — run before marking the build complete. Covers session config, password handling, SQL safety, input validation, response shaping, environment variables.
globs: "**/REVIEW.md,**/SELF_REVIEW.md,**/BUILD_LOG.md"
---

# Pre-Flight Security Checklist

Run through every item before marking the build as complete. Log results in BUILD_LOG.md.

```
SESSION & AUTH
□ iron-session with encrypted cookies (not custom base64/JWT)
□ Session secret from env var (not hardcoded in production)
□ httpOnly: true on session cookie
□ sameSite: 'lax' on session cookie
□ secure: true in production
□ bcrypt with cost 10+ for password hashing
□ await bcrypt.hash (async, not hashSync which blocks)
□ Generic auth errors ("Invalid email or password" for both cases)

SQL & DATA
□ All queries parameterized (? or $N placeholders)
□ Column names whitelisted for dynamic UPDATE SET
□ Column names whitelisted for dynamic ORDER BY
□ userId scoped on every data access query
□ 404 returned for other users' resources (not 403)

VALIDATION & RESPONSES
□ Zod .safeParse() on all inputs (never .parse())
□ Max lengths on all string fields
□ Email normalized (.trim().toLowerCase())
□ Explicit field selection in all responses (no spread destructuring)
□ No password_hash in any response
□ Consistent {success, data/error} envelope via helpers

ENVIRONMENT
□ Env vars validated at startup with Zod + throw
□ .env.example provided with all variables
□ No secrets in .env.example (only placeholders)
□ .gitignore includes .env*, *.db, node_modules, .next
```
