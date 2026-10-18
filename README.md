# Thrive

A compact freelancer workspace for clients, projects, forms, documents, invoices, time, scheduling, and one-trigger/one-action workflows. The existing HTML/JS interface is served by a Sites Vinext Worker; authenticated data is stored in D1.

## Develop

Requires Node 22.13+ (Node 24 recommended). Run `npm run install:ci`, then `npm run db:generate` only after editing `db/schema.ts`. Build through the Sites `build-site.mjs` helper. Apply the generated schema to the local database:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_outstanding_otto_octavius.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_warm_sway.sql
npm run dev -- --port 4173 --hostname 127.0.0.1
```

Local preview uses the starter's loopback-only mock sign-in. Hosted identity comes from trusted Sites identity headers; the mock sign-in is excluded from the production build. `npm test` runs domain, custom field, SQLite-backed concurrency, and MCP protocol tests. `node server.mjs` remains a compatibility entry point for preview.

Source layout:

- `public/`: browser UI and shared pure business logic; assets are no longer maintained in `dist/`.
- `ui/index.html`: app shell served by `app/route.ts`.
- `app/api/workspace/route.ts`: authenticated browser migration and synchronization.
- `app/mcp/route.ts`, `server/`: MCP, action dispatch, validation, and shared persistence.
- `db/`, `drizzle/`: schema and immutable generated migrations.

## Custom fields

Clients and projects have independent definitions. Use the table's **+** button or **Display → Manage custom fields**. Fields support text, number, currency (USD decimals), date, checkbox, select, multi-select, email, and URL. Values can be edited from table cells or record details, displayed in saved views, searched, filtered, and sorted. New fields appear in default table views. Archived fields and values are retained and can be restored.

Field and option IDs remain stable through renaming. Types are fixed at creation; used options cannot be removed until their values are cleared. Empty values, numeric zero, and unchecked checkboxes are distinct. Custom fields are internal workspace metadata and are not added to client-facing documents/portals.

Workflows support `client.field_changed` and `project.field_changed`, optionally scoped to one field, plus `client.set_field` and `project.set_field` actions with typed controls.

## Shared workspace

On first sign-in, the browser's existing workspace is imported into an owner-scoped D1 row, with a local pre-migration backup. Thereafter D1 is authoritative. Other browsers and connected agents use the same authenticated user workspace. Idle browsers poll for updates every five seconds; editing a dialog pauses automatic refresh.

Writes use revision checks and idempotency receipts. A stale writer cannot overwrite newer state. Unsaved edits are retained locally with download/reload controls, including recovery after refresh. Server-side workflow execution occurs once per committed change, and actual trigger events are recorded with the same transaction. Workflow action failures are isolated and visible in run history.

This first backend uses compressed workspace snapshots, not a normalized multi-user CRM schema. Current bounds: 8 MB uncompressed state, 1.8 MB compressed, 50 custom fields per object, 50 options per field. Use smaller logos if attachment limits are reached. Concurrent edits are detected, not automatically merged. Issued invoice snapshots and existing payment entries are protected from replacement. Browser sync validates full snapshots; MCP actions use individual domain operations. There is no shared-team role model yet.

## Thrive MCP

The hosted stateless Streamable HTTP endpoint is `/mcp`; `.openai/hosting.json` declares the capability. Sites provisions and authenticates the private connector. Install/connect the provisioned plugin through Codex **Plugins → Personal → Created by you**. No local stdio process or hand-written bearer token is needed. Open the hosted Thrive workspace once to migrate records before making agent writes.

Tools:

| Tool | Purpose |
| --- | --- |
| `thrive_get_workspace` | Initialization, revision, counts |
| `thrive_get_catalog` | All triggers, executable actions, input schemas, field definitions |
| `thrive_list_records` / `thrive_get_record` | Scoped record reads, pagination and text search |
| `thrive_preview_action` | Validate/simulate an action and workflow effects without saving |
| `thrive_execute_action` | Commit an action with `expected_revision` and `request_id` |
| `thrive_test_workflow` | Simulate a workflow on a sample record without emitting live events |
| `thrive_read_events` | Cursor-based polling of actual committed business events |
| `thrive_list_workflow_runs` | Successes, failures, and loop prevention |

Typical agent sequence: read workspace + catalog, read target records, preview an action, execute at the observed revision with a unique request ID. Retry an uncertain write using the same exact arguments/request ID; after a revision conflict, read and review again with a new request ID. Select/multi-select values use stable option IDs. Money in invoice/project data is integer cents; workflow `config.amount` is a USD decimal string. Custom currency fields use USD decimal numbers.

Example custom field action input:

```json
{
  "action": "customField.save",
  "input": {
    "entity": "project",
    "data": {"name": "Priority", "type": "select", "options": [{"label": "High"}, {"label": "Normal"}]}
  },
  "expected_revision": 4,
  "request_id": "unique-operation-identifier"
}
```

All workflow catalog actions are available via MCP, plus typed field administration, draft editing/issuing, service editing, document responses/revisions, form submission, manual payments, meeting completion, and workflow management. Triggers describe observed state changes: callers cannot fabricate a paid invoice/signature by emitting arbitrary events. MCP discovery contains no private data; all data-bearing calls require authenticated identity. Separate users cannot access each other's workspaces. A Sites service-access bypass token alone does not grant data access.

Remaining prototype boundaries: no payment collection or Stripe connection, no outbound email, no third-party e-signature or signer verification service, no external calendar sync, no background date triggers. Owner preview and MCP document responses remain explicitly simulated. Client-link responses are recorded against the shared version. AI chat still uses the existing prototype intent parser; adding MCP does not turn chat into a hosted LLM service.

## Client links

Published documents, issued invoices, and active forms have a **Share** action. Generate or copy a link, choose 7/30/90 days or no expiry, and revoke it at any time. Documents are pinned to a published version; revision, archive, revocation, or expiry makes that link unavailable. Completed versions remain downloadable. Forms use their current definition and reject submissions from an outdated page. Invoices show the current recorded balance and payment instructions; clients cannot mark invoices paid.

`/share/:token` serves a standalone page without workspace navigation. `/api/shared/:token` returns an explicit allowlist of client-visible fields and accepts only that item's permitted response. Client names, consent, action, version and server timestamp are retained for document responses. Typed signatures record consent; there is no independent identity verification or third-party e-signature service. Owner previews and MCP `document.respond` remain simulations. Client responses run the existing workflows transactionally. Form retries and document retries use idempotency receipts, and concurrent responses cannot produce duplicate invoices.

The D1 `share_links` index stores SHA-256 hashes of 256-bit random tokens; only the owner's authenticated workspace keeps copyable tokens. Revocation is checked against current workspace state on every request. Links are bearer capabilities: anyone given the link can access its item until revoked or expired. Pages disable indexing, referrer transmission and framing. Form submissions have per-link limits. Downloads are self-contained HTML copies; **Print / Save PDF** uses the browser's print renderer and the invoice's saved design.

The Sites audience must permit anonymous requests for these routes. The root workspace still redirects to sign-in; workspace API and MCP record calls require trusted identity and remain scoped to that owner. No platform bypass credential is used in client links.

Agents can create/reuse links with `share.create` (`entity`, `recordId`, optional `expiresInDays`), revoke with `share.revoke` (`id`), and read their owner's links using entity `shareLink`. Returned `path` values are relative to the Thrive site origin.
