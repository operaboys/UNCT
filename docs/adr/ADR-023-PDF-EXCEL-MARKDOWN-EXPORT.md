# ADR-023 — PDF, Excel, Markdown Export (P12-3)

**Status:** Accepted  
**Date:** 2026-06-30  
**Authors:** UNCT team

---

## Context

Doc 08 §12 (P12-3) calls for three additional export formats: PDF, Excel, and Markdown. Each
requires a library decision (or no library at all) governed by doc 14 §2.1's bundle-size budget
(**150 KB gzip total**).

### Measured baseline (gzip, production build)

| Artefact | Raw | Gzip |
|---|---|---|
| Current app.js | 228,336 B | **75 KB** |
| Remaining budget | | **75 KB** |

### Candidates evaluated

#### Markdown — no library needed
Template strings (identical pattern to `to-html.js`) produce correct CommonMark output with no
dependency cost. **Winner: 0 KB added.**

#### PDF — library comparison

| Library | Raw | Gzip | Decision |
|---|---|---|---|
| jsPDF v4.2.1 (es.min.js) | 343,605 B | **109 KB** | Rejected — exceeds remaining budget by itself |
| pdf-lib v1.17.1 (pdf-lib.min.js) | 525,099 B | **207 KB** | Rejected — far over budget |
| Custom PDF 1.4 generator | 0 B | **0 KB** | **Accepted** |

A custom PDF 1.4 generator (ASCII content streams, Helvetica built-in font, absolute text
positioning with `Td`/`T*`, xref table) handles every field `exportHtmlReport` covers with zero
dependency overhead. The format is single-pass: collect lines → paginate → emit objects → compute
offsets → write xref. **Winner: 0 KB added.**

#### Excel — library comparison

| Library | Raw | Gzip | Decision |
|---|---|---|---|
| xlsx (SheetJS CE) v0.18.5 (core.min) | 437,032 B | **141 KB** | Rejected — exceeds remaining budget |
| write-excel-file v4.1.1 | 70,844 B | **19 KB** | **Accepted** |

`write-excel-file` ships separate `browser` / `node` / `universal` ESM entries. The root import
resolves to the `browser` entry in bundled (esbuild, ADR-014) output and to `node` in Vitest —
both support `buffer: true` to return bytes instead of writing to disk. **Winner: 19 KB added.**

### Budget after decisions

| Item | Gzip |
|---|---|
| Current app.js | 75 KB |
| write-excel-file | +19 KB |
| PDF + Markdown (no library) | +0 KB |
| **New total** | **94 KB** |
| Budget | 150 KB |
| Headroom | 56 KB (37%) |

---

## Decision

| Format | Approach | Dependency |
|---|---|---|
| Markdown | Template strings | None |
| PDF | Custom minimal PDF 1.4 generator | None |
| Excel | `write-excel-file` with `buffer: true` | `write-excel-file` (runtime dep) |

All three exporters live in `core/exporter/` (ADR-004: exporters are core, not UI).
The Excel exporter is async (write-excel-file returns a Promise); the other two are sync.
All three return `{ content }` — `string` for Markdown, `Uint8Array` for PDF and Excel.

---

## Consequences

- `write-excel-file` added to `dependencies` in `package.json`.
- `core/exporter/to-markdown.js`, `to-pdf.js`, `to-excel.js` created.
- `core/exporter/index.js` gains three new re-exports.
- No Architecture Freeze regions (`core/types/`, `core/unm/`) are touched.
- No UI changes in this phase.

---

## Verification Checklist

- [ ] `npm test` passes for all three new test files
- [ ] `npm run typecheck` passes with no new errors
- [ ] Markdown output is valid CommonMark (headers, tables, lists)
- [ ] PDF magic bytes are `%PDF` (0x25 0x50 0x44 0x46)
- [ ] Excel magic bytes are `PK` (0x50 0x4B) — XLSX is a ZIP
- [ ] Bundle size stays under 150 KB gzip after adding write-excel-file
