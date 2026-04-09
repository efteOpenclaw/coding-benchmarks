#!/bin/bash
# Static enforcement checks — run after every file creation during build.
# Exit code 0 = all checks pass. Non-zero = violations found.
# Usage: bash infra/v1/lint/check.sh <project-src-dir>

set -e

SRC_DIR="${1:-.}/src"
ERRORS=0

echo "=== Lint Check ==="

# 1. No console statements in production code (excluding test files)
echo -n "Checking for console statements... "
CONSOLE_HITS=$(grep -rn "console\." "$SRC_DIR" --include="*.ts" --include="*.tsx" | grep -v "\.test\." | grep -v "\.spec\." || true)
if [ -n "$CONSOLE_HITS" ]; then
  echo "FAIL"
  echo "$CONSOLE_HITS"
  ERRORS=$((ERRORS + 1))
else
  echo "OK"
fi

# 2. No `any` types
echo -n "Checking for 'any' types... "
ANY_HITS=$(grep -rn ": any\b\|as any\b" "$SRC_DIR" --include="*.ts" --include="*.tsx" | grep -v "\.test\." | grep -v "\.spec\." || true)
if [ -n "$ANY_HITS" ]; then
  echo "FAIL"
  echo "$ANY_HITS"
  ERRORS=$((ERRORS + 1))
else
  echo "OK"
fi

# 3. No default exports (except Next.js pages/layouts/error boundaries)
echo -n "Checking for default exports... "
DEFAULT_HITS=$(grep -rn "export default" "$SRC_DIR" --include="*.ts" --include="*.tsx" \
  | grep -v "\.test\." | grep -v "\.spec\." \
  | grep -v "/page\." | grep -v "/layout\." | grep -v "/error\." \
  | grep -v "/loading\." | grep -v "/not-found\." || true)
if [ -n "$DEFAULT_HITS" ]; then
  echo "FAIL"
  echo "$DEFAULT_HITS"
  ERRORS=$((ERRORS + 1))
else
  echo "OK"
fi

# 4. No barrel exports (index.ts files that just re-export)
echo -n "Checking for barrel exports... "
BARREL_HITS=$(find "$SRC_DIR" -name "index.ts" -o -name "index.tsx" 2>/dev/null || true)
if [ -n "$BARREL_HITS" ]; then
  echo "FAIL"
  echo "$BARREL_HITS"
  ERRORS=$((ERRORS + 1))
else
  echo "OK"
fi

# 5. Tests colocated (no __tests__ directories)
echo -n "Checking for __tests__ directories... "
TESTS_DIR_HITS=$(find "$SRC_DIR" -type d -name "__tests__" 2>/dev/null || true)
if [ -n "$TESTS_DIR_HITS" ]; then
  echo "FAIL — tests must be colocated with source, not in __tests__/"
  echo "$TESTS_DIR_HITS"
  ERRORS=$((ERRORS + 1))
else
  echo "OK"
fi

# 6. No raw NextResponse.json in route handlers (should use apiResponse helpers)
echo -n "Checking for raw NextResponse.json in routes... "
RAW_RESPONSE_HITS=$(grep -rn "NextResponse.json" "$SRC_DIR/app/api" --include="*.ts" 2>/dev/null | grep -v "\.test\." | grep -v "api-response" || true)
if [ -n "$RAW_RESPONSE_HITS" ]; then
  echo "FAIL — use successResponse/errorResponse from @/lib/api-response"
  echo "$RAW_RESPONSE_HITS"
  ERRORS=$((ERRORS + 1))
else
  echo "OK"
fi

echo ""
if [ $ERRORS -gt 0 ]; then
  echo "=== $ERRORS check(s) failed ==="
  exit 1
else
  echo "=== All checks passed ==="
  exit 0
fi
