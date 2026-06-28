/**
 * Settings State — Theme Engine (07-UI_UX_SYSTEM §2: "Theme Engine: Dark
 * Mode · Light Mode · Auto Mode · System Sync"). This is the ONLY Settings
 * content documented anywhere in the blueprints — doc 07 has no dedicated
 * §4.x Settings subsection, unlike every other screen — so this store is
 * deliberately just the one preference, not a general "app settings" bag;
 * anything else is Backlog, not built here.
 *
 * "Auto Mode" and "System Sync" are one mechanism here, not two separate
 * toggles: choosing `"auto"` resolves the live OS preference via the
 * `prefers-color-scheme` media query (Web Platform API, no new dependency
 * per 14-DEPENDENCY_POLICY) at the moment of choosing it, AND keeps
 * following it for as long as `"auto"` stays selected (a `change` listener
 * on that same media query) — "System Sync" names that ongoing tracking
 * behavior of "Auto Mode", not a distinct fourth mode.
 *
 * Two-Layer split (ADR-013's pattern, mirrored from IndexedDB/node-store.js):
 * `core/storage/local-adapter.js` is the raw, swappable LocalStorage engine;
 * this file is the public domain layer on top of it — read the persisted
 * choice on creation (default `"auto"` if nothing was ever saved), write
 * through on every `setThemeChoice`, and add the one domain behavior
 * LocalStorage itself has no concept of: deriving + live-updating
 * `resolvedTheme` from the OS preference.
 *
 * @typedef {"dark" | "light" | "auto"} ThemeChoice
 * @typedef {"en" | "fa" | "auto"} LanguageChoice
 * @typedef {{
 *   themeChoice: ThemeChoice,
 *   resolvedTheme: "dark" | "light",
 *   languageChoice: LanguageChoice,
 *   resolvedLanguage: "en" | "fa",
 * }} SettingsState
 * @typedef {{
 *   matches: boolean,
 *   addEventListener: (type: "change", listener: () => void) => void,
 *   removeEventListener: (type: "change", listener: () => void) => void,
 * }} MinimalMediaQueryList
 */

/*
 * Language (ADR-019-BILINGUAL-I18N-ARCHITECTURE Decision 2): the *same kind*
 * of persisted, UI-wide user preference as Theme, with the same `"auto"`
 * default — so it extends this existing Owner rather than creating a
 * second Settings-shaped store. Unlike Theme's OS-level "System Sync",
 * Language's `"auto"` detection only ever runs once, at store-creation time
 * (`navigator.language`, doc 07 §9.3) — there is no `languagechange` event
 * to live-listen for the way `prefers-color-scheme` has one, and the doc
 * deliberately scopes Auto Mode to first-load detection only, not continuous
 * tracking.
 */

import { createStore } from "./create-store.js";
import { createLocalAdapter } from "../storage/local-adapter.js";

const STORAGE_KEY = "theme";
/** @type {ThemeChoice} */
const DEFAULT_CHOICE = "auto";

const LANGUAGE_STORAGE_KEY = "language";
/** @type {LanguageChoice} */
const DEFAULT_LANGUAGE_CHOICE = "auto";

/**
 * @param {(query: string) => MinimalMediaQueryList} matchMedia
 * @returns {"dark" | "light"}
 */
function systemTheme(matchMedia) {
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * @param {ThemeChoice} choice
 * @param {(query: string) => MinimalMediaQueryList} matchMedia
 * @returns {"dark" | "light"}
 */
function resolveTheme(choice, matchMedia) {
  return choice === "auto" ? systemTheme(matchMedia) : choice;
}

/** @param {unknown} value @returns {value is ThemeChoice} */
function isThemeChoice(value) {
  return value === "dark" || value === "light" || value === "auto";
}

/**
 * @param {() => string | undefined} getNavigatorLanguage
 * @returns {"en" | "fa"}
 */
function systemLanguage(getNavigatorLanguage) {
  const locale = getNavigatorLanguage() ?? "";
  return locale.toLowerCase().startsWith("fa") ? "fa" : "en";
}

/**
 * @param {LanguageChoice} choice
 * @param {() => string | undefined} getNavigatorLanguage
 * @returns {"en" | "fa"}
 */
function resolveLanguage(choice, getNavigatorLanguage) {
  return choice === "auto" ? systemLanguage(getNavigatorLanguage) : choice;
}

/** @param {unknown} value @returns {value is LanguageChoice} */
function isLanguageChoice(value) {
  return value === "en" || value === "fa" || value === "auto";
}

/**
 * @param {{
 *   adapter?: ReturnType<typeof createLocalAdapter>,
 *   matchMedia?: (query: string) => MinimalMediaQueryList,
 *   getNavigatorLanguage?: () => string | undefined,
 * }} [options]
 * @returns {{
 *   getState: () => SettingsState,
 *   subscribe: (listener: (state: SettingsState) => void) => () => void,
 *   setThemeChoice: (choice: ThemeChoice) => void,
 *   setLanguageChoice: (choice: LanguageChoice) => void,
 *   close: () => void,
 * }}
 */
export function createSettingsStore(options = {}) {
  const adapter = options.adapter ?? createLocalAdapter();
  const matchMedia = options.matchMedia ?? globalThis.matchMedia;
  const getNavigatorLanguage = options.getNavigatorLanguage ?? (() => globalThis.navigator?.language);

  const persisted = adapter.get(STORAGE_KEY);
  const initialChoice = isThemeChoice(persisted) ? persisted : DEFAULT_CHOICE;

  const persistedLanguage = adapter.get(LANGUAGE_STORAGE_KEY);
  const initialLanguageChoice = isLanguageChoice(persistedLanguage) ? persistedLanguage : DEFAULT_LANGUAGE_CHOICE;

  const store = createStore({
    themeChoice: initialChoice,
    resolvedTheme: resolveTheme(initialChoice, matchMedia),
    languageChoice: initialLanguageChoice,
    resolvedLanguage: resolveLanguage(initialLanguageChoice, getNavigatorLanguage),
  });

  /** Re-resolves + notifies whenever the OS scheme changes WHILE choice is `"auto"` ("System Sync"). */
  function onSystemChange() {
    if (store.getState().themeChoice !== "auto") return;
    store.setState((prev) => ({ ...prev, resolvedTheme: systemTheme(matchMedia) }));
  }

  const mediaQueryList = matchMedia("(prefers-color-scheme: dark)");
  mediaQueryList.addEventListener("change", onSystemChange);

  return {
    getState: store.getState,
    subscribe: store.subscribe,

    /** @param {ThemeChoice} choice */
    setThemeChoice(choice) {
      adapter.set(STORAGE_KEY, choice);
      store.setState((prev) => ({ ...prev, themeChoice: choice, resolvedTheme: resolveTheme(choice, matchMedia) }));
    },

    /** @param {LanguageChoice} choice */
    setLanguageChoice(choice) {
      adapter.set(LANGUAGE_STORAGE_KEY, choice);
      store.setState((prev) => ({ ...prev, languageChoice: choice, resolvedLanguage: resolveLanguage(choice, getNavigatorLanguage) }));
    },

    /** Stops listening for OS theme changes (test teardown; mirrors node-store.js's close()). */
    close() {
      mediaQueryList.removeEventListener("change", onSystemChange);
    },
  };
}
