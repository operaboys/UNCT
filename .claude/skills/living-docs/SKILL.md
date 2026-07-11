---
name: living-docs
description: Keep project documentation truthful in every commit. Use this skill whenever you commit ANY change to a project — bug fix, feature, refactor, redesign, or config change. It ensures README.md, ADRs, and code comments are updated in the SAME commit so documentation never claims something the code no longer does. Also use it when reviewing a codebase to detect stale comments and obsolete claims.
---

# Living Docs: Documentation Updated in the Same Commit

## Why this exists

Stale documentation is worse than no documentation: a README that lists a fixed bug under "Known Limitations", or a code comment that justifies a decision with a reason that was later overturned, will actively mislead the next developer (or the next AI session). Documentation debt compounds silently. The only reliable moment to update docs is the same commit that changes the behavior.

## Rules

1. **README.md updates ship with the change, not "later".** In every commit that alters behavior, features, structure, or status, check README.md for:
   - Items in "Known Limitations" / "Open Issues" that this commit resolves → move them out.
   - Status tables, feature lists, screenshots-descriptions, version claims → update.
   - Claims that are now obsolete or wrong → delete, don't soften.

2. **Comments carry expiry risk.** When your change overturns a rationale (e.g., "library X was never reviewed" after the library got approved in a later ADR), search for comments that still state the old rationale — in the changed file AND elsewhere — and fix them. A comment contradicting the code or another comment in the same file is a bug.

3. **Decisions get recorded where decisions live.** If a change embodies a decision (a default changed, an option dropped, a deviation from a spec), record it in the project's decision log (ADR or equivalent) — including deviations you made for good technical reasons. A justified deviation documented openly is healthy; a silent deviation is not.

4. **Changelog entries are dated and specific.** "Improved UI" is useless; "Mobile header: removed glass frame below 760px, toggles grouped end-side, 44px targets (commit abc123)" is useful.

## Self-check before every commit

- Does README still describe reality after this commit?
- Did I overturn any rationale that is still written down somewhere?
- Did I make any decision (or deviation) that belongs in the decision log?
- Would a fresh reader of the docs be misled about anything I just changed?

If any answer is "yes/unsure", fix the docs in this commit.
