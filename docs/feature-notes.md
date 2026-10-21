> Historical development notes. For current installation instructions, see [the README](../README.md) and [self-hosting guide](self-hosting.md). Some deployment and feature-status statements below predate later changes.

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

## Bulk selection

Record lists use **Select multiple** beside their view controls. Row checkboxes and **Select all in this view** appear only in selection mode. A floating bar at the bottom of the workspace shows the selected count and available actions. This covers clients, projects (table and board), documents, invoices, forms and submissions, time, meetings and meeting types, messages, workflows and run history. Configuration checkboxes inside editors remain ordinary form controls.

Select all affects only the current filtered view. Filters/search remove hidden records from the selection, and navigation clears it. Escape or **Done selecting** exits; Cmd/Ctrl+A selects the current view only while selection mode is active and focus is outside a text field. The header checkbox shows the mixed state for a partial selection.

Actions include archive/restore, pause/enable, invoice-draft deletion, and time-to-invoice where supported. Mixed or ineligible selections disable those actions. Mutations are reviewed with selected record names and applied to a copy of state before one save; stale or invalid records cannot cause partial local changes. CSV export includes selected visible columns (or the section’s summary fields) and escapes spreadsheet formulas. Issued invoices remain protected; billed/reserved time cannot be archived. Read-only lists offer export.

## Custom fields

Clients and projects have independent definitions. Use the table's **+** button or **Display → Manage custom fields**. Fields support text, number, currency (workspace currency decimals), date, checkbox, select, multi-select, email, and URL. Values can be edited from table cells or record details, displayed in saved views, searched, filtered, and sorted. New fields appear in default table views. Archived fields and values are retained and can be restored.

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

Typical agent sequence: read workspace + catalog, read target records, preview an action, execute at the observed revision with a unique request ID. Retry an uncertain write using the same exact arguments/request ID; after a revision conflict, read and review again with a new request ID. Select/multi-select values use stable option IDs. Money in invoice/project data is integer cents; workflow `config.amount` is a workspace currency decimal string. Custom currency fields use workspace currency decimal numbers.

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

## Client portals

Open a client (or project) and choose **Client portal**. Set the title and welcome message, enable sections, and select the exact records to share. **Client preview** uses the same safe projection as the client page; it cannot submit responses. Activate the portal, then **Save & share** to generate an expiring or non-expiring link. Pause the portal or revoke its link to stop access.

One portal spans the client's projects. Pending documents, requested forms, and unpaid invoices appear first. Clients can review/accept/sign documents, submit forms and attachments, download documents/invoices, see payment instructions, and expand project phases. Selected meetings show their time and location. Recorded payments and completed responses update the pending list automatically. Clients cannot mark an invoice paid.

New records are private until selected. Only published document versions and issued invoices can be selected; document revisions require explicit re-selection. Internal notes, custom fields, project budgets, meeting briefs, and unselected records are excluded server-side. Every child request rechecks the portal and its selection; hiding a section, removing a record, pausing the portal, or archiving the client blocks that access. Independent document/form/invoice links retain their own sharing settings.

A form assignment accepts one response for this client, even when the form has no CRM email field. A bound email must match that client's email. To request another response, remove the form, save, and add it again. Old assignment URLs stop working. Response receipts are scoped to the portal item, and existing workflow and file-upload protections apply.

Agents can use `portal.save` through Thrive MCP with `clientId` and `data` (`enabled`, `title`, `intro`, `sections`, and arrays of record IDs for `documents`, `forms`, `invoices`, `projects`, `meetings`). Partial updates preserve selections and pinned versions. Use `share.create` with `entity: "portal"` and the client ID, and `share.revoke` to manage links. The catalog describes these actions. Configuration is stored on the client record.

The current private Sites audience still applies to client URLs. This does not activate external customer access, independent signup, messaging, booking, or payment collection.

## Client links

Published documents, issued invoices, and active forms have a **Share** action. Generate or copy a link, choose 7/30/90 days or no expiry, and revoke it at any time. Documents are pinned to a published version; revision, archive, revocation, or expiry makes that link unavailable. Completed versions remain downloadable. Forms use their current definition and reject submissions from an outdated page. Invoices show the current recorded balance and payment instructions; clients cannot mark invoices paid.

`/share/:token` serves a standalone page without workspace navigation. `/api/shared/:token` returns an explicit allowlist of client-visible fields and accepts only that item's permitted response. Client names, consent, action, version and server timestamp are retained for document responses. Typed signatures record consent; there is no independent identity verification or third-party e-signature service. Owner previews and MCP `document.respond` remain simulations. Client responses run the existing workflows transactionally. Form retries and document retries use idempotency receipts, and concurrent responses cannot produce duplicate invoices.

The D1 `share_links` index stores SHA-256 hashes of 256-bit random tokens; only the owner's authenticated workspace keeps copyable tokens. Revocation is checked against current workspace state on every request. Links are bearer capabilities: anyone given the link can access its item until revoked or expired. Standalone share pages disable indexing, referrer transmission and framing. The separate form-only embed route permits framing. Form submissions have per-link limits. Downloads are self-contained HTML copies; **Print / Save PDF** uses the browser's print renderer and the invoice's saved design.

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
2. Register this exact authorized redirect URI: `https://thrive.example.com/api/google/callback`. For local testing, use a separate client or add `http://127.0.0.1:4173/api/google/callback` and set the corresponding environment value.
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

## Tracked time → invoice drafts

**Time** is a standalone ledger using the existing CRM table style. Log or edit whole hours/minutes, date, project, description, billable flag and hourly rate; archive/restore unreserved entries. Filter by project, status and date range. Project details link directly to their entries. **Hourly rates** sets a workspace default and optional project override. New entries retain the rate used when logged. Legacy hours remain intact; entries without a saved rate use the current default until reserved in a draft.

Select unbilled entries from one project, then **Create invoice draft**. Group lines by entry, day or work description; different hourly rates stay separate. The review explicitly confirms these are additional charges to the existing project fee. No invoice is issued or sent automatically, and deposit/milestone terms do not change. Non-billable, archived, already reserved and billed entries cannot be selected for billing. Entries with no price must be priced first.

Each line retains source IDs, integer minutes and hourly rate snapshots. Amounts round to cents per entry before summing, so grouping does not change the total. Drafts reserve entries; removing a source line and saving, or deleting the draft, releases them. Issuing permanently locks the source time and invoice amounts. Client invoice previews show exact hours/minutes without exposing internal time IDs. Server validation and revision checks enforce the same rules for UI and agent operations.

MCP actions: `time.save` (`data: {projectId, minutes, date, note, rate?, billable?}`, optional `id`), `time.rates` (`data: {hourlyRate}`, optional `projectId`; null clears a project override), `time.invoice` (`entryIds`, `groupBy: entry | day | description`, `additionalCharge: true`), `time.archive` (`targetId`, `config: {}`), and `time.restore` (`id`). Rates use integer cents. Existing invoice draft actions save, release and issue these drafts. Workflows now expose time updated, archived, restored, reserved, released and billed events, plus an archive-time action. As with other actions, MCP requires the expected workspace revision and a unique request ID.

Adapted from the time-to-invoice opportunity in the Dubsado/Plutio research notes. This is manual time entry and reviewed billing; a live timer and recurring invoice generation remain outside this slice. Validation includes minute/cents arithmetic, rate snapshots, duplicate billing prevention, release/issue transitions, immutable source data, client-safe projection, MCP replay/concurrency, and browser creation/preview/persistence checks.

## Shared dropdown controls

Workspace filters, editors, and shared client forms use one themed select component. Long lists include search; all lists support keyboard navigation, typeahead, selected-item checkmarks, and disabled options. Menus fit the viewport and stay above dialogs. Native select values, change events, required validation, and form submission remain the data contract. The Time ledger is directly after Projects in navigation and linked from the dashboard's tracked-time metric.

## Form templates

**Forms → New form** opens a gallery of nine starters: website contact, project inquiry, client onboarding, creative brief, website brief, consultation intake, content collection, project feedback, and testimonial request. Filter by Sales, Projects, or Feedback; inspect a read-only preview and submission behavior; then use the template in the existing question editor. **Start from scratch** opens a blank form. Browsing or choosing a template does not save a form; Save form / Save & preview persists a separate editable copy with fresh question and option IDs.

The inquiry starter maps contact email and project details to the CRM. Onboarding matches or creates only a client. All other starters save responses without creating CRM records or approving work. Mappings can be changed through each question's existing More options. Testimonial publication permission is recorded as an answer; no testimonial is published automatically. Existing forms and response snapshots remain unchanged.

The MCP catalog includes `formTemplates` with descriptions, question counts, and submission behavior. `form.from_template` accepts `{templateId}` and creates an editable saved form without sharing it or submitting a response. The existing revision/idempotency protections apply.


### Website form overlays

Forms → Share → Website overlay generates a copyable script and trigger link. Choose light, dark, or device appearance, accent color, and link text. Include `/embed.js` once per page. The trigger inherits the host website’s styling. The “Use an existing button” instructions expose the equivalent data attributes. `ThriveForms.open(absoluteShareUrl, {theme, accent, title})` and `ThriveForms.close()` are also available after the script loads.

The loader creates a Shadow DOM dialog with a sandboxed iframe at `/embed/form/:token`. The host page must allow Thrive’s origin in its `script-src`, `style-src`, and `frame-src` CSP. Supported hosts are normal HTTP(S) websites that allow custom JavaScript; a builder that removes scripts requires its custom-code integration. The dedicated route accepts active **form links only**. Other shared documents retain their framing restriction. The iframe posts to Thrive’s existing same-origin API: there is no cross-origin workspace API, no browser-cookie dependency for form submissions, and no bypass token in the snippet. Closing with the button, backdrop, or Escape restores the previous focus and scroll behavior. Reopening preserves in-progress answers and completed confirmation during that page visit.

Responses, attachments, stale-form checks, rate limits, idempotency, client matching, and workflows use the existing submission pipeline. The `thrive:submitted` event on the host document contains only the shared form URL, never the answers; internal frame messages verify source window, origin, and an instance channel. Editing a form updates subsequent loads; an already-open stale version must reload before submitting. Revoking the link, expiry, and archiving block new submissions. Overlay preview saves real responses.

The Website contact template includes topic, name, email, and message. It matches or creates a client by email and saves the response without creating a project. No embed is installed on any external website by creating a form or copying its code. The hosted preview remains private: anonymous embeds require public hosting at launch, while the workspace APIs continue to require owner authentication.

## Accounts and Supabase

Accounts have two explicit runtime modes. Without `THRIVE_AUTH_MODE=supabase`, the existing Sites-authenticated preview and its D1/R2 data remain in place. `/auth/sign-up` and `/auth/sign-in` show the new account screens but do not accept signup until configured. Setting the mode activates email/password signup, confirmation, login, password recovery, logout, and optional Google/Microsoft OAuth. These flows have automated tests; actual provider redirects and email delivery still require a connected project and provider credentials.

### Provisioning and activation

1. Create a Supabase project and apply `supabase/migrations/202610180001_thrive.sql`. It creates owner-scoped tables, transaction RPCs, RLS policies, and the private `thrive-files` bucket. Workspace snapshots retain the existing domain schema and optimistic revision control; this first migration does not normalize every CRM entity into a separate table.
2. Configure the following through the hosting runtime's secret/environment controls (never in source or browser bundles): `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (legacy `SUPABASE_ANON_KEY` also accepted), `SUPABASE_SECRET_KEY` (legacy `SUPABASE_SERVICE_ROLE_KEY` also accepted), and `THRIVE_APP_URL` (canonical HTTPS origin, no path). Then set `THRIVE_AUTH_MODE=supabase` and `THRIVE_DATA_BACKEND=supabase`. Missing credentials fail closed; a database failure never falls back to D1. Do not activate these flags until the migration, configuration and owner migration are reviewed.
3. In Supabase Auth, enable email/password and email confirmation; set the minimum password length to 12. Set Site URL to `THRIVE_APP_URL` and allow exactly `<origin>/auth/callback` and `<origin>/auth/callback?next=reset-password`. Configure custom SMTP for real users: the default Supabase mail service is restricted and is not a public signup mail service. Test confirmation and password recovery delivery before launch.
4. For email links that work across browsers, use `<origin>/auth/confirm?token_hash={{ .TokenHash }}&type=signup` in the confirmation email and the same URL with `type=recovery` in the recovery email. The page asks the user to continue before consuming the token. Default PKCE redirect emails also work in the browser where the request began; a different browser must use the token-hash templates. Do not include these URLs in analytics or logs.
5. Configure Google and Azure/Microsoft in Supabase Auth. Google requires an OAuth web client; Microsoft requires an Entra app registration with the desired account audience (include personal Microsoft accounts if intended). Register the project's Supabase Auth callback URL with each provider. Request only identity/email scopes for login; for Microsoft configure the recommended verified-email claim. Enable `THRIVE_GOOGLE_LOGIN=true` and `THRIVE_MICROSOFT_LOGIN=true` only after configuring and testing each provider. Gmail/Calendar permissions remain a separate connection with explicit consent.
6. Verify two real accounts, confirmation/recovery, sign-out/reload, account switching across tabs, each social provider, and a file upload/download in staging. Only then change the Sites audience or choose production hosting: the current owner-private Sites gate still applies to all routes and prevents a general public signup launch by itself.

Sessions are managed on the server using Supabase SSR with PKCE and HttpOnly, Secure, SameSite=Lax cookies. Protected operations call `getUser()`; platform identity headers are not accepted as a substitute in Supabase mode. Browser cache and unsynced-edit recovery are scoped to the verified account. New accounts are initialized on the server with empty collections; a browser's demo records are never imported automatically. A stale tab cannot save into an account signed into in a different tab. Public client links continue to use their individual share token and never expose the workspace account session.

The privileged Supabase key stays server-side. RLS denies direct client writes and access to credential, receipt, event, and upload tables. Users can only directly read their own workspace row; all business writes pass through Thrive's domain validation and service-only RPCs. `thrive_commit` locks the workspace row and atomically persists the revision, receipt, share index and workflow events. Files stay in a private bucket and use the existing question, owner, share and quota checks. The underlying snapshot size limits are unchanged.

### Existing preview data and agent access

Do not activate Supabase by replacing the current database or copying all preview records into every new account. Preserve D1/R2 as the original backup. Before switching, export the authenticated owner's workspace, confirm the destination Supabase user UUID, and migrate that owner's snapshot into an empty `supabase:<uuid>` workspace with `thrive_bootstrap`. Account matching must be explicitly confirmed; email strings alone are not proof of ownership. Existing share indexes must move with the snapshot. Copy upload bytes and owner-bound upload metadata into the private Supabase bucket before activating any forms with file responses. Reconnect Gmail/Calendar because encrypted provider tokens are bound to the original owner ID. There is intentionally no automatic destructive cutover or cross-account import; the connected project and destination identity are needed to finish migration safely.

MCP discovery stays public. In Supabase mode, protected `/mcp` calls need `Authorization: Bearer <Supabase user access token>` and verify the token with Supabase. Never give agents the service key. The previous Sites account header no longer identifies a Supabase account. Full MCP OAuth discovery/account-linking for hosted agent clients is a follow-up; interactive workspace accounts and a verified user bearer token are implemented now.

Validation: `npm test` includes account-flow, cookie, CSRF, account-switching, private storage and adapter coverage tests. `tests/accounts-postgres.sql` additionally checks the real PostgreSQL migration's RLS, denied RPC/direct writes, atomic rollback, stale revisions and idempotency. Run that file only against an isolated database with Supabase's `anon`, `authenticated`, `service_role`, `auth.uid()` and `storage.buckets` available. Tests roll back their own records.


## Shared list controls

Clients, Projects, Documents, Invoices, Forms and Submissions, Time, Messages, Scheduling, and Workflow / Run history use `list-view-ui.js` for the same Search → Filter → Sort → Group by → Columns → Select multiple toolbar. Section-specific actions stay above it. Home, AI chat, and availability settings are not record lists.

Grouping produces collapsible sections with counts, plus project fee or time-duration totals where relevant. Date fields support day, Monday-based week, and month. Boards use categorical group fields; the Columns control also controls their visible card fields. In Messages, it controls fields in the conversation preview. Related clients and projects with identical names remain separate groups. Missing values form a final “No …” group. Filtering and sorting happen before grouping, and group order is independent of row order.

Collapsing a group removes its rows from the visible selection. Select all and CSV export apply only to the visible, filtered rows. The floating action bar remains the only place for bulk mutations. CRM saved views persist grouping alongside filters, sort, columns, and density; other list preferences are retained during navigation in the current session. Search is temporary. `/` focuses section search; Escape closes a view menu before exiting selection.

Pattern references: [Attio filters and sorts](https://attio.com/help/reference/managing-your-data/views/filter-and-sort-views) and [Twenty views and filters](https://twentyhq-twenty.mintlify.app/core-concepts/views-and-filters). Thrive keeps its existing fonts, icons, palette, and document editors.


## Kanban boards

Clients, Projects, Documents, Invoices, Forms, and Workflows share a Table / Board switch. CRM lists also have a built-in board view. Choose **Group by** for categorical fields, including custom single-choice and checkbox fields on clients and projects. Declared stages and choices include empty columns; service columns remain available after their last card moves out.

Drag a card between columns to update client services, form services/tags, project stages, custom choice fields, or workflow Active/Paused status. Drag within a column to reorder. Card order is stored in the shared workspace per section and group field, independently of saved views; filtered-out cards keep their relative order. With an explicit Sort, cross-column moves still work but card ordering follows the sort. Clear Sort to restore manual ordering. The card's **Move** button provides column and first/last position choices for keyboard and touch users.

Project moves use the existing acceptance, deposit, phase-completion, and reopening rules. Invoice and document status drops open a review with the existing invoice/document controls: they cannot invent payments, signatures, acceptance, or publication. Other relationship/derived groupings allow manual ordering within a column and direct users to the record for field changes. Failed/stale moves are atomic; pending saves block another drag. Existing search, filters, column visibility, collapsible groups, and opt-in bulk selection work in either layout.

Validation: `tests/kanban.test.mjs` covers saved layouts, empty destinations, custom option identities, service changes, workflow activation, project prerequisites, protected invoice/document state, hidden-card ordering, stale moves, and archived fields. Native browser drag-and-drop, reload persistence, the accessible move control, filtered selection, and the invoice review path are also checked locally.

## Client and project record pages

Both records use a shared panel aligned with the top of the workspace. The list header stays to its left; Expand opens the record across the workspace, and the header contains navigation, Archive/Restore, and contextual New actions. Standard properties and custom field values edit inline with save/cancel and validation. Published pricing and derived totals keep their existing business rules.

Clients can be companies or individuals. Companies expose a contact name; individuals use their own name for downstream communications. Existing clients default to companies. Logos accept PNG, JPEG, or WebP under 2 MB, are resized to 256 pixels, bounded to 150 KB, and saved with the client. They appear in the list and record page.

The record New menu opens Project, Time entry, Message, Document, Form, Meeting, and Invoice creators with the client/project preselected. Time requires a project and limits choices to the client. Forms and meetings retain project associations; forms are still reusable form definitions, not automatically sent assignments. New project client relationships can change inline until linked work exists. Existing delivery, billing, and communication review steps remain in force.

### Client CSV import

Clients → **Import clients** downloads an example CSV containing all writable
client fields and active custom fields. Only email is required. Upload a UTF-8
comma/semicolon CSV (500 rows / 2 MB), map headers, and review/edit the suggestions.
Explicit values win; free/public email domains suggest individuals; business
domains suggest companies. Names are basic suggestions, not verified identities.
Duplicate email addresses, including archived clients, are skipped. Invalid rows
require correction or explicit opt-in to skip. Imports run existing workflows,
subject to the workspace's 100-action-per-save guard.

**Use with AI · MCP** in the sidebar provides connection instructions, the endpoint,
and copyable prompts. Agent import tools:

1. `thrive_get_client_import_template` returns fields, formats, options, and CSV.
2. `thrive_preview_client_import({csv, mapping?})` returns row-level suggestions,
   errors, skipped duplicates, and the current revision without saving.
3. `thrive_import_clients({csv, mapping?, skip_invalid?, expected_revision,
   request_id})` commits reviewed data. Use the same request ID to retry an
   uncertain response. The equivalent catalog action is `client.import`.

Supply file contents as `csv`, not a filesystem path. New fields/custom definitions
must be created before importing; unknown CSV columns can be explicitly ignored.
Imports preserve existing records and use the same owner isolation, optimistic
concurrency, validation, events, and receipts as other MCP mutations. Local test
fixtures do not establish that an external agent is connected to a live account.

## Signup onboarding

New accounts enter a resumable three-step setup: name and optional business name, country and billing currency; business vertical; then optional setup actions. Six verticals offer editable example services and safe one-click workflows. CSV import uses the existing mapping and review flow. Google Calendar/Gmail uses the existing separate OAuth connection and accurately reports unavailable or connected status; Google sign-in alone does not grant mailbox/calendar access. Users can skip optional actions, return through Getting started, and see a resume prompt until they finish. Existing workspaces are not forced through onboarding.

A workspace uses one of 17 supported two-decimal currencies. Legacy workspaces default to USD. Currency locks once pricing or financial records exist; there is no currency conversion. Invoice/document snapshots and public views preserve the chosen currency. Starter prices are examples in the selected currency and should be reviewed before use.

## Nylas email and scheduling

Set `THRIVE_COMMUNICATIONS_PROVIDER=nylas` to use Nylas v3 for the existing in-app Messages and Scheduling experience. Supabase sign-in remains separate. Users connect their own Google or Microsoft account through hosted OAuth with PKCE; connection state is single-use, expiring, and bound to the signed-in Thrive account. Grant IDs stay on the server. No shared grant ID is accepted from a browser.

Server-only settings: `NYLAS_CLIENT_ID`, `NYLAS_API_KEY`, `NYLAS_TOKEN_ENCRYPTION_KEY` (32 random bytes, base64), `NYLAS_REDIRECT_URI` (`https://thrive.example.com/api/nylas/callback`), `NYLAS_REGION` (`eu` or `us`), and `NYLAS_ENVIRONMENT` (`sandbox` or `production`). Keep secrets in Sites environment settings. Add the exact callback URL in Nylas Hosted authentication. Configure Google/Microsoft connectors with email read/send and calendar read/write/free-busy permissions. Sandbox restrictions still apply and sandbox messages/invitations can reach real recipients.

Apply `supabase/migrations/202610190001_nylas.sql` for Supabase or the corresponding D1 migration before enabling Nylas. The new connection/state tables use RLS and server-role-only access. Disconnect revokes the Nylas grant and removes cached Nylas conversations; existing mailbox messages, calendar events, drafts, and delivery receipts remain.

Messages refresh explicitly and import up to 25 recent conversations across the first 100 active client email addresses. A maximum of 50 messages is fetched per conversation, with the latest 10 of those retained; pagination limits are shown as truncation. Attachments remain in the provider mailbox. Sending requires reviewing a saved draft. Atomic receipts prevent duplicate sends; uncertain outcomes can be reconciled through Nylas metadata without sending again.

Scheduling combines Thrive's timezone, hours, notice, buffers, and local bookings with Nylas free/busy. Calendar availability is checked again on save. Invitations are created only through the reviewed **Calendar invitation** action. Nylas invitation creation uses atomic receipts and a status check for uncertain outcomes. In-app cancellation cancels the Nylas event and notifies participants before freeing the local slot. Exported event details cannot be silently rewritten; cancel and create a new meeting to change them. Two external systems do not provide a transactional lock across the final free/busy check and event creation. Availability is read live; this implementation does not add Nylas-hosted public booking pages or background mailbox/webhook synchronization.

References: [Nylas hosted authentication](https://developer.nylas.com/docs/v3/auth/hosted-oauth-apikey/), [message sending](https://developer.nylas.com/docs/reference/api/messages/send-message/), [calendar free/busy](https://developer.nylas.com/docs/reference/api/calendar/post-calendars-free-busy/).

### Customizable website forms

Choose **Forms → New form → Website contact** for a short contact form that matches or creates clients by email without creating projects. Question mappings remain explicit: the email question is mapped to **Client email** and the name to **Contact name**. Other response-only templates keep their existing behavior. Existing client details are not overwritten by anonymous submissions.

In the form editor, **Appearance & website branding** saves the font, background/text/button colors, corner radius, short heading, button label, footer note, thank-you message, two-column layout, and optional **Built with Thrive** link. Changes propagate to existing form links and embeds. Only allowlisted fonts and hex colors become CSS; arbitrary CSS and remote font URLs are not accepted. Question placeholders are editable under **More options**. The Website contact starter includes a dark mint design.

**Share → Website embed** offers either a popup trigger (including attributes for an existing button) or an inline iframe. Inline embeds are full-width with an editable height in the snippet. The popup checks message origin, window, and channel; completion events carry no answers. Submissions use the existing server-side validation, honeypot, rate limit, optimistic concurrency, and idempotency handling.

Hosting access still applies: an owner-private Sites deployment cannot receive anonymous website visitors. Public website installation needs a publicly reachable deployment while retaining Supabase authorization for workspace routes. This feature does not change the Sites audience or modify an external website automatically.
