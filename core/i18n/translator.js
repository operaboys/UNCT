/**
 * `t(key)` Translator factory.
 *
 * Core never holds its own Settings State singleton — the State Ownership
 * Rule (`11-STATE_MANAGEMENT`) gives Settings State exactly one Owner
 * instance, created in `ui/store/use-settings-state.ts` (ADR-015 Decision
 * point 2), not in `core/`. So `createTranslator` takes that instance as a
 * parameter instead of importing or constructing a second one, which would
 * otherwise split a single State into two divergent copies.
 *
 * Per ADR-019 Decision 5, this stays a plain key->string lookup: `core/`
 * itself never calls `t()` (it only ever returns Error/Warning Codes); only
 * the UI layer resolves a Code to translated text through this function.
 */
import { en } from "./dictionaries/en.js";
import { fa } from "./dictionaries/fa.js";

/** @type {Record<"en" | "fa", Record<string, string>>} */
const DICTIONARIES = { en, fa };

/**
 * @param {{ getState: () => { resolvedLanguage: "en" | "fa" } }} settingsStore
 *   Any object exposing `getState()` with a `resolvedLanguage` field —
 *   in practice, the app's one `core/store/settings-state.js` instance.
 * @returns {(key: string) => string}
 */
export function createTranslator(settingsStore) {
  return function t(key) {
    const { resolvedLanguage } = settingsStore.getState();
    const dictionary = DICTIONARIES[resolvedLanguage] ?? DICTIONARIES.en;
    return dictionary[key] ?? DICTIONARIES.en[key] ?? key;
  };
}
