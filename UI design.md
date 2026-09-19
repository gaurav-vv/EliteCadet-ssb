# SSB Academy --- Apple-Inspired Glass UI Design System (v3, site-wide)

This is a **design system**, not a single-page spec. It applies to
every section of the app — Dashboard, Students, Batches, Mentors,
Reports, Settings, and anything added later. Any new screen should be
buildable entirely from the tokens and patterns below, without
inventing new colors, radii, shadows, or motion values.

------------------------------------------------------------------------

## 1. Design Direction

The whole product should read as **one continuous surface**, not a
dashboard with separate "app" pages bolted on. Whether the user is
looking at the Dashboard, a Students table, a Batch detail view, or
Settings, they should see the same glass material, the same near-zero
color palette, the same radius/shadow/motion system.

The interface should feel: - Quiet - Precise - Spacious -
Almost monochrome - Effortless - Native, not "web glassy" -
Consistent from screen to screen

The biggest failure mode to avoid: designing each section with its own
accent color or its own card style "because it's a different feature."
In Apple's own apps (Settings, Health, Files, Finder), every section
shares one material and color system — only the *content* changes.

------------------------------------------------------------------------

## 2. Visual Language (applies everywhere)

### Glass material system

Three reusable material tiers. Every surface on every page picks one —
never invent a fourth.

| Tier | Use for | Blur | Background | Border |
|---|---|---|---|---|
| `glass-thin` | chips, tags, tooltips, search bars, table row hover, filter pills | `blur(12px) saturate(140%)` | `rgba(255,255,255,0.55)` | `1px solid rgba(255,255,255,0.35)` |
| `glass-regular` | cards, panels, table containers, list containers, form panels | `blur(20px) saturate(150%)` | `rgba(255,255,255,0.65)` | `1px solid rgba(255,255,255,0.4)` |
| `glass-thick` | sidebar, top header, modals, drawers, dialogs | `blur(32px) saturate(160%)` | `rgba(255,255,255,0.75)` | `1px solid rgba(255,255,255,0.5)` |

Rules, everywhere:

-   `backdrop-filter` and `-webkit-backdrop-filter` both set
-   Never below ~0.5 opacity
-   No gradient fill on glass itself — gradients are reserved for the
    single primary/active element visible on a given screen
-   One hairline border style system-wide, translucent, never colored
-   Radius always from the §16 scale

### Color: one near-monochrome system for the whole app

-   **Ink** (primary text, all pages): `#1C1C1E`
-   **Ink secondary** (muted text, all pages): `#6E6E73`
-   **Surface base**: `#F5F5F7`
-   **Hairline**: `rgba(0,0,0,0.08)`
-   **Single accent**: indigo `#4A55E8` — the *only* saturated color
    that appears in normal UI chrome, used for: current section in
    the nav, the one primary action on any given screen, links,
    focus rings, selected/checked states
-   **Status colors** (Students overdue, batch at-risk, mentor
    inactive, etc. — any real state anywhere in the app):
    success `#34C759`, warning `#FF9F0A`, danger `#FF3B30`

This palette does not change per section. Students, Batches, Mentors,
Reports, and Settings all use the same ink/glass/indigo system. A
"batch" is not visually violet and a "mentor" is not visually orange —
category should never be color-coded through the UI chrome. If a
section genuinely needs to distinguish categories (e.g. batch status
tags, readiness bands), use the three status colors only, applied as
small tags/dots — never as whole-card or whole-icon accents.

### Background

One shared ambient background used behind every page shell:

-   Base `#F5F5F7`
-   Single radial wash, indigo → cyan, `6–8%` opacity, `120px+` blur,
    top-right, `14–20s` drift cycle
-   Same wash instance persists as the user navigates between
    sections — it should not restart or change per page

------------------------------------------------------------------------

## 3. App Shell (persists across every section)

The shell is fixed; only the content region swaps per route.

``` text
┌──────────────────────────────────────────────────────────────┐
│                    Top Header (glass-thick)                   │
├───────────────┬──────────────────────────────────────────────┤
│               │                                              │
│   Sidebar     │              Content Region                  │
│  (glass-thick)│         (swaps per section/route)             │
│   Dashboard   │                                              │
│   Students    │   Page header (title + primary action)       │
│   Batches     │   Filters / search (if list-based section)   │
│   Mentors     │   Main content pattern (see §7)               │
│   Reports     │                                              │
│   Settings    │                                              │
│               │                                              │
└───────────────┴──────────────────────────────────────────────┘
```

Content region: max-width `1120px`, centered, side padding min `32px`
(`48px` at ≥1440px). `8px` base grid. Section gaps `32px`, card padding
`24px`, internal element gaps `12–16px`. These values are identical
whether the content is the Dashboard, a Students table, or a Settings
form.

### Mobile

Sidebar collapses into a floating bottom tab bar (`glass-thick`,
`16px` margin from edges). Single-column content, `16–20px` padding.

------------------------------------------------------------------------

## 4. Sidebar (global navigation)

Items: Dashboard, Students, Batches, Mentors, Reports, Settings —
same treatment for every item, no per-item color coding.

**Inactive:** transparent background, icon + text in `Ink secondary`.

**Active (current section):** indigo gradient fill `#4A55E8 → #6C63F2`,
white text/icon, soft glow `0 4px 16px rgba(74,85,232,0.25)`. This is
the *only* place gradient fill appears besides a page's primary button.

Hover (inactive): `translateY(-1px)`, background → `rgba(0,0,0,0.04)`,
icon scale `1.05`, `160–200ms`.

Sidebar header: **SSB Academy** + small refined glyph, no logo block.

------------------------------------------------------------------------

## 5. Top Header (global)

`glass-thick`, `64px`, present on every section.

-   Left: `glass-thin` search capsule. Placeholder text changes per
    section context (e.g. "Search students…" on the Students page,
    "Search mentors…" on Mentors) but the component is identical.
-   Right: notification button (`glass-thin`, circular), avatar,
    name + role label, chevron.
-   Notification dot: `6px` solid indigo, no glow, no pulse.

------------------------------------------------------------------------

# 6. Page Header Pattern (every section uses this)

Every section — Dashboard, Students, Batches, Mentors, Reports,
Settings — opens with the same header pattern so navigation feels
predictable:

-   **Title**: section name, large/bold (see §15), e.g. "Students,"
    "Batches," "Reports"
-   **Subtitle** (optional, one line): short context line, e.g. "How
    your academy is performing today" on Dashboard, "Manage enrolled
    students and their progress" on Students
-   **Primary action**, right-aligned, indigo gradient button — the
    *one* colored action for that screen (e.g. Dashboard → "Add
    student," Students → "Add student," Batches → "Create batch,"
    Mentors → "Invite mentor," Reports → "Export report," Settings →
    no primary action needed, omit it)
-   **Secondary actions**, if any, as `glass-regular` buttons beside it

No section gets a different header layout, size, or color treatment.

------------------------------------------------------------------------

# 7. Reusable Content Patterns

These are the building blocks every section is assembled from. A
section should combine these rather than invent bespoke layouts.

### 7.1 Stat / KPI cards

Used on Dashboard (Total Students, Active Batches, etc.), but also
reusable at the top of Students (e.g. "Total," "Active," "At risk"),
Batches (e.g. "Ongoing," "Upcoming," "Completed"), Mentors, and Reports
summary rows.

-   `glass-regular`, identical treatment regardless of section
-   Small line icon (`Ink secondary`), uppercase label, large bold
    value, optional status-colored delta, optional muted sparkline
-   No per-section accent colors on these cards, ever

### 7.2 List / table views

Used on Students, Batches, Mentors — anywhere there's a collection of
records.

-   Container: `glass-regular` panel wrapping the full table/list
-   Row hover: `glass-thin` tint, no border color change
-   Row selected: subtle indigo-tinted background at low opacity
    (`rgba(74,85,232,0.06)`), never a full indigo fill
-   Status/category shown via small text tags or dots using only the
    three status colors — not full-row coloring
-   Sticky header row, `Ink secondary`, uppercase, `11px`
-   Empty table → use the Empty State pattern (7.4)
-   Row actions (edit/delete/view) appear as icon buttons on hover,
    `Ink secondary`, no color unless destructive (danger red on
    delete icon only, on hover)

### 7.3 Detail / profile views

Used for a single Student, Batch, Mentor, or Report detail page.

-   Header block: avatar/initial glyph + name/title + status tag,
    inside a `glass-regular` panel
-   Below: 2–3 column responsive grid of `glass-regular` info cards
    (identical styling to stat cards, just holding text fields instead
    of numbers)
-   Activity/history shown as a simple vertical timeline, `Ink
    secondary` connector line, `Ink` text, no color except status
    dots on events

### 7.4 Empty states (one pattern, reused everywhere)

Every section's empty state — no students, no batches, no mentors, no
report data, no attention signals — follows the identical structure:

-   Small line icon, `Ink secondary`, centered or leading
-   One bold primary line (`Ink`)
-   One muted secondary line (`Ink secondary`) telling the user what
    action resolves it
-   Optional inline text link (indigo) to the relevant action, e.g.
    "Add your first student," "Invite a mentor"
-   Never a large illustration; never more than two lines of copy

### 7.5 Forms & modals

Used in Settings, and in "Add student / Create batch / Invite mentor"
flows launched from any section.

-   Modal container: `glass-thick`, `24px` radius, centered, max-width
    `480–560px`
-   Inputs: `glass-thin`, `12px` radius, `1px` hairline border,
    `2px` indigo focus ring on focus — same focus ring token as
    everywhere else
-   Primary submit button: indigo gradient, same token as page-header
    primary actions
-   Cancel/secondary: `glass-regular` text button, no fill

### 7.6 Filters & search

Appears on Students, Batches, Mentors, Reports list views.

-   Filter chips: `glass-thin`, pill radius, `Ink secondary` when
    inactive, indigo-outlined (not filled) when active — keeps the
    filled-indigo treatment reserved for primary actions only
-   Search bar: identical component to the header search, just scoped
    to the section's records

------------------------------------------------------------------------

# 8. Section Notes

Each section is the shared shell (§3–5) + page header (§6) + a
combination of the patterns in §7. Nothing below introduces new visual
rules — only which patterns apply.

-   **Dashboard**: Page header (no subtitle actions beyond primary) →
    Quick actions (three capsules, one primary + two `glass-regular`
    secondary, same button tokens as §6) → Stat cards (7.1, 4-up) →
    "Students needing attention" panel (7.4 empty state if none) →
    Analytics (two `glass-regular` cards, 7.4 empty states)
-   **Students**: Page header with "Add student" primary → optional
    stat cards (7.1) → filters (7.6) → table (7.2) → row click opens
    detail view (7.3)
-   **Batches**: Page header with "Create batch" primary → stat cards
    (7.1) → filters (7.6) → list/table or card-grid of batches (7.2) →
    detail view (7.3)
-   **Mentors**: Page header with "Invite mentor" primary → stat cards
    (7.1) → table (7.2) → detail view (7.3)
-   **Reports**: Page header with "Export" secondary action → stat
    summary cards (7.1) → chart panels (`glass-regular`, same empty
    state pattern when no data) → optional detail table (7.2)
-   **Settings**: Page header, no primary action → grouped
    `glass-regular` panels of form fields (7.5), no stat cards, no
    tables

------------------------------------------------------------------------

# 9. Animated Icons (global icon behavior)

Same icon motion rules regardless of where the icon appears (sidebar,
table row, card, empty state):

-   Dashboard grid glyph: cells scale `1 → 1.04` when active
-   Students/person glyph: lifts `1px` on hover
-   Batches/stack glyph: layers offset `1–2px` on hover
-   Mentors/user glyph: scales `1 → 1.05`
-   Reports/bars glyph: animates to height once on mount, not on every
    hover
-   Settings/gear glyph: rotates `8–10°` max
-   Notification bell: single `±4°` shake only on new item
-   Empty-state icons: optional float `±2px` over `4s`

Max amplitude anywhere in the app: `2px` translate / `5%` scale / `10°`
rotate.

------------------------------------------------------------------------

# 10. Typography (one scale, all sections)

Primary: **SF Pro Display / SF Pro Text**
(fallback: `-apple-system, "Inter", "Manrope", sans-serif`)

| Role | Size | Weight | Color |
|---|---|---|---|
| Page title | `28–32px` | 700 | Ink |
| Section/card title | `18–20px` | 600 | Ink |
| Card label (uppercase) | `11px` | 600, `+0.04em` | Ink secondary |
| Stat/KPI value | `28–32px` | 700 | Ink |
| Body / description | `14–15px` | 400–500 | Ink secondary |
| Table header | `11px` | 600, uppercase | Ink secondary |
| Micro text (timestamps, meta) | `12–13px` | 400 | Ink secondary @70% |

Only two font weights visible on any single screen at once.

------------------------------------------------------------------------

# 11. Border Radius (one scale, all sections)

-   Small controls / chips / tags: `12px`
-   Buttons: `14px`
-   Content / stat / table-row cards: `20px`
-   Main panels (sidebar, header, modals, section containers): `24px`
-   Full pills (nav items, search bars, filter chips): `999px`

No section uses a radius outside this list.

------------------------------------------------------------------------

# 12. Shadows (one scale, all sections)

``` text
--shadow-sm: 0 1px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.03)
--shadow-md: 0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)
--shadow-glow-accent: 0 4px 16px rgba(74,85,232,0.20)   /* primary buttons + active nav only, anywhere in the app */
```

Colored glow never appears on a neutral card, table row, or icon —
only on the single accent element active on that screen.

------------------------------------------------------------------------

# 13. Card & Row Hover Motion (one pattern, all sections)

``` text
Rest:    translateY(0)      shadow: sm
Hover:   translateY(-2px)   shadow: md   border opacity +10%
Active:  translateY(0)      scale(0.99)
```

`180–220ms`, `cubic-bezier(0.4, 0, 0.2, 1)`. Table rows use a lighter
version: background tint only, no vertical translate (translating rows
in a list feels noisy).

------------------------------------------------------------------------

# 14. Background Motion (shared, not per-page)

One ambient wash, shared across the whole app shell (§2), not
regenerated or recolored per section:

-   `6–8%` opacity, `120px+` blur, `14–20s` drift, indigo↔cyan hue
    range only
-   `prefers-reduced-motion: reduce` → freeze on one frame everywhere,
    disable icon/card motion app-wide, keep only opacity/color
    transitions

------------------------------------------------------------------------

# 15. Responsive Behavior (applies to every section)

### Large Desktop (≥1440px)

Sidebar visible (`260px`); stat cards 4-up where present; list/table
views full width within the `1120px` content max; two-column panels
where the section calls for them (Dashboard analytics, Reports charts).

### Laptop / Tablet (900–1439px)

Sidebar narrows to `220px` or icon-only rail; stat cards 2×2; two-column
panels stack to one column if width is tight; tables gain horizontal
scroll before columns are dropped.

### Mobile (<900px)

Sidebar → floating bottom tab bar; all stat cards 1 column; all
tables become stacked record cards (one `glass-regular` card per row,
label/value pairs inside) rather than horizontal-scrolling tables;
filters collapse into a single "Filters" sheet trigger; search goes
full width.

No horizontal page overflow at any breakpoint, in any section.

------------------------------------------------------------------------

# 16. Accessibility (applies everywhere)

-   Full keyboard navigation, logical tab order, on every screen
-   Visible focus ring: `2px solid #4A55E8`, `2px` offset — identical
    token in forms, tables, nav, filters
-   All icons have `aria-label`s, including table row action icons
-   Real `<button>`/`<a>`/`<table>` semantics, not `<div>` substitutes
-   Text contrast ≥ 4.5:1 against glass at its lightest resting
    opacity (0.5 alpha), tested per material tier, not just once
-   `prefers-reduced-motion` respected app-wide
-   Touch targets ≥ `44px`, including table row actions on mobile
    cards
-   Status is never color-only anywhere — pair color with an icon or
    text label (e.g. "At risk" text + dot, not a red row alone)

------------------------------------------------------------------------

# 17. Motion Principles (applies everywhere)

Use only: fade, small translate (`≤2px`), soft scale (`≤5%`), gentle
gradient drift, subtle shadow/border change on hover/focus.

Avoid everywhere: bouncing, decorative spinners, parallax, flashing,
particles, hue-cycling backgrounds, elastic/overshoot easing, and
route-transition animations that differ section to section — moving
from Dashboard to Students should feel like the same app, not a scene
change.

------------------------------------------------------------------------

# 18. Overall Design Rule

**One system, many sections.** Dashboard, Students, Batches, Mentors,
Reports, and Settings are all expressions of the same material, color,
type, radius, shadow, and motion tokens defined above — never
section-specific variants of them.

Remove, in every section:

-   Section-specific accent colors
-   Category-based icon/card coloring
-   One-off radii, shadows, or animation timings that don't match the
    shared scale
-   Decorative quotes, illustrations, redundant cards

Keep, in every section:

-   The three-tier glass material system
-   One accent color, used only for the single primary action or
    active/selected state on that screen
-   Shared radius, shadow, typography, and motion tokens
-   The same empty-state, stat-card, list, and form patterns reused
    rather than redesigned per section

The result should feel like a single Apple-designed app with several
sections — like System Settings or Health — not a collection of
differently themed dashboards stitched together.
