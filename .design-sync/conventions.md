# GastApp Pulse — Design conventions

## Color system

All colors are CSS custom properties on `:root` (dark theme) with `.light` class overrides. **Never hardcode colors** — always use Tailwind classes or `var(--pulse-*)` tokens.

Key tokens:
- `--pulse-bg` / `bg-pulse-bg` — app background (`#0a0b1a` dark)
- `--pulse-text` / `text-pulse-text` — primary text
- `--pulse-dim` / `text-pulse-dim` — secondary text
- `--pulse-faint` / `text-pulse-faint` — hints, placeholders
- `--pulse-glass` / `bg-pulse-glass` — card surface (frosted glass)
- `--pulse-stroke` / `border-pulse-stroke` — borders
- `--pulse-v1` / `text-pulse-v1` — primary accent (violet `#7c5cff`)
- `--pulse-v2` / `text-pulse-v2` — secondary accent (cyan `#22d3ee`)

## Gradient patterns

- **Hero text**: `className="gradient-hero-text"` on a text element — applies `var(--pulse-hero-text)` gradient as background-clip text.
- **Accent button / FAB**: `variant="primary"` on `Button` — gradient flows from v1 → v2 at 135°.
- **Progress bars**: inline `background: 'linear-gradient(90deg, var(--pulse-v1), var(--pulse-v2))'`.

## Typography

Sora (Google Fonts, loaded at runtime). Font is NOT bundled — the host app loads it via `<link>` in `index.html`. All weights used: 400, 600, 700.

## Dark backgrounds required

Place all previews on `background: '#0a0b1a'` (or `bg-pulse-bg`) — components use glassmorphic surfaces that are invisible on white.

## Glassmorphic cards

Use `<Card>` with no extra styling for section containers. Add `hero` prop for the gradient background hero card variant.

## Composition patterns

- Labels + Inputs pair as a `flexDirection: 'column', gap: '6px'` stack.
- Form groups use `gap: '16px'` between label+input pairs.
- Action rows (button groups) use `justifyContent: 'flex-end', gap: '8px'`.

## Compound components

- **Select**: always composed as `<Select> → <SelectTrigger> → <SelectValue>` + `<SelectContent> → <SelectItem>*`.
- **Dialog**: always composed as `<Dialog open> → <DialogContent title="…"> → content + <DialogClose asChild>` footer.
- **ConfirmDialog**: self-contained — pass `open`, `title`, `description`, `onConfirm`, `variant` (primary|danger).
