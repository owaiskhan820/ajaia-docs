# Ajaia Docs

A lightweight collaborative document editor built for the Ajaia LLC Full Stack Product Engineer take-home assessment.

**Live demo:** *(add Vercel URL after deployment)*

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Rich-text editor | Tiptap v3 |
| Database | Neon Postgres (serverless) |
| Deployment | Vercel |
| Tests | Vitest |

---

## Local setup

### Prerequisites

- Node.js 18 + (project uses Node 24)
- A [Neon](https://neon.tech) account with a project created

### Steps

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/ajaia-docs.git
cd ajaia-docs

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.local.example .env.local
# Open .env.local and paste your Neon connection string (postgres://...)
```

`.env.local`:
```
DATABASE_URL=postgres://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

Get your connection string from [Neon Console](https://console.neon.tech) → your project → **Connection Details**.

```bash
# 4. Run the dev server
npm run dev
# → http://localhost:3000

# 5. Seed the database (run once)
# Open http://localhost:3000/api/seed in your browser (or use curl):
curl -X POST http://localhost:3000/api/seed
# This creates the 3 tables and seeds Alice, Bob, Carol.

# 6. Verify DB connection
curl http://localhost:3000/api/db-check
# Should return: {"ok":true,"time":"..."}
```

### Running tests

```bash
npm test
# 10 unit tests for upload validation and text conversion
```

---

## Seeded users

The app uses an "Acting as…" dropdown instead of real auth.

| User | ID |
|---|---|
| Alice | 1 |
| Bob | 2 |
| Carol | 3 |

---

## File upload constraints

Only `.txt` and `.md` files are supported (max 1 MB). This limit is stated in the UI and enforced server-side. The file's text content is converted into a Tiptap-editable HTML document.

`.docx` parsing was deliberately excluded — see Architecture Note.

---

## Deployment (Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Add env var in Vercel dashboard or via CLI:
vercel env add DATABASE_URL
# Paste your Neon connection string when prompted

# Redeploy to pick up the env var
vercel --prod
```

Then hit `https://YOUR_DEPLOY_URL/api/seed` once to create tables.

---

## What works

- Create, rename, delete documents
- Rich-text editing: bold, italic, underline, H1/H2/H3, bullet and ordered lists, text alignment, blockquote, inline code
- Auto-save on Ctrl+S, manual Save button
- Share a document with other users; revoke sharing
- Dashboard: "My Documents" vs "Shared With Me" sections
- Upload `.txt` or `.md` → opens as editable document
- Persist content (Tiptap HTML stored in Postgres)
- 10 automated tests

## What's deliberately excluded

- Real authentication (seeded users + dropdown instead)
- Real-time collaboration (no WebSocket/Liveblocks)
- `.docx` parsing (requires heavy server-side parsing; not worth the complexity for this scope)
- Document version history (stretch goal)
- Role-based sharing beyond basic "can edit"

See `ARCHITECTURE.md` for reasoning.
