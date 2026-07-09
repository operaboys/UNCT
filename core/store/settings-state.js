/**
 * Settings State — Theme Engine (07-UI_UX_SYSTEM §2: "Theme Engine: Dark
 * Mode · Light Mode · Auto Mode · System Sync") plus, since ADR-030, three
 * behavioral toggles (Strict Validation, Auto-repair, Deduplicate on
 * import) the Liquid Glass v2 handoff's Settings screen adds. This used to
 * be "deliberately just the one preference" (doc 07 has no dedicated §4.x
 * Settings subsection) — ADR-030 is the backlog item that ends that scope
 * limit; see it for the exact, precisely-defined behavior of each toggle.
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
 * `resolvedTheme` from the OS preference. The three ADR-030 toggles are
 * plain booleans — no derived/resolved counterpart needed, so they follow
 * the simpler get/set-through pattern only.
 *
 * @typedef {"dark" | "light" | "auto"} ThemeChoice
 * @typedef {"en" | "fa" | "auto"} LanguageChoice
 * @typedef {{
 *   themeChoice: ThemeChoice,
 *   resolvedTheme: "dark" | "light",
 *   languageChoice: LanguageChoice,
 *   resolvedLanguage: "en" | "fa",
 *   strictValidation: boolean,
 *   autoRepair: boolean,
 *   dedupeOnImport: boolean,
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

/* ADR-030 behavioral toggles — plain persisted booleans, each with its own
   Owner-decided default (see the ADR for exactly why each default is what
   it is; `dedupeOnImport: true` is the one real default-behavior change). */
const STRICT_VALIDATION_STORAGE_KEY = "strictValidation";
const DEFAULT_STRICT_VALIDATION = false;
const AUTO_REPAIR_STORAGE_KEY = "autoRepair";
const DEFAULT_AUTO_REPAIR = true;
const DEDUPE_ON_IMPORT_STORAGE_KEY = "dedupeOnImport";
const DEFAULT_DEDUPE_ON_IMPORT = true;

/** @param {unknown} value @param {boolean} fallback @returns {boolean} */
function readBooleanChoice(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

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
 *   setStrictValidation: (value: boolean) => void,
 *   setAutoRepair: (value: boolean) => void,
 *   setDedupeOnImport: (value: boolean) => void,
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

  const initialStrictValidation = readBooleanChoice(adapter.get(STRICT_VALIDATION_STORAGE_KEY), DEFAULT_STRICT_VALIDATION);
  const initialAutoRepair = readBooleanChoice(adapter.get(AUTO_REPAIR_STORAGE_KEY), DEFAULT_AUTO_REPAIR);
  const initialDedupeOnImport = readBooleanChoice(adapter.get(DEDUPE_ON_IMPORT_STORAGE_KEY), DEFAULT_DEDUPE_ON_IMPORT);

  const store = createStore({
    themeChoice: initialChoice,
    resolvedTheme: resolveTheme(initialChoice, matchMedia),
    languageChoice: initialLanguageChoice,
    resolvedLanguage: resolveLanguage(initialLanguageChoice, getNavigatorLanguage),
    strictValidation: initialStrictValidation,
    autoRepair: initialAutoRepair,
    dedupeOnImport: initialDedupeOnImport,
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

    /** ADR-030 Decision 1. @param {boolean} value */
    setStrictValidation(value) {
      adapter.set(STRICT_VALIDATION_STORAGE_KEY, value);
      store.setState((prev) => ({ ...prev, strictValidation: value }));
    },

    /** ADR-030 Decision 2. @param {boolean} value */
    setAutoRepair(value) {
      adapter.set(AUTO_REPAIR_STORAGE_KEY, value);
      store.setState((prev) => ({ ...prev, autoRepair: value }));
    },

    /** ADR-030 Decision 3. @param {boolean} value */
    setDedupeOnImport(value) {
      adapter.set(DEDUPE_ON_IMPORT_STORAGE_KEY, value);
      store.setState((prev) => ({ ...prev, dedupeOnImport: value }));
    },

    /** Stops listening for OS theme changes (test teardown; mirrors node-store.js's close()). */
    close() {
      mediaQueryList.removeEventListener("change", onSystemChange);
    },
  };
}
