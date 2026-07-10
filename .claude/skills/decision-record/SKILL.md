---
name: decision-record
description: Capture an architectural decision so the next session (or engineer) knows WHY. Use this skill after ANY non-obvious technical choice — picking a library, pattern, or format; changing a default behavior; making a tradeoff; deviating from a spec for technical reasons; or any hard-to-reverse choice. Silent decisions are bugs; recorded ones are engineering.
---

# Decision Record (ADR)

## Step 0 — Follow the project's existing convention first

Before writing anything, check whether the project already has a decision-record system
(look for `docs/adr/`, `docs/decisions/`, an ADR index, or numbering like `ADR-NNN-*.md`).
If it exists, **use its exact path, numbering, naming, and tier system** — do not invent a
parallel one. Some projects deliberately use a two-tier system (Lightweight vs Full) to
avoid bureaucracy: small reversible decisions get a short record, big or hard-to-reverse
ones get the full treatment. Respect that split; do not write a Full ADR for a minor call.

## Default structure (only when the project has no convention)

Write a short file `docs/adr/NNN-<slug>.md`:

- **Context** — what forced a decision. The constraints.
- **Options** — the 2-3 real candidates, one line each.
- **Decision** — what you picked, dated.
- **Why** — the tradeoff. What you gave up. "We picked X over Y because we need Z; we accept W."
- **Consequences** — what this now makes easy and hard.

## What MUST get a record

- Hard-to-reverse choices (data format, storage, core API shape, dependency adoption).
- Any change to a default behavior users already rely on.
- Any deviation from an approved spec — even a well-justified one. A justified deviation
  recorded openly is healthy engineering; a silent one is a failure (see adversarial-verify,
  shortcut 9).
- Dropping a planned feature/option and why.

## The deviation procedure

If implementation reveals the approved spec is contradictory or technically impossible as
written, do NOT silently implement something else. In the ADR record: what the spec said,
why it cannot work literally, what you implemented instead, and how that preserves the
spec's *intent*. Then explicitly flag it in your report for the owner's approval — the
owner decides, even when your technical argument is strong.

Future-you will ask "why on earth did we do this" — answer it now, in the same commit as
the decision itself (see living-docs).
