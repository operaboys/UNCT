---
name: bug-fix-scope
description: Systematic project-wide bug fixing. Use this skill EVERY time you are asked to fix a bug, defect, visual glitch, wrong label, or incorrect behavior — even when the report mentions only a single instance, a single page, or a single file. A reported bug is one visible symptom of an underlying pattern; this skill ensures the whole pattern is fixed everywhere, not just the reported spot.
---

# Bug-Fix Scope: Fix the Pattern, Not the Instance

## Why this exists

When a user reports a bug, they report *where they saw it* — not everywhere it exists. If you fix only the reported instance, the same bug will resurface elsewhere and the user will have to report each occurrence one by one. That wastes their time and erodes trust. One report = one class of bug = one complete fix.

## Workflow

1. **Identify the root cause first**, not the symptom. Ask: what pattern, helper, style rule, copy-pasted snippet, or wrong assumption produced this bug? Fixing the root is mandatory; patching the symptom is not acceptable.

2. **Search the entire project for the same pattern** before writing the fix:
   - `grep` for the exact code pattern, class name, variable, string, or style rule involved.
   - Also grep for *conceptual siblings*: if a sun glyph renders wrong because of emoji presentation, search for ALL emoji-prone glyphs, not just the sun. If one table breaks with many columns, check every table.
   - List every occurrence found, including ones in tests, docs, and comments.

3. **Fix all occurrences in the same commit.** If some occurrence intentionally must stay different, say so explicitly in the report with the reason.

4. **Check for stale documentation**: comments, README sections, or docs that describe the old buggy behavior or a now-obsolete justification must be updated in the same commit. A stale comment that repeats a debunked rationale is itself a bug.

5. **Report the scope**: the final report must state what was grepped for, how many occurrences were found, and where each was fixed (or why it was intentionally left).

## Example

**Report:** "The sun icon on the mobile header is black instead of golden."

**Wrong response:** change the color of that one icon.

**Right response:** root cause is U+2600 rendering with emoji presentation (ignores CSS color) → grep the whole project for every emoji-prone Unicode glyph styled with CSS color (☀ ☾ ★ ⚠ …) → append U+FE0E to all of them → report: "grepped for emoji-prone glyphs; found 2 (nav sun + moon); both fixed; no other occurrences in dock/splash/settings."
