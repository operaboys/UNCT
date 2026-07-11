/**
 * Settings Screen (07-UI_UX_SYSTEM §2 "Theme Engine", §9 "Language Support";
 * ADR-030 "Settings Behavioral Toggles" for the three toggle rows + Data row
 * below). Originally scoped to JUST theme switching (see git history) because
 * real Persian content didn't exist yet — adding a language switcher would
 * have had nothing real to switch to. That condition no longer holds: `fa.js`
 * now carries real translations and every screen resolves its text through
 * `t()`, so this screen adds the Language Engine panel — the same
 * `setLanguageChoice`/`languageChoice`/`resolvedLanguage` trio
 * `core/store/settings-state.js` has exposed since ADR-019 (Decision 2) sat
 * unused here.
 *
 * Reads/writes through `useSettingsState()`/`settingsStore` the same
 * read-via-hook / write-via-store-action split every other screen already
 * uses for its own domain store (e.g. `converter-screen.tsx` + `parserStore`).
 * The actual `data-theme`/`lang`/`dir` DOM application happens once, app-wide,
 * in `main.tsx` — not here — so both stay applied/live-synced regardless of
 * which screen is currently mounted.
 *
 * ADR-030's three behavioral toggles (Strict Validation, Auto-repair,
 * Deduplicate on import) are plain persisted booleans — this screen only
 * flips them via `settingsStore.setStrictValidation`/etc; every actual
 * behavior change they cause lives in `core/validator/derive-status.js` and
 * `converter-screen.tsx`'s `runParse`, never here (Rule 11). Wipe Data calls
 * `core/storage/wipe.js#wipeAllAppData()` behind a native two-step
 * `confirm()` gate (no new dependency, matches ADR-030's own reasoning), then
 * reloads the page so every in-memory store (parser/analyzer/settings/tags)
 * re-hydrates from the now-empty storage instead of a stale in-memory copy.
 * Telemetry was deliberately dropped from this screen (ADR-030): a toggle
 * for a control with no real backing logic would be dead UI; the "nothing is
 * ever sent" message already lives in `main.tsx`'s persistent Offline footer
 * badge.
 *
 * Visual design (final visual design phase, Settings step): restyled onto
 * the same Liquid Glass system as the other redesigned screens, reusing
 * `.glass-panel`/`.panel-title`/`.hint` as-is. `.radio-group`/`.radio-card`
 * (assets/css/theme.css) turns the plain `<fieldset>` radio list into
 * clickable pill cards using `:has(input:checked)` for the active-state
 * highlight — a CSS-only reaction to the native input's own state. The
 * Language Engine panel below reuses this exact same pattern/classes,
 * mirroring Theme Engine one-for-one rather than inventing a second shape.
 * The three toggle rows + Data row (ADR-030) reuse the handoff's icon-tile
 * row layout (`.settings-row`/`.settings-row-icon`/`.toggle-switch`, added to
 * theme.css alongside this change) inside their own glass panel, one row per
 * control, matching the handoff prototype's Settings screen 1:1 (minus the
 * Telemetry row).
 */
import { useState } from "preact/hooks";
import { createTranslator } from "../../core/i18n/translator.js";
import { settingsStore, useSettingsState } from "../store/use-settings-state.js";
import { wipeAllAppData } from "../../core/storage/wipe.js";
import { UserGuideModal } from "./user-guide-modal.js";

type ThemeChoice = "dark" | "light" | "auto";
type LanguageChoice = "en" | "fa" | "auto";

const CHOICE_KEYS: { value: ThemeChoice; labelKey: string }[] = [
  { value: "dark", labelKey: "settings.themeEngine.dark" },
  { value: "light", labelKey: "settings.themeEngine.light" },
  { value: "auto", labelKey: "settings.themeEngine.auto" },
];

const LANGUAGE_CHOICE_KEYS: { value: LanguageChoice; labelKey: string }[] = [
  { value: "en", labelKey: "settings.languageEngine.en" },
  { value: "fa", labelKey: "settings.languageEngine.fa" },
  { value: "auto", labelKey: "settings.languageEngine.auto" },
];

export function SettingsScreen() {
  const {
    themeChoice, resolvedTheme, languageChoice, resolvedLanguage,
    strictValidation, autoRepair, dedupeOnImport,
  } = useSettingsState();
  const t = createTranslator(settingsStore);
  const [guideOpen, setGuideOpen] = useState(false);

  async function handleWipeData() {
    if (!confirm(t("settings.data.wipeConfirm1"))) return;
    if (!confirm(t("settings.data.wipeConfirm2"))) return;
    await wipeAllAppData();
    location.reload();
  }

  return (
    <main class="settings-screen">
      <div class="screen-header">
        <h1 class="screen-title">{t("settings.title")}</h1>
        <p class="screen-subtitle">
          {t("settings.subtitle")}
        </p>
      </div>

      <div class="panel glass-panel guide-entry" style={{ padding: 0 }} aria-label={t("userGuide.rowTitle")}>
        <div class="settings-row">
          <div class="settings-row-icon"><img src="assets/icons/ic-bars.png" alt="" /></div>
          <div>
            <div class="settings-row-title">{t("userGuide.rowTitle")}</div>
            <div class="settings-row-sub">{t("userGuide.rowSub")}</div>
          </div>
          <button type="button" class="btn btn--primary settings-row-action" onClick={() => setGuideOpen(true)}>
            {t("userGuide.openButton")}
          </button>
        </div>
      </div>

      <div class="panel glass-panel" style={{ marginBlockStart: "20px" }} aria-label={t("settings.themeEngine.title")}>
        <div class="panel-title">{t("settings.themeEngine.title")}</div>
        <fieldset class="radio-group">
          <legend class="hint" style={{ marginBlockEnd: "10px" }}>{t("settings.themeEngine.legend")}</legend>
          <div class="form-actions" style={{ marginBlockStart: 0 }}>
            {CHOICE_KEYS.map(({ value, labelKey }) => (
              <label key={value} class="radio-card">
                <input
                  type="radio"
                  name="theme-choice"
                  value={value}
                  checked={themeChoice === value}
                  onChange={() => settingsStore.setThemeChoice(value)}
                />
                {t(labelKey)}
              </label>
            ))}
          </div>
        </fieldset>
        <p class="hint" style={{ marginBlockStart: "14px" }}>
          {t("settings.themeEngine.currentlyAppliedPrefix")}{resolvedTheme === "dark" ? t("settings.themeEngine.currentlyAppliedDark") : t("settings.themeEngine.currentlyAppliedLight")}
        </p>
      </div>

      <div class="panel glass-panel" style={{ marginBlockStart: "20px" }} aria-label={t("settings.languageEngine.title")}>
        <div class="panel-title">{t("settings.languageEngine.title")}</div>
        <fieldset class="radio-group">
          <legend class="hint" style={{ marginBlockEnd: "10px" }}>{t("settings.languageEngine.legend")}</legend>
          <div class="form-actions" style={{ marginBlockStart: 0 }}>
            {LANGUAGE_CHOICE_KEYS.map(({ value, labelKey }) => (
              <label key={value} class="radio-card">
                <input
                  type="radio"
                  name="language-choice"
                  value={value}
                  checked={languageChoice === value}
                  onChange={() => settingsStore.setLanguageChoice(value)}
                />
                {t(labelKey)}
              </label>
            ))}
          </div>
        </fieldset>
        <p class="hint" style={{ marginBlockStart: "14px" }}>
          {t("settings.languageEngine.currentlyAppliedPrefix")}{resolvedLanguage === "fa" ? t("settings.languageEngine.currentlyAppliedFa") : t("settings.languageEngine.currentlyAppliedEn")}
        </p>
      </div>

      <div class="panel glass-panel" style={{ marginBlockStart: "20px", padding: 0 }} aria-label={t("settings.strictValidation.title")}>
        <div class="settings-row">
          <div class="settings-row-icon"><img src="assets/icons/ic-shield.png" alt="" /></div>
          <div>
            <div class="settings-row-title">{t("settings.strictValidation.title")}</div>
            <div class="settings-row-sub">{t("settings.strictValidation.sub")}</div>
          </div>
          <label class="toggle-switch">
            <input
              type="checkbox"
              checked={strictValidation}
              onChange={(e) => settingsStore.setStrictValidation((e.target as HTMLInputElement).checked)}
              aria-label={t("settings.strictValidation.title")}
            />
            <span class="toggle-track" />
            <span class="toggle-knob" />
          </label>
        </div>

        <div class="settings-row">
          <div class="settings-row-icon"><img src="assets/icons/ic-speed.png" alt="" /></div>
          <div>
            <div class="settings-row-title">{t("settings.autoRepair.title")}</div>
            <div class="settings-row-sub">{t("settings.autoRepair.sub")}</div>
          </div>
          <label class="toggle-switch">
            <input
              type="checkbox"
              checked={autoRepair}
              onChange={(e) => settingsStore.setAutoRepair((e.target as HTMLInputElement).checked)}
              aria-label={t("settings.autoRepair.title")}
            />
            <span class="toggle-track" />
            <span class="toggle-knob" />
          </label>
        </div>

        <div class="settings-row">
          <div class="settings-row-icon"><img src="assets/icons/ic-network.png" alt="" /></div>
          <div>
            <div class="settings-row-title">{t("settings.dedupeOnImport.title")}</div>
            <div class="settings-row-sub">{t("settings.dedupeOnImport.sub")}</div>
          </div>
          <label class="toggle-switch">
            <input
              type="checkbox"
              checked={dedupeOnImport}
              onChange={(e) => settingsStore.setDedupeOnImport((e.target as HTMLInputElement).checked)}
              aria-label={t("settings.dedupeOnImport.title")}
            />
            <span class="toggle-track" />
            <span class="toggle-knob" />
          </label>
        </div>

        <div class="settings-row">
          <div>
            <div class="settings-row-title">{t("settings.data.title")}</div>
            <div class="settings-row-sub">{t("settings.data.sub")}</div>
          </div>
          <button type="button" class="settings-row-action settings-row-wipe" onClick={handleWipeData}>
            {t("settings.data.wipeButton")}
          </button>
        </div>
      </div>

      <UserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </main>
  );
}
