---
name: flaky-hunter
description: Diagnose and fix tests that pass sometimes and fail other times. Use this skill whenever CI is red intermittently, a test "passes locally but fails in CI", an e2e test fails on retry, or any test result is not reproducible — BEFORE adding retries or quarantining anything.
---

# Flaky Test Hunter

Run the suspect test 20x in a loop first — confirm it's actually flaky, not just broken.

Common causes, in order of likelihood:

1. **Time/order** — depends on test execution order or shared mutable state. Isolate it; run alone.
2. **Async race** — asserting before a promise/refetch/render resolves. Await the actual condition, not a sleep. (E2e tests are the most exposed: animations, worker messages, and viewport-dependent rendering all race the assertion.)
3. **Real network/clock/random** — mock them. Freeze time, seed RNG, stub the call.
4. **Resource leak** — a prior test left a connection/file/port open.

Fix the cause, not the symptom. `retry(3)` on a flaky test hides a real race that will bite in production. Quarantine only as a last resort, with a ticket.

Pairs with `systematic-debugging` — flaky hunting is its loop applied to nondeterminism: one hypothesis, one change, re-run the 20x loop, repeat.
