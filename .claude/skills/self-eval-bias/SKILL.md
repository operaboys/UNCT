---
name: self-eval-bias
description: Detect and interrupt the pattern where an agent confidently praises work it just produced instead of reviewing it critically. Use this skill whenever you are about to grade, approve, or accept output that was produced in the SAME context — your own diff, plan, or report — and whenever a review verdict is high-confidence positive with no cited concrete evidence. Same-context grading is not review; it is rationalization.
---

# Self-Eval Bias

An agent that just produced a plan, a diff, or a report cannot fairly grade it in the same context. The reasoning that justified writing it is still loaded — every doubt was already resolved in favor of shipping. Asked to review, the same context reliably returns "looks good, ship it." This is not review. It is rationalization wearing a review's uniform. In long generator/evaluator loops the effect compounds: the evaluator's context fills with the generator's reasoning and skepticism erodes silently.

## When to apply

- You just wrote code, a plan, or a claim, and the next step is "confirm it's correct".
- A reviewer verdict comes back positive with no cited line numbers, no failing case explored, no counter-example attempted.
- You're about to mark a task `passes: true`, close an issue, or hand off to the next session.
- The evaluator in a multi-agent loop has agreed with the last N generator outputs in a row.

## Procedure

1. **Notice the same-context tell.** If the review verdict lands in under three sentences and contains "looks correct", "this should work", or "no issues found" without a cited artifact — treat the verdict as unwritten.
2. **Force a fresh persona.** Drop the generation context. Open a new subagent, or at minimum re-prompt with only the artifact (diff, plan, output) and the acceptance criteria — no reasoning trail, no self-justification.
3. **Demand concrete evidence, not verdicts.** The reviewer must cite: the file:line it inspected, the input it ran, the observed output, and the criterion it matched against. "LGTM" without these is a null review — discard it.
4. **Adversarially probe.** Ask the reviewer for the strongest case where the artifact fails (this is adversarial-verify's job — run its 11-shortcut hunt). If no failure case can even be described, the review didn't happen.
5. **Run the artifact.** For code, exercise it end-to-end with fresh commands (verification-before-completion). For a plan, walk the first two steps concretely. Same-context confidence collapses fast against a runtime.
6. **Rotate the reviewer periodically.** In long multi-agent loops, re-prompt the evaluator from scratch at regular intervals — leniency drift compounds silently.

## Anti-patterns

- **Self-review in the same turn.** "Let me double-check my work" followed by immediate approval. The doubt has to cost something to be real.
- **Praise as evidence.** "This is a clean, well-structured implementation" is a vibe, not a finding. Findings cite lines.
- **Positive verdict, empty failure scenario.** If the reviewer can't describe what a failure would look like, they didn't look for one.
- **Rubber-stamping across a run.** N consecutive "approved" verdicts without a single rejection is a red flag, not a track record.
- **Fixing the criterion instead of the artifact.** Reviewer notices a gap, then edits the spec to say the gap is out of scope. The gap is in the artifact. Fix that.
- **Reported numbers from memory.** Counts (tests, files, keys) recalled instead of re-measured are a classic same-context artifact — measure fresh.

## When NOT to apply

- The output is trivial and cheap to redo if wrong (a one-line rename, a config toggle) — proportional-effort governs.
- A separate reviewer with a fresh context already ran and cited concrete evidence — the check has been done, don't loop on it.

## Pairs with

- `adversarial-verify` — the structural form of "find the strongest failure case".
- `verification-before-completion` — the runtime form: fresh commands beat loaded confidence.
