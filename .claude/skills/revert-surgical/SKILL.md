---
name: revert-surgical
description: Undo a bad change without nuking unrelated work. Use this skill whenever a specific commit or change broke something — "revert this", a bad deploy, one commit broke prod, or any undo that must not lose other work. Consult it BEFORE reaching for git reset.
---

# Surgical Revert

Don't `git reset --hard` away three good commits to undo one bad one.

- **Single commit** — `git revert <sha>` creates an inverse commit; history stays intact and shared-branch-safe.
- **One file from a commit** — `git checkout <good-sha> -- path/to/file`.
- **Hunk-level** — `git checkout -p` to revert specific changes, keep the rest.
- **A merge** — `git revert -m 1 <merge-sha>` (pick the mainline parent).

On a shared branch, always revert (forward), never rewrite history — published hashes may already be referenced by reviews and verification reports, and rewriting them silently invalidates all of it (same rule as clean-commits).

Reproduce the breakage first so you revert the RIGHT thing (systematic-debugging), then verify the revert actually fixes it with a fresh run (verification-before-completion). A revert is a change like any other — it gets the same evidence standard.
