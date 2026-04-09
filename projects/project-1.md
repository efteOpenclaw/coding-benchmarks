# Project 1: Task Manager (Difficulty: ★☆☆)

## Overview
Fullstack task management app. CRUD operations, auth, filtering.
Single-user. Calibration project — tests baseline capability.

## Data Model

**User**
| Field         | Type        | Constraints        |
|---------------|-------------|--------------------|
| id            | TEXT (UUID) | PK                 |
| email         | TEXT        | UNIQUE, NOT NULL   |
| password_hash | TEXT        | NOT NULL           |
| created_at    | TEXT (ISO)  | NOT NULL, DEFAULT  |

**Task**
| Field       | Type        | Constraints                 |
|-------------|-------------|-----------------------------|
| id          | TEXT (UUID) | PK                          |
| user_id     | TEXT        | FK → User, NOT NULL         |
| title       | TEXT        | NOT NULL, max 200 chars     |
| description | TEXT        | nullable                    |
| status      | TEXT        | 'todo'|'in_progress'|'done' |
| priority    | TEXT        | 'low'|'medium'|'high'       |
| due_date    | TEXT (ISO)  | nullable                    |
| created_at  | TEXT (ISO)  | NOT NULL, DEFAULT           |
| updated_at  | TEXT (ISO)  | NOT NULL, DEFAULT           |

## API Routes

```
POST   /api/auth/register   — { email, password } → { user }
POST   /api/auth/login      — { email, password } → { user }
POST   /api/auth/logout     — {} → { success }
GET    /api/auth/me         — → { user } | 401

GET    /api/tasks           — ?status=&priority=&sort=due_date|created_at|priority → { tasks[] }
POST   /api/tasks           — { title, description?, status?, priority?, due_date? } → { task }
GET    /api/tasks/:id       — → { task } | 404
PATCH  /api/tasks/:id       — partial update → { task }
DELETE /api/tasks/:id       — → { success }
```

All protected routes return 401 without valid session.
All mutations validate input with Zod.
Consistent response shape: `{ success: boolean, data?: T, error?: { code: string, message: string } }`

## UI Requirements
- Login / register pages
- Task list with status + priority filter dropdowns
- Sort toggle: due date, created date, priority
- Create task form (title required, rest optional)
- Edit task inline or via modal
- Delete with confirmation dialog
- Color-coded priority indicators
- Overdue highlight on past due dates
- Empty states (no tasks, no filter results)
- Responsive (mobile viewport)

## Tech Stack (enforced)
- Next.js 14+ App Router
- TypeScript strict mode (`"strict": true` in tsconfig)
- SQLite via better-sqlite3 — raw SQL, typed wrapper functions, NO ORM
- Tailwind CSS — no inline styles, no CSS modules
- Vitest + @testing-library/react + supertest
- Iron-session for auth sessions
- bcryptjs for password hashing
- Zod for all runtime validation

## DO NOT Build
- Email verification or password reset
- Task sharing / collaboration
- File attachments
- Real-time updates (WebSocket/SSE)
- Deployment config (Dockerfile, CI, etc.)
