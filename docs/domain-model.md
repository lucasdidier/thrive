# Thrive · Domain model v0.3

## Core relationships

Workspace → Clients → Engagements (shown as Projects) → Phases.
Contacts belong to client relationships. A returning client can have several engagements at different stages. Documents, bookings, submissions, messages, invoices, and time entries reference the relevant engagement and workspace.

| Object | Responsibility |
| --- | --- |
| Workspace | Business identity, branding, settings, currency defaults |
| Client / Contact | Buying party and individual people; these are distinct in the production model |
| Engagement | One prospective or agreed piece of work |
| Phase / Task | Delivery scope, schedule, and optional budget allocation |
| Service | Reusable offering; snapshot terms into an engagement |
| Document / Version | Proposal or agreement; immutable published and accepted snapshots |
| Billing plan / Rule | Amount and trigger; independent of the delivery budget |
| Invoice / Line | Specific request for payment with an immutable issued record |
| Payment / Allocation | Actual receipt allocated against an invoice; refunds tracked separately |
| Time entry / Expense | Work and direct costs attached to the business/project/phase |
| Interaction | Booking, form submission, or conversation with explicit context |
| Workflow / Version / Run | Validated configuration, version, and execution history |

## Lifecycle

Engagement: inquiry → proposal → awaiting deposit → active → completed; cancellation is explicit.
Document: draft → published → accepted/declined/superseded. Required signatures are a separate completion condition in production.
Invoice: draft → issued → partially paid/paid; overdue derives from due date and balance, not a contradictory second status. Voids and credits must be modeled before production billing.

## Invariants

- Every reference stays inside its workspace.
- Currency amounts are integer minor units. Currency is explicit.
- Payment totals must not exceed an invoice's balance in the initial model.
- A proposal can create at most one deposit invoice for its current acceptance event.
- Repeating an event must not repeat its financial side effects.
- Delivery budgets and billing schedules are separate.
- New template prices/configuration affect future records, never accepted terms.
- Published commercial documents require immutable versions and change history.
- Bank payouts are transfers, not duplicate income.
- Client portal visibility must be enforced server-side.

## Prototype simplifications

One local workspace, one contact per client, USD, multiple documents with immutable published versions per client/project, percentage-based deposit and phase billing, manual full and partial payment recording, no live integrations. Prototype proposal acceptance is a simulation, not an electronic-signature implementation. Browser-local records have no authentication or cross-device synchronization.

## Future server operations

createClient, createEngagement, publishDocument, completeAgreement, createInvoiceFromRule, allocatePayment, logTime, approveMilestone, configureWorkflow. UI, AI, and automations must call the same permission-checked operations. Commit business mutations and outbox events transactionally; workers execute external effects with idempotency keys and auditable retries.

## Implemented prototype constraints

- Inquiry submissions match clients by normalized email and create separate projects for repeat work. Submission keys prevent duplicate processing.
- Billing percentages must total 100%; amounts are allocated in integer cents. Each phase has at most one new milestone billing rule.
- Publication freezes scope, client details, phases, and fees. A revision supersedes the previous unaccepted version; stale versions cannot be accepted. Accepted terms cannot be revised in this prototype.
- Deposit and phase invoices are unique by project and rule. Total invoices cannot exceed the agreed fee. Phase approval creates its invoice; completion of delivery is separate from collection.
- Archives preserve financial records. Version 1 browser data migrates without changing existing invoice amounts or paid balances.

## Standalone Forms and Documents

A Form is a reusable configuration. Each Submission stores its form identity and a snapshot of its question/answer, then links to the matched Client and resulting Project. Archiving a form closes new submissions without deleting history.

A Document belongs to a Client and optionally a Project. Its type (`proposal`, `contract`, `agreement`, `document`) is separate from its response mode (`acceptance`, `signature`, `none`). Versions freeze both attributes, all content, recipient details, and any billing schedule. Signature completion requires a name and explicit demo consent; it is not a real signing provider. Information-only documents do not accept responses or trigger invoices.

One Document may govern a project's billing. Completing that document applies its agreed terms through the existing project/invoice operations; ancillary documents cannot trigger a second deposit. The prototype retains the legacy project agreement snapshot for invoice compatibility. The production implementation should replace this compatibility copy with a foreign key to the accepted Document Version.

Project views group legacy inquiry/proposal states as Planned. The incoming request is visible in Forms → Submissions; its commercial document lives in Documents. The project provides links to both and owns delivery progress.

## Payment instructions and chat preview

Workspace settings hold default payment instructions. Invoice issuance copies them into each invoice; later default changes do not rewrite issued invoices. An explicit per-invoice edit can update instructions without changing amounts or recipient snapshots. Manual receipts store integer-cent amounts, payment dates, methods, references, and unique operation IDs. Invalid and duplicate submissions have no financial side effects. The full deposit must be recorded before delivery starts. Legacy paid balances remain intact; missing historical dates remain unknown.

Chat conversations and messages persist locally. The current assistant uses a bounded prompt router, not a live model. It reads current records and links to the same UI operations. A proposed default deposit change records its prior value and requires an Apply action. Cancelled, already-applied, and stale proposals cannot apply again. Existing project terms are unchanged.

## Scheduling prototype

Workspace availability stores a time zone, weekdays, a daily time range, and minimum notice. Meeting types define duration, buffer, description, and location instructions. Slots cover the next 30 days and respect all noncancelled local meetings across meeting types. Actual UTC instants are checked against host-local hours, including daylight-saving changes.

A meeting belongs to a client and snapshots its type name, duration, buffer, location, timezone, and booked contact details. Editing defaults does not rewrite booked meetings. Booking keys prevent duplicate creation; normalized emails match existing clients. Cancelled meetings retain their record and free the slot. Future completion requires explicit simulation.

A completed meeting can create one proposal and one editable email draft, optionally tied to a project belonging to the same client. The proposal incorporates the saved brief and notes. Repeating the action reuses the draft; no invoice or external send occurs. Internal notes and follow-up drafts persist in browser-local state.

## Manual invoices and design snapshots

A manual invoice belongs directly to a Client and optionally a Project. Line items hold description, decimal quantity, integer-cent rate, and rounded integer-cent amount. Tax is rounded once from the subtotal. Creation validates all fields before mutation, assigns a unique invoice number, and deduplicates by operation key.

The invoice snapshots client name/email, issuer, billing address, issue/due dates, notes, instructions, and template design. Design includes one of ten layout IDs, a validated hex accent color, raster logo data, issuer details, and footer. Workspace default changes do not rewrite issued invoices. Automatic milestone invoices also snapshot the current design. Legacy invoices receive the neutral default.

Manual invoices are additional one-off charges; they neither consume a billing-plan allocation nor fund the project's agreed delivery gate. They remain included in the overall invoice/payment totals and linked client history. Payments on standalone invoices do not require a project.
