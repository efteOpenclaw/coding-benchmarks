// TEMPLATE: Data Access Layer
// Pattern:
//   - Singleton better-sqlite3 connection
//   - getDb(':memory:') override for tests — no file cleanup needed
//   - WAL mode + foreign keys enabled on init
//   - Schema auto-created on first connection (CREATE TABLE IF NOT EXISTS)
//   - Every function: typed params → parameterized SQL (?) → typed return
//   - NEVER expose raw rows — always return typed interfaces
//   - NEVER put SQL outside this file
//   - NEVER use string interpolation for values — only ? placeholders
//   - For dynamic column names (UPDATE SET, ORDER BY): use a WHITELIST, never user input
//   - crypto.randomUUID() for IDs — no uuid dependency needed
//   - RETURNING * for write operations

import Database from 'better-sqlite3';
import crypto from 'crypto';

// -- Typed row interfaces --

export interface ThingRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// -- Singleton connection --

let db: Database.Database | null = null;

export function getDb(path?: string): Database.Database {
  if (db) return db;

  const dbPath = path ?? process.env.DATABASE_PATH ?? './data/app.db';
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS things (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL CHECK(length(title) <= 200),
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_things_user_id ON things(user_id);
    CREATE INDEX IF NOT EXISTS idx_things_user_status ON things(user_id, status);
  `);

  return db;
}

export function closeDb(): void {
  if (db) { db.close(); db = null; }
}

// -- Query functions: typed params → parameterized SQL → typed return --

export function createThing(params: { user_id: string; title: string; description?: string | null }): ThingRow {
  const id = crypto.randomUUID();
  const stmt = getDb().prepare(
    'INSERT INTO things (id, user_id, title, description) VALUES (?, ?, ?, ?) RETURNING *'
  );
  return stmt.get(id, params.user_id, params.title, params.description ?? null) as ThingRow;
}

export function getThingById(id: string, userId: string): ThingRow | undefined {
  // Always scope by userId — return 404 (not 403) for other users' resources
  const stmt = getDb().prepare('SELECT * FROM things WHERE id = ? AND user_id = ?');
  return stmt.get(id, userId) as ThingRow | undefined;
}

export function deleteThing(id: string, userId: string): boolean {
  const stmt = getDb().prepare('DELETE FROM things WHERE id = ? AND user_id = ?');
  const result = stmt.run(id, userId);
  return result.changes > 0;
}

// -- SAFE dynamic UPDATE: whitelist allowed columns --

const UPDATABLE_COLUMNS = new Set(['title', 'description']);

export function updateThing(
  id: string,
  userId: string,
  updates: Record<string, string | null | undefined>
): ThingRow | undefined {
  const existing = getThingById(id, userId);
  if (!existing) return undefined;

  const fields: string[] = [];
  const values: (string | null)[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && UPDATABLE_COLUMNS.has(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return existing;

  fields.push("updated_at = datetime('now')");
  values.push(id, userId);

  const sql = `UPDATE things SET ${fields.join(', ')} WHERE id = ? AND user_id = ? RETURNING *`;
  const stmt = getDb().prepare(sql);
  return stmt.get(...values) as ThingRow | undefined;
}
