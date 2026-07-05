/**
 * Xray format detection — 04-PARSER_ENGINE Stage 02 / 12-PARSER_FACTORY §4.
 * Returns a Confidence Score 0-100 (Highest Confidence Wins). A broken-JSON
 * input that still looks like Xray returns a mid score so the ParserFactory
 * routes it here and recover() (Stage 10/11) gets its chance.
 */

import { selectOutbound } from "./extract.js";
import { trimOrReject, isUrlScheme, looksLikeJson } from "../shared/detect-guards.js";

/** Tokens that strongly imply an Xray config even in malformed text. */
const XRAY_TOKENS = /"(outbounds|streamSettings|vnext|realitySettings)"\s*:/;

/**
 * @param {string} input
 * @returns {number} confidence 0-100
 */
export function detectXray(input) {
  const trimmed = trimOrReject(input);
  if (trimmed === null) return 0;

  // URL-scheme configs and YAML are other parsers' job — hard reject.
  if (isUrlScheme(trimmed)) return 0;
  if (!looksLikeJson(trimmed)) return 0;

  /** @type {any} */
  let config;
  try {
    config = JSON.parse(trimmed);
  } catch {
    // Broken JSON, but if the Xray shape is visible it is recoverable.
    return XRAY_TOKENS.test(trimmed) ? 60 : 0;
  }

  // A root-level Array of complete Xray config documents (e.g. v2rayN's
  // export shape — see extract.js's `collectOutbounds`) is a step removed
  // from the single-document case: a bare array happening to contain
  // objects that structurally resemble outbounds is a (slightly) less
  // specific signal than a single object already carrying Xray-only
  // top-level keys, so this scores a notch below the equivalent
  // single-document confidence rather than reusing it outright.
  const isArrayRoot = Array.isArray(config);

  const ob = selectOutbound(config);
  if (ob) {
    const hasStrongShape = Boolean(ob.streamSettings || ob.settings?.vnext || ob.settings?.servers);
    if (isArrayRoot) return hasStrongShape ? 85 : 70;
    return hasStrongShape ? 95 : 80;
  }
  // Parseable JSON carrying Xray-only keys but no usable outbound yet
  // (single-document only — a bare array with no matching outbound in any
  // element has no equivalent "carries Xray-only keys" signal to fall back on).
  if (!isArrayRoot && config && (config.outbounds || config.streamSettings)) return 55;
  return 0;
}
