# Thrive

A compact freelancer workspace for clients, projects, forms, documents, invoices, time, scheduling, client email, and one-trigger/one-action workflows. The existing HTML/JS interface is served by a Sites Vinext Worker; authenticated data is stored in D1.

## Develop

Requires Node 22.13+ (Node 24 recommended). Run `npm run install:ci`, then `npm run db:generate` only after editing `db/schema.ts`. Build through the Sites `build-site.mjs` helper. Apply the generated schema to the local database:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_outstanding_otto_octavius.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_warm_sway.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_chunky_bullseye.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0003_gorgeous_microchip.sql
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
| `thrive_get_connections` / `thrive_list_conversations` | Google status, cached client threads, delivery receipts |
| `thrive_refresh_gmail` / `thrive_update_conversation` | Refresh mail; link projects or archive locally |
| `thrive_calendar_availability` | Live primary-calendar busy intervals |
| `thrive_preview_delivery` | Exact draft/meeting content and fingerprint for review |
| `thrive_send_email` / `thrive_check_email_delivery` | Explicit Gmail send and delivery reconciliation |
| `thrive_create_calendar_event` | Explicit Google event creation and client invitation |

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

Remaining prototype boundaries: no payment collection or Stripe connection, no third-party e-signature or signer verification service, no background email refresh or date triggers. Gmail and Google Calendar require operator OAuth setup plus user consent. Calendar availability is checked live; event creation is explicit, and subsequent edits/cancellations must be managed in Google Calendar. Owner preview and MCP document responses remain explicitly simulated. Client-link responses are recorded against the shared version. AI chat still uses the existing prototype intent parser; adding MCP does not turn chat into a hosted LLM service.

## Client links

Published documents, issued invoices, and active forms have a **Share** action. Generate or copy a link, choose 7/30/90 days or no expiry, and revoke it at any time. Documents are pinned to a published version; revision, archive, revocation, or expiry makes that link unavailable. Completed versions remain downloadable. Forms use their current definition and reject submissions from an outdated page. Invoices show the current recorded balance and payment instructions; clients cannot mark invoices paid.

`/share/:token` serves a standalone page without workspace navigation. `/api/shared/:token` returns an explicit allowlist of client-visible fields and accepts only that item's permitted response. Client names, consent, action, version and server timestamp are retained for document responses. Typed signatures record consent; there is no independent identity verification or third-party e-signature service. Owner previews and MCP `document.respond` remain simulations. Client responses run the existing workflows transactionally. Form retries and document retries use idempotency receipts, and concurrent responses cannot produce duplicate invoices.

The D1 `share_links` index stores SHA-256 hashes of 256-bit random tokens; only the owner's authenticated workspace keeps copyable tokens. Revocation is checked against current workspace state on every request. Links are bearer capabilities: anyone given the link can access its item until revoked or expired. Pages disable indexing, referrer transmission and framing. Form submissions have per-link limits. Downloads are self-contained HTML copies; **Print / Save PDF** uses the browser's print renderer and the invoice's saved design.

The Sites audience must permit anonymous requests for these routes. The root workspace still redirects to sign-in; workspace API and MCP record calls require trusted identity and remain scoped to that owner. No platform bypass credential is used in client links.

Agents can create/reuse links with `share.create` (`entity`, `recordId`, optional `expiresInDays`), revoke with `share.revoke` (`id`), and read their owner's links using entity `shareLink`. Returned `path` values are relative to the Thrive site origin.


## Client communications and Google connections

Messages provides Needs reply, All conversations, Sent, Drafts, and Archived views, search, client/project filters, threaded replies, and explicit project assignment. Client records and project details link into contextual compose and conversation views. The global New menu includes Email draft. Drafts have project-update, document-delivery, and follow-up templates. Existing client links can be inserted; their hosting audience restrictions still apply. Email bodies are rendered as escaped plain text without remote images or attachments.

Drafts live in the shared workspace and support `emailDraft.create`, `emailDraft.save`, and `emailDraft.delete` through MCP. Created/updated draft events and the Draft email workflow action use the existing event engine. Automation only prepares drafts. External Gmail sends and Google invitations use separate tools and review screens; an agent must obtain explicit authorization for the recipient and contents before using those tools.

Google tokens and OAuth state are stored separately from workspace snapshots. Tokens use AES-GCM with a server-only encryption key and owner-bound additional data. OAuth uses single-use, ten-minute, owner-bound state and PKCE. Gmail and Calendar are separate consent steps for the same Google account. Sites remains the workspace identity provider; Google is only an integration. Disconnect removes tokens and cached conversations, attempts grant revocation, and preserves drafts and delivery receipts.

Email refresh imports up to 25 threads from the last 90 days, searching the first 100 distinct client email addresses. Each thread retains the latest 10 messages. Refresh is manual; it is not a complete mailbox mirror. A project is assigned explicitly. Archive only changes Thrive, not Gmail. Gmail messages and attachments remain accessible in Gmail. The initial connection uses the primary Google calendar only.

Sending uses a draft fingerprint and a durable per-draft operation claim. A draft cannot be edited or deleted after a send attempt. Confirmed sends retain a content snapshot and Gmail IDs. Transport errors remain unconfirmed; retries of the same draft do not send again. Check delivery searches Sent by the deterministic RFC Message-ID. A negative search is not proof of non-delivery, so it does not unlock automatic retry. Definite provider rejections can be copied into a new draft after correction.

The booking preview filters Google busy intervals. Browser saves and MCP booking actions recheck new/changed bookings on the server, including buffers, and fail if connected Google availability cannot be checked. This is an availability check, not an atomic reservation across Google and Thrive: another calendar can still change after the check. Adding a meeting to Google requires a separate review and invitation action. Its deterministic Google event ID prevents duplicate events on retries. Internal meeting notes and briefs are never copied into the invitation. Thrive does not yet update/delete an exported event when a local meeting changes, and this is stated at export/cancellation.

### Operator setup

1. Create a Google Cloud project and enable Gmail API and Google Calendar API. Configure the OAuth consent screen and a Web application OAuth client. During testing, add the intended Google accounts as test users.
2. Register this exact authorized redirect URI: `https://thrive-workspace.creambirch3.chatgpt.site/api/google/callback`. For local testing, use a separate client or add `http://127.0.0.1:4173/api/google/callback` and set the corresponding environment value.
3. Configure server environment variables in Sites: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, and `GOOGLE_TOKEN_ENCRYPTION_KEY`. The encryption key is 32 random bytes encoded as Base64; keep it stable or existing tokens become unreadable. Never commit these values or expose them through public environment prefixes.
4. Deploy the environment revision, open Messages → Connections, and connect Gmail and/or Calendar. Refresh Messages to import existing client threads.

Gmail requests `gmail.readonly` and `gmail.send`, plus identity scopes. Calendar requests `calendar.events` and `calendar.freebusy`. Public distribution of an app that stores/transmits restricted Gmail data requires Google's applicable verification/security assessment. External OAuth apps in testing can also receive short-lived refresh tokens. See [Gmail scope classifications](https://developers.google.com/workspace/gmail/api/auth/scopes) and [Google OAuth web-server guidance](https://developers.google.com/identity/protocols/oauth2/web-server).

No Google credentials were present during implementation. Automated tests use a fake Google transport to exercise token isolation, OAuth state, MIME encoding, sync boundaries, send receipts, reconciliation, and calendar conflicts. A real account connection, consent round trip, mail delivery, and invitation have not been tested yet.

### Integration research and product decisions — 18 October 2026

| Option | Fit for Thrive | Decision |
| --- | --- | --- |
| [Google Gmail API](https://developers.google.com/workspace/gmail/api/guides/sending) + [Calendar API](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query) | Native Google capabilities, our own UI, no additional integration service | Implemented direct adapters and OAuth foundations. Google APIs are hosted APIs, not open-source services. |
| [Cal.diy](https://github.com/calcom/cal.diy) | Current community self-hosted scheduling project; MIT-licensed repository, separate Node/PostgreSQL stack | Revisit for a dedicated scheduler. Its current README positions the community edition for personal/non-production use. |
| [Nango](https://github.com/NangoHQ/nango) | OAuth/token/sync infrastructure, useful with more providers | Defer extra service. Current repository license is Elastic License 2.0, source-available rather than permissive open source. |
| [EmailEngine](https://emailengine.app/) | Self-hosted email gateway with Gmail/IMAP/Graph support | Defer: separate service and EmailEngine licensing; does not solve scheduling. |
| [Nylas](https://developer.nylas.com/docs/provider-guides/google/) | Commercial unified email/calendar APIs with Google onboarding options | Consider when multiple providers justify a vendor dependency. |

UX patterns adapted: Dubsado's contact-focused inbox and contextual recipients ([Dubsado Inbox](https://help.dubsado.com/en/articles/15811791-dubsado-inbox)); Plutio's shared conversation history linked to clients/projects and reusable drafts ([Plutio Gmail](https://www.plutio.com/help/gmail-integration), [Inbox and communication](https://www.plutio.com/help/inbox-and-communication)). Thrive retains its existing visual system. This pass used product documentation and prior research notes; no new authenticated competitor-session inspection was possible while the Mac was locked.


## Form builder

Forms support 1–50 editable questions: short/long text, number, email, phone, website, date, time, single choice, dropdown, multiple choices, checkbox, rating (5 or 10), and file upload. Click a question to edit; use its controls to reorder, duplicate, or delete (with undo). Required settings, hints, choice labels, numeric limits, and accepted file groups are per question. Preview uses the same renderer and validation as the shared form.

Existing inquiry fields become editable questions without replacing existing forms. In **More options → Use answer for**, an email question can match/create a client; a project-name question additionally creates a planned project. Without these mappings, a form simply saves responses. An unanswered budget leaves a project unpriced. Response snapshots preserve the original labels, choices, values, and form title when questions change later.

Uploaded files use the `BUCKET` R2 binding and the `form_uploads` D1 table. Files are limited to 5 MB each, 1/3/5 per question, 20 MB per submission, and 500 MB per workspace. A share link accepts at most 100 uploads per hour. Accepted extensions cover PDF, text, CSV, Office documents, ZIP, and common raster images. Downloads require workspace ownership and always use attachment disposition. Uploaded files for shared responses are tied to the link, question, form revision and request ID; unsubmitted uploads expire for submission after 24 hours. Abandoned uploads still consume storage; automatic storage cleanup is not implemented. File content is not malware-scanned. Site audience settings continue to apply to all routes.

The same question definitions are available via `thrive_execute_action` with `form.save` (`input: {id, data: {...form, questions}}`). `form.submit` accepts `input: {id, data: {answers: {questionId: value}}}`. Choice answers use option IDs; multiple choices use an ID array; numeric/rating answers are numbers and checkbox answers are booleans. File answers reference previously uploaded `{id, name, size}` metadata; arbitrary file IDs are rejected. Both actions use the usual revision and idempotency requirements.


## Document templates and service pricing

**Documents → New document** offers eight editable content starters: simple/project proposals, package/services proposals, proposal + contract, service contract, time & materials, and ongoing services. Each starts with the appropriate response requirement. Acceptance, signature, or no response remain editable. **Layout & branding** reuses the ten invoice layouts with a logo, accent color, business details, and footer. Branding can be saved for future documents; published versions keep their own snapshot.

Turn the pricing table on or off. With pricing enabled, choose **Include all services**, **Choose one package**, **Choose multiple**, or optional per-item rules. Quantities can be fixed or limited to a client-editable range. Clients choose services before accepting/signing; the server validates selections and totals, and completion records the selected items and agreed prices. Information-only documents may display a fixed table but cannot ask clients to choose services. Hidden pricing is omitted from client-link data, and cannot trigger automatic project billing.

**Documents → Services**, **Invoices → Services**, and the workspace menu open the independent service/package catalog. Pricing supports a fixed fee or a time-based rate per hour, day, week, or month. Line items copy catalog prices and units; later catalog edits do not alter existing documents or invoices. New services can also be saved to the catalog directly from the document editor. Workspace setup and **Add starter services** offer example catalogs for design, web/development, consulting, marketing, photography, and general services. These are editable example prices, not industry rate recommendations. Adding starters preserves existing catalog records and prices.

Time & materials tables show estimates, not a final fixed fee. Acceptance records rates and estimated quantities without starting automatic deposit or milestone invoices. For completed standalone pricing documents, **Create invoice draft** copies only the selected services and agreed rates. Review actual quantities before issuing. Weekly/monthly units describe the rate basis; this release does not schedule recurring invoices or charges. Payment continues through invoice instructions.

The MCP catalog advertises all starters, layouts, pricing units, and verticals. New actions are `document.from_template` (`data: {templateId, clientId, projectId?, title?}`), `document.defaults` (`data: {template, color, logo, issuerDetails, footer}`), and `catalog.seed` (`vertical`). Existing `service.save`, `document.save`, and `invoiceDraft.save` support `billingModel: "fixed" | "time"` and `unit: "item" | "hour" | "day" | "week" | "month"`. Rates are integer cents; quantities allow two decimals. Documents additionally accept `showPricing`, `selectionMode` (`fixed`, `single`, `multiple`, `advanced`), `offers`, and `design`. Simulated `document.respond` accepts `signature.selections: [{id, quantity}]`.

Validation: 145 automated tests plus local HTTP/MCP checks cover client selection, estimate quantities, hidden-price projection, immutable published versions, replay handling, catalog starters, and invoice rate preservation. Browser checks cover template selection, catalog insertion/creation, layout changes, live preview, publication, client package selection/acceptance, and the invoice-draft handoff.
