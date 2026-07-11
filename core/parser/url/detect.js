/**
 * URL format detection — 04-PARSER_ENGINE Stage 02 / 12-PARSER_FACTORY §4.
 * Returns a Confidence Score 0-100. A single supported URL line scores high; a
 * multi-line blob of several URLs is the Subscription Parser's job, so it scores
 * low here (Highest Confidence Wins routes it away).
 */

import { URL_SCHEMES } from "./preprocess.js";
import { trimOrReject } from "../shared/detect-guards.js";
import { fuzzyMatch } from "../shared/fuzzy.js";

const SCHEME_RE = new RegExp(`^(${URL_SCHEMES.join("|")})://`, "i");
const SCHEME_TOKEN_RE = /^([a-zA-Z0-9]+):\/\//;

// Mid confidence: clears UNKNOWN_FORMAT_THRESHOLD (50, factory.js) so
// recover() gets a chance to fuzzy-correct the scheme (ADR-009), but stays
// below the exact-match score (95) since the scheme is only a guess.
const FUZZY_SCHEME_CONFIDENCE = 55;
const FUZZY_SCHEME_MAX_DIST = 2;

/**
 * @param {string} input
 * @returns {number} confidence 0-100
 */
export function detectUrl(input) {
  const trimmed = trimOrReject(input);
  if (trimmed === null) return 0;

  if (!SCHEME_RE.test(trimmed)) {
    // Single-line, single-scheme-token input whose scheme is a near-miss of a
    // known one (e.g. "vmes://" for "vmess://") — ADR-009 Detection Fuzzy
    // Tolerance. Multi-line input is left at 0 (Subscription territory).
    if (/\r?\n/.test(trimmed)) return 0;
    const m = SCHEME_TOKEN_RE.exec(trimmed);
    if (!m) return 0;
    const scheme = m[1].toLowerCase();
    if (URL_SCHEMES.includes(scheme)) return 0; // exact match already handled above
    const fixed = fuzzyMatch(scheme, URL_SCHEMES, FUZZY_SCHEME_MAX_DIST);
    return fixed ? FUZZY_SCHEME_CONFIDENCE : 0;
  }

  // Several URL lines -> Subscription territory; defer with a low score.
  const urlLines = trimmed.split(/\r?\n/).filter((l) => SCHEME_RE.test(l.trim()));
  if (urlLines.length > 1) return 30;

  return 95;
}
