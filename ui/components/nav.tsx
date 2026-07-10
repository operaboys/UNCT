/**
 * App Navigation — Liquid Glass v2 handoff chrome
 * (docs/design/design_handoff_unct_liquid_glass/README.md §Chrome):
 * a floating, self-centered glass pill holding the brand lockup, the 8
 * screen pills, and the language/theme quick toggles; below the 760px
 * breakpoint the pill strip hides and a fixed bottom glass dock (4 main
 * sections + "More") takes over, with "More" opening a glass bottom
 * sheet listing all 8 sections in a 2-column grid.
 *
 * The dock/sheet are conditionally RENDERED, not just CSS-hidden, gated by
 * the `useIsMobile()` hook below (a `matchMedia("(max-width: 760px)")`
 * listener) — see that hook's own comment for why (duplicate accessible
 * names in the DOM otherwise). `moreOpen` is purely-presentational local
 * state (like the design prototype's own), not app state.
 *
 * The language/theme toggles write through the SAME settingsStore actions
 * Settings Screen already uses (`setLanguageChoice`/`setThemeChoice`) —
 * no new logic, just a second entry point to existing behavior, exactly
 * what the handoff's top-nav specifies.
 *
 * Active-tab styling is driven entirely by the pre-existing `disabled`
 * prop (`.nav-tab:disabled` in theme.css) — click/keyboard-focus
 * semantics are unchanged from the previous nav.
 */
import { useEffect, useState } from "preact/hooks";
import { createTranslator } from "../../core/i18n/translator.js";
import { settingsStore, useSettingsState } from "../store/use-settings-state.js";

/** Matches the handoff's 760px breakpoint. The dock/sheet are conditionally
    RENDERED (not just CSS-hidden) so the desktop DOM carries exactly one
    button per screen name — several e2e tests (and screen readers) address
    nav buttons by accessible name and would otherwise hit duplicates. */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

/**
 * Sun/moon theme-toggle glyph, rendered as inline SVG rather than a Unicode
 * character. Two prior fixes at the Unicode-glyph layer (b743296's U+FE0E
 * variation selector; 00f7b51) still left the icon able to turn the wrong
 * color: `stroke="#E8C56A"` here is a literal SVG attribute, never the CSS
 * `color` property, so it can't be clobbered by an unrelated `:hover` rule
 * winning the cascade the way `.app-nav__toggle:hover { color: ... }` did
 * against `.app-nav__toggle--theme { color: #E8C56A; }` (see ADR/README for
 * the specificity writeup) — nor can it fall back to a platform emoji font
 * that ignores CSS color entirely, since there's no font/glyph involved at
 * all. Paths are the well-known MIT-licensed Feather Icons sun/moon glyphs.
 */
function ThemeIcon({ variant }: { variant: "sun" | "moon" }) {
  if (variant === "moon") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8C56A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8C56A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

export interface NavItem {
  key: string;
  labelKey: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { key: "dashboard", labelKey: "nav.dashboard" },
  { key: "converter", labelKey: "nav.converter" },
  { key: "analyzer", labelKey: "nav.analyzer" },
  { key: "subscription", labelKey: "nav.subscription" },
  { key: "extractor", labelKey: "nav.extractor" },
  { key: "export", labelKey: "nav.export" },
  { key: "settings", labelKey: "nav.settings" },
  { key: "devconsole", labelKey: "nav.devconsole" },
];

/** The 4 sections pinned to the mobile dock (handoff §Chrome, dock).
    Subscription Center / Export Center use shorter dock labels so the
    5-column grid's 11px labels stay single-line on narrow phones. */
const DOCK_ITEMS = [
  { key: "dashboard", labelKey: "nav.dashboard" },
  { key: "converter", labelKey: "nav.converter" },
  { key: "subscription", labelKey: "nav.subscriptionShort" },
  { key: "export", labelKey: "nav.exportShort" },
] as const;

export function AppNav({ current, onNavigate }: { current: string; onNavigate: (key: string) => void }) {
  const { resolvedTheme, resolvedLanguage } = useSettingsState();
  const t = createTranslator(settingsStore);
  const [moreOpen, setMoreOpen] = useState(false);
  const isMobile = useIsMobile();

  function go(key: string) {
    setMoreOpen(false);
    onNavigate(key);
  }

  return (
    <>
      <nav class="app-nav glass-panel" aria-label={t("nav.screenSwitcher")}>
        <div class="app-nav__brand">
          <img src="assets/icons/unct-lockup.png" alt="UNCT — Universal Network Config Toolkit" />
        </div>
        <div class="app-nav__divider" />
        <div class="app-nav__scroll">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              class="nav-tab"
              disabled={current === item.key}
              onClick={() => onNavigate(item.key)}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
        <div class="app-nav__divider" />
        <div class="app-nav__toggles">
          <button
            type="button"
            class="app-nav__toggle"
            aria-label={t("nav.toggleLanguage")}
            onClick={() => settingsStore.setLanguageChoice(resolvedLanguage === "fa" ? "en" : "fa")}
          >
            {resolvedLanguage === "fa" ? "EN" : "فا"}
          </button>
          <button
            type="button"
            class="app-nav__toggle app-nav__toggle--theme"
            aria-label={t("nav.toggleTheme")}
            onClick={() => settingsStore.setThemeChoice(resolvedTheme === "dark" ? "light" : "dark")}
          >
            <ThemeIcon variant={resolvedTheme === "dark" ? "moon" : "sun"} />
          </button>
        </div>
      </nav>

      {isMobile && moreOpen ? (
        <>
          <button type="button" class="more-sheet-backdrop" aria-label={t("nav.allSections")} onClick={() => setMoreOpen(false)} />
          <div class="more-sheet">
            <div class="more-sheet__handle" />
            <div class="more-sheet__header">
              <img src="assets/icons/unct-icon.png" alt="" />
              <span>{t("nav.allSections")}</span>
            </div>
            <div class="more-sheet__grid">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  class={`more-sheet__item${current === item.key ? " more-sheet__item--active" : ""}`}
                  onClick={() => go(item.key)}
                >
                  {t(item.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {isMobile ? (
      <div class="mobile-dock">
        {DOCK_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            class={`mobile-dock__item${current === item.key && !moreOpen ? " mobile-dock__item--active" : ""}`}
            onClick={() => go(item.key)}
          >
            {t(item.labelKey)}
          </button>
        ))}
        <button
          type="button"
          class={`mobile-dock__item${moreOpen ? " mobile-dock__item--active" : ""}`}
          onClick={() => setMoreOpen(!moreOpen)}
        >
          {t("nav.more")}
        </button>
      </div>
      ) : null}
    </>
  );
}
