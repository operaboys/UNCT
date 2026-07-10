---
name: kill-dead-code
description: Find and remove unreachable or unused code safely. Use this skill during any cleanup, before a refactor, after a redesign or feature removal, or whenever asked to "remove unused" code, styles, keys, or assets — it prevents both kinds of failure, deleting live code and keeping dead weight.
---

# Kill Dead Code

1. **Prove it's dead** — no references. Grep the symbol across the repo, including:
   - dynamic/string usage and tests;
   - **string-keyed consumers**: i18n keys, CSS custom properties (`var(--x)`), storage keys, event names — these never appear as symbols, grep the literal string;
   - **public contracts**: an unused export is NOT dead if it's a public/plugin API. Reserved hooks (an optional interface method no built-in code calls yet) exist precisely for external consumers — check the project's plugin/API docs before touching.
2. Check it's not feature-flagged or setting-gated off (dead today, alive when the flag flips).
3. Delete it AND its now-orphaned tests, imports, config entries, i18n keys, and assets.
4. **Verify proportionally** (see proportional-effort): a small orphaned class/key → targeted tests of the touched area; a whole module or shared helper → full suite + build. Either way, dead-code removal must change behavior in exactly zero ways — and the verification must actually run (verification-before-completion).

Bias to delete: every line someone has to read is a cost. But never delete what you can't prove is unreachable — say "I think X is unused, confirm?" instead of guessing. The owner decides on public-facing removals.
