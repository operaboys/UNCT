# ADR-021 — Lightweight: Additive Changes to WorkerManager for Performance Monitoring

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Type** | Lightweight ADR (ULTIMATE_BLUEPRINT_INDEX §Architecture Freeze — Additive category) |
| **Scope** | `core/worker/worker-manager.js` |
| **Phase** | Phase 12 — P12-2 Performance Analyzer |

## Context

`core/worker/` is in Architecture Freeze Scope (ULTIMATE_BLUEPRINT_INDEX). Any change
requires at minimum a Lightweight ADR per the two-tier ADR policy. The Performance
Analyzer Spec (06-ANALYZER_ENGINE §2.7) requires pool-level operational metrics
(counters, timing) from `WorkerManager`.

## Decision

Add the following to `createWorkerManager` — all Additive (new state/getters/methods
only; zero change to the `postMessage` protocol, pool dispatch logic, or cancellation
behavior):

1. **Three `let` counters** inside the factory closure: `completedCount`,
   `cancelledCount`, `failedCount` — incremented in `settle()` based on job outcome.
2. **`enqueuedAt: number` and `startedAt: number | null`** fields on the internal `Job`
   struct — set in `makeJob()` and `dispatchNext()` respectively.
3. **`recentJobDurations: number[]`** ring-buffer (max 10 entries) — populated on each
   successful/failed job completion (when `startedAt` is non-null).
4. **`settle()` receives an `outcome` parameter** (`"ok" | "cancelled" | "failed"`) so it
   can dispatch to the right counter without the callers duplicating the logic. This is a
   change to an INTERNAL function signature only (not exported, not part of any message
   protocol).
5. **`get busyCount()`** on the returned object — `pool.filter(s => s.busy).length`.
6. **`getStats()`** on the returned object — returns a frozen `PoolStats` snapshot of all
   metrics at call time.

## What is explicitly NOT changed

- `postMessage` payload shape (`{jobId, generationId, track, payload}`)
- Worker response shape (`{jobId, generationId, track, ok, result|error}`)
- Pool sizing / dispatch / queueing / cancellation logic
- `CancelledError` class
- `computePoolSize`, `resolveHardwareConcurrency` pure functions
- The exported API surface of `createWorkerManager` (only new additions, no removals)

## Memory Usage exclusion

`performance.memory` (Chrome-only, process-level, deprecated) and
`performance.measureMemory()` (requires COOP/COEP, incompatible with ADR-014's
zero-build static-file app from `file://`) cannot provide reliable per-worker heap
metrics. Explicitly excluded per Rule 9 — no fabrication.

## Consequences

- Performance Analyzer (§2.7) can read real pool metrics from all three Worker clients.
- All existing tests for `createWorkerManager` continue to pass unchanged.
- New test cases cover `getStats()`, counter increments, and timing assertions.
