/**
 * TLS Analyzer — 06-ANALYZER_ENGINE §1.3.
 *
 * Question (§1.3): are the TLS *handshake* settings (SNI / ALPN / Fingerprint)
 * coherent with the node's security type? On UNM data only. Three boundaries
 * are deliberately respected:
 *  - NOT validity: whether `alpn` is a well-formed array of known ids, etc., is
 *    the Validation Engine's job (spec 04). Here we ask "do these settings make
 *    sense together", not "is each value well-formed".
 *  - NOT Reality: PBK / SID are the Reality Analyzer's concern (§1.5), even
 *    though `reality` also runs a TLS handshake. This module touches only the
 *    handshake fields sni/alpn/fingerprint; the clean split is TLS-handshake
 *    here, Reality-credentials there.
 *  - NOT a score: no 0-100 quality number — that is Security Analyzer (§1.2).
 *
 * Presence of sni/alpn/fingerprint is read from the Data Completeness
 * Analyzer's `missingFields` (§1.0 consumption rule: other analyzers consult
 * that output instead of re-deriving per-field emptiness). Pure & Sync,
 * mirroring the other analyzers; eventually wrapped by `analyzer.worker.js`
 * (ADR-003).
 *
 * @typedef {import("../../types/unm").UNMNode} UNMNode
 * @typedef {import("../types").CompletenessResult} CompletenessResult
 * @typedef {import("../types").TlsAnalysis} TlsAnalysis
 */

import { analyzeCompleteness } from "./data-completeness.js";

/** Security types that perform a TLS handshake (so sni/alpn/fingerprint apply). */
const TLS_LIKE_SECURITY = Object.freeze(["tls", "reality"]);

/**
 * Recognized uTLS client fingerprints (Xray/sing-box). A present fingerprint
 * outside this set is a coherence concern, not a validation error.
 */
const KNOWN_FINGERPRINTS = Object.freeze([
  "chrome", "firefox", "safari", "ios", "android", "edge",
  "360", "qq", "random", "randomized",
]);

/**
 * Is a string field actually filled in (non-empty after trim)?
 * @param {unknown} value
 * @returns {value is string}
 */
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Run the TLS Analyzer on one node.
 * @param {UNMNode} node
 * @param {CompletenessResult} [completeness] precomputed Data Completeness
 *   result; recomputed from the node when omitted (so the module is usable
 *   standalone and as part of the orchestrated chain).
 * @returns {TlsAnalysis}
 */
export function analyzeTls(node, completeness = analyzeCompleteness(node)) {
  const securityType = node.security;
  const applicable = TLS_LIKE_SECURITY.includes(securityType);
  /** @type {string[]} */
  const issues = [];

  if (!applicable) {
    // security "none": there is no TLS layer, so handshake params are
    // meaningless. Setting them is a misconfiguration (coherence, not
    // validity). Completeness doesn't track these fields when security="none"
    // (they aren't "relevant"), so presence is checked directly here.
    for (const field of /** @type {const} */ (["sni", "alpn", "fingerprint"])) {
      const value = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (node))[field];
      const present = Array.isArray(value) ? value.length > 0 : isNonEmptyString(value);
      if (present) {
        issues.push(`${field} is set but security is "none" (no TLS layer to use it)`);
      }
    }
    return { securityType, applicable, coherent: issues.length === 0, knownFingerprint: null, issues };
  }

  // TLS layer present (tls / reality). Consume Data Completeness for presence.
  if (completeness.missingFields.includes("sni")) {
    issues.push(`sni is missing for a "${securityType}" handshake (SNI should be set)`);
  }

  /** @type {boolean | null} */
  let knownFingerprint = null;
  const fingerprint = node.fingerprint;
  if (isNonEmptyString(fingerprint)) {
    knownFingerprint = KNOWN_FINGERPRINTS.includes(fingerprint.trim().toLowerCase());
    if (!knownFingerprint) {
      issues.push(`fingerprint "${fingerprint}" is not a recognized uTLS profile`);
    }
  }

  return { securityType, applicable, coherent: issues.length === 0, knownFingerprint, issues };
}
