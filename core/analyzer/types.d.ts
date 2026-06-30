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

/** Operating-system row of the Compatibility Analyzer (§2.6). */
export type Platform = "android" | "ios" | "windows" | "linux" | "macos";

/** Client-app row of the Compatibility Analyzer (§2.6). */
export type ClientApp = "xray" | "sing-box" | "clash-meta" | "nekobox" | "v2rayng" | "hiddify";

/**
 * Output of the Compatibility Analyzer (§2.6) — the first نیمه‌قطعی/semi-
 * definitive (Extended) module, chosen first for being lowest-risk (a static
 * lookup table, not multi-layer decoding like Cloudflare/Worker §2.1-§2.3).
 *
 * Question: would a real client on a real platform actually be able to USE
 * this node? Two deliberately separate sub-questions per §2.6's own
 * correction note (it used to conflate them):
 *  - Client Compatibility: does a specific client app's core implement this
 *    node's protocol/transport/security combination at all?
 *  - Platform Compatibility: does ANY client app exist, on this OS, that is
 *    Client-Compatible with this node? (so Platform is derived FROM Client,
 *    via a static, node-independent platform->client availability table —
 *    never re-derived from protocol/network/security directly.)
 *
 * NOT validity (Validation Engine, spec 04), NOT a quality score (Security
 * Analyzer, §1.2), NOT Reality Compatibility (Reality Analyzer, §1.5 — that
 * judges whether THIS node's own pbk/sid/fingerprint are usable at all,
 * independent of any client; this module instead asks which of the six named
 * clients support the Reality protocol layer in the first place).
 *
 * Tri-state per cell, never a coin-flip guess (Rule 9): `true`/`false` only
 * when backed by a documented, citable fact about that client/platform
 * (e.g. "Xray-core never implemented Hysteria2" or "v2rayNG is Android-only").
 * `null` ("نامشخص") whenever the real fact is version-dependent or otherwise
 * not knowable from a `UNMNode` alone (e.g. Reality support on v2rayNG
 * depends on the installed app version, which UNM does not carry) — this is
 * the boundary the task's own example points at, not a generic "don't know".
 */
export interface CompatibilityAnalysis {
  /** Per-platform verdict: does any compatible client exist for this OS? */
  platforms: Record<Platform, boolean | null>;
  /** Per-client verdict: can this specific client app use this node? */
  clients: Record<ClientApp, boolean | null>;
}

/**
 * Confidence level for pattern-match analyzers that produce probabilistic
 * verdicts rather than definitive boolean claims (Rule 9: never over-claim
 * certainty that the data does not support). Used by CloudflareAnalysis and
 * CleanIpAnalysis.
 *
 *  - "low"    — one weak structural signal only (e.g. port alone)
 *  - "medium" — one medium signal without corroboration
 *  - "high"   — strong or corroborated signals (e.g. .workers.dev domain)
 */
export type AnalysisConfidence = "low" | "medium" | "high";

/**
 * One entry produced by the Worker Analyzer's best-effort Base64 extraction
 * (§2.2). Reports what was found and what decoding produced, without claiming
 * to know WHAT the binary/text payload means (Rule 9).
 */
export interface WorkerEncodedFinding {
  /** "path:<segment>" or "param:<key>" — locates the value in the node's path. */
  source: string;
  /** The raw (undecoded) value as it appeared in the path/query string. */
  raw: string;
  /** Printable decoded text, or null when decoded bytes are non-printable (binary). */
  decoded: string | null;
  /** True when the value matched the Base64 alphabet but its bytes were binary/unprintable. */
  rawBase64Detected: boolean;
}

/**
 * Output of the Worker Analyzer (06-ANALYZER_ENGINE §2.2, Phase 10).
 * Extracts structured Worker details from a node that was already identified
 * as `likelyCloudflareWorker=true` by the Cloudflare Analyzer (§2.1). When
 * `applicable` is false (node was not a likely Worker), all other fields are
 * empty/null — no extraction ran (Rule 9: no fabricated data on non-Workers).
 *
 * Deliberately NOT a re-detection: the `applicable` flag is read directly from
 * the upstream `CloudflareAnalysis.likelyCloudflareWorker`, never recomputed.
 */
export interface WorkerAnalysis {
  /** True when CloudflareAnalysis.likelyCloudflareWorker was true and extraction ran. */
  applicable: boolean;
  /** The address/host/sni field that matched a Worker/Pages domain suffix; null when not applicable or no such field found. */
  workerDomain: string | null;
  /** Non-empty path segments from node.path (before '?'), in order. */
  pathSegments: string[];
  /** First UUID-shaped path segment found (RFC 4122); null if none. */
  uuidSegment: string | null;
  /** Parsed query-string parameters as key→value strings. */
  parameters: Record<string, string>;
  /** Base64-shaped values found in path segments or parameter values, with decode attempts. */
  encodedDataFindings: WorkerEncodedFinding[];
}

/**
 * Output of the Cloudflare Analyzer (06-ANALYZER_ENGINE §2.1, Phase 10).
 * Detects structural patterns associated with Cloudflare Worker endpoints —
 * NEVER a definitive "yes this is a Worker" claim (no such header exists).
 *
 * Signals considered (in descending evidential weight):
 *  - address/host/sni ends with .workers.dev or .pages.dev  → HIGH
 *  - path contains ed=2048/2560 (Cloudflare early-data param)  → MEDIUM
 *  - path contains UUID-shaped segment (common in Worker routing) → MEDIUM
 *  - port is in the Cloudflare-known proxy port set  → LOW (alone)
 *
 * likelyCloudflareWorker is true when confidence reaches MEDIUM or HIGH.
 * A single CF-port signal without anything else leaves it false (too weak).
 */
export interface CloudflareAnalysis {
  /** Whether structural signals suggest this is a Cloudflare Worker endpoint. */
  likelyCloudflareWorker: boolean;
  /** How strongly the available signals support the verdict. */
  confidence: AnalysisConfidence;
  /** Human-readable list of every matched signal, for debugging/display. */
  signals: string[];
}

/**
 * Output of the Clean IP Analyzer (06-ANALYZER_ENGINE §2.3, Phase 10).
 * Detects the "Clean IP" pattern: the connection target (`address`) is a raw
 * IPv4/IPv6 while the TLS handshake domain (`host`/`sni`) is a separate,
 * different domain.
 *
 * Structural rationale: in CDN-based proxying the IP is "clean" (not yet
 * filtered per-IP) while SNI carries a CDN-hosted domain so traffic looks
 * like normal CDN traffic. This analyzer ONLY recognises the structural
 * pattern — it makes NO liveness claim (doc 01 Non-Goals: UNCT is not a
 * Real-Time Connection Engine; "clean" does not mean "currently unblocked").
 *
 * No external IP lists are embedded (Rule 9 / task constraint): all judgement
 * is derived from the UNMNode fields alone.
 */
export interface CleanIpAnalysis {
  /** Whether the node exhibits the address-IP + host/sni-domain pattern. */
  isCleanIpPattern: boolean;
  /** Confidence in the verdict. */
  confidence: AnalysisConfidence;
  /** Human-readable list of matched signals. */
  signals: string[];
}

/**
 * One identity-key collision group from the Subscription Analyzer's
 * duplicate detection (§2.5) — always length >= 2. See
 * `extended/subscription-analyzer.js`'s `duplicateKey` for the criterion
 * and its justification.
 */
export interface DuplicateGroup {
  /** The shared identity key these nodes collide on (protocol|address|port|credential). */
  key: string;
  /** Every node sharing that identity key. */
  nodeIds: string[];
}

/**
 * One node's place in the Subscription Analyzer's Security Ranking (§2.5).
 * Nodes the Analyzer has not yet scored are OMITTED entirely from the
 * ranking, never represented with a fabricated 0 (Rule 9).
 */
export interface SecurityRankEntry {
  nodeId: string;
  /** Echoed from that node's own `AnalysisBundle.security.securityScore` (ADR-011). */
  securityScore: number;
}

/**
 * Output of the Subscription Analyzer (§2.5) — the second نیمه‌قطعی
 * (Extended) module (Phase 10), picked second for being the next-lowest-risk
 * module in §2 after Compatibility (§2.6).
 *
 * Unlike every other analyzer module (the six §1 Core modules, plus
 * Compatibility §2.6), this one's INPUT is a whole `UNMNode[]` collection,
 * not one node — §2.5's own text: "این مورد به مجموعه‌ای از Nodeها (نه یک
 * Node تنها) عمل می‌کند". Its OUTPUT is therefore also one aggregate object,
 * never a per-node verdict — it does not appear in `AnalysisBundle` and is
 * never threaded through `analyze-node.js`.
 */
export interface SubscriptionSummary {
  /** `nodes.length`. */
  totalNodes: number;
  /** Count of nodes per `protocol`. */
  protocolDistribution: Record<string, number>;
  /** Identity-key collision groups (each length >= 2). */
  duplicateGroups: DuplicateGroup[];
  /** Total nodes appearing across `duplicateGroups` (sum of group sizes) — the headline "Duplicate Nodes" count. */
  duplicateNodeCount: number;
  /** nodeIds where `validation.overallValid === false` — read from the Validation Engine's own existing verdict, never re-judged here. */
  invalidNodeIds: string[];
  /** Always `null`: no field anywhere in UNM/metadata records connection liveness, so there is nothing to compute "candidate" from (Rule 9). */
  deadNodesCandidate: null;
  /** Nodes the Analyzer has scored, sorted highest-`securityScore`-first; un-Analyzed nodes are omitted, never defaulted to 0 (Rule 9). */
  securityRanking: SecurityRankEntry[];
}
