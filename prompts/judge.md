# Judge Prompt

You are scoring a completed Next.js application against its spec.
The project lives in a run folder at `/app/runs/YYMMDD-MODELNAME/`.
Read every file in that folder before scoring.
Be rigorous. Every score needs written justification tied to specific
code evidence.

## Rating Rubric (100 points)

### 1. FUNCTIONALITY (20 pts)

**Spec compliance (10)**
Check every feature listed in the spec. Every API route present?
Every UI requirement implemented? Miss one = lose points.

**Runtime correctness (10)**
Does `npm run dev` work? Do all flows complete without errors?
No crashes, no console errors, no broken state transitions.

### 2. CODE QUALITY (20 pts)

**Type safety (5)**
Strict TS, no `any`, Zod schemas align with TS types.
Proper generics and discriminated unions where appropriate.

**Naming & structure (5)**
Files/functions/variables named for what they do.
No `utils.ts` dumping grounds. No god components. No 300-line files.

**Error handling (5)**
API errors caught and typed. UI shows error states.
No swallowed promises. No unhandled rejection paths.

**Idiomatic patterns (5)**
Uses Next.js/React/TS as the ecosystem intends.
Server components, proper caching, loading/error conventions.

### 3. ARCHITECTURE (15 pts)

**Separation of concerns (5)**
Data access ≠ business logic ≠ presentation.
Can you swap the DB without touching UI?

**API design (5)**
RESTful, consistent, proper status codes, pagination where needed.

**File organization (5)**
Logical grouping. Consistent pattern. Clear where to add features.

### 4. TEST QUALITY (15 pts)

**Coverage (5)**
Critical paths tested. Auth failures, validation errors, edge cases.
Not just happy paths.

**Test design (5)**
Independent, readable, fast. No interdependence. Proper setup/teardown.

**Meaningful assertions (5)**
Tests verify behavior, not implementation. No snapshot-everything.
No `expect(true).toBe(true)`.

### 5. PRODUCTION READINESS (15 pts)

**Security basics (5)**
Input validation everywhere. Auth on protected routes. No injection.
Secrets in env vars.

**Performance awareness (5)**
No N+1 queries. Proper loading states. Bundle not bloated.

**DX & maintainability (5)**
README with setup instructions. .env.example. Scripts work.
New dev can clone → install → run.

### 6. BONUS / PENALTY (±15 pts max)

```
+5  Clever simplification that reduces complexity
+5  Handles edge cases spec didn't mention but should have
+5  Excellent a11y (semantic HTML, ARIA, keyboard nav)
-5  Unused dependencies in package.json
-5  Console.log left in production code
-5  Hardcoded values that should be configurable
-10 Security vulnerability (XSS, injection, exposed secrets)
-10 Tests that pass but don't actually test anything
```

## Output Format

Score MUST be valid JSON:

```json
{
  "model": "<model name>",
  "project": "<project number>",
  "scores": {
    "functionality": {
      "spec_compliance": { "score": 0, "justification": "" },
      "runtime_correctness": { "score": 0, "justification": "" }
    },
    "code_quality": {
      "type_safety": { "score": 0, "justification": "" },
      "naming_structure": { "score": 0, "justification": "" },
      "error_handling": { "score": 0, "justification": "" },
      "idiomatic_patterns": { "score": 0, "justification": "" }
    },
    "architecture": {
      "separation_of_concerns": { "score": 0, "justification": "" },
      "api_design": { "score": 0, "justification": "" },
      "file_organization": { "score": 0, "justification": "" }
    },
    "test_quality": {
      "coverage": { "score": 0, "justification": "" },
      "test_design": { "score": 0, "justification": "" },
      "meaningful_assertions": { "score": 0, "justification": "" }
    },
    "production_readiness": {
      "security_basics": { "score": 0, "justification": "" },
      "performance_awareness": { "score": 0, "justification": "" },
      "dx_maintainability": { "score": 0, "justification": "" }
    },
    "bonuses": [],
    "penalties": []
  },
  "total": 0,
  "strengths": [],
  "weaknesses": [],
  "verdict": ""
}
```

Every justification must reference specific files, functions, or patterns.
"Good error handling" is not a justification.
"src/app/api/tasks/route.ts catches Zod validation errors and returns
{ success: false, error: { code: 'VALIDATION', message } } with 400 status"
is a justification.
