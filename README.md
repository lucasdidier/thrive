# Thrive

A workspace for independent service businesses: clients, projects, proposals and documents, invoices, forms, time tracking, workflows, email, calendar, and scheduling.

This repository is for running **your own Thrive instance**. Bring your own hosting, database, and optional integrations. There is no shared hosted demo or connection to the author's accounts.

> Early software: review and test it with your own data before relying on it for daily operations. Thrive is available under the [MIT license](LICENSE). Third-party licenses are retained.

## Choose your setup

| Setup | What you need |
| --- | --- |
| Try it locally, by yourself | Node.js 22.13+ (24 recommended). No Supabase or Nylas account required. Local mock sign-in is for development only. |
| Host it at your own HTTPS URL | Cloudflare Workers plus your own Supabase project for authentication, database, and private file storage. |
| Enable live email, calendar, and booking pages | Your own Nylas application, API key, and Google/Microsoft connector configuration. |

Authentication is optional for a local, private single-user preview. The current release does **not** provide a production no-login mode. A public URL needs access control even if only one person intends to use it. The supplied Cloudflare deployment requires Supabase and fails closed if that mode is disabled. A future private-network/no-login deployment would need a dedicated single-owner adapter.

## Try it locally

Clone this repository, open a terminal in its root, then:

```sh
npm run install:ci
npm test
npm run build
npm run db:local
npm run dev -- --port 5173 --hostname 127.0.0.1
```

Open **http://127.0.0.1:5173**. The local mock sign-in does not require a ChatGPT account. Keep this preview on loopback; do not expose the development server through a public tunnel. Data is stored in your local `.wrangler/state` directory. `db:local` initializes a fresh preview database; do not rerun it over an already initialized database. To test authenticated hosting locally, follow the Supabase section in the guide instead.

## Self-host

Follow the [self-hosting guide](docs/self-hosting.md) for:

1. Creating your Supabase project and applying both database migrations.
2. Configuring email/password authentication, optional Google/Microsoft login, and recovery emails.
3. Deploying the full application to Cloudflare Workers over HTTPS.
4. Optionally connecting your own Nylas application for email, calendar, and booking pages.
5. Verifying access control, backups, and the features you enable.

## Get started with a coding agent

Copy this prompt into Codex, Claude Code, Cursor, GitHub Copilot, or another coding agent with terminal access. It works even if you haven't cloned the repository yet:

```text
Help me install and run Thrive from https://github.com/lucasdidier/thrive.

Clone the repository into a new folder if it is not already checked out. Read
README.md, docs/self-hosting.md, and docs/agent-setup.md, then follow the detailed
setup prompt in docs/agent-setup.md.

Start with the local-only preview unless I ask for a hosted deployment. Inspect
my environment, use Node.js 22.13+ (24 recommended), install the locked dependencies,
run the tests, build the app, and initialize a fresh local database if needed.
Preserve any existing database and user changes. Start the preview on 127.0.0.1
and give me its local URL. This preview needs no Supabase or Nylas account.

If I request hosting, help me use my own Cloudflare Workers and Supabase project,
with HTTPS and authentication. If I request email, calendar, or booking pages,
help me configure my own Nylas application and connect my own mailbox/calendar.
Follow the standalone deployment instructions; don't deploy the local mock auth.

Ask only for missing decisions or account access when needed. Have me enter
secrets through secure local prompts or provider settings, never in chat or
tracked files. Don't overwrite existing data, send email, issue invitations,
or publish a deployment/booking page without my authorization.

Finish with the URL, what was verified, and any remaining setup steps. Do not
claim that external integrations work unless you actually verified them.
```

For a hosted setup from the outset, add “Deploy to my Cloudflare account using my
own Supabase project” to the prompt. The [detailed agent prompt](docs/agent-setup.md)
includes preferences for your domain, account access, and optional integrations.

## What's included

- CRM clients and projects, custom fields, table/board views, and CSV import.
- Documents, proposals, invoices, manual payment tracking, time, and workflows.
- Shareable client portals, documents, invoices, website forms, and private uploads.
- Optional Nylas email, calendar, and hosted booking pages.
- Supabase accounts, server-validated workspace operations, and an MCP endpoint at `/mcp`.

The code retains a legacy direct Google integration, but the self-hosting guide uses Nylas. Nylas is not needed for core CRM, documents, or invoices. Without it, live mailbox/calendar access and hosted booking publication are unavailable; local scheduling definitions can still be edited.

Payments are recorded manually; Thrive does not collect money. Typed document signatures are not an independent identity-verification service. The in-app AI chat is a prototype intent parser, not a bundled LLM service. External agents can use MCP with a verified Supabase user token; complete OAuth account linking for MCP clients is not implemented.

## Project layout

| Path | Contents |
| --- | --- |
| `app/`, `server/` | Routes, authentication, storage, business operations, integrations, MCP |
| `public/`, `ui/`, `components/`, `fluid/` | Browser interface and shared domain logic |
| `supabase/migrations/` | PostgreSQL schema, RLS, RPCs, and private storage bucket |
| `db/`, `drizzle/` | Local/Sites D1 schema and migrations |
| `vite.self-hosted.config.ts`, `wrangler.self-hosted.jsonc` | Standalone Cloudflare deployment |
| `tests/` | Domain, persistence, integration-adapter, and account tests |
| `docs/` | Setup guide, agent prompt, product model, and historical feature notes |

The runtime is a Vinext/Vite application with Cloudflare Workers bindings. Node.js runs development and build tools; this is not a static-only site or a generic `node server.js` production server. The original Sites preview tools remain available for local development, but the standalone deployment does not need a Sites project or a ChatGPT account.

## Development

```sh
npm test
npm run build:self-hosted
```

Builds generate ignored `dist/` and `public/fluid/` assets. Keep dependency versions pinned through the committed lockfile. Read [historical feature notes](docs/feature-notes.md) for implementation detail; the setup guide takes precedence over old deployment notes.

## License and credentials

Thrive is licensed under the [MIT license](LICENSE), copyright © 2026 Lucas Didier.
Bundled third-party assets retain their own license notices.

Never commit `.dev.vars`, `.env` files, service/API keys, workspace exports, real
client information, share tokens, or local database state. See the
[secret audit](docs/secret-audit.md) for the scope and results of the pre-publication check.
