# UI, UX and functional audit — 26 October 2026

## Scope and method

Reviewed the project record, client drawer, CRM tables and boards, document and invoice editors, public pricing projections, forms, workflows, portal, shared controls, and every workspace settings section. Compared equivalent interactions in source, exercised the affected browser flows, and ran the application regression suite. Browser checks used the local preview with fictional records, in light and dark themes at desktop width and at 390 px for project/status settings. Production integrations were covered by existing mocked tests; no real emails, payments or signatures were sent during verification.

## Changes made

| Finding | Resolution |
| --- | --- |
| Route focus drew a blue outline around the whole project | Removed the outline from the route-focus containers; interactive controls retain keyboard focus indicators. |
| Opening a client reduced the available project width | Fixed-position overlay drawer; measured workspace width stayed 1076 px before and after opening at the test viewport. |
| Status editing swapped in a different-sized field and exposed inquiry as a default | One anchored status menu shared by the title and property. Opening it leaves the row height and page scroll unchanged. |
| Project stages were coupled to responses, deposits and delivery phases | Delivery status is now independent. Defaults are Planned, In progress, Completed and Cancelled. Names/colors/order and additional statuses are workspace settings. Custom IDs work in workflow actions and filters. |
| Tags sat in a large decorative identity block | Tags are a normal property with the existing searchable multiple-selection control and wrapping chips. |
| Project phases duplicated status and complicated billing | Removed live phase fields, controls, actions, workflow events, portal display and seed data. Billing uses a deposit and explicitly issued scheduled payments. |
| Combined Documents tab obscured the type of agreement | Separate Proposals and Contracts tabs with matching filtering. |
| Inconsistent disclosure styling | `expandable-card.js` provides a bordered card with a right-hand SVG chevron. Applied to layouts, form options/settings, workflow variables, connection help, import help, sharing help and business totals. Project billing remains directly visible. Menus and calendar event rows keep their own interaction semantics. |
| Branding controls were repeated and poorly fitted inside document editors | Replaced them with a compact workspace-branding link. Drafts are saved before leaving. Workspace logo/color/business details/footer apply to drafts; layout remains document-specific. |
| Rate basis was hidden in a secondary options panel | Fixed/hour/day/week/month selector lives in the rate cell for proposal/contract and invoice lines. |
| “Packages” were individual service options | Packages now have title/description, nested service rows, quantities, rates, tax, subtotal and total. Supports single option, choose-one package, multi-select, duplication, reordering and removal. Fee-structure changes preserve package tax. Saved catalog bundles expand into editable service rows. |
| Mobile status color picker collided with the status name | Compact swatch control suppresses the hex value in these rows, while retaining its accessible label. |
| Invalid partial package preview displayed the old project budget | Invalid quotes show a dash and a validation message instead of a stale amount. |
| Nested public package data could carry internal catalog metadata | Explicit nested allowlists expose only client-facing pricing fields. |
| Activity route could fall back to Profile after settings cleanup | Retained the functional Activity section and its history link. |

## Workspace settings: both directions

| Setting | Consumer / outcome |
| --- | --- |
| Profile name / business name | Workspace identity, document issuer and onboarding. Retained; duplicate modal editors route to the settings page. |
| Appearance | Browser theme and system preference. Retained. |
| Business type | Starter service catalog. Retained. |
| Currency | New project/invoice currency, with existing financial-record lock. Retained. |
| Country | Used to suggest currency during onboarding, with no ongoing workspace behavior. Removed from General settings; onboarding metadata is preserved. |
| Hourly rate | Defaults for new tracked time; client/project overrides remain supported. Retained. |
| Deposit / service | Defaults for new projects and billing schedules. Retained. |
| Project phase list | Removed together with live phase functionality. |
| Project statuses | Added workspace names, colors, ordering and custom values; shared by record views, boards, portal and workflows. In-use statuses cannot be removed. |
| Branding | Single workspace source for proposal/contract/invoice draft identity. Retained and connected to all draft editors. |
| Client portal defaults | New portal title, intro and visible sections; explicit per-client overrides preserved. Retained. |
| Form email notifications | Submission notification service, subject to an email connection. Retained. |
| Services / packages | Catalog used by proposal, contract and invoice line-item pickers. Retained. |
| Payment instructions | Copied to newly created invoices. Retained. |
| Invoice templates | Default invoice layout. Retained; duplicate branding editor removed. |
| Invoice due days / tax | Added workspace defaults used by new manual and tracked-time drafts. Accepted package tax is not applied twice. Existing issued records retain their values. |
| Sidebar visibility | Navigation rendering. Retained. |
| Email/calendar and MCP | Actual connection and integration setup. Retained. |
| Forms/workflows settings shortcuts | Removed redundant sections that only linked to their corresponding application page. Their actual settings remain in their editors. |
| Activity | Functional workspace history; retained. |

## Data and compatibility

Migration deletes phase data only from live project/document records and workspace defaults. Minimal compatibility code still recognizes old keys so saved workspaces can upgrade safely. Immutable published versions and issued invoices retain their original snapshots. Phase-specific automation rules are retired out of the active engine, preserving their definitions rather than silently running a different action. Legacy project status references in workflows migrate to Planned.

Scheduled payment issuance is idempotent: repeated requests return the existing invoice. Invoice balances, published agreement terms, client-selected package content and accepted quantities are not rewritten by later catalog or branding changes.

The Sites and self-hosted source trees contain the same changed application modules and regression tests. Their hosting configuration and self-hosted installation instructions remain distinct.

## Verification

- Final full regression runs: 319 prototype tests and 321 self-hosted tests passed, including all 8 new project/package cases. Production build completed successfully.
- Package checks cover child quantities, per-package tax, invalid totals, single/multiple selection, nested time estimates, publication, client acceptance, exact deposit amounts and replay protection.
- Status checks cover custom values, stable identifiers, persistence and workflow compatibility.
- Migration checks preserve historical versions and invoice totals and verify a second migration makes no further changes.
- Branding checks update drafts while preserving issued/published snapshots.
- Public projection check confirms catalog IDs and private nested fields do not leak.
- Browser checks confirm the overlay width, fixed status row/scroll, package arithmetic, fee-mode preservation, desktop and narrow layouts, and all settings routes with no runtime errors or page overflow.
- Impeccable detector returned no findings for the changed core controls.

## Verification limits

This is a source/domain audit plus targeted browser verification, not an exhaustive test of every possible record, screen reader, browser engine or connected provider account. Live email/calendar delivery, production credential flows and real financial/signature actions were not exercised. Billing schedules and existing historical snapshots intentionally preserve prior commercial commitments.

## Release status

Local implementation and production build are complete. Publishing to the existing Thrive Sites source repository was blocked by automatic approval review, which requires explicit authorization to upload source and deploy to that destination. No new version was published.
