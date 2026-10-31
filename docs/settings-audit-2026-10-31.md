# Settings audit — 31 October 2026

Implemented in the hosted `prototype` application.

## Implemented

- One Edit profile entry, whole-row account hover, no sidebar photo upload and no duplicate Appearance dropdown entry.
- Email/password section: password accounts can change either after current-password verification; email changes require provider confirmation. Google/Microsoft identities link to their account provider. Owner-restricted Google workspaces keep their existing sign-in restriction.
- Workspace settings remain reachable in the workspace menu; redundant sidebar shortcut removed. AI/MCP receives a restrained blue highlight.
- Completed onboarding actions remain clickable. Undo reopens a step without old records immediately completing it; a new action or Done completes it again. Completed checklists can be hidden and reopened from the account menu.
- Shared photo/logo controls with previews, explicit Upload/Replace/Remove, type/size constraints and the existing save/reset flow. Client-logo actions moved beside the avatar in a compact menu; explicit removal suppresses demo-logo fallback.
- Branding owns one logo for workspace and new/draft documents. General no longer exposes a competing logo. Issued invoices and published document versions retain their saved appearance.
- Project defaults merges hourly rate, deposit and statuses; default service removed from this UI. Currency remains in General, with client/project overrides on their respective records. Time's Hourly rates action opens these defaults and has no project override form.
- Client and project custom fields are in workspace settings, reusing field creation, editing, archiving and restoration.
- Scheduling settings exposes existing availability, timezone, notice, meeting types, durations and buffers.
- Starter services uses a secondary button. Connected notification status uses green with a check. Input focus changes the existing border instead of adding a blue ring.

## Other areas reviewed

| Area | Decision |
|---|---|
| Email | Keep Email & calendar as the single connection/reconnect/disconnect destination. Sending remains explicitly reviewed in Emails. A reusable email signature would be a useful future addition, but needs editor and send-pipeline support. |
| Proposals | Keep scope, pricing/selection modes and response behavior in the template/document editor; global branding already applies. Reusable custom templates and expiry defaults are follow-up product features, not inert settings switches. |
| Contracts | Keep signing and billing terms with the actual agreement. A clause library and reminder policy would need storage, scheduling and delivery controls before adding settings. |
| Time tracking | Rate/currency inheritance is already covered by workspace → client → project. Optional descriptions remain optional. Rounding, timesheet approvals and locking require explicit billing semantics and permissions; do not silently add them in a visual cleanup. |
| Project defaults | Deposit, rate and statuses are meaningful current defaults. Currency stays in General; custom fields have their own section. Default service was redundant with the catalog. No arbitrary global project budget or due date. |
| Invoices | Retain Invoice defaults, Payment instructions and Invoice templates because they control different persisted behaviors. |
| Notifications | Existing notification setting covers form responses. More categories require real delivery support; do not show toggles that do nothing. |

## Validation

Automated coverage: 431 tests in the full suite plus one added client-logo removal regression. The single localhost-server test blocked by sandbox networking passed on a permitted rerun; the final focused set passed all 14 tests. Production build passed. Browser checks cover Project Defaults save/focus, logo replacement/removal, checklist undo/complete/hide/reopen, completed action navigation, custom-field creation, and desktop/dark/mobile layouts (390 px, no page overflow). Account credential changes use mocked integration tests; no real account credentials were changed or confirmation emails sent.
