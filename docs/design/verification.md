# Cobalt workspace verification

October 29, 2026

## Automated checks

- Existing regression suite: **391 passed, 0 failed**.
- Production build: **passed** using the bundled Node 24 runtime.
- Appearance smoke check against `public/appearance.js`: no saved choice defaults to light even on a dark system; saved Light/Dark are respected; explicit System follows both initial preference and subsequent system changes.
- `git diff --check`: passed.
- Impeccable mechanical scan run once. It identified insufficient contrast in the initial tertiary text token; that token was darkened. Its other findings included a table wrapper with no padding (cells provide the inset), a disabled-button hover conflict (fixed), and a shadow-color warning (shadows made achromatic). The scan cannot resolve the UI template’s server-relative stylesheet URLs as filesystem paths, so browser inspection and direct contrast calculations supplement it.

## Browser checks

Inspected the real application UI in an isolated local preview with repository sample records. Reviewed desktop light/dark, 390px phone, and 768px tablet layouts. The desktop browser’s default width was 1217px. Viewport overrides were reset afterward.

Verified:

- Home, client table, client detail panel, creation drawer, and Appearance settings render.
- Primary actions remain cobalt with white text in dark mode.
- Sidebar collapse preserves its 64px content margin; expanding restores the labeled sidebar.
- Mobile account menu still reaches Appearance after utilities move out of the header.
- Phone page width equals viewport width (390px); tablet page width equals viewport width (768px).
- Table content scrolls within its own frame on the phone, preserving fields.
- The standalone component guide switches light/dark without altering the saved workspace preference.
- The existing Inter font is used by the workspace.

The first visual pass revealed an obsolete dark-mode white-button rule and neutral focus styling. Both were fixed. The preview-only banner’s stacking order was lowered so it does not intercept detail-panel controls. The phone header was compacted to bring work higher on screen.

## Token contrast

Direct sRGB calculations for the final palette:

| Pair | Ratio |
|---|---:|
| White text / cobalt primary | 4.98:1 |
| Secondary text / light navigation | 5.09:1 |
| Tertiary text / light pressed surface | 4.60:1 |
| Light link / white | 6.25:1 |
| Light success / paired fill | 5.43:1 |
| Light warning / paired fill | 5.19:1 |
| Light error / paired fill | 5.26:1 |
| Dark secondary / working surface | 8.55:1 |
| Dark tertiary / working surface | 6.86:1 |
| Dark link / working surface | 9.15:1 |

These checks establish the shared text/action token pairs; they are not a claim of a full accessibility certification of every legacy screen or user-defined status color.

## Evidence

- [Home, desktop light](screenshots/home-desktop-light.jpg)
- [Clients, desktop light](screenshots/clients-desktop-light.jpg)
- [Clients, desktop dark](screenshots/clients-desktop-dark.jpg)
- [Home, phone light](screenshots/home-mobile-light.jpg)
- [Live component guide](screenshots/component-guide-light.jpg)

## Preview and limits

With Node 22.13+ and installed dependencies, run `npm run preview:design` from `prototype/`, then open `http://127.0.0.1:4174/`. The script builds the enhanced controls before serving. The component reference is `http://127.0.0.1:4174/design-system.html`.

This server binds to loopback, uses fictional Morgan Studio records, and keeps changes only in memory. It does not use the production database or connect external providers. It deliberately rejects external integration operations. Restarting resets the dataset.

The ordinary development server’s sign-in returned 403 during browser testing, so browser QA used the isolated design server. Production authentication, email, calendar, payments, and client document publishing were not exercised. No hosted deployment was made during that initial exploration. The subsequent finishing pass and publication are recorded below. The separate `self-hosted/` checkout was not modified.


## Production finishing pass

The user authorized publication after compacting buttons, refining interaction states, and harmonizing fonts.

| Before | After | Why |
|---|---|---|
| 34px default buttons; mixed footer sizing | 30px desktop actions; 32px form actions; 28px icon controls | More compact controls with consistent roles |
| Inter declared only in workspace CSS | One shared Inter declaration in `typography.css` | Account, client-page chrome, workspace, and enhanced controls use the same family |
| Mixed press darkening, filters, and inset outlines | Explicit pressed surface and subtle 98% pointer compression | Consistent feedback without moving keyboard interactions |
| 140ms generic feedback | 120ms targeted color/transform feedback | Quicker response with reduced-motion support |
| Compact desktop sizing could leak onto touch controls | Coarse-pointer controls retain 44px targets | Preserve comfortable touch interaction |

Browser measurements confirmed 30px primary buttons, 32px form-footer actions, Inter on body/button/field text, a loaded local font, blue primary hover, and a 2px blue keyboard-focus outline with no keyboard transform. Both light and dark theme checks and the responsive screen check use the same application tokens. The production workflow runs the full regression suite and production build before packaging and pushing this source.
