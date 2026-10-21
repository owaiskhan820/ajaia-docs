# Architecture Note

## What I prioritized and why

### 1. Spine-first deployment

I deployed an empty app to Vercel and verified the Neon DB connection worked before writing any feature code. This catches infrastructure and environment mismatches early. The spine check (/api/db-check) stays in the app as a health-check endpoint.

### 2. Tiptap for the editor

Tiptap gives us a ProseMirror-backed contenteditable that stores rich HTML natively, with a straightforward React integration. The main tradeoff: it is a larger bundle than a plain textarea, and the v3 API has a few breaking changes from v2 (e.g. setContent options changed shape, immediatelyRender flag required to avoid SSR mismatches). Worth it because the editing experience is substantially better.

### 3. Neon serverless driver

Using @neondatabase/serverless with neon() (the HTTP-based driver) rather than pg + connection pooling. In a Vercel serverless environment, maintaining a connection pool across lambda invocations is unreliable. The Neon HTTP driver is designed exactly for this pattern.

### 4. Three-table schema

  users(id, name)
  documents(id, title, content, owner_id, created_at, updated_at)
  shares(document_id, shared_with_user_id) -- unique constraint

The UNIQUE(document_id, shared_with_user_id) constraint means the app can use ON CONFLICT DO NOTHING for idempotent share grants and prevents duplicate share entries at the DB level.

### 5. Seeded auth over real auth

Real OAuth adds ~1 hour and zero product signal for this scope. The "Acting as..." dropdown achieves the same demo goal: the reviewer can switch between Alice, Bob, and Carol and verify that sharing, access control, and the owned/shared distinction all work correctly.

### 6. Scope cuts

.docx parsing excluded. Reading .docx correctly requires unzipping the file and parsing XML. I chose to support .txt and .md (plain text, no parsing needed) and document the limit clearly in the UI.

No real-time collaboration. The assessment explicitly allows this tradeoff.

No version history. The update flow records updated_at. The table structure would support a document_versions table with 2 more hours.

## Data flow

  Browser -> Next.js App Router
    |- Client components (page.tsx, Editor.tsx) -- useEffect for data fetching
    +- API Routes (route.ts files)
          +- @neondatabase/serverless -> Neon Postgres (via HTTP)

## CI/CD and staging

Due to the time constraint of this assessment, all changes were built and pushed directly to production. In a real-world project I would not work this way. Given more time I would have set up:

- A **staging environment** on Vercel (a separate branch deployment pointing at a Neon branch database) so every change could be tested end-to-end before it reached users.
- A **CI pipeline** (GitHub Actions) running type-checking, unit tests, and a headless Playwright smoke-test on every pull request, with the merge button blocked until green.
- **Branch-based deploys** — no direct commits to master; all work done on feature branches, reviewed via pull request, merged only after CI passes.
- **Database migrations** via a proper migration tool (e.g. Drizzle migrations or Flyway) rather than the idempotent `ALTER TABLE … IF NOT EXISTS` pattern used here, which is fine for a solo assessment but fragile in a team setting.

The foundation is all there (the seed endpoint already doubles as a migration runner), but wiring it into a proper pipeline was deliberately deferred given the deadline.

## Testing approach

One test file, 10 tests, covering upload validation and text-to-HTML conversion. The validation logic lives in lib/upload-validator.ts (pure functions, no DB), so it can be tested without mocking. I used Vitest because it is zero-config with ESM and TypeScript.
