# ADR-029 — Virtual List Dependency: `@tanstack/virtual-core`

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-05 |
| **Deciders** | Mehdi (Architecture Review) |
| **Related** | `13-PERFORMANCE_OPTIMIZATION`; `14-DEPENDENCY_POLICY` §1, §2, §2.1, §6.2; `ADR-017`; `ADR-018` |
| **Anti-Chaos Rule** | Rule 13 (Architecture Freeze / new Dependency requires ADR) |

## Context

A real trigger, not a speculative one: a user imported a ~5000-6000-node V2Ray/Trojan config
file through the Converter, opened Subscription Center, and the tab fully crashed ("Aw, Snap!").
`ui/subscription/subscription-screen.tsx`'s `NodeTable` rendered every node with plain Preact
`.map()` — doc 14 §1's Virtual List row had been left `⏳` since Phase 9, deliberately deferred
until there was real large-scale data to measure a library choice against (see the file's own
prior header comment). That trigger has now occurred.

## Candidates considered

| Package | Last publish (npm registry, checked 2026-07-05) | Preact compatibility | Verdict |
|---|---|---|---|
| `@tanstack/virtual-core` | `3.17.3`, 2026-06-30 (5 days before this checkpoint) | **Direct — zero framework dependency** (`peerDependencies` lists react/vue/solid/svelte only for its own *optional adapter subpaths*; the plain `Virtualizer` class this ADR adopts depends on nothing) | ✅ **Chosen** |
| `virtua` | `0.49.2`, 2026-06-29 | Its main (`"."`) export peer-depends on `react`/`react-dom` directly — would need `preact/compat` aliasing (not currently a project dependency) to use its public API at all | 🔸 Rejected — needlessly adds a `preact/compat` shim doc 14 §6 would separately require reviewing, when a zero-dependency alternative exists |
| `preact-virtual-list` | `0.3.1`, 2022-06-24 | Direct (built for Preact) | 🔴 Rejected outright — four years stale, fails doc 14 §1's explicit "must be Actively Maintained" criterion on its face |

`@tanstack/virtual-core` wins on the same axis doc 14 §1 flagged as the risk ("بعضی
کتابخانه‌های Virtual Scroll سال‌هاست آپدیت نشده‌اند"): it is the only candidate both
actively maintained **and** requiring no `preact/compat` wrapper — its headless design
(the same package React/Vue/Solid/Svelte's own official `@tanstack/*-virtual` adapters wrap)
means "Preact vs. React" was never a real fork in the road for this package.

## Decision

Adopt **`@tanstack/virtual-core@3.17.3`** (MIT, `TanStack/virtual`), consumed through a new
~35-line Preact hook, `ui/components/use-virtualizer.ts`, that ports
`@tanstack/react-virtual`'s own `useVirtualizerBase`/`_didMount`/`_willUpdate` wiring onto
`preact/hooks` (`useState`/`useLayoutEffect` — the same hook names, same semantics, no
`preact/compat`). `ui/subscription/subscription-screen.tsx`'s `NodeTable` uses it to render only
the `<tr>`s inside the scroll viewport (+ overscan buffer), bracketed by two spacer `<tr>`s
carrying the scrolled-past height above/below — the standard technique for virtualizing a real
`<table>` without losing native column alignment (no CSS Grid rewrite).

## Review (mirrors doc 14 §2's Preact-exception criteria table)

| معیار | `@tanstack/virtual-core` |
|---|---|
| Active Maintenance | ✅ `3.17.3` published 2026-06-30, five days before this checkpoint |
| Small Footprint | ✅ Zero dependencies; isolated probe (bundling only the `Virtualizer` class + the three DOM-element observer/scroll helpers this project actually imports, minified, gzip, outside the project): **6720 bytes** |
| Offline Compatibility | ✅ Pure client-side JS; no network access, no Build Step beyond the existing esbuild pass |
| MIT Compatible License | ✅ MIT |
| عدم نقض Zero-Backend | ✅ Fully client-side |
| Rule 11 boundary (`core/` never imports Preact/UI) | ✅ Lives entirely in `ui/components/use-virtualizer.ts` + `ui/subscription/subscription-screen.tsx`; `core/` is untouched |

## Performance Impact (real measurement, not estimate)

Per `14-DEPENDENCY_POLICY` §2.1's required methodology, `assets/js/app.js`'s real gzip size was
measured before and after wiring the Virtual List into the real bundle via `scripts/build.js`:

| Checkpoint | gzip size | Δ |
|---|---|---|
| Immediately before this checkpoint (fresh rebuild, no `@tanstack/virtual-core`) | 97710 bytes (95.42 KiB) | — |
| After Virtual List (`@tanstack/virtual-core` + `use-virtualizer.ts` + `NodeTable` rewrite) | **105050 bytes (102.59 KiB)** | **+7340 bytes** |

An isolated probe (bundling only `Virtualizer`/`elementScroll`/`observeElementOffset`/
`observeElementRect` from `@tanstack/virtual-core`, minified, gzip, outside the project)
measured **6720 bytes** — accounting for the large majority of the real 7340-byte delta (the
remaining ~620 bytes is `use-virtualizer.ts`'s own wrapper code plus `NodeTable`'s spacer-row
logic), the same integration-overhead pattern `ADR-018` found for `dompurify`.

### ⚠️ A pre-existing baseline discrepancy found during this measurement (not caused by this checkpoint)

`14-DEPENDENCY_POLICY` §2.1's registered baseline was still **67594 bytes**, dated to
`ADR-018` (end of the Export Engine phase). Rebuilding `assets/js/app.js` fresh, **before**
touching anything for this checkpoint, measured **97710 bytes** — a **+30116-byte drift**
accumulated across every feature checkpoint shipped between `ADR-018` and this one (Templates,
Subscription Builder, Recent Exports, Alternative Candidates, Deduplicate/Split/Tag/Merge, i18n
dictionary growth, etc.), none of which re-measured or re-declared §2.1's baseline number as they
landed. This was discovered, not caused, by this checkpoint's required before/after measurement —
recorded here in full rather than silently absorbed into the new number, per the same
"measure and report plainly, do not decide unilaterally" instruction `ADR-018`'s Overage
decision was made under.

**تصمیم (تأیید مهدی):** هر دو رقم — Overage از قبل موجود (۶۷۵۹۴ → ۹۷۷۱۰ بایت، از Checkpointهای
قبلی) و Overage جدید این Checkpoint (۹۷۷۱۰ → ۱۰۵۰۵۰ بایت، از `@tanstack/virtual-core`) — با هم
پذیرفته می‌شوند؛ دلیل این مرحله «رفع یک باگ بحرانی داده‌ی واقعی (کرش تب)، نه انتخاب دلبخواهی»،
و رقم **۱۰۵۰۵۰ بایت** Baseline جدید `14-DEPENDENCY_POLICY` §2.1 است. سقف دوم — «کل
Dependencyهای خارجی ≤ 150KB» — همچنان با فاصله‌ی زیاد رعایت می‌شود (105050 بایت ≈ 102.6 KiB،
کاملاً زیر 150KB). بازبینی جداگانه‌ی علت Drift ۳۰۱۱۶ بایتی قبلی (کدام Checkpointها دقیقاً چقدر
سهیم بودند) در Scope این ADR نیست — فقط شفاف ثبت شد.

`npm audit` after installing `@tanstack/virtual-core@3.17.3` shows the same 6 pre-existing
vulnerabilities, all in the vitest/vite/esbuild **dev**-dependency toolchain —
`@tanstack/virtual-core` itself introduces none.

## Consequences

- `ui/components/use-virtualizer.ts` imports `@tanstack/virtual-core` directly; `core/` is
  untouched (Rule 11).
- The version is pinned (`@tanstack/virtual-core@3.17.3`, `14-DEPENDENCY_POLICY` §6.1) — any
  future upgrade, even a patch version, needs a new Baseline Dataset pass and a fresh
  Architecture Review.
- `NodeTable`'s real `<table>`/`<tr>`/`<td>` structure is preserved — only the mounted `<tr>`
  count changes, via two spacer `<tr>`s bracketing the visible window. All prior per-row
  features (checkbox selection, Sort/Filter/Group, Test/Check/Lookup, Save as Template, Tag
  add/remove) are unchanged.
- `assets/css/theme.css` gained one new class, `.table-scroll--virtual` (`max-height` +
  `overflow-y: auto`), giving the scroll container a bounded height for the virtualizer to
  measure/scroll against.
- `14-DEPENDENCY_POLICY` §1's Virtual List row and §2.1's baseline are updated to reference this
  ADR and the pinned version/measured size.
