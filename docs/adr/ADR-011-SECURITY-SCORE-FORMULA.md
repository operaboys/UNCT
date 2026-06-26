# ADR-011 — Security Score Formula (Weighted Penalty Model)

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-06-26 |
| **Deciders** | Mehdi (Architecture Review) |
| **Related** | `06-ANALYZER_ENGINE` §1.2 (Security Analyzer inputs), §3 (Risk Scoring bands, the open flag); `05-UNIVERSAL_NODE_MODEL` §4 (`AnalysisObject.securityScore`/`compatibilityScore` as distinct frozen fields); `core/analyzer/core/data-completeness.js`, `tls-analyzer.js`, `reality-analyzer.js`, `network-analyzer.js`; `09-DEVELOPMENT_ROADMAP` Phase 6 |
| **Anti-Chaos Rule** | None triggered — this closes an explicitly-deferred open flag (doc 06 §3: "فرمول تولید `riskScore`/per-module scores هنوز تعریف نشده... باید قبل از پیاده‌سازی واقعی Phase 6 مشخص شود"). It specifies the computation behind an already-frozen `AnalysisObject.securityScore` field (spec 05 §4); it adds no new field and removes none. |
| **Tier** | Lightweight — additive decision, no change to `AnalysisObject`'s shape, no change to any already-built Analyzer's own output contract (Completeness/TLS/Reality/Network keep returning exactly what they return today; Security Analyzer only *reads* them). |

## Context

Doc 06 §1.2 names the Security Analyzer's inputs ("امتیازدهی بر اساس: TLS,
Reality, Encryption, Fingerprint, ALPN, Flow, PBK, SID + خروجی Data
Completeness Analyzer") but never specifies the arithmetic that turns them
into the 0–100 `securityScore`. §3 flags this explicitly as an open item that
must be resolved "قبل از پیاده‌سازی واقعی Phase 6" (before Phase 6's real
implementation) — i.e. now, before Security Analyzer (item 6, the last Core
module) is written.

Five of the eight named inputs are no longer raw fields by the time Security
Analyzer runs — they are already judged by earlier Phase 6 modules, each with
its own boundary:
- **Fingerprint, SNI** coherence → `analyzeTls()` (§1.3) — boolean `coherent`
  + `issues[]`.
- **PBK, SID** plausibility, and the **Reality-specific** fingerprint
  tightening → `analyzeReality()` (§1.5) — boolean `compatible` + `issues[]`.
- **field presence** (is `encryption`/`alpn`/`flow`/... filled in at all) →
  `analyzeCompleteness()` (§1.0) — `missingFields[]`.

Per the §1.0 consumption rule (already applied by TLS → Reality), Security
Analyzer must *consume* these three outputs rather than re-deriving its own
notion of "is sni missing" or "is pbk plausible" a fourth time. The only
genuinely new judgment Security Analyzer makes is turning these already-typed
verdicts into one combined number, plus one check nothing upstream makes:
whether a *transport security layer was chosen at all* (`security === "none"`
is never itself flagged as an issue by TLS or Reality Analyzer — both only
react to fields being set or coherent *given* a security type, never to the
choice of security type itself).

**A real bug this context surfaced**: `core/parser/*/normalize.js` never sets
`security` for hysteria2/tuic/wireguard (confirmed by source grep — no
`security` assignment exists in any of the three normalizers), so these nodes
always carry the UNM default `security: "none"`, exactly mirroring why
`network` always defaults to `"tcp"` for the same three protocols (Network
Analyzer's existing self-transporting carve-out, §1.4). Their actual wire-level
encryption (QUIC+TLS1.3 for hysteria2/tuic, Noise for wireguard) is mandatory
and structural, not a configurable UNM field. A formula that penalizes
`security === "none"` uniformly across all protocols would tank every
correctly-parsed hysteria2/tuic/wireguard node's `securityScore` — a
false-positive of the same shape Network Analyzer was built to avoid.

The user fixed four governing principles before this ADR was drafted:
1. Reality Analyzer's **issue count** may be an input (a quality signal), but
   must never be (or stand in for) `compatibilityScore`.
2. `securityScore` must be genuinely independent of `compatibilityScore` —
   never a copy or a direct one-line derivation of it.
3. The model must be an explainable **Weighted Penalty**: start at 100,
   subtract weighted deductions, floor at 0.
4. The result must be compatible with doc 06 §3's existing 5-tier band table.

## Decision

### Formula

```
penalty
  = transportBase(security, protocol)
  + 8 * tlsIssuePenaltyCount
  + 8 * reality.issues.length
  + 5 * securityRelevantMissingCount

securityScore = clamp(100 - penalty, 0, 100)
```

Computed by `analyzeSecurity(node, completeness?, tls?, reality?)` in
`core/analyzer/core/security-analyzer.js`, following the exact default-
parameter composition pattern already used by `analyzeTls`/`analyzeReality`
(each optional arg recomputed from the node when the caller doesn't already
have it, so the function works standalone or as the last link in the
Completeness → TLS → Reality → Security chain).

**`transportBase(security, protocol)`** — the only check nothing upstream
makes (is a security layer chosen at all):

| protocol | `reality` | `tls` | `none` |
|---|---|---|---|
| vless / vmess / trojan / shadowsocks | 0 | 10 | 55 |
| hysteria2 / tuic / wireguard | 0 | 0 | 0 |

The second row is the false-positive fix above: for self-transporting
protocols `security` is structurally inert (the parser never sets it away
from the neutral default), so it carries no penalty regardless of value —
the same reasoning Network Analyzer already applies to `network` for these
three protocols. This table is the module's *own* single source of truth
(named export `SECURITY_BASE_PENALTY`/`SECURITY_CHOICE_PROTOCOLS`), mirroring
`SUPPORTED_BY_PROTOCOL` in `network-analyzer.js`.

**`tlsIssuePenaltyCount`** — `tls.issues.length`, *except* it is forced to `0`
when `security === "reality"`. Reason: `analyzeReality` already does
`issues.push(...tls.issues)` whenever `!tls.coherent` (§1.5's consumption of
§1.3), so `reality.issues` is already a superset of `tls.issues` for a Reality
node. Counting both would double-penalize the identical root cause (e.g. a
missing SNI) twice. For `security !== "reality"` there is no such overlap
(Reality Analyzer's own issues are a disjoint stray-pbk/sid check in that
branch), so both terms are independent and both apply.

**`reality.issues.length`** — used as a **count**, never as
`reality.compatible` and never scaled to look like a percentage/score. This
is principle 1: the raw issue count is a *continuous* quality signal (0, 1, 2,
3, 4 distinct problems), structurally different from the *binary* compatible/
incompatible verdict that `compatibilityScore` will eventually be built from.
Reusing the count, never the verdict, is what keeps `securityScore` and the
future `compatibilityScore` independent (principle 2) even though both read
the same upstream `RealityAnalysis` — they apply different arithmetic to
different parts of it (a continuous count here vs. a boolean elsewhere), so
the two scores can and will diverge for the same node (secure-but-incompatible
Reality setups, or vice versa, are exactly doc 06 §1.5's warning).

**`securityRelevantMissingCount`** — `completeness.missingFields` filtered to
`{"encryption", "method", "alpn", "flow"}` only. `sni`/`fingerprint`/`pbk` are
deliberately excluded from this term — their absence is already counted
through `tlsIssuePenaltyCount`/`reality.issues.length` above, so including
them again here would be the same double-count problem one level up. `sid` is
excluded because its absence is not a defect (§1.5: empty/absent `sid` means
"no short ID restriction", never an issue anywhere upstream, and must stay
that way here too). This residual set is exactly doc 06 §1.2's named
"Encryption"/"Flow"/"ALPN" inputs minus what earlier modules already cover —
no field is invented beyond what the spec already lists.

Weights (8 / 8 / 5) and the transport-base table are fixed integers, not
tunable config — consistent with every other Analyzer in this codebase
(`KNOWN_FINGERPRINTS`, `SUPPORTED_BY_PROTOCOL`, `PBK_PATTERN`, etc. are all
plain constants, not configuration surface). `clamp(100 - penalty, 0, 100)` is
the only place a floor/ceiling is applied — no per-term cap, because each
term's natural maximum (the longest `issues` array any one module can
actually produce today) already keeps the sum well inside `[0, 100]` for
every observed combination; the global clamp is the safety net, not the
primary control.

### Band compatibility (principle 4)

Doc 06 §3's table is five `[0,100]` breakpoints shared across modules, but
its literal labels (`0–20 Excellent ... 81–100 Critical`) are written for
`riskScore`, where **low = good**. `securityScore` (like `completenessScore`,
already shipped in §1.0) is a **goodness** score where **high = good** — the
inverse direction. Applying the same five breakpoints with the label
*order* reversed end-to-end (`81–100 Excellent, 61–80 Good, 41–60 Average,
21–40 Poor, 0–20 Critical`) is the only reading that keeps "Excellent" meaning
the same thing (a well-configured node) for both scores. This mapping is a
**presentation-layer concern**: `AnalysisObject` (spec 05 §4, frozen) has only
`securityScore: number` — no label/level field — so `analyzeSecurity()`
returns the raw number only; banding happens wherever doc 06 §4's Final
Report (or the UI) later renders it, not inside the Analyzer.

### Explicitly out of scope

`riskScore` — the *other* open item in doc 06 §3, combining Security +
Compatibility + DNS + Reality into one aggregate — is **not** addressed by
this ADR and not computed by Security Analyzer. Doc 06 §3 itself separates
these two questions ("جدول بالا فقط خروجی نهایی `riskScore` را طبقه‌بندی
می‌کند" — the table classifies the *final aggregate*, not any one module's
score). Security Analyzer's contract is exactly `securityScore`; the
aggregate formula is deferred to whatever later module/report assembles the
full `AnalysisObject` (likely the Final Report, §4), since it needs
`compatibilityScore` and `dnsLeakRisk` to exist first — neither does yet.

## Consequences

- **No false positive on self-transporting protocols.** A correctly-parsed
  hysteria2/tuic/wireguard node with otherwise-clean fields now scores 100
  (`transportBase` = 0 for these three, no other penalty applies), instead of
  being incorrectly punished for a `security` value the parser never had a
  field to set in the first place.
- **`securityScore` and the future `compatibilityScore` are structurally
  independent**, not just independently *computed*: they consume the same
  `RealityAnalysis`/`NetworkAnalysis` outputs but through different
  projections of them (issue *counts* vs. the *boolean* verdict), so no
  refactor of one can accidentally make the other a derived copy.
- **Explainability**: any `securityScore` is reconstructable from four
  numbers (`transportBase`, `tlsIssuePenaltyCount`, `reality.issues.length`,
  `securityRelevantMissingCount`) — useful for the eventual `issues`-style
  breakdown the Final Report (§4) will want, without `analyzeSecurity()`
  needing to expose anything beyond the score itself today.
- **No change to any existing Analyzer's output contract.** Completeness,
  TLS, Reality, Network keep their exact current shapes; Security Analyzer is
  purely a consumer, composed the same way Reality Analyzer already composes
  Completeness + TLS.
- **`riskScore` stays an open flag**, now scoped down to "the Final-Report-
  level aggregation problem" rather than "every score's formula is
  undefined" — a smaller, clearly-bounded follow-up for whichever phase
  builds the Final Report.
