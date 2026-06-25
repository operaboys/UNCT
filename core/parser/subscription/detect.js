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

// Mid confidence: clears UNKNOWN_FORMAT_THRESHOLD (50, factory.js) so
// recover()'s sanitize-and-redecode step gets a chance (ADR-009), but stays
// below the clean-Base64 score (90) since the payload is known to be dirty.
const DIRTY_BASE64_CONFIDENCE = 55;
// Only tolerate light pollution — most of the blob must already be valid
// Base64 alphabet, or this would risk matching arbitrary text (false positives).
const MAX_POLLUTION_RATIO = 0.15;

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
  const compact = trimmed.replace(/\s+/g, "");
  const decoded = decodeBase64(compact);
  if (decoded.length > 0 && decoded.split(/\r?\n/).some(isUrlLine)) return 90;

  // ADR-009: a Base64 blob with light pollution (a handful of stray bytes
  // injected into otherwise-valid Base64) fails to decode outright above, but
  // sanitizing the alphabet and retrying reveals it really is a subscription.
  if (compact.length >= 16) {
    const sanitized = compact.replace(/[^A-Za-z0-9+/=_-]/g, "");
    const pollutionRatio = 1 - sanitized.length / compact.length;
    if (sanitized.length >= 16 && pollutionRatio > 0 && pollutionRatio <= MAX_POLLUTION_RATIO) {
      const sanitizedDecoded = decodeBase64(sanitized);
      if (sanitizedDecoded.length > 0 && sanitizedDecoded.split(/\r?\n/).some(isUrlLine)) {
        return DIRTY_BASE64_CONFIDENCE;
      }
    }
  }

  return 0;
}
