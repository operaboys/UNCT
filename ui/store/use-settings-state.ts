/**
 * The Settings State domain's Preact-facing half (mirrors use-parser-state.ts,
 * ADR-015 Decision point 2 — `useSettingsState()` lives here, never in
 * `core/`). `settingsStore` is the one app-wide instance of
 * `core/store/settings-state.js`'s `createSettingsStore()` for the running
 * app (tests build their own, independent instances instead — see
 * tests/store/settings-state.test.js).
 *
 * `useSettingsState()` reads the whole (two-field) `SettingsState` via a
 * stable identity selector — `core/store/selectors.js` is reserved for
 * `ParserState`/`AnalyzerState`; Settings' own domain is too small to need a
 * separate selectors module. Writes go through `settingsStore.setThemeChoice`
 * directly, called from the Settings Screen's event handlers.
 */
import { createSettingsStore } from "../../core/store/settings-state.js";
import { useStoreSelector } from "./use-store-selector.js";

export const settingsStore = createSettingsStore();

function selectSettings(state: ReturnType<typeof settingsStore.getState>) {
  return state;
}

export function useSettingsState() {
  return useStoreSelector(settingsStore, selectSettings);
}
