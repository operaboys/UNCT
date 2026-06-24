# ADR-003 — Worker Architecture (Pure Core Logic, Worker as Thin Wrapper)

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-06-24 |
| **Deciders** | Mehdi (Architecture Review) |
| **Related** | `09-DEVELOPMENT_ROADMAP` Phase 3/5, `10-PERFORMANCE_ENGINE`, `12-PARSER_FACTORY`, `MASTER_FILE_STRUCTURE` |
| **Anti-Chaos Rule** | Rule 13 |

## Context

Heavy work (parsing/analyzing 10,000+ nodes) must run off the main thread so the UI never freezes
(`10-PERFORMANCE_ENGINE`, `15-TESTING_FRAMEWORK` UI-responsiveness target). But if business logic
is written *inside* a Web Worker, it becomes hard/impossible to unit-test without simulating a full
worker thread, and the logic tends to get duplicated.

## Decision

Separate concerns strictly:

| Layer | Responsibility |
|---|---|
| `core/parser/`, `core/analyzer/`, `core/converter/` | **Pure, synchronous logic.** Independent of any worker. Directly importable and unit-testable. |
| `core/worker/*.worker.js` | **Thin wrapper only.** Receives `postMessage`, calls the matching pure function, returns the result. **No business logic.** |

This matches `12-PARSER_FACTORY` (parsers are sync; `isAsync`/`parseAsync` reserved for future
plugin parsers) and `09-DEVELOPMENT_ROADMAP` (Phase 3 writes/tests parsers sync; Phase 5 only
wraps them).

## Phase 1 implication

`core/validator/` and all Phase-1 logic are pure and sync. The test harness ships a simple
**Worker Mock** (`tests/setup/worker-mock.js`) that invokes the pure function directly in-thread —
no real thread simulation needed (`15-TESTING_FRAMEWORK` Testing Infrastructure).

## Consequences

- Core logic is testable in Node/Vitest without a DOM or worker.
- Comlink remains NOT approved (raw `postMessage` is enough); revisit before Phase 5
  (`14-DEPENDENCY_POLICY`).
