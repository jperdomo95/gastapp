---
name: new-component
description: Scaffold a new React UI component for the GastApp web app using raw Radix primitives + Tailwind (NOT shadcn). Use when adding a reusable component under apps/web/src/components.
---

# New web component (Radix + Tailwind)

GastApp's web UI is built on **raw Radix primitives styled with Tailwind**.
Do **not** install or generate shadcn/ui wrappers — match the existing hand-rolled
components in `apps/web/src/components/ui/` (button, input, dialog, select, label).

## Conventions

- **Location**: shared primitives in `apps/web/src/components/ui/<name>.tsx`;
  feature components in `apps/web/src/components/<feature>/<Name>.tsx`.
- **Filenames**: `ui/` primitives are lowercase (`button.tsx`); feature
  components are PascalCase (`AppLayout.tsx`).
- **Styling**: Tailwind utility classes inline. If the repo has a `cn()` helper
  use it; otherwise compose `className` with template strings as the existing
  components do.
- **Radix**: import from the specific `@radix-ui/react-*` package (already
  dependencies: dialog, dropdown-menu, label, select, slot, toast, tooltip).
  Use `React.forwardRef` and spread `...props` so refs and ARIA attributes pass
  through to the underlying Radix part — this is how the existing primitives are
  written.
- **Icons**: `lucide-react`.
- **Types**: extend the Radix part's prop types (e.g.
  `React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>`); pull shared
  domain types from `@gastapp/types`.

## Steps

1. Read 1–2 existing files in `apps/web/src/components/ui/` to copy the exact
   forwardRef + Tailwind pattern in use.
2. Create the component file in the right location.
3. Keep it presentational — data fetching lives in `apps/web/src/hooks/`
   (TanStack Query) and global state in `apps/web/src/stores/` (Zustand).
4. Verify it compiles: `pnpm --filter @gastapp/web typecheck`.

## Anti-patterns

- ❌ `npx shadcn add ...` or copying shadcn component code.
- ❌ New UI/styling libraries (no MUI, Chakra, styled-components).
- ❌ Business logic or `axios` calls inside the component.
