# ADR-001 — Adopt Preact as the (UI-only) Framework

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-06-24 |
| **Deciders** | Mehdi (Architecture Review) |
| **Related** | `09-DEVELOPMENT_ROADMAP`, `11-STATE_MANAGEMENT`, `13-RENDER_ENGINE`, `14-DEPENDENCY_POLICY` |
| **Anti-Chaos Rule** | Rule 13 (large architectural change requires an ADR) |

## Context

The original blueprints (`11-STATE_MANAGEMENT`, `13-RENDER_ENGINE`) described building a
hand-rolled Store, Pub/Sub engine, ES6-Proxy reactive engine, and a custom render/diff engine.
That is effectively re-implementing what a small framework already provides. `14-DEPENDENCY_POLICY`
originally forbade React/Vue/Angular outright.

## Decision

Adopt **Preact** (~3KB gzip, MIT) as the UI framework, with optional `htm` to avoid a JSX build
step. This is a **narrow, explicit exception** to the "no UI framework" rule — granted only to
Preact, not to the whole React-like family. Every other framework still has to pass the
Future Dependency Review (`14-DEPENDENCY_POLICY` §6).

The deprecated hand-built State/Render engines are dropped (`11` is now DEPRECATED → merged).

## Constraints (binding)

- **Preact Is UI Layer Only** (`09-DEVELOPMENT_ROADMAP` Phase 9). `core/` MUST NOT import Preact.
  Parser/Analyzer/Converter must not know Preact exists (Anti-Chaos Rule 11).
- UNM remains the single source of truth (Rule 10). Preact state is only a temporary projection
  for display; `core/store/` is the Adapter Layer between UNM and Preact hooks.
- Bundle Size Budget applies (`14-DEPENDENCY_POLICY` §2.1): UI Layer ≤ 50KB gzip.

## Consequences

- Less custom engine code to build and test.
- A hard architectural boundary must be enforced so plugins (Phase 11) never assume Core depends
  on a UI framework.
