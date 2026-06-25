/**
 * Subscription detection — 04-PARSER_ENGINE Stage 02 / 12-PARSER_FACTORY §4.
 *
 * A single URL on one line is the URL Parser's job (it scores 95), so this
 * scores 0 there. A multi-line list of URLs, or a Base64 blob that decodes to
 * URLs, is a subscription and scores high (Highest Confidence Wins).
 */

import { decodeBase64 } from "../url/index.js";
import { isUrlLine } from "./decode.js";
import { trimOrReject } from "../shared/detect-guards.js";

/**
 * @param {string} input
 * @returns {number} confidence 0-100
 */
export function detectSubscription(input) {
  const trimmed = trimOrReject(input);
  if (trimmed === null) return 0;

  const multiLine = /\r?\n/.test(trimmed);
  const urlLines = trimmed.split(/\r?\n/).filter(isUrlLine);

  // A single URL on a single line -> defer to the URL Parser.
  if (urlLines.length === 1 && !multiLine) return 0;
  // Several URL lines -> a plain-text subscription.
  if (urlLines.length > 1) return 85;

  // A Base64 blob that decodes to URLs -> a Base64 subscription.
  const decoded = decodeBase64(trimmed.replace(/\s+/g, ""));
  if (decoded.length > 0 && decoded.split(/\r?\n/).some(isUrlLine)) return 90;

  return 0;
}
