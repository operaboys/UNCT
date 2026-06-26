/**
 * Analyzer Engine — internal intermediate types (06-ANALYZER_ENGINE §1).
 *
 * These are the shapes Analyzers pass *between themselves* before the final
 * scores land in `AnalysisObject` (05-UNIVERSAL_NODE_MODEL §4). They are NOT
 * UNM fields — `AnalysisObject` stays exactly as frozen in spec 05; this file
 * only types the analyzers' working data. New analyzer intermediates may be
 * added here without an ADR (they are not in the UNM Freeze zone).
 */

import type { Protocol, NetworkType, SecurityType } from "../types/unm";

/**
 * Output of the Data Completeness Analyzer (§1.0). Reports which
 * Protocol/Security-relevant OPTIONAL fields are present vs absent — a pure
 * "is it filled in" question, never "is the value valid" (that is the
 * Validation Engine's job, spec 04) nor "how good is it" (Security/Reality
 * Analyzer's job). Other analyzers consume `missingFields` instead of
 * re-deriving per-field emptiness checks (§1.0 consumption rule).
 */
export interface CompletenessResult {
  /** Relevant optional fields that are absent/empty, e.g. ["sni", "alpn"]. */
  missingFields: string[];
  /** Relevant optional fields that are present (non-empty). */
  presentOptionalFields: string[];
  /** 0-100: percentage of relevant optional fields that are filled in. */
  completenessScore: number;
}

/**
 * Output of the Protocol Analyzer (§1.1). Confirms the protocol identified on
 * an already-parsed `UNMNode` — never a raw-file/Format detection (that is
 * the Format Detector's job, 04-PARSER_ENGINE). `node.protocol` is already a
 * required field `createNode` enforces against the `PROTOCOLS` enum, so for
 * any node built through the normal Parser pipeline `recognized` is always
 * true; this module is still the independent boundary check Network/TLS/
 * Reality/Security Analyzers (§1.2-§1.5) build on instead of re-trusting
 * `node.protocol` blindly.
 */
export interface ProtocolAnalysis {
  /** The protocol found on the node (echoed from `node.protocol`). */
  protocol: Protocol;
  /** True iff `protocol` is one of the known/supported UNM protocols. */
  recognized: boolean;
}

/**
 * Output of the Network Analyzer (§1.4). Reports whether the node's transport
 * `network` is one the selected `protocol` can actually run over. This is a
 * compatibility question (is this transport meaningful for this protocol?),
 * NOT a validity question (is the transport value well-formed? — Validation
 * Engine, spec 04) nor a quality score (Security/Reality Analyzer). The
 * self-transporting protocols (hysteria2/tuic/wireguard) carry no
 * streamSettings transport, so their only compatible network is the neutral
 * default `tcp`. `supportedNetworks` is exposed so later analyzers read the
 * compatibility set from one place instead of re-deriving it.
 */
export interface NetworkAnalysis {
  /** The transport found on the node (echoed from `node.network`). */
  network: NetworkType;
  /** The protocol the network is judged against (echoed from `node.protocol`). */
  protocol: Protocol;
  /** True iff `network` is in `supportedNetworks` for this protocol. */
  compatible: boolean;
  /** The transports this protocol can run over — the compatibility set. */
  supportedNetworks: NetworkType[];
}

/**
 * Output of the TLS Analyzer (§1.3). Judges whether the TLS *handshake*
 * settings (SNI / ALPN / Fingerprint) are coherent with the node's security
 * type — a correctness-of-configuration question, NOT field validity (is the
 * value well-formed? — Validation Engine, spec 04) nor a quality score
 * (§1.2/§1.5). It deliberately covers only the TLS-handshake fields; the
 * Reality-specific credentials PBK/SID belong to the Reality Analyzer (§1.5),
 * even though Reality also runs a TLS handshake. Presence of sni/alpn/
 * fingerprint is read from the Data Completeness Analyzer's `missingFields`
 * (§1.0 consumption rule), not re-derived here.
 */
export interface TlsAnalysis {
  /** The security type judged against (echoed from `node.security`). */
  securityType: SecurityType;
  /** True iff a TLS layer exists (security is "tls" or "reality"). */
  applicable: boolean;
  /** True iff the TLS settings make sense for this security type (no issues). */
  coherent: boolean;
  /**
   * Is `fingerprint` a recognized uTLS profile? `null` when no fingerprint is
   * set, or when TLS does not apply (security "none").
   */
  knownFingerprint: boolean | null;
  /** Human-readable coherence problems, empty when fully coherent. */
  issues: string[];
}

/**
 * Output of the Reality Analyzer (§1.5). Judges **Reality Compatibility** —
 * whether this node's Reality setup has everything a real client needs to
 * establish a Reality connection — deliberately kept separate from
 * `securityScore` (§1.5's explicit warning: a node can be Secure but not
 * Compatible with a specific client, or vice versa; these land in
 * `AnalysisObject`'s distinct `securityScore`/`compatibilityScore` fields,
 * spec 05 §4). PBK/SID structural plausibility is this module's own
 * contribution (no other module checks their format); SNI/Fingerprint
 * handshake coherence is consumed from the TLS Analyzer (§1.3) rather than
 * re-derived, per the §1.0 consumption rule.
 */
export interface RealityAnalysis {
  /** True iff Reality is in play (security === "reality"). */
  applicable: boolean;
  /** Aggregate verdict: would a real client be able to use this Reality setup? */
  compatible: boolean;
  /**
   * Is `pbk` a plausible X25519 public key (43-char base64url)? `null` when
   * `pbk` is absent or Reality is not applicable.
   */
  pbkPlausible: boolean | null;
  /**
   * Is `sid` a plausible Reality short ID (even-length hex, <=16 chars)?
   * `null` when `sid` is absent (it is optional) or Reality is not applicable.
   */
  sidPlausible: boolean | null;
  /** Human-readable compatibility problems, empty when fully compatible. */
  issues: string[];
}

/**
 * Output of the Security Analyzer (§1.2) — the last of the six Spec-قطعی
 * modules. A Weighted-Penalty score (ADR-011): starts at 100, subtracts
 * weighted deductions for each quality problem found, floors at 0. Reads
 * `CompletenessResult`/`TlsAnalysis`/`RealityAnalysis` rather than
 * re-deriving per-field checks (§1.0 consumption rule) — its own and only
 * new judgment is whether a transport security layer was chosen at all
 * (`security` itself, which no earlier module evaluates as a verdict).
 *
 * Deliberately independent of `compatibilityScore` (§1.5's warning, ADR-011
 * principle 2): this module reads Reality Analyzer's `issues.length` — a
 * continuous count — never `compatible`, the boolean a future
 * `compatibilityScore` will be built from. `securityScore` lands in
 * `AnalysisObject` (spec 05 §4) as-is; banding it into Excellent/Good/.../
 * Critical (06 §3) is a presentation-layer concern, not this module's.
 */
export interface SecurityAnalysis {
  /** 0-100, ADR-011 Weighted-Penalty model. High = good (inverse of risk). */
  securityScore: number;
  /** Human-readable quality problems the score was deducted for. */
  issues: string[];
}
