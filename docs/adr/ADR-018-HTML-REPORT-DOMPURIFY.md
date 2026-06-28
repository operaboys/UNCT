# ADR-018 — HTML Report Export Dependency: `dompurify`

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-06-28 |
| **Deciders** | Mehdi (Architecture Review) |
| **Related** | `08-EXPORT_ENGINE` §8, §9, §10, §11; `14-DEPENDENCY_POLICY` §1, §2.1, §6.2; `ADR-017` |
| **Anti-Chaos Rule** | Rule 13 (Architecture Freeze / new Dependency requires ADR) |

## Context

`14-DEPENDENCY_POLICY` §1 already lists DOMPurify as 🔴 **REQUIRED** ("Used In: Export Engine,
HTML Preview, Report Rendering") — unlike `uqr` (ADR-017), this dependency needed no separate
user approval before installing, since it is already named in doc 14 rather than a bare category.
The Dependency Lock Rule (§6.2) still requires, before any dependency enters the project: a
Blueprint Reference, an Architecture Review, a Security Review, and a recorded Performance Impact
— this ADR records all four for the pinned version actually installed, the same way ADR-017 closed
the gap for `fflate`/`uqr`.

Doc 08 §8 fixes HTML Report's six sections — "Summary, Analysis, Security Report, Compatibility
Report, Warnings, Recommendations" — and doc 08 §11 makes its Security Layer **MANDATORY**: XSS
Protection Required, HTML Reports Must Be Sanitized, All Text Fields Must Be Escaped, User Content
Never Render Directly. Forbidden: Raw HTML Injection, Raw Script Injection, Raw User Markup.
Suggested tool: DOMPurify.

## Decision

Adopt **`dompurify@3.4.11`** (license `(MPL-2.0 OR Apache-2.0)`, `cure53/DOMPurify`) for HTML
Report Export (`core/exporter/to-html.js`, doc 08 §8).

## Two-layer defense (why DOMPurify alone, run per field, is not enough)

Before writing `to-html.js`, the naive approach — run every individual node field through
`DOMPurify.sanitize(value, { ALLOWED_TAGS: [] })` — was tested directly against representative
strings. Result: it correctly strips `<script>...</script>` and event-handler-bearing tags, and
correctly entity-escapes stray `<`/`>`/`&` in plain text, **but it silently deletes content that
merely looks like an unrecognized HTML tag** — e.g. `"see <readme>"` becomes `"see "`, the literal
substring `<readme>` vanishing entirely rather than having its brackets escaped. A node's `remark`
field is free-form user text; losing real characters from it on export would violate Rule 9 (never
fabricate/lose real data).

The adopted design is therefore two layers, each satisfying a different doc 08 §11 rule literally:

1. **"Escape Before Render"** — a hand-written, pure `escapeHtml(value)` (`core/exporter/to-html.js`)
   entity-escapes `& < > " '` on every individual value before it is concatenated into the HTML
   string. This preserves the user's literal text with zero data loss.
2. **"Sanitize Before Export"** — the fully-assembled HTML document is passed once through
   `DOMPurify.sanitize(page, { WHOLE_DOCUMENT: true, ADD_TAGS: ["meta", "style"], ADD_ATTR:
   ["charset"] })` as defense-in-depth against anything layer 1 could have missed (e.g. a future
   contributor concatenating a raw field by mistake). `ADD_TAGS`/`ADD_ATTR` were needed because
   DOMPurify's default sanitize drops `<meta charset>`/`<style>` even under `WHOLE_DOCUMENT: true`
   (confirmed by direct testing); the static `<!DOCTYPE html>` preamble (never user-controlled) is
   prepended manually after sanitization, since DOMPurify strips that too regardless of options.

"Never Trust User Input" is the principle both layers serve together — neither is sufficient
alone for this project's data (layer 1 alone would not defend against a future bug that forgets to
escape; layer 2 alone, run per-field, would lose real data; layer 2 run once over the whole
assembled document has neither problem).

A follow-on check (also direct testing): DOMPurify's whole-document sanitize parses the page into a
DOM tree and re-serializes it, so the *unnecessary* entities `escapeHtml()` adds for `"`/`'` (safe
in text-node context, only meaningful inside a matching-quoted attribute value) come back out as
literal characters — this is expected, harmless, and was confirmed not to reintroduce any markup:
only `&`/`<`/`>` survive as entities, which is exactly what is needed to keep them from being
reparsed as syntax.

## Review

| معیار | dompurify |
|---|---|
| Active Maintenance | ✅ نگهداری فعال، استفاده‌ی بسیار وسیع (`cure53/DOMPurify`)؛ از قبل در سند ۱۴ به‌عنوان REQUIRED ثبت شده بود |
| Small Footprint | 🔸 برخلاف `fflate`/`uqr`، تنها یک Export سطح‌بالا دارد (`sanitize`) — قابل Tree-Shake نیست؛ اندازه‌گیری مجزا (Bundle+Minify+Gzip فقط `dompurify`، جدا از پروژه): **۱۰۶۵۸ بایت** — جزئیات کامل در بخش Performance Impact پایین |
| Security Review | ✅ بدون اجرای کد دلخواه؛ ورودی = رشته‌ی HTML ساخته‌شده توسط خودِ `to-html.js` (نه فایل خارجی)؛ بدون Network access؛ تنها به DOM مرورگر (`window`/`document`) وابسته است، نه Preact — طبق توضیح بخش Rule 11 پایین |
| MIT Compatible License | ✅ `(MPL-2.0 OR Apache-2.0)` — دوگانه، با MIT همخوان (Permissive، بدون الزام Copyleft برای استفاده‌ی این‌شکلی) |
| عدم نقض Zero-Backend | ✅ کاملاً Client-side؛ بدون نیاز به Build Step اضافه (Vanilla ESM Import) |
| Performance Impact | اندازه‌گیری واقعی پس از ادغام در پروژه: جزئیات کامل پایین |

### Rule 11 boundary note (`core/` never depends on Preact/UI)

`core/exporter/to-html.js` imports `dompurify`, which depends only on the browser's native DOM API
(`window`/`document`), never on Preact or any UI framework. Since UNCT's `core/` already targets
the browser as its only real runtime (ADR-005/ADR-014: Zero-Build, client-side-only), this is
consistent with Rule 11's intent — the rule forbids `core/` depending on the *UI framework*, not on
browser-native APIs the whole application already requires. (In the Vitest test environment, this
is why `tests/exporter/to-html.test.js` carries the `// @vitest-environment jsdom` pragma — the
same one `tests/store/settings-state.test.js` and `tests/ui/store/use-store-selector.test.js`
already use — so `window`/`document` exist at import time the same way they would in a real
browser.)

## Performance Impact (real measurement, not estimate)

Per `14-DEPENDENCY_POLICY` §2.1, the real gzip size of `assets/js/app.js` was measured before and
after wiring `to-html.js` (with DOMPurify) into the real bundle via `scripts/build.js`:

| Checkpoint | gzip size | Δ vs previous baseline |
|---|---|---|
| Baseline after ADR-017 + Addendum 2 (fflate + uqr) | 55651 bytes (54.35 KiB) | — |
| After HTML Report Export (+ dompurify) | **67594 bytes (66.01 KiB)** | **+11943 bytes (+21.5%)** |

An isolated probe (bundling only `import DOMPurify from "dompurify"`, minified, gzip, outside the
project) measured **10658 bytes** — accounting for nearly all of the 11943-byte real delta (the
remaining ~1285 bytes is `to-html.js`'s own rendering logic plus the Export Center Screen's new UI
section). Unlike `fflate`/`uqr` (ADR-017), DOMPurify cannot be meaningfully reduced by importing a
narrower entry point — its package exposes one comprehensive `sanitize()` covering the full HTML,
SVG, and MathML namespaces plus Trusted Types support, with no smaller "core-only" build published.
This is the accepted cost of a security-mandatory dependency (doc 08 §11 states sanitization is
**MANDATORY**, not optional) rather than a tree-shaking gap to fix.

This pushes the §2.1 ceiling overage well past what `fflate`+`uqr` alone required, but the budget's
*other* ceiling — "کل Dependencyهای خارجی ≤ 150KB" — is still met with a large margin (67594 bytes
≈ 66 KiB, all three Export Engine dependencies combined, well under 150KB). `npm audit` after
installing `dompurify@3.4.11` shows the same 6 pre-existing vulnerabilities, all in the
vitest/vite/esbuild **dev**-dependency toolchain — `dompurify` itself introduces none.

**تصمیم (تأیید مهدی):** این Overage به همان روالی که ADR-017 برای `fflate`/`uqr` پذیرفت، پذیرفته
و ثبت می‌شود — دلیل این بار «Mandatory Security Dependency بدون امکان Tree-Shake بهتر»، نه
«تخمین اشتباه». عدد **۶۷۵۹۴ بایت** Baseline جدید `14-DEPENDENCY_POLICY` §2.1 است.

## Consequences

- `core/exporter/to-html.js` imports `dompurify` directly; it does not depend on `ui/` (ADR-004:
  Exporter stays in `core/`).
- The version is pinned (`dompurify@3.4.11`, `14-DEPENDENCY_POLICY` §6.1) — any future upgrade,
  even a patch version, needs a new Baseline Dataset pass and a fresh Architecture Review.
- `ui/export/export-screen.tsx` renders the produced (already-sanitized) markup inside a sandboxed
  `<iframe sandbox="allow-same-origin">` (no `allow-scripts`) for preview, rather than injecting it
  into the host page's own DOM — defense-in-depth in case a future regression in
  `core/exporter/to-html.js` ever stops sanitizing correctly, this still cannot execute in the
  Export Center Screen's own document context.
- `14-DEPENDENCY_POLICY` §1's DOMPurify row and §2.1's baseline are updated to reference this ADR
  and the pinned version/measured size.
