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
      <h1>Settings</h1>

      <section aria-label="Theme Engine">
        <h2>Theme Engine</h2>
        <fieldset>
          <legend>Theme</legend>
          {CHOICES.map(({ value, label }) => (
            <label key={value}>
              <input
                type="radio"
                name="theme-choice"
                value={value}
                checked={themeChoice === value}
                onChange={() => settingsStore.setThemeChoice(value)}
              />
              {" "}
              {label}
            </label>
          ))}
        </fieldset>
        <p class="hint">Currently applied: {resolvedTheme === "dark" ? "Dark" : "Light"}</p>
      </section>
    </main>
  );
}
