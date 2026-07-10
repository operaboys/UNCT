---
name: simplify
description: Reduce a change to the minimum that solves the problem. Use this skill when reviewing or writing ANY diff that feels bigger than the ask — over-abstraction, a 200-line diff for a small request, premature generality, speculative flexibility — and as a final pass before committing any non-trivial change.
---

# Simplify

Over-engineering is the default failure mode. Cut it:

- **Premature abstraction** — a class/strategy/factory for one caller. Inline it. Abstract on the THIRD use, not the first.
- **Speculative config** — a parameter/flag/env var for something that never changes. Hardcode it until there's a real reason.
- **Dead flexibility** — an interface with one implementation, a generic with one type. Delete the indirection.
- **Defensive noise** — null checks on values that can't be null, try/except for errors that can't happen. Handle only real failure modes.

## The exception: documented contracts are not dead flexibility

Before cutting an "unused" abstraction, check the project's decision log. A reserved hook, an optional interface method with no caller yet, or a deliberately generic seam may be a **recorded architectural contract** (e.g. a plugin API reserved by an ADR). Dead flexibility has no reason; documented flexibility has a written one. If the record exists, leave it; if you think the record itself is obsolete, raise it to the owner — don't silently delete (decision-record).

## The line test

Can you justify every changed line by a direct connection to what was asked? If a line is there "while I was in there", revert it (that's scope creep — adversarial-verify shortcut 7, caught at the source).

Pairs with `kill-dead-code`: simplify prevents complexity from entering; kill-dead-code removes what already got in.
