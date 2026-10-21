import { NextResponse } from "next/server";
import sql from "@/lib/db";

// POST /api/seed — idempotently creates tables and seeds Alice / Bob / Carol.
// Safe to call multiple times; uses CREATE TABLE IF NOT EXISTS + ON CONFLICT DO NOTHING.
export async function POST() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id   SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS documents (
        id         SERIAL PRIMARY KEY,
        title      TEXT        NOT NULL DEFAULT 'Untitled',
        content    TEXT        NOT NULL DEFAULT '',
        owner_id   INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS shares (
        id                  SERIAL PRIMARY KEY,
        document_id         INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        shared_with_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(document_id, shared_with_user_id)
      )
    `;

    await sql`
      INSERT INTO users (name) VALUES ('Alice'), ('Bob'), ('Carol')
        ON CONFLICT (name) DO NOTHING
    `;

    const users = await sql`SELECT id, name FROM users ORDER BY id`;
    return NextResponse.json({ ok: true, users });
  } catch (err) {
    console.error("Seed failed:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
