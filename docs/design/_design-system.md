# Design system extract — AYMAX Knowledge Hub

Source: `AYMAX Knowledge Hub Design (4).zip` (uploaded 2026-07-29), pages `export/*.html`.
Every page ships an identical copy of this CSS — extracted once here instead of repeating it
in every `docs/design/<Page>.md`.

**This is a reference for translating the mock into Fiori, not CSS to import.** Per
`CLAUDE.md` §4/§10: UI5 freestyle, `sap_horizon`/`sap_horizon_dark` themes, semantic colours
(`Success`/`Warning`/`Error`/`Information`/`None`) — never hex, never inline `style=`. The
hex values below exist so we can pick the *closest semantic match*, not so we copy them into
CSS.

## Palette — "Cold Sky / Modern Navy"

| Token | Light | Dark | Nearest Horizon semantic use |
|---|---|---|---|
| `--color-primary` | `#293681` | — | brand / header accents |
| `--color-secondary` | `#4274D9` | — | brand gradient partner |
| `--color-bg` | `#F6F8FC` | `#0F1526` | page background |
| `--color-surface` | `#FFFFFF` | `#171E33` | card/tile background |
| `--color-text` | `#1A2138` | `#E8ECF7` | primary text |
| `--color-accent` | `#4274D9` | `#6FA0E8` | links, active nav, focus ring |
| `--color-divider` | `rgba(41,54,129,.12)` | `rgba(232,236,247,.12)` | borders |
| `--color-success` / `-bg` | `#1E9E6B` / `#E4F7EE` | dark variants exist | `ValueState.Success` |
| `--color-warning` / `-bg` | `#B8860B` / `#FDF3DC` | | `ValueState.Warning` |
| `--color-error` / `-bg` | `#D64545` / `#FBEAEA` | | `ValueState.Error` |
| `--color-info` / `-bg` | `#4274D9` / `#EEF4FD` | | `ValueState.Information` |
| `--color-pending` / `-bg` | `#7A6BC4` / `#EFEBFB` | | closest to `Information`/`None` — no purple semantic in Horizon, map to neutral + icon |
| `--color-completed` / `-bg` | same as success | | `ValueState.Success` |
| `--color-cancelled` / `-bg` | `#8A93A8` / `#EEF0F5` | | `ValueState.None` |
| `--color-blocked` / `-bg` | same as error | | `ValueState.Error` |

Full neutral/accent 100–900 ramps and the `[data-theme="dark"]` overrides exist in the source
if a component needs a specific step; the table above covers what actually recurs across
pages.

## Typography

- Headings: `Sora`, weight 700 (`--font-heading-weight`). Sizes: h1 40px · h2 30px · h3 23px ·
  h4 19px · h5 16px · h6 12px (uppercase, letter-spacing .08em).
- Body: `Inter`, 15px base, line-height 1.6.
- → UI5: use standard `sapMTitle`/`Text` classes with the theme's font; don't hardcode Sora/Inter,
  Horizon's default type ramp is the equivalent contract.

## Spacing & radius

`--space-1..8` = 4/8/12/16/24/32px. `--radius-sm/md/lg` = 8/12/16px.
→ UI5: `sapUiTinyMargin`(4px)/`sapUiSmallMargin`(8px)/`sapUiMediumMargin`(16px)/`sapUiLargeMargin`(32px)
cover the same steps closely enough — use the standard classes per `CLAUDE.md` §10, never inline style.

## Components present in the mock (→ Fiori control mapping)

| Mock class | What it is | Fiori control |
|---|---|---|
| `.btn.btn-primary` | Gradient CTA button | `sap.m.Button` (`Emphasized`) |
| `.btn.btn-secondary` | Outlined button | `sap.m.Button` (`Default`) |
| `.btn.btn-ghost` | Text-only button | `sap.m.Button` (`Transparent`) |
| `.btn.btn-icon` | Icon-only 36×36 button | `sap.m.Button` with `icon`, always with `tooltip` (`CLAUDE.md` §10) |
| `.card` (+ `.elev-sm/md/lg`) | Rounded panel, hover-lift | `sap.m.Panel` or a custom tile in a `sap.f.GridList` |
| `.card-kicker` / `.card-title` / `.card-body` / `.card-meta` | Card internal typographic slots | `ObjectHeader`/`Text` inside the panel |
| `.tag` (+ variants `accent/neutral/success/warning/error/info/pending/completed/cancelled/blocked`) | Pill-shaped status badge | `sap.m.ObjectStatus` with matching `state`, or `sap.m.Token` for filter chips |
| `.nav` / `.nav-brand` | Top nav bar with logo + links | Fiori shell bar (`sap.f.ShellBar`) — the mock hand-rolls this; we use the framework control |
| `.field > label` / `.input` | Form field | `sap.m.Label` + `sap.m.Input`/`TextArea` |
| `.radio` | Custom radio | `sap.m.RadioButton` |
| `.seg` / `.seg-opt` | Segmented control | `sap.m.SegmentedButton` |
| `.table` | Data table with sticky header | `sap.m.Table` or `sap.ui.table.Table` depending on row count |
| `.dialog-backdrop` / `.dialog` | Modal | `sap.m.Dialog` |
| `.blueprint` + `.corner` (`tl/tr/bl/br`) | Legacy wireframe corner brackets — **explicitly neutralized** in this export's CSS (`display:none`) | Ignore. Purely a leftover class from an earlier wireframe stage; the design itself says so in a comment. |

## Templating conventions used in the mock source (not ours — just how to read the extracts)

The exported pages use a small internal templating DSL (`x-dc`, `sc-for`, `sc-if`,
`{{ expr }}`, `sc-camel-on-click`) plus a `class Component extends DCLogic { state = {...} }`
block holding the **mock data and interaction logic** for that page. When reading
`docs/design/<Page>.md`:

- `sc-for list="{{ x }}" as="y"` = "repeat this block for each item in `x`, bound as `y`" → a
  `sap.m.List`/`Table`/`GridList` binding in UI5.
- `sc-if value="{{ cond }}"` = conditional rendering → `visible="{= ${cond} }"` or role-based
  `@restrict`-driven visibility, not a client-side toggle (`CLAUDE.md` C7 — no role switcher).
- The `state.dashboard` / `DASHBOARD_OPTIONS` role-switcher menu seen on every page is the
  **mock's** stand-in for "which dashboard am I" — it reads `localStorage`. This is exactly
  what `CLAUDE.md` C7 forbids in the real app: our role comes from the XSUAA token, never a
  dropdown. Treat that menu as a demo convenience to ignore, not a feature to port.
- Any `Component` method (`toggleX`, `markAllRead`, `setDashboard`, …) documents an
  **interaction/business rule** the real handler needs to implement — that's the useful part,
  not the mechanism.
