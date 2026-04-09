// TEMPLATE: Data Access Layer (PostgreSQL via pg)
// Pattern:
//   - Connection pool (pg.Pool) — never single client for request handling
//   - DATABASE_URL from env — connection string, not individual params
//   - Schema auto-created via initDb() — call once at startup
//   - Every function: typed params → parameterized SQL ($1, $2) → typed return
//   - NEVER expose raw rows — always return typed interfaces
//   - NEVER put SQL outside this file
//   - NEVER use string interpolation for values — only $1 placeholders
//   - For dynamic column names (UPDATE SET, ORDER BY): use a WHITELIST, never user input
//   - crypto.randomUUID() for IDs — no uuid dependency needed
//   - RETURNING * for write operations

import { Pool, PoolClient } from 'pg';
import crypto from 'crypto';

// -- Typed row interfaces --

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface PageRow {
  id: string;
  slug: string;
  title: string;
  parent_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PageRevisionRow {
  id: string;
  page_id: string;
  content_markdown: string;
  content_html: string;
  edited_by: string;
  edit_summary: string | null;
  created_at: string;
}

export interface PageLockRow {
  page_id: string;
  locked_by: string;
  locked_at: string;
  expires_at: string;
}

// -- Connection pool --

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) { await pool.end(); pool = null; }
}

// -- Schema init (call once at startup or in test beforeAll) --

export async function initDb(): Promise<void> {
  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL CHECK(length(title) <= 200),
      parent_id TEXT REFERENCES pages(id) ON DELETE SET NULL,
      created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
    CREATE INDEX IF NOT EXISTS idx_pages_parent ON pages(parent_id);

    CREATE TABLE IF NOT EXISTS page_revisions (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      content_markdown TEXT NOT NULL,
      content_html TEXT NOT NULL,
      edited_by TEXT NOT NULL REFERENCES users(id),
      edit_summary TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_revisions_page ON page_revisions(page_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS page_locks (
      page_id TEXT PRIMARY KEY REFERENCES pages(id) ON DELETE CASCADE,
      locked_by TEXT NOT NULL REFERENCES users(id),
      locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    );
  `);
}

// -- Query functions: async, parameterized, typed --

export async function createUser(params: {
  email: string; password_hash: string; display_name: string;
}): Promise<UserRow> {
  const id = crypto.randomUUID();
  const { rows } = await getPool().query(
    'INSERT INTO users (id, email, password_hash, display_name) VALUES ($1, $2, $3, $4) RETURNING *',
    [id, params.email, params.password_hash, params.display_name]
  );
  return rows[0] as UserRow;
}

export async function getUserByEmail(email: string): Promise<UserRow | undefined> {
  const { rows } = await getPool().query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] as UserRow | undefined;
}

export async function getUserById(id: string): Promise<UserRow | undefined> {
  const { rows } = await getPool().query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] as UserRow | undefined;
}

// -- Page CRUD --

export async function createPage(params: {
  title: string; slug: string; parent_id?: string | null; created_by: string;
  content_markdown: string; content_html: string;
}): Promise<PageRow> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const pageId = crypto.randomUUID();
    const { rows: pageRows } = await client.query(
      'INSERT INTO pages (id, slug, title, parent_id, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [pageId, params.slug, params.title, params.parent_id ?? null, params.created_by]
    );
    const revId = crypto.randomUUID();
    await client.query(
      'INSERT INTO page_revisions (id, page_id, content_markdown, content_html, edited_by) VALUES ($1, $2, $3, $4, $5)',
      [revId, pageId, params.content_markdown, params.content_html, params.created_by]
    );
    await client.query('COMMIT');
    return pageRows[0] as PageRow;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getPageBySlug(slug: string): Promise<PageRow | undefined> {
  const { rows } = await getPool().query('SELECT * FROM pages WHERE slug = $1', [slug]);
  return rows[0] as PageRow | undefined;
}

// -- SAFE dynamic UPDATE: whitelist allowed columns --

const PAGE_UPDATABLE = new Set(['title', 'parent_id']);

export async function updatePage(
  slug: string,
  updates: Record<string, string | null | undefined>
): Promise<PageRow | undefined> {
  const fields: string[] = [];
  const values: (string | null)[] = [];
  let paramIdx = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && PAGE_UPDATABLE.has(key)) {
      fields.push(`${key} = $${paramIdx++}`);
      values.push(value);
    }
  }
  if (fields.length === 0) return getPageBySlug(slug);

  fields.push(`updated_at = NOW()`);
  values.push(slug);

  const sql = `UPDATE pages SET ${fields.join(', ')} WHERE slug = $${paramIdx} RETURNING *`;
  const { rows } = await getPool().query(sql, values);
  return rows[0] as PageRow | undefined;
}

// -- Revisions --

export async function createRevision(params: {
  page_id: string; content_markdown: string; content_html: string;
  edited_by: string; edit_summary?: string | null;
}): Promise<PageRevisionRow> {
  const id = crypto.randomUUID();
  const { rows } = await getPool().query(
    `INSERT INTO page_revisions (id, page_id, content_markdown, content_html, edited_by, edit_summary)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [id, params.page_id, params.content_markdown, params.content_html, params.edited_by, params.edit_summary ?? null]
  );
  // Also touch page updated_at
  await getPool().query('UPDATE pages SET updated_at = NOW() WHERE id = $1', [params.page_id]);
  return rows[0] as PageRevisionRow;
}

export async function getRevisions(pageId: string): Promise<PageRevisionRow[]> {
  const { rows } = await getPool().query(
    'SELECT * FROM page_revisions WHERE page_id = $1 ORDER BY created_at DESC',
    [pageId]
  );
  return rows as PageRevisionRow[];
}

export async function getLatestRevision(pageId: string): Promise<PageRevisionRow | undefined> {
  const { rows } = await getPool().query(
    'SELECT * FROM page_revisions WHERE page_id = $1 ORDER BY created_at DESC LIMIT 1',
    [pageId]
  );
  return rows[0] as PageRevisionRow | undefined;
}

// -- Locks (with expiry) --

export async function acquireLock(pageId: string, userId: string, ttlMinutes = 5): Promise<PageLockRow | null> {
  // Delete expired locks first, then try to insert
  await getPool().query('DELETE FROM page_locks WHERE expires_at < NOW()');
  try {
    const { rows } = await getPool().query(
      `INSERT INTO page_locks (page_id, locked_by, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '${ttlMinutes} minutes')
       RETURNING *`,
      [pageId, userId]
    );
    return rows[0] as PageLockRow;
  } catch {
    // Unique constraint violation = already locked
    return null;
  }
}

export async function releaseLock(pageId: string, userId: string): Promise<boolean> {
  const result = await getPool().query(
    'DELETE FROM page_locks WHERE page_id = $1 AND locked_by = $2',
    [pageId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getLock(pageId: string): Promise<PageLockRow | undefined> {
  await getPool().query('DELETE FROM page_locks WHERE expires_at < NOW()');
  const { rows } = await getPool().query('SELECT * FROM page_locks WHERE page_id = $1', [pageId]);
  return rows[0] as PageLockRow | undefined;
}
