/**
 * Settings Screen (07-UI_UX_SYSTEM §2 "Theme Engine", §9 "Language Support").
 * Originally scoped to JUST theme switching (see git history) because real
 * Persian content didn't exist yet — adding a language switcher would have
 * had nothing real to switch to. That condition no longer holds: `fa.js` now
 * carries real translations and every screen resolves its text through
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
 * Visual design (final visual design phase, Settings step): restyled onto
 * the same Liquid Glass system as the other redesigned screens, reusing
 * `.glass-panel`/`.panel-title`/`.hint` as-is. `.radio-group`/`.radio-card`
 * (assets/css/theme.css) turns the plain `<fieldset>` radio list into
 * clickable pill cards using `:has(input:checked)` for the active-state
 * highlight — a CSS-only reaction to the native input's own state. The
 * Language Engine panel below reuses this exact same pattern/classes,
 * mirroring Theme Engine one-for-one rather than inventing a second shape.
 */
import { createTranslator } from "../../core/i18n/translator.js";
import { settingsStore, useSettingsState } from "../store/use-settings-state.js";

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
  const { themeChoice, resolvedTheme, languageChoice, resolvedLanguage } = useSettingsState();
  const t = createTranslator(settingsStore);

  return (
    <main class="settings-screen">
      <div class="screen-header">
        <h1 class="screen-title">{t("settings.title")}</h1>
        <p class="screen-subtitle">
          {t("settings.subtitle")}
        </p>
      </div>

      <div class="panel glass-panel" aria-label={t("settings.themeEngine.title")}>
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
    </main>
  );
}
