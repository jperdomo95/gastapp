# Handoff: Pulse — Expense Tracker (GastApp)

## Overview
**Pulse** is the chosen visual direction for GastApp, a personal expense-tracking app. This package covers the full Pulse UI: five mobile screens (Dashboard, Expenses, Add Expense, Categories, Reports) plus a Desktop dashboard, each available in **dark** and **light** themes. The aesthetic is "neon fintech": a deep midnight (or clean light) surface, glassmorphic cards, and an electric violet→cyan accent used across gradients, charts, and active states.

## About the Design Files
The files in this bundle are **design references created in HTML/React (JSX) prototypes** — they show the intended look, layout, and behavior. They are **not production code to copy directly**. The task is to **recreate these designs in the target codebase's existing environment** (React Native, SwiftUI, Flutter, a web React/Vue app, etc.) using that project's established component library, navigation, and state patterns. If no environment exists yet, pick the most appropriate framework for the product (a mobile-first expense app suggests React Native or SwiftUI) and implement there.

The prototypes are driven by a single shared data object (`data.js` → `window.GAST`) and a single themeable token factory (`pulse-kit.jsx` → `window.makePulse(mode)`). Mirror this structure: one source of truth for sample/real data, one theme token set with a `dark`/`light` switch.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, radii, and chart treatments are all specified below and should be reproduced closely. Recreate the UI pixel-accurately using the codebase's libraries; only substitute primitives (e.g. swap the hand-rolled SVG donut for a charting lib) where it doesn't change the visual result.

---

## Design Tokens

Everything derives from `makePulse(mode)`. Two complete palettes:

### Dark (default)
| Token | Value | Use |
|---|---|---|
| `bg` | `#0a0b1a` | app background |
| `bgSoft` | `#10122a` | raised background |
| `text` | `#eef0ff` | primary text |
| `dim` | `#8a8db0` | secondary text |
| `faint` | `#5d6086` | tertiary / captions |
| `glass` | `rgba(255,255,255,0.045)` | card fill |
| `stroke` | `rgba(255,255,255,0.08)` | card borders, separators |
| `track` | `rgba(255,255,255,0.06)` | progress/chart rails |
| `grid` | `rgba(255,255,255,0.05)` | chart gridlines |
| `barInactive` | `rgba(255,255,255,0.12)` | inactive comparison bar |
| `navBg` | `rgba(18,19,38,0.72)` | bottom tab bar / sidebar |
| `sheetBg` | `rgba(16,18,40,0.92)` | bottom sheet |
| `scrim` | `rgba(5,6,16,0.62)` | modal backdrop |
| `handle` | `rgba(255,255,255,0.18)` | sheet grabber |
| card shadow | `none` | — |
| hero amount gradient | `linear-gradient(100deg, #eef0ff, #22d3ee)` | big balance number |

### Light
| Token | Value | Use |
|---|---|---|
| `bg` | `#f4f5fb` | app background |
| `bgSoft` | `#ffffff` | raised background |
| `text` | `#181a2e` | primary text |
| `dim` | `#6c7090` | secondary text |
| `faint` | `#a2a5c0` | tertiary / captions |
| `glass` | `#ffffff` | card fill (solid) |
| `stroke` | `rgba(24,26,46,0.08)` | card borders, separators |
| `track` | `rgba(24,26,46,0.07)` | progress/chart rails |
| `grid` | `rgba(24,26,46,0.06)` | chart gridlines |
| `barInactive` | `rgba(24,26,46,0.10)` | inactive comparison bar |
| `navBg` | `rgba(255,255,255,0.82)` | bottom tab bar / sidebar |
| `sheetBg` | `rgba(255,255,255,0.96)` | bottom sheet |
| `scrim` | `rgba(20,22,45,0.34)` | modal backdrop |
| `handle` | `rgba(24,26,46,0.18)` | sheet grabber |
| card shadow | `0 8px 24px rgba(24,26,46,0.06), 0 1px 2px rgba(24,26,46,0.04)` | lifts white cards |
| hero amount gradient | `linear-gradient(100deg, #6f54ff, #0fb6d6)` | big balance number |

### Brand accent (both themes)
- **Accent gradient:** `linear-gradient(135deg, v1, v2)` — used on the FAB/+button, primary buttons, active tab/chip, active comparison bar, chart line, progress fills.
- **v1 (violet):** dark `#7c5cff` · light `#6f54ff`
- **v2 (cyan):** dark `#22d3ee` · light `#0fb6d6`
- On-accent foreground (text/icons sitting on the gradient) is always **white** `#fff`.

### Category colors (HSL by hue)
Each category has a fixed hue. Three derived roles:
- **color** (dot/bar/stroke): dark `hsl(H 85% 65%)` · light `hsl(H 68% 47%)`
- **soft** (chip/icon background): dark `hsl(H 70% 60% / 0.18)` · light `hsl(H 70% 52% / 0.12)`
- **tint** (icon/text on soft): dark `hsl(H 85% 72%)` · light `hsl(H 62% 40%)`

Hues: Groceries `145`, Health `200`, Dining `28`, Shopping `280`, Transport `330`, Utilities `50`, Subscriptions `170`, Other `230`. Category bars use `linear-gradient(90deg, color(H), color(H+18))`.

### Typography
- **Font family:** `'Sora', sans-serif` (weights 300/400/500/600/700), loaded from Google Fonts.
- Display/balance numbers: 40–52px / 700 / letter-spacing −0.02em / line-height 1.
- Screen titles (`h1`): 26px (mobile) · 24px (desktop topbar) / 700 / −0.01em.
- Card titles: 14–15px / 600.
- Body: 13.5–14px / 500. Secondary: 11.5–12.5px (`dim`). Captions: 9.5–11px (`faint`).
- Uppercase labels (table headers, "TOTAL", "AMOUNT"): letter-spacing 0.06–0.1em.

### Radii & spacing
- Card radius: **22px** mobile, **18px** desktop. Chips/pills: **20px**. Icon tiles: **11–13px**. FAB: **16px**. Bottom sheet: **28px** top corners.
- Screen gutters: **20px** mobile, **32px** desktop. Inter-card gap: **14px** mobile, **18px** desktop.
- Touch targets ≥ 44px. Bottom tab bar height 62px; FAB 46×46.

---

## Screens / Views

All mobile screens are **390px wide** (iPhone logical width) and share `PulseShell`: a status bar (9:41 / 5G), two ambient radial glows (violet top-right, cyan mid-left), the screen body, and a floating glass bottom tab bar with 5 items — Home `◧`, List `≣`, **Add `+` (gradient FAB, center)**, Categories `◍`, Reports `◔`. Active item is `v2` (cyan); inactive is `dim`.

### 1. Dashboard (`DirectionNeon.jsx`)
- **Purpose:** at-a-glance monthly spend overview.
- **Layout:** vertical scroll, 20px gutters, 14px gaps. Header (avatar + "Welcome back / Marco" + settings button) → hero balance card → 2-up quick stats → By category (donut + ranked bars) → Monthly trend (area chart) → Recent list.
- **Hero card:** gradient-tinted (`heroBg`), label "Spent this month", balance `$2,847.50` in hero gradient text at 44px/700, then a cyan pill `↓ 11.3%` + "less than May".
- **Quick stats:** Avg/day `$95`, Entries `64`.
- **By category:** 132px SVG donut (radius 52, stroke 14, rounded caps, center shows `$2.8k / TOTAL`, soft violet drop-shadow) beside the top-5 categories each with a colored dot, name, value, and a thin gradient progress bar.
- **Monthly trend:** 322×88 gradient area chart (area fades `v1` 45%→0; line is `v1→v2`), last point marked with a cyan dot; month labels below, current month in cyan.
- **Recent:** 5 rows — circular category-tinted initial, merchant + "category · when", amount `−$84.20`.

### 2. Expenses (`PulseExpenses.jsx`)
- **Purpose:** browse/filter the full ledger.
- **Layout:** title "Expenses" + search button → gradient summary strip (This month `$X` / Entries `64`) → horizontal filter chips (`All time`, **`This month` active=gradient**, `Category ▾`, `Sort: Newest ▾`) → ledger grouped by day.
- **Day group:** header "Today" + "Jun 20 · −$102.69"; card lists rows (tinted initial, merchant + category, amount). Footer "Showing 1–11 of 64".
- Active chip = accent gradient + white text; inactive = glass + stroke + `text`.

### 3. Add Expense (`PulseAddExpense.jsx`)
- **Purpose:** modal entry of a new expense.
- **Layout:** a **bottom sheet (660px tall, `sheetBg`, 28px top radius, blur, top shadow)** rising over the dimmed/blurred dashboard + `scrim`. Grabber handle on top.
- **Contents:** "New expense" + ✕ close → centered AMOUNT display `$48.50` in hero gradient text at 52px with a blinking cyan caret → category chips (selected = category soft bg + category-colored border + tint text) → Date + Note fields (glass) → 3-column numeric keypad (`1–9`, `.`, `0`, `⌫`) → full-width gradient "Add expense" button.

### 4. Categories (`PulseCategories.jsx`)
- **Purpose:** manage categories and see per-category spend.
- **Layout:** title "Categories" + gradient "+ New" pill → "7 categories · $2,847 this month" → **2-column grid** of cards. Each card: category-tinted initial tile + percentage (top-right), name, "N entries", value (e.g. `$642`), and a gradient progress bar relative to the largest category.

### 5. Reports (`PulseReports.jsx`)
- **Purpose:** deeper analytics.
- **Layout:** title "Reports" + "Last 6 months ▾" → hero total card → Monthly trend (322×110 area chart with 3 gridlines, every point dotted) → "This month vs last" (two bars, current = accent gradient, previous = `barInactive`) → By category donut (136px, radius 54) with full legend (name + %) → Top merchants (ranked rows with gradient bars).

### 6. Desktop (`PulseDesktop*.jsx` + `pulse-desktop-kit.jsx`)
All desktop screens share **`PulseDesktopShell`**: a fixed **248px sidebar** (Pulse wordmark → nav with the current screen active → spacer → "Budget left" mini-card → "Marco Bianchi / Pro plan" user row) + a bottom-bordered **topbar** (title + subtitle left; screen-specific actions right, built from `PulseDeskChip` / `PulseDeskPrimary`) + content area. Frame **1440×1090**.
- **Dashboard** (`PulseDesktop.jsx`): stat row (wide hero `1.6fr` + Avg/day, Entries, Categories) then a `1.55fr/1fr` grid — left: 600×200 trend chart + Recent transactions table; right: donut + legend, This vs last bars, Top merchants.
- **Expenses** (`PulseDesktopExpenses.jsx`): filter chips, then `1.7fr/1fr` — left: grouped transactions **table** (tinted day-group headers, Merchant/Category/Date/Amount, pagination footer); right: "This month" hero + By-category bar list.
- **Add Expense** (`PulseDesktopAdd.jsx`): centered **modal dialog** (540px) over the blurred/dimmed dashboard + `scrim`. Header, large gradient amount with caret, category chip grid, Date + Note fields, Cancel / "Add expense" buttons (no numeric keypad on desktop).
- **Categories** (`PulseDesktopCategories.jsx`): overview row (full-category donut + legend + four highlight stats), then a **3-column grid** of category cards ending in a dashed "New category" tile.
- **Reports** (`PulseDesktopReports.jsx`): stat row (hero + 6-month avg / highest / lowest), full-width 760×220 trend chart, then a 3-up row (This vs last bars, donut, Top merchants).

---

## Interactions & Behavior
The prototypes are static visual references; implement these behaviors:
- **Bottom tab bar / sidebar nav:** switch active screen; active item adopts cyan icon (`v2`) + (sidebar) soft pill background.
- **FAB / "+ New expense":** opens the Add Expense sheet/modal. Sheet slides up from the bottom (≈300ms ease-out), backdrop fades to `scrim`; dismiss by ✕, backdrop tap, or swipe-down on the grabber.
- **Filter chips (Expenses):** toggle/segmented; caret chips open a picker. Active chip = accent gradient.
- **Keypad (Add):** appends digits to the amount; `⌫` deletes; caret blinks (~1s). "Add expense" validates amount > 0 and a selected category.
- **Charts:** entrance animation acceptable (area sweep / bar grow / donut draw), but the resting state must match the mocks; respect `prefers-reduced-motion`. Points/bars can show tooltips on hover/press.
- **Theme switch:** a single `mode` ('dark'|'light') drives the whole token set — wire it to a settings toggle and/or the OS color scheme.
- **Hover (desktop):** nav items and table rows get a subtle `glass`/`stroke` hover; buttons lift slightly.

## State Management
- `transactions` (the ledger; each: merchant, category, amount, date) — source for Dashboard recent, Expenses list, Reports merchants, all totals.
- `categories` (name, hue, value, count) — source for donut, Categories grid, chips.
- Derived: `thisMonth`, `lastMonth`, `deltaPct`, `avgPerDay`, `entries`, `catTotal`, `budget`/`budgetLeft`, `trend` (6-month series).
- UI state: `activeScreen`/route, `theme` mode, `addSheetOpen`, draft expense (`amount`, `category`, `date`, `note`), active filter/sort.
- Data fetching: replace `window.GAST` with the app's real store/API; keep the same shape so the views map 1:1.

## Sample Data
All numbers come from `data.js` (`window.GAST`): user "Marco", June 2026, `thisMonth 2847.50`, `lastMonth 3210.00`, `avgPerDay 94.92`, `entries 64`, `budget 3500`; 7 categories; a 6-month `trend`; a `recent` array and a day-grouped `ledger`. Use it verbatim for parity while building, then swap for live data.

## Assets
No external image/icon assets — all iconography is Unicode glyphs (`◧ ≣ ◍ ◔ ⌕ ⚙ ✕ ↓ ▾ ⌫`) and all charts are inline SVG drawn from data. Replace glyphs with the codebase's icon set (e.g. a home, list, grid, chart, gear icon) when implementing. Only web font: **Sora** (Google Fonts).

## Files
Design reference files (included in this bundle under `design_files/`):
- `GastApp Visual Directions.html` — the canvas host that lays out every screen/theme.
- `directions/pulse-kit.jsx` — **`makePulse(mode)` token factory + `PulseShell`** (start here).
- `directions/data.js` — shared sample data (`window.GAST`).
- `directions/DirectionNeon.jsx` — mobile Dashboard.
- `directions/PulseExpenses.jsx` — mobile Expenses.
- `directions/PulseAddExpense.jsx` — mobile Add Expense sheet.
- `directions/PulseCategories.jsx` — mobile Categories.
- `directions/PulseReports.jsx` — mobile Reports.
- `directions/PulseDesktop.jsx` — Desktop dashboard.
- `directions/pulse-desktop-kit.jsx` — **`PulseDesktopShell`** (sidebar + topbar) + `PulseDeskChip` / `PulseDeskPrimary`.
- `directions/PulseDesktopExpenses.jsx` — Desktop Expenses.
- `directions/PulseDesktopCategories.jsx` — Desktop Categories.
- `directions/PulseDesktopReports.jsx` — Desktop Reports.
- `directions/PulseDesktopAdd.jsx` — Desktop Add Expense (modal).

> Note: `DirectionTerminal.jsx` and `DirectionEditorial.jsx` are the two *rejected* exploration directions and are intentionally **not** part of this handoff.
