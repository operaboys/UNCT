/**
 * Subscription recovery — 04-PARSER_ENGINE Stage 10/11.
 *
 * Two structural repairs, in order:
 *  1. Sanitize a Base64 blob (strip stray non-Base64 characters) and re-decode.
 *  2. Otherwise keep only the valid URL-scheme lines from the raw text, dropping
 *     comments / junk lines.
 *
 * It never fabricates a config line — it only decodes or keeps lines that are
 * already present. (Per-line credential safety is the URL parser's concern,
 * applied later in normalize.)
 *
 * @typedef {import("../../types/parser").RawExtraction} RawExtraction
 * @typedef {import("../../types/parser").ParseError} ParseError
 */

import { decodeBase64 } from "../url/index.js";
import { isUrlLine } from "./decode.js";
import { splitAndDedupe } from "./extract.js";

/**
 * @param {string} input
 * @param {"base64"|"plain"} encoding
 * @param {{ lines: string[], totalLines: number, duplicateCount: number }} split
 * @param {string[]} recoveryActions
 * @returns {RawExtraction}
 */
function buildExtraction(input, encoding, split, recoveryActions) {
  return {
    protocol: "subscription",
    fields: {
      lines: split.lines,
      report: {
        encoding, totalLines: split.totalLines,
        uniqueLines: split.lines.length, duplicateCount: split.duplicateCount,
      },
    },
    warnings: ["REC_PARTIAL_CONFIG: subscription recovered from malformed input."],
    recoveryActions,
    raw: input,
  };
}

/**
 * @param {string} input
 * @param {ParseError} [_error]
 * @returns {RawExtraction | null}
 */
export function recoverSubscription(input, _error) {
  if (typeof input !== "string" || input.trim().length === 0) return null;

  // 1) Sanitize a Base64 blob and retry.
  const compact = input.replace(/\s+/g, "");
  const sanitized = compact.replace(/[^A-Za-z0-9+/=_-]/g, "");
  if (sanitized.length >= 16) {
    const decoded = decodeBase64(sanitized);
    if (decoded.length > 0 && decoded.split(/\r?\n/).some(isUrlLine)) {
      const split = splitAndDedupe(decoded);
      if (split.lines.length > 0) {
        /** @type {string[]} */
        const actions = [];
        if (sanitized !== compact) actions.push("REC_STRUCTURE_REPAIRED: sanitized Base64 subscription payload");
        return buildExtraction(input, "base64", split, actions);
      }
    }
  }

  // 2) Keep only valid URL lines from the raw text (drop junk / comments).
  const split = splitAndDedupe(input);
  if (split.lines.length > 0) {
    return buildExtraction(input, "plain", split, ["REC_PARTIAL_CONFIG: kept only valid URL lines."]);
  }

  return null;
}
