/**
 * Reality Analyzer — 06-ANALYZER_ENGINE §1.5.
 *
 * Question (§1.5): does this node's Reality setup have everything a real
 * client needs to establish a Reality connection — i.e. **Reality
 * Compatibility**? Three boundaries are deliberately respected:
 *  - NOT validity: whether `pbk`/`sid` are well-formed per the Validation
 *    Engine's stricter rules is spec 04's job (today the Validation Engine
 *    has no pbk/sid checks at all — `pbkPlausible`/`sidPlausible` below are
 *    this module's OWN structural-plausibility heuristic, filling that gap
 *    for compatibility purposes only, never a cryptographic verification).
 *  - NOT TLS handshake coherence: sni/fingerprint coherence is the TLS
 *    Analyzer's job (§1.3), even though Reality also runs a TLS handshake.
 *    This module *consumes* `analyzeTls`'s verdict instead of re-deriving it
 *    (§1.0 consumption rule), and only adds a Reality-specific tightening on
 *    top: an absent fingerprint is merely a coherence non-issue for plain TLS
 *    (§1.3 leaves `knownFingerprint: null` and raises no issue), but for
 *    Reality a real client cannot camouflage the handshake at all without a
 *    uTLS fingerprint — so Reality Analyzer raises its own issue for that case
 *    that TLS Analyzer deliberately does not.
 *  - NOT a score: `securityScore` is the Security Analyzer's job (§1.2). This
 *    module's explicit warning (§1.5): a node can be Secure but not
 *    Compatible with a specific client, or vice versa — so Reality
 *    Compatibility is its own `compatible` boolean, landing in
 *    `AnalysisObject.compatibilityScore` later, never folded into
 *    `securityScore` (spec 05 §4).
 *
 * ALPN is deliberately NOT re-checked here beyond what Completeness/TLS
 * Analyzer already track: real Reality camouflage ALPN is dictated by the
 * impersonated server, not by client config, so there is no additional
 * Reality-specific ALPN rule to add (a scope decision, not an oversight).
 *
 * Presence of pbk/sid is read from the Data Completeness Analyzer's
 * `missingFields` (§1.0 consumption rule); sni/fingerprint coherence is read
 * from the TLS Analyzer (§1.3). Pure & Sync, mirroring the other analyzers;
 * eventually wrapped by `analyzer.worker.js` (ADR-003).
 *
 * @typedef {import("../../types/unm").UNMNode} UNMNode
 * @typedef {import("../types").CompletenessResult} CompletenessResult
 * @typedef {import("../types").TlsAnalysis} TlsAnalysis
 * @typedef {import("../types").RealityAnalysis} RealityAnalysis
 */

import { analyzeCompleteness } from "./data-completeness.js";
import { analyzeTls, isNonEmptyString } from "./tls-analyzer.js";

/** 43-char unpadded base64url — the shape of a 32-byte X25519 public key. */
const PBK_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** Even-length hex, up to 16 chars — the shape of a Reality short ID. */
const SID_PATTERN = /^[0-9a-fA-F]{0,16}$/;

/**
 * Is `value` a plausible X25519 public key (structural shape only, never a
 * cryptographic check)?
 * @param {string} value
 * @returns {boolean}
 */
function isPlausiblePbk(value) {
  return PBK_PATTERN.test(value.trim());
}

/**
 * Is `value` a plausible Reality short ID (even-length hex, <=16 chars)?
 * @param {string} value
 * @returns {boolean}
 */
function isPlausibleSid(value) {
  const trimmed = value.trim();
  return trimmed.length % 2 === 0 && SID_PATTERN.test(trimmed);
}

/**
 * Run the Reality Analyzer on one node.
 * @param {UNMNode} node
 * @param {CompletenessResult} [completeness] precomputed Data Completeness
 *   result; recomputed from the node when omitted.
 * @param {TlsAnalysis} [tls] precomputed TLS Analyzer result; recomputed from
 *   the node (and `completeness`) when omitted.
 * @returns {RealityAnalysis}
 */
export function analyzeReality(
  node,
  completeness = analyzeCompleteness(node),
  tls = analyzeTls(node, completeness),
) {
  const applicable = node.security === "reality";
  /** @type {string[]} */
  const issues = [];

  if (!applicable) {
    // No Reality in play: pbk/sid set here is a stray misconfiguration, the
    // same way TLS Analyzer flags stray sni/alpn/fingerprint on security
    // "none" — Completeness doesn't track pbk/sid when security !== "reality"
    // (they aren't "relevant"), so presence is checked directly here.
    for (const field of /** @type {const} */ (["pbk", "sid"])) {
      const value = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (node))[field];
      if (isNonEmptyString(value)) {
        issues.push(`${field} is set but security is not "reality" (no Reality layer to use it)`);
      }
    }
    return {
      applicable, compatible: issues.length === 0,
      pbkPlausible: null, sidPlausible: null, issues,
    };
  }

  // Reality is in play. Consume Data Completeness for pbk/sid presence.
  /** @type {boolean | null} */
  let pbkPlausible = null;
  if (completeness.missingFields.includes("pbk")) {
    issues.push("pbk is missing — a Reality client cannot connect without a public key");
  } else if (isNonEmptyString(node.pbk)) {
    pbkPlausible = isPlausiblePbk(node.pbk);
    if (!pbkPlausible) issues.push(`pbk "${node.pbk}" is not a plausible X25519 public key`);
  }

  // sid is optional (empty/absent means "no short ID restriction" — fine).
  /** @type {boolean | null} */
  let sidPlausible = null;
  if (isNonEmptyString(node.sid)) {
    sidPlausible = isPlausibleSid(node.sid);
    if (!sidPlausible) issues.push(`sid "${node.sid}" is not a plausible Reality short ID`);
  }

  // Consume the TLS Analyzer's handshake-coherence verdict instead of
  // re-deriving sni/fingerprint checks (§1.0 consumption rule).
  if (!tls.coherent) issues.push(...tls.issues);

  // Reality-specific tightening: TLS Analyzer treats an absent fingerprint as
  // a non-issue (knownFingerprint: null, no issue raised), but Reality cannot
  // camouflage its handshake at all without one.
  if (tls.knownFingerprint === null) {
    issues.push("fingerprint is missing — Reality needs a uTLS fingerprint to camouflage the handshake");
  }

  return { applicable, compatible: issues.length === 0, pbkPlausible, sidPlausible, issues };
}
