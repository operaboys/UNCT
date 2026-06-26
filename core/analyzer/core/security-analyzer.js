/**
 * Security Analyzer — 06-ANALYZER_ENGINE §1.2. Last of the six Spec-قطعی
 * Phase 6 Core modules.
 *
 * Question (§1.2): given TLS, Reality, Encryption, Fingerprint, ALPN, Flow,
 * PBK, SID and Data Completeness, how good is this node's security posture —
 * as one 0-100 `securityScore`? The Weighted-Penalty formula is fixed by
 * ADR-011 (`docs/adr/ADR-011-SECURITY-SCORE-FORMULA.md`); this module is that
 * formula's implementation, nothing more.
 *
 * Five of the eight named inputs are no longer raw fields by the time this
 * runs — they are already judged by earlier Phase 6 modules, and per the
 * §1.0 consumption rule this module *reads* those verdicts instead of
 * re-deriving them a fourth time:
 *  - Fingerprint/SNI coherence -> `analyzeTls()` (§1.3).
 *  - PBK/SID plausibility + the Reality-only fingerprint tightening ->
 *    `analyzeReality()` (§1.5).
 *  - Field presence (is `encryption`/`alpn`/`flow`/... filled in) ->
 *    `analyzeCompleteness()` (§1.0).
 *
 * The only judgment nothing upstream makes: whether a transport security
 * layer was *chosen* at all (`security === "none"` is never itself an issue
 * for TLS/Reality Analyzer — both only react to fields given a security
 * type, never to the choice of security type). That is `transportBase()`
 * below, and it is deliberately `0` for hysteria2/tuic/wireguard — their
 * `normalize.js` never sets `security` away from the UNM default "none" (no
 * such field exists in those raw formats), exactly why `network` always
 * defaults to "tcp" for the same three protocols and Network Analyzer (§1.4)
 * already exempts them from network-type penalties. Penalizing `security`
 * uniformly here would be the identical false positive one layer over.
 *
 * `securityScore` is built from Reality Analyzer's `issues.length` — a
 * *count*, never `reality.compatible` — so it stays structurally independent
 * of the future `compatibilityScore` (ADR-011 principles 1-2), not merely
 * separately computed. Pure & Sync, mirroring the other analyzers; eventually
 * wrapped by `analyzer.worker.js` (ADR-003).
 *
 * @typedef {import("../../types/unm").UNMNode} UNMNode
 * @typedef {import("../../types/unm").Protocol} Protocol
 * @typedef {import("../../types/unm").SecurityType} SecurityType
 * @typedef {import("../types").CompletenessResult} CompletenessResult
 * @typedef {import("../types").TlsAnalysis} TlsAnalysis
 * @typedef {import("../types").RealityAnalysis} RealityAnalysis
 * @typedef {import("../types").SecurityAnalysis} SecurityAnalysis
 */

import { analyzeCompleteness } from "./data-completeness.js";
import { analyzeTls } from "./tls-analyzer.js";
import { analyzeReality } from "./reality-analyzer.js";

/**
 * Protocols where `security` is a real, parser-populated user choice.
 * Disjoint from the self-transporting set below (every protocol falls in
 * exactly one of the two), mirroring the duplicated-locally convention
 * `TLS_LIKE_SECURITY` already uses across data-completeness.js/tls-analyzer.js
 * rather than a cross-module import for a three-item constant.
 */
const SECURITY_CHOICE_PROTOCOLS = Object.freeze(["vless", "vmess", "trojan", "shadowsocks"]);

/**
 * Self-transporting protocols (QUIC / WireGuard UDP). Their raw config
 * formats carry no `security` field, so the Parser leaves it at the UNM
 * default "none" — see `core/parser/url/normalize.js`,
 * `core/parser/wireguard/normalize.js` (neither assigns `security`) and
 * `core/unm/schema/defaults.js` (`DEFAULT_SECURITY`). `transportBase` must
 * not penalize this default for
 * these three (ADR-011), the same carve-out Network Analyzer (§1.4) already
 * applies to `network` for the identical root cause.
 */
const SELF_TRANSPORTING_PROTOCOLS = Object.freeze(["hysteria2", "tuic", "wireguard"]);

/** ADR-011 transport-base penalty table, keyed by `security`, for choice protocols. */
const TRANSPORT_BASE_PENALTY = Object.freeze({ reality: 0, tls: 10, none: 55 });

/** ADR-011 per-issue weight for TLS coherence problems. */
const TLS_ISSUE_WEIGHT = 8;

/** ADR-011 per-issue weight for Reality compatibility problems. */
const REALITY_ISSUE_WEIGHT = 8;

/** ADR-011 per-field weight for the security-relevant completeness gap. */
const COMPLETENESS_GAP_WEIGHT = 5;

/**
 * Completeness fields this module scores directly. `sni`/`fingerprint`/`pbk`
 * are deliberately excluded — their absence is already counted through
 * `tls.issues`/`reality.issues` below, so counting them again here would
 * double-penalize the same root cause. `sid` is excluded because an absent
 * `sid` is never a defect (§1.5: it means "no short ID restriction").
 */
const SECURITY_RELEVANT_COMPLETENESS_FIELDS = Object.freeze(["encryption", "method", "alpn", "flow"]);

/**
 * The one judgment no earlier Phase 6 module makes: was a transport security
 * layer chosen at all? Zero for self-transporting protocols (the choice
 * isn't really theirs to make — see module doc-block).
 * @param {SecurityType} security
 * @param {Protocol} protocol
 * @returns {number} penalty points
 */
function transportBase(security, protocol) {
  if (SELF_TRANSPORTING_PROTOCOLS.includes(protocol)) return 0;
  return TRANSPORT_BASE_PENALTY[security];
}

/**
 * Run the Security Analyzer on one node.
 * @param {UNMNode} node
 * @param {CompletenessResult} [completeness] precomputed Data Completeness
 *   result; recomputed from the node when omitted.
 * @param {TlsAnalysis} [tls] precomputed TLS Analyzer result; recomputed from
 *   the node (and `completeness`) when omitted.
 * @param {RealityAnalysis} [reality] precomputed Reality Analyzer result;
 *   recomputed from the node (and `completeness`/`tls`) when omitted.
 * @returns {SecurityAnalysis}
 */
export function analyzeSecurity(
  node,
  completeness = analyzeCompleteness(node),
  tls = analyzeTls(node, completeness),
  reality = analyzeReality(node, completeness, tls),
) {
  /** @type {string[]} */
  const issues = [];

  const base = transportBase(node.security, node.protocol);
  if (SECURITY_CHOICE_PROTOCOLS.includes(node.protocol) && node.security === "none") {
    issues.push('no TLS/Reality security layer is in use (security: "none")');
  }

  // Reality Analyzer already absorbs tls.issues (via spread) when security is
  // "reality" — counting both here would double-penalize the same root
  // cause, so the separate TLS term only applies when it has NOT been
  // absorbed (ADR-011).
  const tlsIssueCount = node.security === "reality" ? 0 : tls.issues.length;
  if (tlsIssueCount > 0) issues.push(...tls.issues);

  if (reality.issues.length > 0) issues.push(...reality.issues);

  const missingSecurityFields = completeness.missingFields.filter(
    (field) => SECURITY_RELEVANT_COMPLETENESS_FIELDS.includes(field),
  );
  for (const field of missingSecurityFields) {
    issues.push(`${field} is missing — reduces the security score (no value to evaluate)`);
  }

  const penalty = base
    + TLS_ISSUE_WEIGHT * tlsIssueCount
    + REALITY_ISSUE_WEIGHT * reality.issues.length
    + COMPLETENESS_GAP_WEIGHT * missingSecurityFields.length;

  const securityScore = Math.max(0, Math.min(100, 100 - penalty));

  return { securityScore, issues };
}
