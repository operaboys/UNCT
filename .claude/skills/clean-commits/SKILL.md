---
name: clean-commits
description: Turn messy WIP into clean, atomic commits with messages that explain why. Use this skill EVERY time you commit, write a commit message, squash or reorder history, or prepare a branch for a PR — even for small fixes. Also use it when the user mentions messy history, "squash this", WIP commits, or asks for commit message help.
---

# Clean Commits

- **Atomic** — one logical change per commit. Refactor and behavior change go in separate commits.
- **Message** — subject says WHAT in imperative ("Fix null pointer in user lookup"), body says WHY. "Fix bug" is useless.
- **Specific** — "Fix login failing when email has uppercase chars" tells the next person exactly what happened.
- Reorder/squash WIP and "fix typo" commits into the real changes (`git rebase -i`).
- Never mix an unrelated fix into a feature commit.

## History rewriting — hard safety rule

`git rebase -i` (or any history rewrite: amend of pushed commits, force-push) is allowed ONLY on commits that have never been pushed, or immediately before opening a PR with the reviewer's knowledge. Never rewrite commits that others (humans or review tooling) may already reference by hash — published hashes are used for independent code verification, and rewriting them silently invalidates every prior report and review that cites them. When in doubt: squash-merge at PR time instead of rebasing published history.

A good history is a debugging tool: `git bisect` and `git blame` only work if commits are atomic and messages explain intent.
