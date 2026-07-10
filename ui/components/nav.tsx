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
            {resolvedTheme === "dark" ? "☾︎" : "☀︎"}
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
