# Thrive interaction audit — 31 October 2026

## Outcome

Implemented a shared interaction-state pass across the hosted product. Thrive retains its cobalt actions, pale neutral feature icons, white canvas and restrained dark theme. Hover is neutral; saved selection is blue; focused inputs recolor their existing boundary; keyboard-operated buttons retain a visible outline.

## Reference comparison

These are principles adapted to Thrive, not claims of pixel-identical competitor behavior.

- [Harvest Day time tracking](https://support.getharvest.com/hc/en-us/articles/360048181892-Tracking-time-Day-view): searchable project/task choices, optional notes, Enter confirmation, Escape dismissal and visible timer status. Thrive already has day/week tracking and optional descriptions; this batch improves its shared dropdown focus, cancellation and form recovery.
- [Attio workspace navigation](https://attio.com/help/reference/productivity-collaborating/navigating-your-workspace) and [record views](https://attio.com/help/reference/managing-your-data/records/create-and-view-records): contextual record navigation and keyboard efficiency. Applied through anchored record menus, consistent keyboard handling and preserved tab focus.
- [Twenty releases](https://twenty.com/releases): recent improvements include Shift-click range selection, in-place editing and keyboard navigation. Added visible-order range selection to Thrive's shared bulk-selection model without changing record-click behavior.

## Findings and shipped changes

| Priority | Finding | Change |
| --- | --- | --- |
| High | Async client email loading rebuilt the complete drawer and dropped keyboard focus onto the page. | Refresh only the tab body. Keep the selected tab and sidebar mounted; restore focused email actions after loading. |
| High | Invalid forms left focus on Save and concatenated helper text into error labels. | Focus the first invalid field, associate its error message, strip control/helper content from labels, and clear stale validation state on correction. |
| Medium | Custom selects still used a second focus outline; active options could resemble committed selections. | One blue input boundary; neutral keyboard highlight; blue selected option plus checkmark. Preserve native search Home/End and composition input. |
| Medium | “New…” in record details was visually detached from its trigger and did not support arrow navigation. | Anchor below the trigger, constrain horizontally to the viewport, and add Arrow keys, Home/End, typeahead, Escape and focus return. |
| Medium | Creation, sidebar, overflow and document-action menus had divergent keyboard handling. | Shared action-menu navigation skips hidden/disabled items, respects editable fields and modifier shortcuts, and restores trigger focus on Escape. |
| Medium | Selected CRM rows inherited gray styling, blending with hover. | Clear blue selected rows/cards; neutral hover; stable applied-filter state; mixed select-all remains explicit. |
| Medium | Selecting contiguous records required separate clicks. | Shift-click selects or deselects a range in current visible order. Filtering, changing scope and select-all reset stale anchors. |
| Medium | Search fields and table-header buttons lacked a consistent focus treatment. | Visible search boundary, hidden shortcut hint while typing, contained keyboard outlines on table controls and tabs. |
| Low | Long record-property labels were clipped. | Wrap labels and preserve icon width, including custom fields. |
| Low | Open, pressed and disabled states varied between shared controls. | Neutral open-menu and pressed surfaces, muted disabled utilities, square tab edges and semantic error colors in both themes. |

## Coverage and verification

- Source review: shared controls and tokens; sidebar/account menus; CRM tables, boards and bulk controls; client/project record panels; dropdowns; document menus; form validation; time entry; settings; dashboard widgets.
- Browser checks on fictional local data: four-row Shift-selection; mixed master checkbox; menu ArrowDown/typeahead/Escape; menu placement; long custom-field labels; client tab and Refresh focus after asynchronous loading; dropdown cancellation; optional-description time form; validation focus, message and recovery; dark settings; 390px dashboard/widget menu with no document overflow.
- Full regression suite: 447 tests passed, including new range-selection and action-menu keyboard tests.
- Impeccable detector: no findings on inspected changed targets. This is a heuristic result, not an accessibility certification.
- Published commercial-document branding, financial calculations and provider integrations are not redesigned in this batch.

## Remaining audit limits

This was a broad shared-component audit with representative workflow checks, not an exhaustive manual traversal of every state. Screen-reader testing, forced-colors rendering on Windows, browser-matrix coverage, and live connected-provider failure states still need dedicated verification. Native color/date picker behavior remains browser-dependent. The hosted CSS still has overlapping historical layers; a future consolidation should replace these incrementally with visual regression coverage rather than removing them wholesale.
