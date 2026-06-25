/**
 * URL format detection — 04-PARSER_ENGINE Stage 02 / 12-PARSER_FACTORY §4.
 * Returns a Confidence Score 0-100. A single supported URL line scores high; a
 * multi-line blob of several URLs is the Subscription Parser's job, so it scores
 * low here (Highest Confidence Wins routes it away).
 */

import { URL_SCHEMES } from "./preprocess.js";
import { trimOrReject } from "../shared/detect-guards.js";

const SCHEME_RE = new RegExp(`^(${URL_SCHEMES.join("|")})://`, "i");

/**
 * @param {string} input
 * @returns {number} confidence 0-100
 */
export function detectUrl(input) {
  const trimmed = trimOrReject(input);
  if (trimmed === null) return 0;

  if (!SCHEME_RE.test(trimmed)) return 0;

  // Several URL lines -> Subscription territory; defer with a low score.
  const urlLines = trimmed.split(/\r?\n/).filter((l) => SCHEME_RE.test(l.trim()));
  if (urlLines.length > 1) return 30;

  return 95;
}
