/**
 * `core/i18n/` public entry point (ANTI_CHAOS Rule 11; ADR-019).
 * @module core/i18n
 */
export { en } from "./dictionaries/en.js";
export { fa } from "./dictionaries/fa.js";
export { createTranslator } from "./translator.js";
export { normalizeDigitsToAscii, normalizeArabicLettersToPersian, normalizeText } from "./normalize.js";
