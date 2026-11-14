# DESIGN.md — Which theme do I use?

Start here before any UI change. This file tells a new team member **which of the site's three
visual themes applies to the page they are touching**, and which components and tokens to use.

Related files (this one does not replace them):

- `AGENTS.md` §7 — the binding design rules. If this file and §7 disagree, §7 wins; fix this file.
- `UI design.md` — the original long-form glass design spec (reference only).
- `app/globals.css` — the single source of truth for every token named below.

---

## 1. Pick the theme from the route

The site has three themes. The route you are editing decides which one you use. Never mix them
on one page.

| Theme | Scope class | Routes | Footer | Look |
|---|---|---|---|---|
| **Public** | `.site-public` | `app/(public)/*`: landing, login, signup, forgot/reset password, request-demo | `SiteFooter` | White page, navy buttons, flat hairline borders, small radii (6/10px) |
| **Workspace** | `.workspace-app` | `app/student/*`, `app/mentor/*`, `app/academy/*`, `app/admin/*` | `WorkspaceFooter` | Navy sidebar, white sticky header, solid white hairline cards, indigo accent |
| **Glass** | none (root defaults) | Standalone pages outside both shells: `app/onboarding`, `app/forbidden`, `app/dev-preview` | `MinimalFooter` | Near-monochrome glass panels over the ambient wash |

Quick test: **does the route's `layout.tsx` render `WorkspaceLayout`? → Workspace. Is it under
`app/(public)`? → Public. Neither? → Glass.**

Layouts live in: `app/(public)/layout.tsx`, `app/{student,mentor,academy,admin}/layout.tsx`,
and `app/layout.tsx` (root: fonts + ambient wash only).

### Footers are dark navy in every theme

All three footers use the navy brand colour with light text (`text-white/70`–`/75`, contrast ≥ 4.5:1):
`SiteFooter` uses `--site-navy`, `WorkspaceFooter` uses `--academy-navy`, and `MinimalFooter` uses
the same hex as `--site-navy` (that token only exists inside `.site-public`, which also forces a white
background). Inside `SiteFooter` do **not** use `.site-link` or `.site-eyebrow`; they set dark text
colours that disappear on navy.

### Brand logo

The EliteCadet mark lives at `public/brand/elitecadet-logo.png` (512px, circular, transparent
corners; the favicon is `app/icon.png`). Always render it through `<BrandLogo size={…} />`
(`components/layout/brand-logo.tsx`), never a raw `<img>` or a stock icon. It is used in
`SiteHeader` (36px), `SiteFooter` (40px) and `WorkspaceBrand` (40px). Its white disc keeps it
legible on both white and navy, so do not recolour or add a background box behind it. It is
decorative (`alt=""`): keep the brand name or an `aria-label` next to it. Do not stretch it; it is
square.

### Rules that never change

- **Never build a per-role shell.** All four workspaces use the one `WorkspaceLayout`
  (`components/layout/workspace/`). Pages render only their own content, never their own header,
  sidebar or footer.
- **Footers are owned by layouts**, not pages. A new page inside an existing shell gets its footer
  for free. Only a new standalone page (Glass theme) adds `<MinimalFooter />` itself.
- **Do not invent colours, radii, shadows or motion values.** Use the tokens below. A value needed
  twice becomes a token in `app/globals.css`.
- Deviating from the design system is a bug, not a style choice (`AGENTS.md` §2.8).

---

## 2. Workspace theme (Student, Mentor, Academy, Super Admin)

Most work happens here. Tokens are scoped to `.workspace-app` in `app/globals.css`.

**Shell:** `WorkspaceLayout` = navy sidebar (260px; 76px icon rail on tablet; drawer on mobile) +
sticky 64px white header + `<main>` (max-width 1360px) + `WorkspaceFooter`.

**Adding a nav item:** edit the `NAV_ITEMS` array in that role's `layout.tsx` (`app/student/layout.tsx`
etc.). Do not touch `WorkspaceLayout` for a single role's nav.

**Colour**

| Token | Value | Use |
|---|---|---|
| `--ink` / `text-ink` | `#1c1c1e` | Primary text |
| `--ink-secondary` / `text-ink-secondary` | `#6e6e73` | Muted text, icons |
| `--surface-base` | `#f5f6fb` (workspace) | Page background |
| `--hairline` / `border-hairline` | `#e4e7f1` (workspace) | All borders |
| `--brand-accent` / `bg-brand-accent` | `#4a55e8` | The **only** saturated colour: primary action, active nav, links, focus ring, selected state |
| `--status-success/warning/danger` | `#34c759` `#ff9f0a` `#ff3b30` | Real states only, as small tags/dots |
| `--academy-navy` | `#0e1836` | Sidebar only |

Category is **never** colour-coded in the chrome (no orange mentors, violet batches). The only
exception is the Day-2 resource category colours (`--day2-*`), which exist for that feature alone.

**Radius:** `--radius-control` 12 · `--radius-button` 14 · `--radius-card` 16 (workspace) ·
`--radius-panel` 20 (workspace) · `--radius-pill` 999. Use the Tailwind names (`rounded-card`,
`rounded-button`, `rounded-pill`), not raw pixel values.

**Shadow:** `shadow-sm`, `shadow-md`, and `--shadow-glow-accent` (primary button + active nav only).

**Motion:** 180–220ms, `cubic-bezier(0.4, 0, 0.2, 1)`. Max 2px translate, 5% scale, 10° rotate.
Respect `prefers-reduced-motion`. No bounce, parallax or per-route transitions.

**Typography:** Geist (via `--font-geist-sans`). Page title 28–32px/700, card title 18–20px/600,
body 14–15px, uppercase labels and table headers 11–12px/600. Only two weights per screen.

---

## 3. Public theme (marketing + auth pages)

Tokens are `--site-*`, scoped to `.site-public` in `app/globals.css`. Use these, **not** the
workspace tokens, and not the glass classes.

- Colours: `--site-navy` (primary buttons, brand), `--site-text`, `--site-muted`, `--site-line`
  (borders), `--site-bg` / `--site-bg-soft`, `--site-accent-blue` (links, focus ring),
  `--site-danger`.
- Radii: `--site-radius-sm` 6px, `--site-radius-md` 10px.
- Helpers: `.site-btn` + `.site-btn-primary|secondary` + `.site-btn-sm`, `.site-link`,
  `.site-eyebrow`, `.site-input`.
- Chrome: `SiteHeader` and `SiteFooter` (`components/layout/`), wired in `app/(public)/layout.tsx`.
  Nav links come from `site-nav-links.ts`; the footer reuses them.
- The `#about` anchor lives on the footer. Keep that `id`.

---

## 4. Glass theme (standalone pages)

For pages outside both shells. Three material tiers, **never a fourth**:

| Class | Use for |
|---|---|
| `.glass-thin` | chips, tags, tooltips, search bars, row hover |
| `.glass-regular` | cards, panels, table and form containers |
| `.glass-thick` | modals, drawers, dialogs |

Rules: no gradient fill on glass; one translucent hairline border; indigo accent only for the one
primary action and focus/selected states. The shared ambient wash (`.ambient-wash`, rendered once in
the root layout) sits behind every page, so do not add your own background.

Note: inside `.workspace-app`, the glass classes are overridden to solid white hairline cards, so
shared components (`PageHeader`, `StatCard`, `ListPanel`…) look right in both places without changes.

---

## 5. Components: reuse, do not rebuild

Build screens from `components/ui/` and the shared patterns. Do not create bespoke cards, tables or
empty states.

| Need | Use |
|---|---|
| Page title + primary action | `PageHeader` (title, optional subtitle, **one** primary action) |
| KPI tile | `StatCard` |
| Table / list container | `ListPanel` + `Table` |
| Status | `StatusTag` (always dot **and** text: never colour-only) |
| Filters | `FilterChip` (active = indigo outline, not fill) |
| Nothing to show | `EmptyState` (icon, one bold line, one muted line, optional link) |
| Loading / error | `LoadingState`, `Skeleton`, `ErrorState` |
| Single record page | `DetailHeader` |
| Forms | `Input`, `Textarea`, `Select`, `Label` |
| Modal / confirm | `Dialog`, `ConfirmActionDialog` |
| Nav icons | `components/ui/nav-icons.tsx` |

---

## 6. Accessibility checklist (every change)

- Visible focus ring on everything interactive (2px indigo; `--site-accent-blue` on Public).
- Real `<button>`, `<a>`, `<table>` elements. Icon-only controls get an `aria-label`.
- Touch targets ≥ 44px on mobile.
- Text contrast ≥ 4.5:1. Status is never colour-only.
- No horizontal page overflow at any width. Mobile (<900px): tables become stacked cards.

---

## 7. Before you open a PR

1. Identify the theme from the route (§1) and use only that theme's tokens.
2. No hard-coded hex, px radius, or shadow in a component. Use a token or Tailwind alias.
3. Reuse a component from §5; if none fits, extend it rather than forking it.
4. Check at 375px, 768px and 1440px. Check keyboard navigation.
5. Run `npm run lint`, `npm run typecheck`, `npm test`.
6. If you introduced a new token or pattern, add it to `app/globals.css` **and** update this file.

## 8. Branching convention for design work

One concern per branch, named by type: `feat/<area>-<change>` for UI features,
`fix/<area>-<bug>` for visual bugs, `docs/<topic>` for documentation. Do not mix a token change
with a page change in one PR. Do not push to `main` directly.
