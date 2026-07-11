---
name: a11y-pass
description: Catch the accessibility failures that ship in almost every AI-built UI. Use this skill after building or modifying ANY interactive component — forms, buttons, toggles, modals, sheets, tables, keyboard interaction, images, or color choices — before declaring the UI work done.
---

# Accessibility Pass

- **Keyboard** — every interactive element reachable and operable by Tab/Enter/Esc. Modals and sheets trap focus and restore it on close.
- **Labels** — every input has a real `<label>`; icon-only buttons have `aria-label`.
- **Images** — meaningful `alt`; decorative images `alt=""`.
- **Contrast** — text ≥ 4.5:1 (3:1 for large). Don't encode meaning in color alone.
- **Semantics** — real `<button>`/`<a>`, not a clickable `<div>`. Headings in order.
- **Focus** — visible focus ring. Never `outline: none` without a replacement.
- **Bidirectional (RTL/LTR projects)** — verify keyboard navigation and focus order in BOTH directions; logical properties keep focus flow sane, hardcoded left/right break it. Respect `prefers-reduced-motion` for any animated focus/scroll behavior.

Output: each failure with the element + the fix. Test it with Tab only, no mouse.
