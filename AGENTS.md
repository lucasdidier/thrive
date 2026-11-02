# Thrive

Workspace for independent service businesses: clients, projects, proposals, contracts, invoices, email, scheduling, time, forms and workflows. It serves real clients, so treat data and migrations with care. Product context is in `PRODUCT.md`; feature behavior is documented in `README.md` by section, so read the relevant section rather than the whole file.

## Stack and layout

Node 22.13+ (24 recommended). Vinext (Next.js on Vite) on Cloudflare Workers, with D1, R2 and Drizzle, hosted on ChatGPT Sites. Optional Supabase account mode.

- `public/`: browser UI and shared pure business logic, as plain ES modules. Domain logic lives in `*-domain.js`. Assets are not maintained in `dist/`.
- `ui/index.html`: app shell, served by `app/route.ts`.
- `app/api/workspace/route.ts`: authenticated browser sync.
- `app/mcp/route.ts`, `server/`: MCP, action dispatch, validation and persistence.
- `db/schema.ts`, `drizzle/`: schema and generated migrations.
- `supabase/migrations/`: Supabase account mode schema.
- `tests/`: `node:test` suites, `tests/*.test.mjs`.

## Commands

- Install: `npm run install:ci`
- Test everything: `npm test`
- Test one file: `node --test tests/<name>.test.mjs`
- Dev server: `npm run dev -- --port 4173 --hostname 127.0.0.1` (local mock sign-in, loopback only)
- UI preview with fictional data, no accounts, providers or writes: `npm run preview:design`
- Build: `npm run build`
- After editing `db/schema.ts`: `npm run db:generate`
- Local database: apply every `drizzle/*.sql` file in order with `wrangler d1 execute DB --local` (full command in the README's Develop section; its list stops before `0004_nylas.sql`, which is also required).

`npm run lint` currently fails because the repo has no ESLint config. Don't treat that as a code failure.

## Rules

- Run `npm test` after changes, and add or update tests when behavior changes.
- Never edit an existing migration. Generate a new one.
- Writes must keep revision checks and idempotency receipts. A stale writer must not overwrite newer state.
- Don't change published document versions, issued invoices or other commercial snapshots. Money totals come from business records.
- Keep account boundaries intact. Never put secrets in source or browser bundles, and never give agents the privileged Supabase key.
- Use fictional sample data for UI work, with no external sends or provider connections.
- `self-hosted/` is a separate checkout and isn't part of a release from `prototype/`.

## UI work

Read `DESIGN.md` before changing UI. `public/design-system.css` owns colors, semantic roles and shared components; don't add another root palette or a literal primary button color. `public/design-system.html` is the live component reference. App styling must not override saved invoice or document branding, or public client pages. Preserve keyboard access, reduced motion, contrast and responsive layouts. Check light and dark mode.

## Deployment

Production is the existing ChatGPT Sites project declared in `.openai/hosting.json`. Don't deploy, run remote database commands or change hosting unless asked.
