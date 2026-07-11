# ADR-027 — Risk Score Formula (Weighted Aggregate of Security + Compatibility + DNS)

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-05 |
| **Deciders** | Mehdi (Architecture Review) |
| **Related** | `06-ANALYZER_ENGINE` §3 (Risk Scoring bands, the open flag this ADR closes) §3.1 (new section this ADR requires); `05-UNIVERSAL_NODE_MODEL` §4 (`AnalysisObject.riskScore`/`compatibilityScore` as distinct frozen fields); `ADR-011-SECURITY-SCORE-FORMULA` (the `securityScore` this formula consumes, and the four governing principles it set that this ADR must remain compatible with); `core/analyzer/extended/compatibility-analyzer.js`, `core/analyzer/extended/dns-analyzer.js` (ADR-022), `core/analyzer/core/reality-analyzer.js`; `09-DEVELOPMENT_ROADMAP` Phase 6/12 |
| **Anti-Chaos Rule** | None triggered — this closes the second (and last) explicitly-deferred open flag ADR-011 itself left open (`ADR-011` §"Explicitly out of scope": "the aggregate formula is deferred to whatever later module/report assembles the full `AnalysisObject`, since it needs `compatibilityScore` and `dnsLeakRisk` to exist first"). It specifies the computation behind two already-frozen `AnalysisObject` fields (spec 05 §4: `compatibilityScore`, `riskScore`); it adds no new field to `AnalysisObject` and removes none. |
| **Tier** | Lightweight — additive decision, no change to `AnalysisObject`'s shape, no change to any already-built Analyzer's own output contract (`analyzeCompatibility()` keeps returning exactly `{platforms, clients}`; `analyzeSecurity()`/`analyzeDnsLeakRisk()` are untouched — this ADR only adds a new, separate consumer of their outputs). |

## Context

`ADR-011` computed `securityScore` and explicitly deferred two things: (1) `compatibilityScore` itself — `analyzeCompatibility()` (06 §2.6) only ever produced a `{platforms, clients}` map of `boolean | null` verdicts, never a single 0–100 number — and (2) `riskScore`, doc 06 §3's aggregate of "Security + Compatibility + DNS + Reality" into one final number, banded by the existing 5-tier table (`0–20 Excellent … 81–100 Critical`, where **low = good**, the mirror image of `securityScore`'s own direction).

Before `riskScore` can be written at all, `compatibilityScore` must exist — doc 06 §3's aggregate formula needs a real number to read, not a map. This ADR resolves both, in that order, as one Lightweight decision (neither touches an already-shipped Analyzer's contract).

### Sub-problem A: `compatibilityScore` from `{platforms, clients}`

`analyzeCompatibility()` (`core/analyzer/extended/compatibility-analyzer.js`) produces two records:
- `clients`: one `boolean | null` verdict per named client app (`xray`, `sing-box`, `clash-meta`, `nekobox`, `v2rayng`, `hiddify`) — can THIS SPECIFIC client use the node (protocol + transport + security all supported)?
- `platforms`: one `boolean | null` verdict per OS (`android`, `ios`, `windows`, `linux`, `macos`) — computed by `platformCompatibility()` as `or3(clients available on that OS)` — i.e. **derived from `clients`**, not an independent measurement.

Because `platforms` is a pure OR-projection of `clients` through a static, node-independent availability table, folding both into one score would weight the same six underlying facts twice (once directly, once through their platform projection) — exactly the kind of double-count `ADR-011` was careful to avoid for `tls.issues`/`reality.issues`. **`compatibilityScore` is therefore computed from `clients` only.**

### Sub-problem B: does `Reality` need its own, fourth term in `riskScore`?

Doc 06 §3's original wording lists four inputs: "Security + Compatibility + DNS + Reality". A direct grep of what Reality Analyzer (`core/analyzer/core/reality-analyzer.js`) actually outputs shows this is not a fourth independent signal:

- `reality.issues.length` (a continuous count) is **already** the `8 * reality.issues.length` term inside `securityScore` (`ADR-011`, unconditional on `applicable` — it applies to the non-Reality stray-pbk/sid branch too). `reality.compatible` is defined as literally `issues.length === 0` — a boolean view of the exact same count. Any function of `reality.issues`/`reality.compatible` is therefore fully redundant with `securityScore`.
- Whether a *client* even implements the Reality *protocol layer* at all (`REALITY_CLIENT_SUPPORT`, `compatibility-analyzer.js`) is **already** folded into `clientCompatibility()`'s `securitySupport` term, which feeds `compatibilityScore` (sub-problem A above).

So every real fact Reality Analyzer and the Compatibility Analyzer's Reality-aware branch produce is already fully distributed across `securityScore` (structural soundness of THIS node's own pbk/sid/fingerprint) and `compatibilityScore` (does a given client's app understand the Reality protocol at all) — two genuinely different questions, per `ADR-011` principle 1 ("Reality Analyzer's issue count may be an input... but must never be (or stand in for) `compatibilityScore`") and `06-ANALYZER_ENGINE` §1.5's own warning ("a node can be Secure but not Compatible with a specific client, or vice versa"). Adding a *third*, separate "Reality" term to `riskScore` would double-count both of these a second time. **`riskScore` therefore has three independent input terms, not four** — Reality's real signal already flows in through `securityScore` and `compatibilityScore`. This is a genuine architectural finding grounded in the actual code (not an oversight in this ADR): doc 06 §3's four-name list pre-dates both `ADR-011` and `compatibility-analyzer.js`'s Reality-aware branch, both of which already absorbed it.

## Decision

### `compatibilityScore` (06 §2.6 → `AnalysisObject.compatibilityScore`)

```
value(v: boolean | null) = 100 if true, 0 if false, 50 if null

compatibilityScore = round(mean of value(clients[c]) for the six named clients)
```

`null` ("نامشخص" — version-dependent, not knowable from a `UNMNode` alone, per `compatibility-analyzer.js`'s own Rule 9 boundary) maps to **50, the numeric midpoint** — neither credited as working nor penalized as broken. This is not an arbitrary third bucket: it is the same "`null` = neutral" philosophy the Validation Engine already established for `ValidationObject`'s tri-state AND (spec 04) and `compatibility-analyzer.js`'s own `and3`/`or3` Kleene logic, generalized from a logical context to a numeric one. The alternative — treating `null` the same as `false` — would make an honestly-unknown verdict actively count against the score, which is the opposite of Rule 9's intent (never let "we don't know" masquerade as "no").

Computed by `computeCompatibilityScore(compatibility: CompatibilityAnalysis)` in the new `core/analyzer/risk-score.js` — a **separate function**, not an addition to `compatibility-analyzer.js`'s own `analyzeCompatibility()`. Reasoning: `analyzeCompatibility()`'s `{platforms, clients}` shape has been shipped, tested (`tests/analyzer/compatibility-analyzer.test.js`), and Playwright-verified in the real Analyzer Screen since Phase 10 — changing its return shape now is unnecessary risk for a Lightweight decision. The established pattern in this exact codebase for "a new module reads an existing module's output without touching it" is `analyzeSecurity()` itself, which reads `CompletenessResult`/`TlsAnalysis`/`RealityAnalysis` without adding fields to any of them. `computeCompatibilityScore` follows the identical shape.

### `riskScore` (06 §3 → `AnalysisObject.riskScore`)

Three independent inputs (Reality's real contribution already inside the first two — see Context, sub-problem B), each converted to a **risk** contribution (`100 - goodness` for the two goodness scores; a direct table for the enum), then combined as a fixed-weight average:

```
securityRisk      = 100 - securityScore
compatibilityRisk = 100 - compatibilityScore
dnsRisk           = DNS_RISK_VALUE[dnsLeakRisk]

DNS_RISK_VALUE = { none: 0, low: 25, medium: 50, high: 100, unknown: 50 }

riskScore = clamp(round(
  0.5 * securityRisk
  + 0.2 * compatibilityRisk
  + 0.3 * dnsRisk
), 0, 100)
```

Computed by `computeRiskScore({ securityScore, compatibilityScore, dnsLeakRisk })` in `core/analyzer/risk-score.js`.

**Weights (0.5 / 0.2 / 0.3 — fixed, not tunable, mirroring `ADR-011`'s own fixed-integer convention):**
- **Security 50%** — the dominant driver. `securityScore` already aggregates TLS/Reality/Encryption/Fingerprint/ALPN/Flow/PBK/SID/completeness (`ADR-011`) — the widest, most direct proxy for "how exposed/detectable/broken is this node's actual connection," which is what "risk" conventionally means for a proxy config.
- **DNS 30%** — a real, independent privacy/security risk vector `securityScore` never reads at all (DNS Analyzer, `ADR-022`, operates on `extensions.configDns`/`extensions.wireguard.dns`, fields Security Analyzer has no access to). A DNS leak can deanonymize a user even behind a perfectly-configured TLS/Reality tunnel, so it earns the second-largest weight, not a token one.
- **Compatibility 20%** — named explicitly in doc 06 §3's original scope, so it must contribute, but it is conceptually softer than the other two: an incompatible node is a **usability** failure (it simply will not connect with a given client) rather than an **exposure** risk (it does not leak anything or make an active connection more detectable). Included with real weight, not dropped, but deliberately the smallest of the three.

**`unknown` DNS risk = 50 (neutral midpoint), not excluded or re-weighted.** This mirrors `compatibilityScore`'s own `null → 50` choice above for the same reason: the large majority of real nodes (every URL/subscription-derived node, per `ADR-022`'s own documented scope) structurally carry no DNS data at all — this is not a defect of that particular node, so it must not be punished with a `high`-risk value, but it is also not verified-safe, so it must not be credited with a `none`-risk value either. A neutral midpoint is the only choice that does not fabricate a verdict the data does not support (Rule 9), and keeps the aggregation formula simple (a fixed 3-term weighted average, no dynamic re-normalization branch for "DNS unknown, redistribute its weight" — one fewer conditional path to get wrong, and one less deviation from `compatibilityScore`'s own established `null`-handling rule right above it).

### Band compatibility (mirrors `ADR-011`'s own principle 4)

Doc 06 §3's existing 5-tier table (`0–20 Excellent … 81–100 Critical`) already reads correctly for `riskScore` as written here — this is the score the table's literal labels were authored for (`ADR-011` §"Band compatibility": "its literal labels... are written for `riskScore`, where low = good"). No inversion is needed (unlike `securityScore`, which needed the reversed reading). Banding remains a presentation-layer concern; `computeRiskScore()` returns the raw number only, exactly like `analyzeSecurity()` does for `securityScore`.

### Where these are computed and wired

Both live in the new `core/analyzer/risk-score.js` — deliberately **not** named `final-report.js`: doc 06 §4's "Final Report" is a much larger, still-entirely-unbuilt surface (Summary, Warnings, Recommendations, Conversion/Optimization/Security/Compatibility Suggestions) that this ADR does not attempt and that has no other inputs ready yet. Naming the module after the two scores it actually computes avoids implying a scope this checkpoint does not deliver.

`analyzeNode()` (`core/analyzer/analyze-node.js`) threads both into `AnalysisBundle` as two new fields — `compatibilityScore: number` and `riskScore: number` — alongside the existing raw `compatibility: CompatibilityAnalysis` and `dns: DnsLeakRisk` fields (which stay exactly as they are; the new fields are additive, not replacements). This is the same threading pattern already used for `security`/`reality`/etc.

UI: wired into the existing Analyzer Screen (`ui/analyzer/analyzer-screen.tsx`), not the Dashboard. Both `compatibilityScore` and `riskScore` are **per-node** numbers, exactly like `securityScore` — the Analyzer Screen already reads and displays the full per-node `AnalysisBundle`; the Dashboard's only existing score aggregate (`selectAverageSecurityScore`) is a cross-node average, a different kind of number this ADR does not attempt to add a parallel aggregate for (that would be a real, separate, additive follow-up, not part of closing this flag). `riskScore` is added as a new row in the existing "Security Analysis" section (immediately after `securityScore` — the two numbers are read together most naturally), and `compatibilityScore` as a new row in the existing "Platform & Client Compatibility" section (it is the numeric summary of exactly that section's own table).

## Consequences

- **The last open flag from doc 06 §3 is closed.** `riskScore` and `compatibilityScore` are both real, computed, wired, and tested — no field in `AnalysisObject` (spec 05 §4) is left without a defined formula.
- **No double-counting, verified by construction.** Reality's real signal (structural pbk/sid/fingerprint soundness → `securityScore`; protocol-layer client support → `compatibilityScore`) is never re-added as a fourth term — a genuine finding from reading the actual analyzer code, documented here rather than silently reproducing doc 06 §3's stale four-name list.
- **Consistent `null`/`unknown` handling across both new formulas.** Both `compatibilityScore`'s per-client `null` and `riskScore`'s `dnsLeakRisk: "unknown"` map to the same neutral midpoint (50) — one philosophy, applied twice, not two ad-hoc rules.
- **No change to any existing Analyzer's output contract.** `analyzeCompatibility()`, `analyzeSecurity()`, `analyzeDnsLeakRisk()` are all untouched; `risk-score.js` is purely a new consumer, the same relationship `analyzeSecurity()` already has to `analyzeCompleteness()`/`analyzeTls()`/`analyzeReality()`.
- **Explainability preserved.** Every `riskScore` is reconstructable from exactly three numbers (`securityScore`, `compatibilityScore`, `dnsLeakRisk`) and three fixed weights — the same explainability property `ADR-011` established for `securityScore`.
- **Doc 06 §4's "Final Report" remains fully out of scope** — this ADR only supplies the two numeric fields `AnalysisObject` was already frozen to carry; Summary/Warnings/Recommendations/Suggestions are a separate, still-unbuilt future phase.
