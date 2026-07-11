/**
 * Risk Score — 06-ANALYZER_ENGINE §3.1, ADR-027. Closes the last two open
 * `AnalysisObject` fields (spec 05 §4): `compatibilityScore` and `riskScore`.
 *
 * Deliberately NOT named `final-report.js`: doc 06 §4's "Final Report"
 * (Summary/Warnings/Recommendations/Suggestions) is a much larger, still
 * entirely-unbuilt surface this module does not attempt — it only supplies
 * the two numeric fields `AnalysisObject` was already frozen to carry.
 *
 * Both functions are pure consumers of already-shipped Analyzer output —
 * `analyzeCompatibility()` (`extended/compatibility-analyzer.js`) and
 * `analyzeDnsLeakRisk()`/`analyzeSecurity()` are untouched by this module,
 * mirroring how `analyzeSecurity()` itself only reads Completeness/TLS/
 * Reality without adding fields to any of them (ADR-011's own pattern).
 *
 * Reality's real contribution (structural pbk/sid/fingerprint soundness, and
 * whether a client's app understands the Reality protocol layer at all) is
 * already fully absorbed by `securityScore` and `compatibilityScore`
 * respectively (see ADR-027 Context, sub-problem B) — there is deliberately
 * no separate, fourth "Reality" term here; adding one would double-count
 * data both scores already fully consume.
 *
 * @typedef {import("./types").CompatibilityAnalysis} CompatibilityAnalysis
 * @typedef {import("../types/unm").DnsLeakRisk} DnsLeakRisk
 */

/**
 * A tri-state Compatibility Analyzer verdict mapped to its numeric
 * contribution. `null` ("نامشخص", version-dependent — not knowable from a
 * `UNMNode` alone) maps to the neutral midpoint, never credited as working
 * nor penalized as broken — the same "null = neutral" philosophy the
 * Validation Engine already applies to `ValidationObject`'s tri-state AND,
 * generalized from a logical context to a numeric one (ADR-027).
 * @param {boolean | null} value
 * @returns {number}
 */
function clientValue(value) {
  if (value === true) return 100;
  if (value === false) return 0;
  return 50;
}

/**
 * `compatibilityScore` (ADR-027) — computed from `clients` only, never
 * `platforms`: `platforms` is itself an OR-projection of `clients` through a
 * static, node-independent availability table
 * (`compatibility-analyzer.js#platformCompatibility`), so folding both in
 * would weight the same six underlying facts twice.
 * @param {CompatibilityAnalysis} compatibility
 * @returns {number} 0-100, high = good
 */
export function computeCompatibilityScore(compatibility) {
  const values = Object.values(compatibility.clients).map(clientValue);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.round(mean);
}

/** ADR-027 DNS risk table. `unknown` maps to the same neutral midpoint as `clientValue`'s `null` — most nodes (every URL/subscription-derived one, ADR-022) structurally carry no DNS data at all, which is not that node's defect but is also not verified-safe. */
const DNS_RISK_VALUE = Object.freeze({ none: 0, low: 25, medium: 50, high: 100, unknown: 50 });

/** ADR-027 fixed weights — not tunable config, mirroring ADR-011's own fixed-integer convention. */
const RISK_WEIGHTS = Object.freeze({ security: 0.5, compatibility: 0.2, dns: 0.3 });

/**
 * `riskScore` (ADR-027) — a fixed-weight average of exactly three
 * independent risk contributions. Reality is deliberately NOT a fourth term
 * (see module doc-block): its real signal already flows through
 * `securityScore` and `compatibilityScore`.
 * @param {{ securityScore: number, compatibilityScore: number, dnsLeakRisk: DnsLeakRisk }} input
 * @returns {number} 0-100, LOW = good (the inverse direction of securityScore/compatibilityScore — matches 06 §3's band table as originally authored)
 */
export function computeRiskScore({ securityScore, compatibilityScore, dnsLeakRisk }) {
  const securityRisk = 100 - securityScore;
  const compatibilityRisk = 100 - compatibilityScore;
  const dnsRisk = DNS_RISK_VALUE[dnsLeakRisk];

  const weighted = RISK_WEIGHTS.security * securityRisk
    + RISK_WEIGHTS.compatibility * compatibilityRisk
    + RISK_WEIGHTS.dns * dnsRisk;

  return Math.max(0, Math.min(100, Math.round(weighted)));
}
