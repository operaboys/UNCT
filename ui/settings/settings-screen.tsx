/**
 * Settings Screen (07-UI_UX_SYSTEM §2 "Theme Engine" — the ONLY documented
 * Settings content; doc 07 has no dedicated §4.x Settings subsection the way
 * every other screen does). Deliberately scoped to JUST theme switching — no
 * other preference is spec'd anywhere in the blueprints, so nothing else is
 * added here; anything else would be Backlog, not this screen.
 *
 * Reads/writes through `useSettingsState()`/`settingsStore` the same
 * read-via-hook / write-via-store-action split every other screen already
 * uses for its own domain store (e.g. `converter-screen.tsx` + `parserStore`).
 * The actual `data-theme` DOM application happens once, app-wide, in
 * `main.tsx` — not here — so the theme stays applied/live-synced regardless
 * of which screen is currently mounted.
 *
 * Visual design (final visual design phase, Settings step): restyled onto
 * the same Liquid Glass system as the other redesigned screens, reusing
 * `.glass-panel`/`.panel-title`/`.hint` as-is. The one new class this step
 * adds, `.radio-group`/`.radio-card` (assets/css/theme.css), turns the
 * plain `<fieldset>` radio list into clickable pill cards using
 * `:has(input:checked)` for the active-state highlight — a CSS-only
 * reaction to the native input's own state, so this stays a pure visual
 * pass with no new JS logic. Same `useSettingsState()`/`settingsStore`
 * read/write as before.
 */
import { createTranslator } from "../../core/i18n/translator.js";
import { settingsStore, useSettingsState } from "../store/use-settings-state.js";

type ThemeChoice = "dark" | "light" | "auto";

const CHOICE_KEYS: { value: ThemeChoice; labelKey: string }[] = [
  { value: "dark", labelKey: "settings.themeEngine.dark" },
  { value: "light", labelKey: "settings.themeEngine.light" },
  { value: "auto", labelKey: "settings.themeEngine.auto" },
];

export function SettingsScreen() {
  const { themeChoice, resolvedTheme } = useSettingsState();
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
    </main>
  );
}
