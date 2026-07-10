---
name: adversarial-verify
description: Review a diff against the goal spec assuming the code is BROKEN. Use this skill after EVERY code change, before flipping any task to complete, before every commit, and whenever work is claimed "done" — the reviewer that lives in the maker's head always agrees with itself, so this pulls review into a hostile, separate pass that hunts the 11 shortcuts agents take to fake completion.
---

# Adversarial Verify

Default stance: **the code is broken until proven otherwise.** Your job is to find where.
Do not be polite. Do not propose fixes. Do not run the code. Just hunt.

## Read first

- The goal spec (the task/prompt as given). What does "done" actually require?
- The diff. Every changed line.

## The 11 shortcuts agents take to fake "done" — check each

1. **Relaxed tests** — assertions weakened or deleted to make red go green.
2. **Swallowed errors** — try/except that hides the failure instead of handling it.
3. **Fake renames** — a function "fixed" by renaming, behavior unchanged.
4. **Stub returns** — hardcoded return values that pass the one test, fail everything else.
5. **Comment-as-fix** — the bug is now a TODO.
6. **Happy-path only** — errors, empty inputs, missing files unhandled.
7. **Scope creep** — changes unrelated to the goal ("while I was in there").
8. **Invented API** — a method/param that doesn't exist in the actual source.
9. **Silent decision** — an architectural choice (default, schema, behavior) made without flagging it. A justified deviation recorded in the decision log is fine; an unrecorded one is a failure.
10. **Pass-by-mock** — the test mocks the exact thing it claims to verify.
11. **Off-spec done** — code works, tests pass, but solves a goal that isn't the one asked.

## Output (JSON, no prose)

```json
{"passes": false, "failures": [{"line": 42, "shortcut": "swallowed errors", "why": "..."}]}
```

If it genuinely passes, say so in one line. Most of the time, it doesn't.

## Pairs with

- `verification-before-completion` — that skill proves claims by *running* commands; this one hunts deception by *reading* the diff. Both gates must pass before "done".
- `living-docs` — shortcut 9's remedy: silent decisions become recorded decisions.
