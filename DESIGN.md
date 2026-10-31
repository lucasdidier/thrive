# Thrive · Cobalt workspace

October 29, 2026. This replaces the application’s evergreen/monochrome visual direction. The explicit references are LAGO and Attio; the user selected light-first with matching dark mode. See [the visual audit](docs/lago-design-audit.md) for evidence and reasoning.

## Intent

Thrive is a working tool for independent service businesses. The design should feel precise, capable, and approachable. The distinctive elements are its blue action hierarchy, recognizable Thrive mark, compact record tables, and a home screen organized around follow-up and delivery. Brand expression comes through consistent details rather than decorative illustration or dashboard ornaments.

## Source of truth

`public/design-system.css` owns application colors, semantic roles, shared components, and responsive refinements. It loads after legacy feature sheets. Existing names (`--bg`, `--accent`, etc.) are compatibility aliases, so old and enhanced React controls consume the same values. Future feature styles must use these roles, never introduce another root palette or literal primary button color. Feature layout rules remain in their feature sheets.

`public/design-system.html` is the live component reference. Its Light/Dark toggle previews the same CSS tokens without changing the saved workspace preference. `public/appearance.js` applies saved appearance before paint. `public/typography.css` owns the sole Inter font declaration and shared font stack, including account and client-page chrome.

## Palette

| Role | Light | Dark |
|---|---|---|
| Primary action | `#3d63ee` | `#3d63ee` |
| Action hover / pressed | `#3154d5` / `#2946b5` | Same |
| Primary action text | `#ffffff` | `#ffffff` |
| Working surface | `#ffffff` | `#1a1b1e` |
| Canvas | `#ffffff` | `#1a1b1e` |
| Navigation surface | `#f5f7fc` | `#181c25` |
| Navigation | `#f6f7f9` | `#17181b` |
| Hover / pressed | `#eef0f4` / `#e7eaf0` | `#25272c` / `#30333a` |
| Primary text | `#20242d` | `#eef0f5` |
| Secondary text | `#626a78` | `#b1b7c3` |
| Tertiary text | `#606978` | `#9ca4b2` |
| Link | `#3154d5` | `#a5bbff` |
| Structural border | `#e3e6eb` | `#34373e` |
| Control border | `#ccd1da` | `#555b67` |

Use `--positive`, `--warning`, `--negative`, and their paired `-bg` roles for actual state. Success is green, attention amber, overdue/failure red. Never use success green for generic progress. Custom client project statuses retain their explicit user colors. Pale identity colors belong to client avatars, not the primary action hierarchy.

## Typography

Locally served Inter Variable, retaining its bundled license. One family across labels, fields, navigation, tables, and headings. LAGO uses GT America on its site; Thrive does not copy its proprietary font assets.

| Role | Size / weight |
|---|---|
| Product wordmark | 25 / 650 |
| Home title | 28 / 600 |
| Page title | 26 / 600 |
| Section title | 14 / 600 |
| Body / record identity | 13 / 400–550 |
| Controls / table values | 12 / 450–550 |
| Metadata | 11 / 400 |

Titles use −0.025em tracking, body stays normal. Monetary figures use tabular numerals and align right. Mobile page titles become 23px. Use full visible state labels rather than color alone.

## Geometry

4px spacing base. Tight groups use 8–12px; panel padding 20px; section gaps 24–32px. Desktop sidebar 228px, collapsed rail 64px. Topbar 56px. Page gutters 32px, tablet 24px, phone 16px. Desktop action buttons 30px, form-footer actions 32px, icon buttons 28px, fields 36px. Coarse-pointer touch targets stay 44px. Mobile navigation targets 44px. Control radius 6px; badges 4px; workspace panels 10px; dialogs 12px. Cards use a thin border and no resting shadow. Shadows indicate floating menus and overlays. Desktop menu rows use a 30px minimum height, 12px text, 14px icons, and 4px inner corners; group labels use 11px text with compact spacing. Create is 208px wide. Mobile and coarse-pointer menus keep 44px rows. Settings navigation uses 32px desktop rows.

## Components

- Primary button: solid blue with white text. One per task. Hover deepens the blue; active deepens again. Disabled controls use neutral roles with legible text.
- Secondary button: white/dark working surface and visible neutral border. Tertiary: unfilled text or quiet icon control.
- Shell: one continuous white working canvas (charcoal in dark mode), including the gutter behind the inset sidebar and the topbar. No contrasting strip or resting shadow between navigation and content. The sidebar alone uses a barely blue surface; selected navigation uses the cobalt selection role. Product mark/name above the workspace switcher. Existing collapse, hover reveal, and keyboard behavior remain intact.
- Record tables: white/dark working surface, sentence-case headers, faint row rules, no zebra stripes. Client identity receives weight and a stable avatar tint. Preserve density and column choices.
- Detail views: neutral property surface, clear header/actions, underline tabs, white working content. Related records retain existing navigation.
- Home: follow-up, delivery, and the week have distinct containers. Existing totals remain computed from records. No fabricated analytics or ornamental trend charts.
- Fields: visible neutral boundary, standard height, same font as the table. Use the blue focus role; placeholder contrast matches metadata.
- Badges: small pale fills and matching readable text. Status always appears in words.
- Dialogs and menus: opaque surfaces. Keep existing workflow safeguards and explicit form actions. No decorative blur.
- Selection, caret, scrollbars, and portalled React controls consume the same semantic roles.

## Appearance and behavior

New visitors begin in light mode. Saved Light and Dark choices remain respected. System is an explicit Appearance setting and follows subsequent operating-system changes. The theme is applied before the interface loads to avoid a dark first frame.

Interactions use short color transitions (120ms). Pointer presses compress buttons to 98%; keyboard actions and reduced-motion preferences stay still. Preserve the existing purposeful sidebar and drawer interactions, keyboard access, reduced-motion support, and high-contrast mode. No page entrance animation or perpetual onboarding orbit.

Sidebar pin/unpin and hover reveal use the shared drawer curve over 260ms, with 160ms label fades. Commit the destination layout once and bridge positions with transforms; never animate width or page margins each frame. Rapid reversal starts at the currently painted position. Keyboard and reduced-motion changes are immediate; mobile retains its static navigation layout.

## Responsive behavior

Phones keep Thrive’s scrolling navigation strip below a compact brand row. The workspace selector and footer utilities hide; the account menu and search remain in the top row. Appearance is reachable through the account menu. The empty Home topbar hides. Home starts with full-width Business totals, then the full-width calendar. Outstanding invoices and Awaiting a response are separate half-width widgets, followed by half-width Projects in motion and Recent activity. Hidden widgets leave the flow; remaining half-width widgets pack in DOM order and keep their width. Each widget has its own visibility toggle; legacy Follow up preferences migrate to both billing widgets. The grid stacks below 760px. Table overflow remains inside its table frame, preserving all configured data. Header controls wrap; panels use 16px padding on phones. Detail panels and drawers retain their existing single-pane mobile behavior.

## Boundaries

Application styling must not replace saved invoice/document branding, published commercial snapshots, customer logos, or explicit project status colors. Do not restyle public client pages using workspace-only assumptions. The production release uses the existing Site associated with `prototype/`; `self-hosted/` is a separate checkout and is not synchronized by this release.

## Direction provenance

The design-taste app draw supplied an Achromatic ledger structure (seed 78174042); the user’s LAGO/Attio direction overrides its black primary button and icon-only shell. Thrive has twelve destinations, so labeled navigation is appropriate. Impeccable’s product-interface guidance supplies consistent states and restrained expression; its random concept service was unavailable. No generated visual comps were needed because the user pinned the visual reference and the implementation uses real working components.

## Feature icon tiles

Use `featureIcon(name, size)` from `public/feature-icon.js` for feature identity in navigation, page headers, record lists, related records, search results, creation menus, and feature empty states. Existing layout wrappers carry the same `feature-icon` class. The reference is the related-record icon tile: neutral grey line art on a light-grey rounded square, a fine border, no shadow. Dark mode uses an elevated charcoal tile and a lighter glyph.

Sizes are deliberate: `xs` 20/13px for menus and navigation, `sm` 24/14px for compact tables and timelines, default `md` 30/15px for related records, and `lg` 40/20px for identity headers and empty states. Blue identifies selected/active features and unread activity, never arbitrary feature categories. Green/amber/red remain status colours; client logos/avatars retain their identity colours. Utility/action glyphs (add, close, copy, edit, arrows, table controls and inline field labels) stay unboxed. Do not change client-facing document branding to match workspace chrome.


### Product copy

Dashboard browse actions use the shared blue `View all` label with a right arrow, aligned at the top right of the relevant widget or section heading. Do not repeat these actions in footers. Give each link or button a destination-specific accessible name.

Headings and controls should stand on their own. Omit subtitles that restate a section’s purpose or describe what is already visible. Keep counts, date ranges, constraints, consequences, save state, and actionable recovery guidance. Empty states name what is missing and offer an action; avoid promotional filler. Render optional descriptions only when present so removed copy leaves no empty paragraph.

### Settings and identity controls

Account menu has one Edit profile destination and Getting started. The entire account row, avatar included, is a single hover/click target; photo editing belongs on Profile. Appearance stays in the sidebar, with an account settings page for System and mobile access. Workspace settings live in the workspace menu, not as a duplicated sidebar item. Use with AI gets a restrained blue-tinted navigation surface.

Project defaults owns hourly rate, deposit and statuses. Client/project Custom fields and Scheduling are workspace settings destinations. Rates may be overridden on individual client/project records, never through a second project editor in Time.

Branding owns the shared workspace/document logo. Profile and branding image controls pair a fixed-size preview with Upload/Replace and a separate Remove action. Client logos use a compact anchored action menu. Raster validation and resizing are shared. Published/issued commercial snapshots retain their branding; changed defaults refresh drafts only.

Text-input focus recolors the existing boundary blue without a second ring. Input groups own one boundary; keyboard button outlines and forced-colors focus remain visible. Positive connection states use the green status role and a check icon.
