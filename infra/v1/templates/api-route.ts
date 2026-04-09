// TEMPLATE: API Route Handler
// Every route handler follows this exact sequence:
//   1. try/catch wrapper
//   2. Initialize DB
//   3. Auth check (session)
//   4. Validate input (Zod safeParse)
//   5. Data operation (call db layer)
//   6. Return successResponse / errorResponse
//
// NEVER put SQL, business logic, or console statements in route handlers.

import { NextResponse } from 'next/server';
import { createThingSchema, thingQuerySchema } from '@/lib/validators';
import { getDb, createThing, getThingsByUserId } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { getSessionFromRequest } from '@/lib/session';

export async function GET(req: Request): Promise<NextResponse> {
  try {
    getDb();
    const session = await getSessionFromRequest(req);

    // 1. Auth check — always first
    if (!session.userId) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    // 2. Validate query params
    const url = new URL(req.url);
    const query = {
      status: url.searchParams.get('status') ?? undefined,
      sort: url.searchParams.get('sort') ?? undefined,
    };

    const parsed = thingQuerySchema.safeParse(query);
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    // 3. Data operation — userId-scoped
    const things = getThingsByUserId(session.userId, parsed.data);

    // 4. Respond with envelope
    return successResponse({ things });
  } catch {
    return errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

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

    const thing = createThing({
      user_id: session.userId,
      ...parsed.data,
    });

    return successResponse({ thing }, 201);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
