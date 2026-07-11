# ADR-004 — Exporter Lives in `core/`, Not in UI

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-06-24 |
| **Deciders** | Mehdi (Architecture Review) |
| **Related** | `08-EXPORT_ENGINE`, `MASTER_FILE_STRUCTURE`, `01-MASTER_BLUEPRINT` §8 |
| **Anti-Chaos Rule** | Rule 11 (no Core logic in UI), Rule 13 |

## Context

Export (TXT/JSON/CSV/YAML/ZIP/HTML/QR) could be seen as a UI feature. But export is a
transformation **from UNM** to an output format — i.e. it is Core logic, not presentation. Placing
it under `ui/` would violate Anti-Chaos Rule 11 (no Core logic in UI) and couple a data
transformation to a specific UI framework.

## Decision

The Export Engine is a **Core capability**: it lives at `core/exporter/`. The `ui/export/` folder
only renders controls and previews and delegates the actual transformation to `core/exporter/`.

This decision is recorded now (even though implementation is Phase 9) specifically so the location
is not "discovered" and moved later.

## Consequences

- Export logic stays unit-testable without a UI.
- Export reads UNM only (Rule 03: a Converter/Exporter never reads raw files).
- HTML export must use DOMPurify (`14-DEPENDENCY_POLICY`, REQUIRED) for XSS safety.
