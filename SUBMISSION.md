# SUBMISSION.md

## What is included

- `README.md` -- local setup and run instructions, deployment steps, seeded users
- `ARCHITECTURE.md` -- what was prioritized and why, scope cuts, data flow
- `AI_WORKFLOW.md` -- AI tools used, where AI helped, what was changed, verification approach
- `SUBMISSION.md` -- this file
- Source code (Next.js 16 App Router, TypeScript, Tailwind, Tiptap, Neon Postgres)
- `lib/schema.sql` -- raw SQL to create tables (also run via POST /api/seed)
- `__tests__/upload-validator.test.ts` -- 10 automated unit tests

## Live deployment

URL: https://ajaia-docs-eo799c0cd-owaiskhan820s-projects.vercel.app

## Test accounts

Use the "Acting as..." dropdown to switch between:
- Alice (id 1)
- Bob (id 2)
- Carol (id 3)

No password needed. To demonstrate sharing: create a document as Alice, click Share, add Bob. Then switch to Bob and verify the document appears under "Shared With Me".

## Walkthrough video

URL: https://www.loom.com/share/f784fdd105cb4a7d8138df8dbf1b2998

## What is working

- Document creation, renaming, deletion
- Rich-text editing: bold, italic, underline, H1/H2/H3, bullet lists, ordered lists, text alignment, blockquote, inline code
- Save (button + Ctrl+S)
- Sharing: grant access, revoke access
- Dashboard: owned vs shared documents clearly separated
- File upload: .txt and .md files converted to editable documents
- Full persistence in Neon Postgres
- 10 automated unit tests (all passing)
- Build: 0 TypeScript errors, clean Vercel deploy

## What is incomplete / intentionally excluded

- No real authentication (seeded users + dropdown)
- No real-time collaboration
- No document version history (stretch goal)
- **Inline commenting** — the share dialog exposes a "Commenter" permission level (read-only access) but there is no comment thread UI. Full inline commenting requires a `comments` table, a Tiptap anchor extension to highlight selections, and a sidebar to display threads. The data model and permission level are already stubbed; the UI was cut due to time. This would be the first thing I would build next.

## What I would build next with 2-4 more hours

1. Auto-save with debounce (currently manual save only)
2. Document version history (snapshot on each save, diff view)
3. Better toolbar icons (SVG instead of unicode placeholders)
4. Keyboard shortcut help overlay
5. Export to Markdown (reverse the HTML-to-text conversion)
