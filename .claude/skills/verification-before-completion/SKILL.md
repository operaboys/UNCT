---
name: verification-before-completion
description: The gate before any success claim. Use this skill EVERY time you are about to say done, fixed, passing, green, complete, or ready — before committing, opening a PR, marking a task finished, or handing off. It requires running the relevant verification command fresh in THIS turn and reading its real output before making any completion claim, and it defines what evidence each kind of claim needs.
---

# Verification Before Completion

Claiming work done without fresh verification is dishonesty, not efficiency. This skill is the gate you pass through right before any completion claim.

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you have not run the verification command in this turn, you cannot claim it passes. Not "should", not "probably", not "based on the diff".

**Scope of the command is set by proportional-effort, freshness is set here.** For a small change, the right command may be one targeted test file plus a typecheck — that is fine. But whatever the right-sized command is, it must be *actually executed, now, with its output read*. The Iron Law is about the reality of evidence, never an excuse to run the full suite for a label fix — and never an excuse to skip the targeted test either.

## The gate function

Before writing "done" / "fixed" / "green" / "ready to merge" — even in your own head:

1. **Identify** — what exact command proves this claim?
2. **Run** — execute it fresh, complete, in this turn.
3. **Read** — full output, check exit code, count failures.
4. **Verify** — does the output actually confirm the claim?
5. **Only then** — make the claim, with the evidence attached.

Skip any step = you are lying to the user, not verifying.

## Common false claims → what they actually need

| Claim | Requires | Not sufficient |
|---|---|---|
| Tests pass | Fresh test run, exit 0, 0 failures | "should pass", previous run, "logic looks right" |
| Linter clean | Linter output, 0 errors | Partial check, extrapolating from unrelated files |
| Build succeeds | Build command, exit 0 | Linter passing, editor squiggles gone |
| Bug fixed | Reproduce original symptom, watch it not happen | Code changed, "assumed" fixed |
| Visual bug fixed | Real screenshot of the exact reported scenario (see visual-verification skill) | Computed styles, geometry assertions |
| Regression test works | Red → green cycle verified (revert fix, watch test fail, restore, watch pass) | Test passes once |
| Spec satisfied | Line-by-line checklist against the plan | "Tests pass, phase complete" |

## Red flags — you are about to claim without verifying

- Words like "should", "probably", "seems to", "looks good"
- Satisfaction language ("Great!", "Perfect!", "Done!") before running the command
- About to commit / push / open PR without a verification block in this turn
- Reporting a number (test count, file count, key count) from memory instead of counting it
- "Just this once" thinking, or "I'm tired, close enough"
- Partial verification (linter passed, so build must)

## Rationalization prevention

| Excuse | Reality |
|---|---|
| "Should work now" | RUN it. |
| "I'm confident" | Confidence ≠ evidence. |
| "Linter passed" | Linter ≠ compiler ≠ tests. |
| "Partial check is enough" | Partial proves nothing about the whole. |
| "Different words, so rule doesn't apply" | Spirit over letter. |

## Patterns

**Tests**
- Run the test command. See the real pass count. Then say "all targeted tests pass" — with the count from the output, not from memory.
- Never: "should pass now".

**Regression tests (real red-green) — for genuine behavioral bugs**
- Write test → run (pass) → revert fix → run (MUST FAIL) → restore fix → run (pass).
- A regression test that has never been red proves nothing.
- Not required for trivial copy/style edits — proportional-effort decides when a regression test is warranted at all.

**Build**
- Run the build. See exit 0. Then say "build passes".
- Never: "linter passed, build should too".

**Reported numbers**
- Every number in the final report (tests passed, files changed, lines, keys) must come from real command output in this session, not recollection.

## When this fires

Always, before:
- Any variation of success / completion / fixed / passing / green
- Committing, opening a PR, marking a task done, handing off
- Moving to the next task
- Any positive statement about the work's state

## Pairs with

- `proportional-effort` — decides WHICH command is the right-sized verification for this change.
- `visual-verification` — defines the evidence standard when the change is visual.
- `clean-commits` — clean commits require verified content.

## The bottom line

Run the command. Read the output. THEN claim the result. Non-negotiable.
