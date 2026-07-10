---
name: visual-verification
description: Real visual proof for UI work. Use this skill for EVERY task that changes anything a user can see — layout, CSS, colors, fonts, spacing, responsive behavior, RTL/LTR, themes, icons, or any visual bug fix. It defines what counts as "verified": real screenshots of the exact reported scenario on every affected platform/theme/language, not computed-style checks. Never declare a visual task done without following this skill.
---

# Visual Verification: Screenshots or It Didn't Happen

## Why this exists

Technical checks lie about visual reality. `getComputedStyle` can prove a property is applied while the element still looks broken on screen. A layout can measure correctly and still be unreadable. An emoji glyph can have the right CSS color and still render black, because the emoji font ignores CSS entirely. The only proof that a visual problem is solved is *looking at it* — in the exact scenario that was reported.

## Rules

1. **Reproduce the exact reported scenario, not a simplified one.** If the bug was reported with 300 nodes on a 390px phone in Persian dark mode, verify with 300 nodes on a 390px viewport in Persian dark mode. A simplified reproduction can pass while the real scenario still fails.

2. **The verification matrix — cover every axis the change touches:**
   - **Platform:** mobile AND desktop viewports. They can differ structurally (a grid collapsing to one column changes the meaning of fixed values), never assume parity.
   - **Theme:** dark AND light, if the project has both.
   - **Language/direction:** every supported language; for RTL+LTR projects, verify mirroring explicitly. Code/URLs/log content must stay LTR even inside RTL pages.
   - **Content volume:** empty state, typical state, and stress state (long lists, long strings) when relevant.

3. **Screenshots are the deliverable.** Attach real screenshots for each relevant cell of the matrix. Computed-style assertions and passing e2e geometry tests are *supporting evidence*, never a substitute — e2e tests check what they were written to check, and they were written before the visual bug was understood.

4. **Watch for known trap categories** (each of these passed technical checks while visually broken at least once):
   - Emoji-presentation glyphs ignoring CSS `color` (fix: U+FE0E text variation selector).
   - `space-between` distributing more than two visible children (middle items float to center; group logical pairs in a wrapper).
   - Sticky/fixed elements overlapping scrolled content, or floating buttons colliding with docks/nav bars.
   - Values tuned on one viewport silently breaking on another (pagination sizes, column counts, truncation widths).
   - Vertical letter-by-letter text wrapping on narrow screens.

5. **When adjusting a visual value (opacity, blur, spacing), never guess a single new number** after the previous one proved wrong. Sweep several candidate values, capture a screenshot of each, compare, then choose — and show the comparison.

## Definition of done

A visual task is done only when: root cause fixed → project-wide pattern check done → the full relevant matrix screenshot-verified → screenshots included in the report.
