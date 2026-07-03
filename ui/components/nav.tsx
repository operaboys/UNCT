/**
 * App Navigation (07-UI_UX_SYSTEM §2, Liquid Glass; final visual design
 * phase, step 3) — the shared tab bar across all eight Main Screens,
 * extracted out of `main.tsx` into its own component (same reasoning as
 * `ui/components/logo.tsx`: one shared piece of chrome belongs in one
 * place, not duplicated per screen).
 *
 * Mobile decision (documented, not just implemented — the task explicitly
 * asked for a justified choice): eight tabs, some labeled "Subscription
 * Center"/"Developer Console"/"Export Center", cannot all fit on a narrow
 * viewport. Two options were weighed:
 *   1. Icon-only compact mode below a breakpoint — rejected. It would need
 *      eight new, well-designed glyphs distinguishing genuinely similar
 *      concepts (Extractor vs. Export Center vs. Developer Console); a real
 *      visual-design task on its own, with real risk of ambiguity once the
 *      text label is gone.
 *   2. Horizontal scroll with a soft edge fade — chosen. Zero new assets,
 *      every label stays fully legible, and it is an already-familiar
 *      pattern (iOS tab bars, browser tab strips) nobody has to learn.
 * The edge fade (`.app-nav__scroll`'s `mask-image`) is a static CSS mask,
 * not scroll-position-aware — deliberately simple for this pass; making it
 * hide itself once there is nothing left to scroll toward is a reasonable
 * follow-up, not a blocker here. `linear-gradient(to right, ...)` is a
 * physical direction keyword, which RTL-GUIDELINES.md §4 would normally
 * flag, but this specific gradient is direction-symmetric (fades equally at
 * both ends) — the visual result is identical whichever way the bar reads,
 * so no logical-property equivalent is needed here (§4's own table does not
 * cover gradient directions in the first place).
 *
 * Active-tab styling is driven entirely by the pre-existing `disabled` prop
 * (`.nav-tab:disabled` in theme.css) — this redesign only changes the CSS,
 * not the click/keyboard-focus semantics `main.tsx` already had.
 */

export interface NavItem {
  key: string;
  label: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "converter", label: "Converter" },
  { key: "analyzer", label: "Analyzer" },
  { key: "subscription", label: "Subscription Center" },
  { key: "extractor", label: "Extractor" },
  { key: "export", label: "Export Center" },
  { key: "settings", label: "Settings" },
  { key: "devconsole", label: "Developer Console" },
];

export function AppNav({ current, onNavigate }: { current: string; onNavigate: (key: string) => void }) {
  return (
    <nav class="app-nav glass-panel" aria-label="Screen Switcher">
      <div class="app-nav__scroll">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            class="nav-tab"
            disabled={current === item.key}
            onClick={() => onNavigate(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
