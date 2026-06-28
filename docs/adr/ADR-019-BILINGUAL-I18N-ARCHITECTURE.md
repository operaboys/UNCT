# ADR-019 — Bilingual (Persian/English) i18n Architecture

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-06-28 |
| **Deciders** | Mehdi (Architecture Review) |
| **Related** | `07-UI_UX_SYSTEM` §9 (Language Support); `04-PARSER_ENGINE` Stage 01 (digit/letter normalization); `11-STATE_MANAGEMENT` (State Ownership Rule); `14-DEPENDENCY_POLICY` §1, §2.1 (Minimal Dependencies, Bundle Size Budget); `08-EXPORT_ENGINE` (export file formats); `core/store/settings-state.js`, `core/storage/local-adapter.js` (Theme persistence pattern reused); `docs/architecture/RTL-GUIDELINES.md` (day-to-day RTL code rules — deliberately not duplicated here) |
| **Anti-Chaos Rule** | Rule 13 (Architecture Freeze / a broad UI Layer change requires a Full ADR); Rule 11 (Core never depends on UI-facing concerns) |

## Context

UNCT must become bilingual (Persian/English, user's choice) from this point forward. This is a
broad UI Layer change — it affects every screen, the persistence layer, Core's error/warning
surface, and the export pipeline — so per Rule 13 it requires a Full ADR rather than being decided
informally inside a single blueprint edit.

Four architectural questions needed an answer before any blueprint or code could be written:

1. Is translation implemented with a library, or something self-built?
2. Where does language choice live — a new state domain, or an existing one?
3. Does translation ever touch numbers?
4. Does translation ever touch the content of files the user exports?

`07-UI_UX_SYSTEM` §9 and `04-PARSER_ENGINE` Stage 01 already encode the resulting *specification*
(what the system does). This ADR records *why* — the architectural reasoning — kept separate from
`docs/architecture/RTL-GUIDELINES.md`, which records the day-to-day CSS/HTML code rules (Logical
Properties, `<bdi>`, `unicode-bidi: plaintext`) that follow from this decision but are not
themselves architectural decisions, and which is re-read before every UI code change rather than
referenced once.

## Decision

1. **Self-built Dictionary, not an i18n library.** Translation is implemented as a small,
   hand-written `core/i18n/` module: one plain object per language (`{ key: string }`) plus a
   lookup function (`t(key)`). No library (`i18next`, `react-intl`, or similar) is adopted. Per
   `14-DEPENDENCY_POLICY` (Philosophy: *Minimal Dependencies · Maximum Control*), every new
   dependency needs architecture approval against the same criteria table used for Preact (§2 of
   that doc). UNCT's actual requirement — key→string lookup for two languages, no runtime locale
   negotiation, no complex pluralization rules — is fully met by a plain dictionary object, so the
   dependency-approval bar is never reached, and the Bundle Size Budget (§2.1) is unaffected: a
   dictionary object adds negligible weight versus a full i18n runtime.

2. **Language is a Settings State value, not a new state domain.** Language choice is persisted
   through the *existing* `core/store/settings-state.js` + `core/storage/local-adapter.js` pair —
   the same mechanism Theme already uses — rather than a new, parallel store/adapter.
   `11-STATE_MANAGEMENT`'s State Ownership Rule ("every State has exactly one Owner") already
   assigns user-preference ownership to Settings State via Theme; Language is the same *kind* of
   preference (a persisted, UI-wide user choice with an `"auto"` default), not a new data domain —
   so it extends the existing Owner instead of creating a second one. First-load detection follows
   Theme's existing `"auto"` pattern exactly: `navigator.language` resolves the default the same
   way `matchMedia(prefers-color-scheme)` resolves Theme's default, and a manual user choice always
   overrides and persists, mirroring `setThemeChoice`.

3. **Numbers are always ASCII — translation never touches digits.** Translation scope is UI text
   strings only; every rendered number (not just IP/Port/UUID, which `04-PARSER_ENGINE` Stage 01
   already normalizes at the input boundary — counters, timestamps, file sizes, any numeric ID)
   stays ASCII regardless of the active language. This is a single, simple, unambiguous boundary
   chosen specifically to avoid the alternative — deciding case-by-case which numbers "look"
   translatable — which would be both inconsistent and untestable. One boundary rule ("digits:
   never translated, full stop") is mechanically verifiable; a contextual rule would not be.

4. **Export file content is language-independent; only UI labels translate.** Switching the UI's
   active language never changes the structure or language of generated export files (CSV, JSON,
   HTML Report — `08-EXPORT_ENGINE`). Only the application's own UI labels are translated. Export
   files are data contracts that may be consumed by other tools or re-imported later; if their
   content language followed the UI's current language, the same export action could silently
   produce a different artifact depending on an unrelated UI setting — an invisible breaking change
   for any downstream consumer. Decoupling export content from UI language removes that
   nondeterminism entirely.

5. **Core never returns translated text — only Error Codes.** `core/` continues to surface only
   Error/Warning Codes (the existing Error Code Registry, `core/types/errors.js`/`errors.d.ts`);
   the Code→translated-message mapping happens exclusively in the UI/Dictionary layer. This is a
   direct extension of Rule 11 (`core/` never depends on UI-facing concerns) — language is a
   UI/presentation concern, so `core/` must stay unaware of which language is active, exactly as it
   already stays unaware of Theme.

6. **Infrastructure now; full content translation and RTL polish later — one scoping decision, not
   two.** This phase's definitive spec is the *infrastructure*: an empty/minimal Dictionary, a
   working language switch (persisted per Decision 2), and baseline RTL (page direction, font
   loading, the number boundary from Decision 3). Translating the full content of all 8 screens,
   and the complete visual RTL polish of every component, are deliberately deferred to the same
   final visual-design phase (Glassmorphism/Theme, `07-UI_UX_SYSTEM` §2) at the end of the Roadmap
   (`09-DEVELOPMENT_ROADMAP`). Both are large, content-heavy efforts that depend on each screen's
   final visual design being settled — building them twice (once now, against UI that will still
   change, and again after the visual redesign) would be wasted work; building the *infrastructure*
   now is not wasted, since every later screen needs it to already exist.

## Consequences

- `core/i18n/` becomes a new top-level Core module (not yet listed in `MASTER_FILE_STRUCTURE`; it
  is added there when the implementation phase begins) — pure data plus a lookup function, no UI
  framework dependency, consistent with Rule 11.
- `core/store/settings-state.js`'s `ThemeChoice`-shaped API gains a parallel `LanguageChoice`
  (`"fa" | "en" | "auto"`) rather than a new store; any future change to `settings-state.js` must
  keep both choices' persistence symmetric.
- The Vazirmatn font (or an equivalent free alternative) is self-hosted/embedded, never loaded from
  a CDN (`07-UI_UX_SYSTEM` §1, Offline First), and scoped with `unicode-range` in `@font-face` so
  it loads only when Persian characters are actually present — keeping `14-DEPENDENCY_POLICY`
  §2.1's Bundle Size Budget unaffected for English-only sessions.
- Two new automated tests become required before this phase can be considered complete: a
  Translation Completeness test (every English Dictionary key must have a Persian counterpart, or
  the test suite fails — no silent fallback) and an RTL visual-overflow Playwright test (no screen
  may have unwanted horizontal overflow under `dir="rtl"`).
- Day-to-day RTL code rules (CSS Logical Properties, `<bdi>`, `unicode-bidi: plaintext`) are
  intentionally NOT recorded here; they live in `docs/architecture/RTL-GUIDELINES.md`, a living
  document re-read before every UI code change, kept separate from this one-time architectural
  record.
- `04-PARSER_ENGINE` Stage 01 gains two normalization rules (Persian/Arabic-Indic digit → ASCII;
  Arabic → Persian letter-form normalization) as a direct consequence of Decision 3 and of
  supporting Persian input uniformly across all four input paths (Paste/Upload/Drag-Drop/
  Clipboard).
