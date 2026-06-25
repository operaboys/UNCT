/**
 * Shared detect() guards — 04-PARSER_ENGINE Stage 02 / 12-PARSER_FACTORY §4.
 *
 * Every parser's detect() opens with the same "is this even worth looking at"
 * checks before it runs format-specific scoring. Factored out so the six
 * detect.js files share one implementation instead of six copies.
 */

/**
 * @param {unknown} input
 * @returns {string | null} the trimmed string, or null if input is not a
 *   non-empty string (the universal first reject in every detect()).
 */
export function trimOrReject(input) {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/** Does the trimmed input look like a `scheme://...` URL? (other parsers' job) */
const URL_SCHEME_RE = /^[a-z0-9]+:\/\//i;

/**
 * @param {string} trimmed
 * @returns {boolean}
 */
export function isUrlScheme(trimmed) {
  return URL_SCHEME_RE.test(trimmed);
}

/**
 * @param {string} trimmed
 * @returns {boolean} true if the input opens like a JSON object/array.
 */
export function looksLikeJson(trimmed) {
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}
