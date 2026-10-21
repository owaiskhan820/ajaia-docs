-- Run this once against your Neon database to set up tables + seed users.
-- You can also hit POST /api/seed from the deployed app.

CREATE TABLE IF NOT EXISTS users (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS documents (
  id         SERIAL PRIMARY KEY,
  title      TEXT    NOT NULL DEFAULT 'Untitled',
  content    TEXT    NOT NULL DEFAULT '',
  owner_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shares (
  id                  SERIAL PRIMARY KEY,
  document_id         INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  shared_with_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(document_id, shared_with_user_id)
);

-- Seed three users
INSERT INTO users (name) VALUES ('Alice'), ('Bob'), ('Carol')
  ON CONFLICT (name) DO NOTHING;
