# CLAUDE.md

Project guidance for Claude Code working in this repository.

## Project

`leschi-apografi` — restaurant inventory management for the Officers' Club of Kalamata (Λέσχη Αξιωματικών Καλαμάτας). UI text is in Greek.

- **Stack:** Next.js 15 (App Router) · React 18 · TypeScript · Tailwind CSS 3 · Supabase (auth + data) · `xlsx` for exports.
- **Key dirs:** `src/app` (routes/pages), `src/components` (UI), `src/lib` (business logic, Supabase client, auth guard), `scripts` (seed/archive), `sql` (schema).
- **Run:** `npm run dev` · **Lint:** `npm run lint`.

## Mobile-first is mandatory

The app is used on phones in the kitchen/storeroom. **Every new page or component must be usable on a ~375px-wide screen before it is considered done.** This is a hard requirement for all features, not a nice-to-have.

### Rules

- **Design mobile-first.** Start from the single-column mobile layout; use Tailwind responsive prefixes (`sm:`, `md:`) to *add* desktop affordances — never the reverse.
- **No fixed widths that exceed ~320px** on layout containers or inputs. Use `w-full` with `sm:`-scoped caps (e.g. `w-full sm:w-40`).
- **Tabular data must use `ResponsiveTable`** (`src/components/ResponsiveTable.tsx`), which renders a real table at `sm:`+ and stacks into labeled cards on mobile. Never drop in a raw `<table>` that can clip or overflow.
- **Multi-column form grids** must be `grid-cols-1 sm:grid-cols-2` (or similar) — never a bare `grid-cols-2`.
- **Touch targets** for interactive controls should be comfortable (~40px+ height). Full-width primary buttons on mobile (`w-full sm:w-auto`).
- **Modals/overlays** must fit and scroll within the viewport on small screens.

### Definition of done

Verify at **375px** width (browser DevTools device toolbar):
- no horizontal page scroll,
- no clipped or cut-off content,
- every action reachable and tappable.

Also confirm the desktop layout (≥1024px) still looks correct.

> A `CLAUDE.md` rule guides Claude but is not auto-enforced by tooling. If hard enforcement is ever needed, add a lint rule or a pre-commit hook.

## Conventions

- Match the existing Tailwind utility style and the project color palette (gold / military in `tailwind.config.js`, CSS vars in `src/app/globals.css`).
- Shared helpers belong in `src/lib`. Reuse existing utilities (e.g. `fetchProducts`, `isLowStock` in `src/lib/inventory.ts`) rather than duplicating logic.
