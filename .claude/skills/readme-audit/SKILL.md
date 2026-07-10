---
name: readme-audit
description: Check whether a README actually lets a stranger run the project. Use this skill before publishing a repo, before a PR/merge to main, when writing onboarding docs, when asked "is the README good", or periodically on long-running projects whose README has grown for months.
---

# README Audit

A README's only job: a stranger clones it and gets to "it works" without asking you.

Check, in order:

1. **One sentence** on what it is and who it's for — above the fold.
2. **Install** — copy-paste commands that actually work on a clean machine. Test them mentally step by step.
3. **Run / quickstart** — the smallest end-to-end example.
4. **Prerequisites & config** — whatever the project actually needs: env vars and secrets for server projects; browser/host requirements, headers (e.g. COOP/COEP), and supported platforms for client-side ones.
5. **No rot** — does it reference files/commands/flags/limitations that still exist? A stale README is worse than none (enforcing this per-commit is living-docs' job; this audit is the periodic sweep that catches what slipped through).
6. **Two audiences** — humans skim it, AI agents treat it as ground truth. Status tables, "known limitations", and feature claims must be *precise*, because an agent will act on them literally.

Cut: long philosophy, badges nobody reads, TODO sections. Output: the specific gaps + the fix.
