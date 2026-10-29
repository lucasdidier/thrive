# LAGO → Thrive: visual audit and design-system revamp

October 29, 2026 · Light-first, with matching dark mode

## Recommendation

Give Thrive the precision of LAGO’s working interface: a clear blue action hierarchy, neutral navigation, white working surfaces, fine rules, compact controls, and strong record identity. Use Attio as the reference for CRM density and predictable table/detail navigation. Keep Thrive’s business workflows and existing outline mark.

The missing flavor was not simply a missing accent color. Thrive had competing visual rules: cobalt tokens in `polish.css`, green tokens later in `workspace-design.css`, inverted primary buttons, and an additional white-button override in dark mode. The cascade could make a primary action blue, black, or white depending on its context. Several component generations also disagreed about corner radius, spacing, and focus treatment.

The new system defines one authoritative palette and component vocabulary in `public/design-system.css`, with aliases for existing feature CSS and React controls. The component guide at `/design-system.html` uses the actual implementation.

## Research scope and source quality

The supplied [platform URL](https://getlago.com/platform/) redirected to the homepage during this audit. I inspected the homepage, Quotes, Billing & Invoicing, Revenue Analytics, Pricing, official customer-management screenshots, and two publicly indexed promotional screenshots. I read computed styles on the live Quotes page and inspected the images in a browser. No authenticated Lago account was used.

The official documentation images show older dates within their example records. They establish the product’s interface language, not a guarantee of today’s authenticated application layout. Third-party galleries are secondary visual evidence. CSS values below are either explicitly measured or identified as Thrive choices; screenshot estimates are not represented as exact Lago tokens.

## What creates LAGO’s character

### 1. Blue has a job

On the [Quotes page](https://getlago.com/platform/quotes), the blue primary action is immediately distinct from the white outlined alternative. The header repeats that hierarchy at a smaller scale. Measured on desktop: header button 14px/500, 6px radius, 8px × 12px padding; hero action 16px/500, 10px radius, 8px × 16px padding. The measured primary fill is CSS Lab `lab(47.6772 18.7595 -79.2846)`.

**Thrive translation:** choose `#3d63ee` as Thrive’s own cobalt, not an asserted exact Lago hex. Use white text, deeper hover/pressed blues, neutral secondary buttons, and one filled primary per task. Apply the same treatment in both themes. Use a lighter blue for dark-mode text links so they remain readable.

### 2. The marketing frame and the app have different roles

The [homepage](https://getlago.com/) uses an almost-white warm ground, a very large headline, and a large product scene. The product scene is denser and more neutral than its outer marketing canvas. The visual warmth and lavender image treatments make the marketing presentation memorable; they do not need to become the app’s everyday background.

**Thrive translation:** retain the clarity, blue, and product-first confidence. Use a cooler neutral canvas, a white working surface, and an almost-white navigation surface. Preserve the distinction between a daily workspace and a marketing page. No photographic background or lavender gradient is needed in a client table.

### 3. Typography does the organizing

The live Quotes headline measured approximately 49.9px, weight 500, in `gtAmerica`. Its compact product preview uses a much tighter type scale. Black headlines, readable gray support, and small restrained labels do most of the hierarchy work.

**Thrive translation:** keep locally served Inter Variable, with deliberate 28/26px page titles, 14px section titles, 13px record text, 12px controls, and 11px metadata. Use 550–620 weights for identity and headings. Tabular figures keep amounts aligned. Do not copy LAGO’s proprietary font files or transplant marketing headline sizes into working screens.

### 4. Commercial content looks like a real object

The [Billing & Invoicing page](https://getlago.com/platform/billing-invoicing) presents structured plan controls, line items, invoice dates, and amounts. The [Quotes page](https://getlago.com/platform/quotes) shows an editor with a separate settings region. These views gain credibility from the organization of real fields and controls rather than from illustration.

**Thrive translation:** preserve existing document and invoice content, line-item behavior, and branding snapshots. Keep creation drawers clean, with stable field spacing and a clearly placed blue commit action. Separate editable workspace controls from the commercial document preview. Application theme changes must not rewrite a published client document.

### 5. Data is compact and legible

The [Revenue Analytics page](https://getlago.com/platform/revenue-analytics) shows compact underline tabs, discreet filters, restrained legends, and aligned monetary values. Its product sequence demonstrates related reports within a stable frame. The information changes while the control language stays consistent.

**Thrive translation:** standardize table headers, filters, tab indicators, dividers, numeric alignment, and selected states. Keep actual record counts and money derived from business records. Do not add growth percentages, sample revenue charts, or decorative metrics simply to make the dashboard feel busier.

### 6. Real product screenshots validate the system

The official [customer-management documentation](https://getlago.com/docs/guide/customers/customer-management#monitor-the-customers-billing-status) contains a [billing overview screenshot](https://mintcdn.com/lago-docs/L57i4PY_iDpAEuWL/guide/images/customer-billing-overview.png) and a [current usage screenshot](https://mintcdn.com/lago-docs/L57i4PY_iDpAEuWL/guide/images/customer-current-usage.png). Both show labeled left navigation, a narrow topbar, a large customer identity, underline tabs, and a separate details region. The active navigation item is a neutral fill with blue icon/text. Overdue billing is clearly distinguished from the primary action.

**Thrive translation:** keep labeled navigation for Thrive’s twelve destinations, add visible Thrive identity above workspace scope, use a neutral selected row and blue active icon, and preserve side panels for client context. Use paired semantic foreground/background colors for state, always accompanied by a word. Client avatar colors identify clients rather than compete with actions.

### 7. The same vocabulary survives different page types

The [Pricing page](https://getlago.com/pricing) keeps the same blue CTA, neutral ground, restrained typography, and precise spacing despite a centered composition. The [OpenTools screenshot gallery](https://opentools.live/project/lago) shows promotional crops of invoice, usage, credit, and plan controls. These crops reinforce the small-radius, fine-border, compact-label language; they are not evidence of full app navigation or interaction behavior.

**Thrive translation:** one token vocabulary must survive home, tables, detail views, settings, and drawers. Avoid a separate visual identity per feature. A live component reference makes that consistency reviewable.

## Thrive audit: problems and implemented response

| Existing issue | Implemented response |
|---|---|
| Green and blue palette declarations competed | Final semantic tokens feed legacy names and the React control bridge |
| Primary buttons inverted or became white in dark mode | One cobalt action treatment; removed the obsolete dark-mode override |
| Product name absent from the sidebar | Existing outline mark and Thrive wordmark above workspace scope |
| Uneven hierarchy on Home | Consistent containers for follow-up, projects, and the week |
| Field focus inherited a neutral shadow | Shared blue focus boundary; keyboard focus uses the semantic focus token |
| Decorative onboarding orbit competed for attention | Static, neutral getting-started control |
| Several unrelated panel/button shapes | 10px panels, 6px controls, 4px badges, 12px dialogs |
| Phone utilities consumed too much of the first screen | Compact brand/search/account row; navigation stays scrollable; empty Home topbar hides |
| New users inherited dark system appearance | Light default before paint; saved dark/light and explicit System remain supported |

## Deliberate boundaries

The initial exploration was local in `prototype/`. The user subsequently authorized production publication after a button, interaction, and typography finishing pass. The separate `self-hosted/` checkout remains outside this release. Existing data, commercial snapshots, user project-status colors, client document branding, authentication, and provider behavior remain outside the visual change. The isolated preview contains the repository’s fictional Morgan Studio dataset; its API changes stay in memory and external actions are unavailable.

LAGO’s marketing gradients and oversized type have not been imported into work screens. The close resemblance comes from its component discipline and hierarchy. Thrive’s own workflows, language, and identity remain the content of the design.

## Deliverables

- `DESIGN.md`: palette, typography, geometry, component rules, themes, and responsive behavior.
- `public/design-system.css`: application tokens and shared component implementation.
- `public/design-system.html`: live, theme-switchable component guide.
- `public/appearance.js`: light-first, pre-paint appearance handling.
- `scripts/design-preview.mjs`: isolated working preview with fictional records.
- `docs/design/verification.md`: checks, screenshots, and known limits.
