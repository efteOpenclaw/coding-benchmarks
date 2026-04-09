// TEMPLATE: Zod Validators
// Pattern:
//   - One schema per operation (create, update, query, login, register)
//   - z.infer<> type export for each schema — single source of truth
//   - .trim() on string inputs to prevent whitespace-only values
//   - .default() for optional fields with sensible defaults
//   - .safeParse() in route handlers (never .parse() — it throws)
//   - Max lengths on all string fields
//   - z.enum() for constrained values (status, priority, sort)

import { z } from 'zod';

export const createThingSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().max(5000, 'Description must be 5000 characters or less').nullable().optional().default(null),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const updateThingSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const thingQuerySchema = z.object({
  status: z.enum(['active', 'inactive']).optional(),
  sort: z.enum(['created_at', 'updated_at', 'title']).default('created_at'),
});

// Type exports — use these in route handlers and components
export type CreateThingInput = z.infer<typeof createThingSchema>;
export type UpdateThingInput = z.infer<typeof updateThingSchema>;
export type ThingQuery = z.infer<typeof thingQuerySchema>;
