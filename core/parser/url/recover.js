/**
 * URL recovery — 04-PARSER_ENGINE Stage 10 (Error Recovery) + Stage 11 (Fuzzy
 * Recovery).
 *
 * Absolute security rule (Stage 11): structure/syntax repairs only. A misspelled
 * scheme is fuzzy-corrected and broken Base64 is sanitized, but no security data
 * (uuid / password / pbk / sid) is EVER fabricated — if it is missing from the
 * input it stays missing, and the node simply fails Validation later.
 *
 * @typedef {import("../../types/parser").RawExtraction} RawExtraction
 * @typedef {import("../../types/parser").ParseError} ParseError
 */

import { URL_SCHEMES } from "./preprocess.js";
import { parseUrl } from "./extract.js";
import { fuzzyMatch } from "../shared/fuzzy.js";

/** Drop anything outside the Base64 / Base64URL alphabet. @param {string} body @returns {string} */
function sanitizeBase64Body(body) {
  return body.replace(/[^A-Za-z0-9+/=_-]/g, "");
}

/**
 * recover() — Stage 10/11 entry. Returns a recovered RawExtraction, or `null`
 * if the URL cannot be repaired into something parseable.
 * @param {string} input
 * @param {ParseError} [_error]
 * @returns {RawExtraction | null}
 */
export function recoverUrl(input, _error) {
  if (typeof input !== "string" || input.trim().length === 0) return null;
  let s = input.trim();

  /** @type {string[]} */
  const recoveryActions = [];

  const m = /^([a-zA-Z0-9]+):\/\//.exec(s);
  if (!m) return null;
  let scheme = m[1].toLowerCase();
  let rest = s.slice(m[1].length); // includes the leading "://"

  // Stage 11: fuzzy-correct a misspelled scheme (vmes -> vmess, vles -> vless).
  if (!URL_SCHEMES.includes(scheme)) {
    const fixed = fuzzyMatch(scheme, URL_SCHEMES, 2);
    if (!fixed) return null;
    recoveryActions.push(`REC_KEY_FUZZY_MATCHED: scheme "${scheme}" -> "${fixed}"`);
    scheme = fixed;
  }

  // Stage 10: for vmess, sanitize the Base64 payload (strip stray characters).
  if (scheme === "vmess") {
    const body = rest.slice("://".length);
    const cleaned = sanitizeBase64Body(body);
    if (cleaned !== body) recoveryActions.push("REC_STRUCTURE_REPAIRED: sanitized vmess Base64 payload");
    rest = "://" + cleaned;
  }

  s = scheme + rest;

  try {
    const extraction = parseUrl(s);
    return {
      ...extraction,
      warnings: [...(extraction.warnings || []), "REC_PARTIAL_CONFIG: node recovered from malformed URL."],
      recoveryActions: [...recoveryActions, ...(extraction.recoveryActions || [])],
      raw: input,
    };
  } catch {
    return null;
  }
}
