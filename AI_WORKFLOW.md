# AI Workflow Note

## Tools used

- Claude Code (claude-sonnet model) as the primary build partner
- Claude Opus for reasoning through architectural decisions

## Where AI materially sped up the work

1. **Scaffolding and boilerplate**: All Next.js route handlers, TypeScript types, and React component skeletons were generated in parallel tool calls. This compressed what would normally be 45 minutes of copy-paste setup into about 5 minutes.

2. **Tiptap v3 API differences**: I asked Claude to check the Tiptap v3 API and it correctly identified that setContent() no longer accepts a boolean second argument -- it now takes an options object. Without that, the build would have failed with a non-obvious type error.

3. **Next.js 16 Suspense requirement**: Claude read the Next.js 16 docs directory bundled with the package and identified that useParams() and useSearchParams() in client components require a Suspense boundary. This is a real breaking change from Next.js 15 and would have been a confusing build error to diagnose cold.

4. **SQL**: The sharing queries (JOIN + subquery for owned OR shared docs) were drafted by AI and I reviewed them for correctness. They are straightforward but tedious to type.

## What AI-generated output I changed or rejected

1. **Editor readOnly prop**: The original document page had a complex expression determining whether the editor should be read-only based on share status. I simplified it to always allow editing for anyone who can open the document -- the access check happens at the API level, which is the right place for it.

2. **Toolbar icons**: AI used unicode arrows for alignment buttons which looked odd. I kept them for now as functional placeholders; in a production version I would swap in proper SVG icons.

3. **The setContent call**: AI initially used the v2 API (boolean second arg). I caught the type error from the build output and applied the correct v3 fix.

## How I verified correctness

- **Build check**: ran `npm run build` after every major change. TypeScript errors surface here.
- **Test suite**: 10 unit tests pass before and after every change.
- **Manual review**: read every route handler and component before committing. The sharing access control logic (who can read, who can write, who can share) was reviewed manually because mistakes there have user-visible consequences.
- **DB schema**: reviewed the SQL for ON CONFLICT behavior and foreign key cascades before running it.

## Reflection

AI tools are most valuable in this kind of timebox when they handle the mechanical work (route stubs, type definitions, CSS classes) and flag version-specific breaking changes that would otherwise require documentation hunting. The judgment calls -- what to cut, where to put the access control, how to structure the schema -- stayed with me.
