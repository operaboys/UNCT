# ADR-010 — Worker Result Versioning Mechanism (jobId + generationId + track)

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-06-25 |
| **Deciders** | Mehdi (Architecture Review) |
| **Related** | `10-PERFORMANCE_ENGINE` §6 (Concurrency Control, the open Versioning flag) and §6.1 (Task Cancellation Policy); `09-DEVELOPMENT_ROADMAP` Phase 5; `ADR-003-WORKER-ARCHITECTURE.md`; `core/worker/worker-manager.js` |
| **Anti-Chaos Rule** | None triggered — this closes an explicitly-deferred open flag in doc 10 §6 ("این الان مانع کار نیست... باید قبل از پیاده‌سازی Worker Manager مشخص شود"); it specifies an implementation detail, not the Worker Pool formula/architecture itself. |
| **Tier** | Lightweight — additive decision, no change to doc 10's Pool formula, the non-chained-pools architecture, or the Message-Based-only communication rule. |

## Context

`10-PERFORMANCE_ENGINE` §6 requires Worker results to be **Versioned** and
**Ordered**, with **Atomic** state updates and "Newest Valid State Wins"
conflict resolution — but left the exact mechanism as an open flag, noting
only that it "must be decided before the Worker Manager is implemented, not
now" and suggesting (not mandating) `jobId` (unique per Task) +
`generationId` (a generation number, to tell Stale Jobs apart relative to
§6.1's Cancellation Policy) as a starting point.

§6.1 (Task Cancellation Policy) adds the concrete requirement this mechanism
must satisfy: Workers support cancellation, Stale Jobs are discarded, a
cancelled Job never updates State, and only the latest active Task may
publish a result — illustrated by `Import A → User Imports B → A Cancelled →
B Continues`.

Now that `core/worker/worker-manager.js` is actually being built (Phase 5),
this flag must be closed with a concrete, implemented mechanism.

## Decision

Use exactly the suggested pair, plus one addition needed to make "the latest
Task" well-defined: **`jobId` + `generationId` + `track`**.

- **`jobId`** — a fresh `crypto.randomUUID()` per `runJob()` call (same
  convention as `nodeId` in `core/unm/create-node.js`). Identifies one
  specific dispatch uniquely; used to match an incoming worker message back
  to its pending Promise.
- **`track`** — a caller-supplied string naming the *logical job family* a
  job belongs to (e.g. `"import"`). Doc 10's example talks about "Import A"
  vs. "Import B" superseding each other — that only makes sense relative to
  some shared identity ("these are both imports"), which `jobId` alone
  cannot express, since every job gets a different one. If a caller omits
  `track`, the job's own `jobId` is used as its track, so it is still
  independently cancellable but never auto-superseded by an unrelated job.
- **`generationId`** — a per-`track` monotonic counter. `worker-manager.js`
  keeps one `Map<track, currentGeneration>`. Every `runJob()` call on a track
  bumps that track's counter and stamps the new job with the resulting
  value. A job's result is **stale** iff its `generationId` no longer equals
  `generationByTrack.get(track)` — i.e. a newer job has since been started on
  the same track.

This single comparison (`generationByTrack.get(job.track) !== job.generationId`)
is the *only* staleness check in the system and covers both cancellation
paths:

1. **Auto-supersede** (the doc 10 example): starting a new job on a track
   already bumps that track's counter, so any older job on the same track —
   queued or already in flight — is immediately stale. Queued same-track
   jobs are proactively pulled out of the queue and their Promise rejects
   right away (no wasted worker slot); an in-flight one is left running (it
   cannot be interrupted mid-computation without `worker.terminate()`, which
   is out of scope here) but its result is silently discarded — never
   resolved, never published — when it eventually arrives.
2. **Manual `cancel()`**: calling the `cancel()` returned by `runJob()` (or
   aborting a passed-in `AbortSignal`) bumps that job's own track generation
   by one *without* starting a replacement job, which makes the same
   comparison invalidate it the same way, with no second mechanism needed.

A stale result's Promise **rejects** with `CancelledError` rather than
silently hanging — so "Stale Jobs never update State" is enforced
structurally by Promise semantics (nothing ever calls `.then()`'s success
path for a superseded job), not by convention callers have to remember.

## Consequences

- **Ordering and versioning collapse into one number per track.** "Newest
  Valid State Wins" is automatic: the only job whose `generationId` can ever
  match the live counter at message-arrival time is the most recent one
  started on that track.
- **No timestamp comparison, no separate ordering field.** Wall-clock
  timestamps were considered and rejected — they require clock assumptions
  across thread boundaries this project doesn't need, when a per-track
  integer counter gives a total order for free.
- **Cancellation policy (§6.1) and Versioning (§6) are the same mechanism**,
  not two. This was the deciding factor in choosing `track`-scoped
  generations over a single global counter: a global counter would make
  unrelated jobs (e.g. one Parser job and one unrelated Parser job for a
  different import) spuriously invalidate each other.
- **No change to `core/worker/worker-manager.js`'s public Pool
  formula/architecture** — `computePoolSize`, the independent-pools model,
  and Message-Based-only communication (doc 10 §2/§5) are unaffected; this
  ADR only fixes the shape of the message envelope
  (`{ jobId, generationId, track, payload }` in,
  `{ jobId, generationId, track, ok, result | error }` out).
- **Worker crash (`error` event) is explicitly out of scope for this ADR** —
  a crashed worker's slot is freed but no Worker-restart/retry policy exists
  yet (doc 15 lists "Worker Restart Cycles" only as a future memory-leak
  *test* concern, not a Phase 5 deliverable). A future ADR can extend this
  mechanism if a restart policy is built.
