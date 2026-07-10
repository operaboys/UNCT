---
name: proportional-effort
description: Match testing depth and report length to the size of the change. Consult this skill at the START of every task to classify it as small or large, and again at the END to decide what to run and what to report. Use it whenever fixing small bugs, tweaking labels/styles, doing minor rework, OR making core/architectural changes — it tells you which testing tier and report format each one requires.
---

# Proportional Effort: Small Change, Small Ceremony

## Why this exists

Running a full test suite and writing a long report for a one-line label change wastes time and buries the signal; skipping real verification on a core behavioral change breaks trust. Both failures come from the same mistake: not classifying the change before deciding how to verify and report it.

## Step 1 — Classify the change

**Small** (targeted tier): label/copy edits, CSS/styling tweaks, single-component fixes, comment/doc corrections, i18n string changes, config value adjustments — anything local, low-risk, and behavior-preserving outside its immediate area.

**Large** (full tier): anything touching core logic/engines, changing a default behavior, altering data flow or storage, project-wide refactors, new features with new state, dependency changes — anything whose blast radius you cannot confidently bound.

**When unsure, ask one short question or default to large.** Misclassifying large-as-small is the expensive mistake.

## Step 2 — Test to the tier

**Small → targeted tests only:** run fast but precise checks of the affected area — the specific test file(s), a typecheck, a quick manual/visual check of the exact change. Do NOT run the entire unit + e2e + build pipeline for a label fix. State in the report which targeted tests ran.

**Large → full verification:** complete suite (typecheck, unit, e2e, build), plus new tests covering the new behavior in BOTH states (on/off, before/after), plus whatever the visual-verification skill requires if UI is involved.

## Step 3 — Report to the tier

**Small → short report:** changed file(s) + line(s), the targeted test result, done. A few lines total. No restating the task, no philosophy.

**Large → structured report:** files changed, decisions/deviations made (with reasons), full test results with counts, screenshots if visual, and documentation updates.

## One more proportionality rule

Prompts, plans, and commit messages follow the same law: a one-line fix needs a one-paragraph plan, not a design document. Effort spent on ceremony is effort not spent on correctness.
