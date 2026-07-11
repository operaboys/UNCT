/**
 * core/i18n/translator.js tests — `createTranslator(settingsStore)` reads
 * the current resolved language from an injected Settings State instance
 * (never its own singleton — see the file's header comment) and looks the
 * key up in the matching Dictionary.
 */
import { describe, it, expect } from "vitest";
import { createTranslator } from "../../core/i18n/translator.js";

/** @param {"en" | "fa"} resolvedLanguage */
function fakeSettingsStore(resolvedLanguage) {
  return { getState: () => ({ resolvedLanguage }) };
}

describe("createTranslator", () => {
  it("looks up a key in the English dictionary when resolvedLanguage is \"en\"", () => {
    const t = createTranslator(fakeSettingsStore("en"));
    expect(t("converter.title")).toBe("Converter");
  });

  it("looks up a key in the Persian dictionary when resolvedLanguage is \"fa\"", () => {
    const t = createTranslator(fakeSettingsStore("fa"));
    expect(t("converter.title")).toBe("مبدل"); // real Persian translation, per the i18n content pass
  });

  it("re-reads the settings store on every call, not just at creation", () => {
    /** @type {"en" | "fa"} */
    let resolvedLanguage = "en";
    const store = { getState: () => ({ resolvedLanguage }) };
    const t = createTranslator(store);

    expect(t("converter.title")).toBe("Converter");
    resolvedLanguage = "fa";
    expect(t("converter.title")).toBe("مبدل");
  });

  it("falls back to the key itself when it exists in neither dictionary", () => {
    const t = createTranslator(fakeSettingsStore("en"));
    expect(t("nonexistent.key")).toBe("nonexistent.key");
  });
});
