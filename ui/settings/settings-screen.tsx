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
import { settingsStore, useSettingsState } from "../store/use-settings-state.js";

type ThemeChoice = "dark" | "light" | "auto";

const CHOICES: { value: ThemeChoice; label: string }[] = [
  { value: "dark", label: "Dark Mode" },
  { value: "light", label: "Light Mode" },
  { value: "auto", label: "Auto Mode (System Sync)" },
];

export function SettingsScreen() {
  const { themeChoice, resolvedTheme } = useSettingsState();

  return (
    <main class="settings-screen">
      <div class="screen-header">
        <h1 class="screen-title">Settings</h1>
        <p class="screen-subtitle">
          App-wide preferences — currently just the Theme Engine (07-UI_UX_SYSTEM §2);
          nothing else is spec'd here yet.
        </p>
      </div>

      <div class="panel glass-panel" aria-label="Theme Engine">
        <div class="panel-title">Theme Engine</div>
        <fieldset class="radio-group">
          <legend class="hint" style={{ marginBlockEnd: "10px" }}>Theme</legend>
          <div class="form-actions" style={{ marginBlockStart: 0 }}>
            {CHOICES.map(({ value, label }) => (
              <label key={value} class="radio-card">
                <input
                  type="radio"
                  name="theme-choice"
                  value={value}
                  checked={themeChoice === value}
                  onChange={() => settingsStore.setThemeChoice(value)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <p class="hint" style={{ marginBlockStart: "14px" }}>
          Currently applied: {resolvedTheme === "dark" ? "Dark" : "Light"}
        </p>
      </div>
    </main>
  );
}
