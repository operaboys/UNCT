/**
 * Subscription decode layer — 04-PARSER_ENGINE Stage 08 (Auto Decode).
 *
 * A subscription arrives as a single Base64 blob, plain TXT (newline-separated
 * URLs), or a mix. This module resolves which, and yields the decoded text plus
 * the signals the Subscription Validation step (03 §2.1) needs (empty / broken
 * Base64). It does NOT split or dedupe — that is extract.js's job, and per
 * 03 §2.1 validation runs BEFORE any split/merge.
 *
 * Decoding reuses the URL parser's `decodeBase64` (no re-implementation).
 */

import { decodeBase64, URL_SCHEMES } from "../url/index.js";

const SCHEME_LINE_RE = new RegExp(`^(${URL_SCHEMES.join("|")})://`, "i");

/** Is this line a supported config URL? @param {unknown} line @returns {boolean} */
export function isUrlLine(line) {
  return typeof line === "string" && SCHEME_LINE_RE.test(line.trim());
}

/**
 * @typedef {Object} DecodeResult
 * @property {string} text                 decoded text (empty when nothing usable)
 * @property {"base64"|"plain"|"empty"|"unknown"} encoding
 * @property {boolean} empty
 * @property {boolean} brokenBase64
 * @property {string[]} actions
 */

/**
 * @param {string} input
 * @returns {DecodeResult}
 */
export function decodeSubscription(input) {
  /** @type {string[]} */
  const actions = [];
  if (typeof input !== "string") {
    return { text: "", encoding: "empty", empty: true, brokenBase64: false, actions };
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { text: "", encoding: "empty", empty: true, brokenBase64: false, actions };
  }

  const rawHasUrls = trimmed.split(/\r?\n/).some(isUrlLine);

  // Try treating the whole blob as Base64 (subscriptions are commonly one blob).
  const compact = trimmed.replace(/\s+/g, "");
  const decoded = decodeBase64(compact);
  const decodedHasUrls = decoded.length > 0 && decoded.split(/\r?\n/).some(isUrlLine);
  if (decodedHasUrls) {
    actions.push("PRE_INVALID_ENCODING: decoded Base64 subscription payload");
    return { text: decoded, encoding: "base64", empty: false, brokenBase64: false, actions };
  }

  if (rawHasUrls) {
    return { text: trimmed, encoding: "plain", empty: false, brokenBase64: false, actions };
  }

  // No URLs raw or decoded. If it LOOKS like Base64, flag it broken; else unknown/empty.
  const lookedBase64 = /^[A-Za-z0-9+/=_-]+$/.test(compact) && compact.length >= 16;
  return { text: "", encoding: "unknown", empty: !lookedBase64, brokenBase64: lookedBase64, actions };
}
