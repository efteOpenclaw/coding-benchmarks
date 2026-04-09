// TEMPLATE: API Response Helpers
// Every API route uses these helpers — never construct JSON responses manually.
// This ensures a consistent envelope: { success: true, data } | { success: false, error: { code, message } }

import { NextResponse } from 'next/server';

interface ApiError {
  code: string;
  message: string;
}

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: ApiError;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export function successResponse<T>(data: T, status = 200): NextResponse<SuccessResponse<T>> {
  return NextResponse.json({ success: true as const, data }, { status });
}

export function errorResponse(code: string, message: string, status: number): NextResponse<ErrorResponse> {
  return NextResponse.json({ success: false as const, error: { code, message } }, { status });
}

// Standard error codes — use these consistently:
// VALIDATION_ERROR  → 400
// UNAUTHORIZED      → 401
// NOT_FOUND         → 404  (also for "wrong user" — never 403, to avoid info leak)
// CONFLICT          → 409
// INTERNAL_ERROR    → 500
