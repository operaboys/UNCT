# ADR-009 — Fuzzy Tolerance in Detection (Scheme/Base64 Near-Misses)

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-06-25 |
| **Deciders** | Mehdi (Architecture Review) |
| **Related** | `04-PARSER_ENGINE` Stage 02 (Detection), Stage 10/11 (Recovery); `12-PARSER_FACTORY` §4/§5; `tests/baseline-dataset/README.md` (Phase 2/3 Gate, ADR-006) |
| **Anti-Chaos Rule** | Detection/Confidence Scoring is part of "Parser Philosophy", an Architecture Freeze Scope area — a behavioral change to scoring requires a Full ADR, not a code-only patch. |
| **Tier** | Full — changes the Detection algorithm's output range for a new input class, with direct consequences for false-positive risk. |

## Context

`ParserFactory` (`core/parser/factory.js`) gates in two places — `selectParser()`
and `parseWithFallback()` — by filtering `detect()` candidates to
`confidence >= UNKNOWN_FORMAT_THRESHOLD` (50) **before** `parse()` or
`recover()` is ever called. A parser's `recover()` can be arbitrarily good at
salvaging broken input, but if `detect()` scores that input below 50, the
parser is never even offered as a candidate and `recover()` is unreachable.

The Phase 2/3 raw-config Foundation Gate (ADR-006) surfaced exactly this gap
for two cases, both excluded from the gate dataset and documented as a known
limitation rather than silently worked around:

1. **URL Parser** — a single-character scheme typo (e.g. `vmes://` instead of
   `vmess://`) makes `detectUrl()`'s exact regex (`SCHEME_RE`) fail outright,
   returning 0. `core/parser/url/recover.js` already calls
   `fuzzyMatch(scheme, URL_SCHEMES, 2)` and correctly repairs exactly this kind
   of typo — but it was unreachable, because detection never let the URL
   parser into the candidate list.
2. **Subscription Parser** — a Base64 blob with a handful of stray bytes
   injected (light corruption, not a typo) fails to decode at all
   (`atob` throws, caught, returns `""`), so `detectSubscription()`'s
   "decode and check for URL lines" check never succeeds and it returns 0.
   `core/parser/subscription/recover.js` already sanitizes the Base64 alphabet
   and re-decodes — also unreachable for the same structural reason.

Both are the same root problem (Detection is too strict relative to what
Recovery can actually fix), but the *mechanism* differs: case 1 is a string
identity problem (which scheme name is this?), solved by Levenshtein distance
on a short token; case 2 is a content-corruption problem (how much of this
blob is genuinely Base64?), solved by alphabet sanitization and measuring how
much was stripped. Both fit the same shape: tolerate a *small, bounded* amount
of damage in detection, score it in the mid-range so it clears the threshold
without claiming the certainty of a clean match, and let the existing
Recovery code (already correct, in both cases) do the actual repair.

## Decision

Add bounded fuzzy tolerance to two `detect()` functions, each returning a
**mid confidence score (55)** — above `UNKNOWN_FORMAT_THRESHOLD` (50) so the
parser becomes a fallback candidate, but below the clean-match score (95 for
URL, 90 for Subscription) so an uncertain match is never preferred over an
exact one by "Highest Confidence Wins" (12 §4):

- **`core/parser/url/detect.js`** — when the exact scheme regex fails on a
  single-line, single-token input, extract the candidate scheme (the token
  before `://`) and run `fuzzyMatch(candidate, URL_SCHEMES, 2)` (the same
  helper, same `maxDist`, already used by `recoverUrl`). A match scores 55; no
  match scores 0, unchanged. Multi-line input is left at 0 (Subscription
  territory, unchanged).
- **`core/parser/subscription/detect.js`** — when the raw and decoded checks
  both fail, strip non-Base64-alphabet characters from the compacted input and
  measure the pollution ratio (`1 - sanitized.length / compact.length`). If
  the ratio is `> 0` and `<= 0.15` (i.e. light pollution — at most 15% of
  characters were stray) **and** the sanitized blob decodes to URL lines, score
  55. Anything dirtier, or anything that still doesn't decode to URLs after
  sanitizing, scores 0, unchanged.

In both cases, no `extract()`/`normalize()` logic changes — `recoverUrl` and
`recoverSubscription` already perform the correction; this change only makes
them reachable. `parse()` still throws on the malformed input (unsupported
scheme / broken Base64), so the factory's existing `parseWithFallback()` chain
routes to `recover()` exactly as designed (12 §5).

## Consequences

- **False positives are bounded, not eliminated, by design.** `maxDist=2` on
  scheme names (avg. length 5–9) and a 15% pollution cap are both small
  relative to the input, so an unrelated random string is very unlikely to
  land inside either tolerance — but it is not impossible. This is an accepted,
  bounded risk, consistent with `15-TESTING_FRAMEWORK` §7's <2% false-positive
  budget (verified empirically below), not a guarantee of zero risk.
- **Score separation is the safety margin.** The mid-range score (55) is
  intentionally well below clean-match scores (95/90) so that whenever a
  genuinely well-formed config of *any* format is also in the input space,
  "Highest Confidence Wins" still prefers the real match over the fuzzy guess.
- **No change to Stage 11's absolute rule.** Both fuzzy paths correct
  *structural* identifiers (a scheme name, a content encoding) that are
  already present in the input — neither path invents `uuid`/`password`/`pbk`/
  `sid`/`privateKey`/`publicKey`. This mirrors the existing `recoverUrl`/
  `recoverSubscription` guarantees and adds no new fabrication surface.
- **Verified empirically**: the existing 269-test suite (262 prior + 7 new for
  this change) is green, including the 100-sample Phase 2/3 Foundation Gate
  (`raw-config-gate.test.js`), which still reports 0% false positives on its
  20 INVALID samples. New unit tests assert the exact mid-range score and an
  end-to-end pass through `factory.parseWithFallback()` for both cases (a
  typo'd-scheme URL, and a lightly-polluted Base64 subscription), each
  producing a valid `UNMNode`.
- **Both Detection functions stay pure and synchronous** — no new
  dependencies, no change to the `BaseParser` contract or `ParserFactory`'s
  threshold/algorithm itself (`UNKNOWN_FORMAT_THRESHOLD` is unchanged at 50).
