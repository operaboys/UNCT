/**
 * Shared text-normalization primitives for bilingual (Persian/English)
 * input, per `docs/blueprints/04-PARSER_ENGINE.md` Stage 01 and
 * `docs/adr/ADR-019-BILINGUAL-I18N-ARCHITECTURE.md` Decision 3 (numbers are
 * always ASCII — translation never touches digits).
 *
 * Written once here and imported wherever raw user input needs it (the
 * Parser Factory's shared pre-detection step) instead of being
 * re-implemented per call site.
 */

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const NON_ASCII_DIGIT_PATTERN = /[۰-۹٠-٩]/g;

/** @type {Record<string, string>} */
const ARABIC_TO_PERSIAN_LETTERS = Object.freeze({
  "ي": "ی", // ي (Arabic Yeh) -> ی (Persian Yeh)
  "ى": "ی", // ى (Arabic Alef Maksura) -> ی (Persian Yeh)
  "ك": "ک", // ك (Arabic Kaf) -> ک (Persian Keheh)
});
const ARABIC_LETTER_PATTERN = /[يىك]/g;

/**
 * Converts every Persian (U+06F0-U+06F9) or Arabic-Indic (U+0660-U+0669)
 * digit in `text` to its ASCII equivalent. Non-digit characters are left
 * untouched. Non-string input (including `null`/`undefined`) passes through
 * unchanged.
 * @template T
 * @param {T} text
 * @returns {T}
 */
export function normalizeDigitsToAscii(text) {
  if (typeof text !== "string" || text.length === 0) return text;
  return /** @type {T} */ (text.replace(NON_ASCII_DIGIT_PATTERN, (char) => {
    const persianIndex = PERSIAN_DIGITS.indexOf(char);
    if (persianIndex !== -1) return String(persianIndex);
    const arabicIndex = ARABIC_INDIC_DIGITS.indexOf(char);
    if (arabicIndex !== -1) return String(arabicIndex);
    return char;
  }));
}

/**
 * Converts Arabic letter-forms that are visually similar to, but distinct
 * code points from, their Persian counterparts (ي/ى -> ی, ك -> ک) so
 * downstream string comparisons treat them uniformly. Other characters are
 * left untouched. Non-string input passes through unchanged.
 * @template T
 * @param {T} text
 * @returns {T}
 */
export function normalizeArabicLettersToPersian(text) {
  if (typeof text !== "string" || text.length === 0) return text;
  return /** @type {T} */ (text.replace(ARABIC_LETTER_PATTERN, (char) => ARABIC_TO_PERSIAN_LETTERS[char]));
}

/**
 * Combined normalization: digits first, then letters. This is the single
 * call site the Parser Factory uses on raw input before format detection.
 * @template T
 * @param {T} text
 * @returns {T}
 */
export function normalizeText(text) {
  return normalizeArabicLettersToPersian(normalizeDigitsToAscii(text));
}
