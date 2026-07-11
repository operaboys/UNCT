# ADR-030 — Settings Behavioral Toggles: Strict Validation, Auto-repair, Dedup-on-import

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Type** | Full ADR (behavior change to how nodes are classified/imported — not a Lightweight/Additive-only change) |
| **Scope** | `core/store/settings-state.js`, `core/validator/derive-status.js` (new), `core/parser/parse-and-validate.js`, `core/worker/parser.worker.js`, `core/store/selectors.js`, `core/storage/wipe.js` (new), `ui/settings/settings-screen.tsx`, `ui/converter/converter-screen.tsx`, `ui/subscription/subscription-screen.tsx` |
| **Phase** | Post-visual-redesign Settings completion (handoff `docs/design/design_handoff_unct_liquid_glass/`) |

## Context

The handoff's Settings screen shows four rows beyond Theme/Language: Strict Validation,
Auto-repair, Deduplicate, and Anonymous Telemetry (a locked-off toggle, opacity .55, not
clickable). `core/store/settings-state.js` today holds only Theme/Language — its own header
comment is explicit that this was deliberate ("this store is deliberately just the one
preference... anything else is Backlog, not built here"). This ADR is that backlog item: it
adds the three real, functioning toggles and records the Owner's decision to drop Telemetry
from the UI entirely (not just leave it disabled).

## Decision — Telemetry row removed

**Not built, not shown, not disabled-and-greyed.** UNCT has no telemetry code anywhere in the
codebase and no server to send it to (offline-first, `common.offlineBadge` already states this
on every screen). A disabled toggle with no real mechanism behind it is dead UI — Rule 9 (never
fabricate) applies to controls, not just data. The privacy guarantee it would have communicated
is already carried by the existing Footer Badge ("Offline · everything stays on your device").
The handoff's own toggle-list is followed for the other three rows only.

## Decision 1 — Strict Validation (default: **off**)

**What it does:** a purely-derived, reversible UI status layer over data the Validation Engine
(`core/validator/validate-node.js`) already produces — it adds no new validation rule and
changes no `ValidationObject` field.

Precise definition, matched against the actual Engine (04-PARSER_ENGINE Stage 13 / 05 §5):

- A node's validation diagnostics are folded into `metadata.warnings`/`metadata.errors` as
  `"CODE: message"` strings by `core/validator/apply-validation.js` — `error`/`critical`
  severity → `errors` (these already flip `overallValid` to `false`, i.e. "Invalid", regardless
  of this toggle); `info`/`warning` severity → `warnings`.
- Every diagnostic code from the `VAL` layer (`VAL_TLS_NO_SNI`, `VAL_ALPN_INVALID`,
  `VAL_PATH_INVALID`, `VAL_HOST_INVALID`) is `warning`-severity by construction
  (`core/errors/registry.js`) and, per `validate-node.js`'s own documented Phase-1 compromise,
  does **not** flip any flag to `false` — `overallValid` stays `true`. Today's UI never
  surfaces this distinction (Subscription Center/Converter Screen only ever show a binary
  Valid/Invalid tag).
- **"No TLS" is explicitly not a warning.** `security: "none"` produces zero diagnostics in
  `validate-node.js` — there is no branch that inspects the absence of TLS at all. Only a real
  inconsistency — `security: "tls"` claimed but no `sni` set, a malformed `alpn`/`path`/`host`
  value — reaches a `VAL_*` warning. This matches the Owner's decision exactly and needed no
  Engine change to satisfy — it was already the Engine's behavior; this ADR just codifies it as
  the precise boundary "Strict Validation" reacts to.

**Derivation (new, `core/validator/derive-status.js`):**

```
hasValidationWarning(node) = node.metadata.warnings.some(w => w.startsWith("VAL_"))

deriveNodeStatus(node, { strictValidation }):
  if !node.validation.overallValid        → "invalid"
  else if hasValidationWarning(node):
    strictValidation ? "rejected" : "warning"
  else                                     → "valid"
```

This turns the previously-binary Valid/Invalid tag into the four states the handoff's own
Analyzer table already designs for (`stValid`/`stWarn`/`stErr` — this ADR adds the missing
`stRejected` on top). **The node is never removed, filtered out of exports, or excluded from
any count** other than the status label itself — turning the toggle off immediately relabels
every "Rejected" node back to "Warning": fully reversible, computed fresh on every read, no
node mutation, no re-parse needed.

**Where it's wired:** `core/store/selectors.js` and the two screens that render the status tag
(`ui/subscription/subscription-screen.tsx`'s Node List, `ui/converter/converter-screen.tsx`'s
Normalized Object table) call `deriveNodeStatus(node, { strictValidation })` instead of reading
`node.validation.overallValid` directly for display. `selectValidNodeIds`/
`selectNodesFilteredByValidity`/`selectDeduplicatedNodes` and every count elsewhere are
untouched — they still mean exactly "structurally valid" as before; "Rejected" is a presentation
label, not a new judgment about validity (Rule 11: UI never computes, but here the reverse
also holds — this new "judgment" lives in `core/`, not inline in a screen).

## Decision 2 — Auto-repair (default: **on**, i.e. today's existing behavior)

**What "repair" means here:** the Recovery Strategy fallback chain (12-PARSER_FACTORY §5) —
every registered parser's `recover()` method, invoked from the ONE shared call site
(`ParserFactory.parseWithFallback`, and per-line in `core/parser/subscription/normalize.js`'s
`parseOneLine` for subscription expansion) whenever a plain `parse()` throws. A node that came
through `recover()` already carries a non-empty `metadata.recoveryActions` array — every
parser's `normalize.js` already copies `extraction.recoveryActions` onto the node
(`core/unm/create-node.js`'s `recoveryActions` field, Rule 5 — never null) and already lowers
that node's own `metadata.confidence` (75 vs. 90 clean) as a quality signal. This ADR's
`hasRecoveryActions(node) = node.metadata.recoveryActions.length > 0` reuses that existing,
already-computed signal — zero new parser/recovery code.

**Why the toggle does not literally disable `recover()`:** `recover()` is the *only* path that
turns genuinely malformed input (a broken-Base64 subscription blob, a malformed URL segment)
into any node at all. Actually skipping it would do one of two things depending on context,
neither matching the Owner's spec of "input still parses, node enters the set, flagged
Warning": for a single raw import it would make the whole `parseWithFallback` throw ("Unknown
Format"/parse error) instead of producing a degraded-but-real node; for one bad line inside a
multi-hundred-node subscription, `parseOneLine` already drops an unrecoverable line silently
today (Rule 9 forbids fabricating a line from nothing) — disabling recovery would silently
shrink the batch, a real Data Loss regression the project's own Rule 9 exists to prevent.
Neither outcome is "enters the set with a Warning label" — both are worse than what exists
today. So Auto-repair is implemented at the same derived-status layer as Strict Validation,
not inside the Architecture-Freeze recovery chain itself:

```
deriveNodeStatus(node, { strictValidation, autoRepair }):
  if !node.validation.overallValid        → "invalid"
  else if hasValidationWarning(node):
    strictValidation ? "rejected" : "warning"
  else if !autoRepair && hasRecoveryActions(node) → "warning"
  else                                     → "valid"
```

When Auto-repair is ON (default = today): a repaired node is indistinguishable from a clean one
in the status tag, exactly current behavior — its `recoveryActions` were always visible in
Converter Screen's own "Recovery Actions" panel (`selectAggregatedRecoveryActions`, unchanged),
just not reflected in the status tag. When OFF: the same node — still fully present, still
carrying all its real data, nothing dropped — is labeled "Warning" instead of "Valid", making
visible exactly what the toggle promises: *repair is happening invisibly right now; turn this
off if you want to know when it did.* Developer Console's Recovery Logs
(`selectAggregatedRecoveryActions`) already lists every repair action taken; no separate
"skipped" log entry is fabricated, since nothing was actually skipped.

## Decision 3 — Deduplicate on import (default: **on** — changes the current default)

**This is a real default-behavior change**, called out explicitly per the task brief. Today,
Converter Screen's Parse (`runParse` → `parserStore.setNodes(result.nodes)`) never
deduplicates — a user must open Subscription Center and press the existing manual
"Run Deduplicate" button (`selectDeduplicatedNodes`, `handleDeduplicate`). With this ADR, the
DEFAULT experience deduplicates automatically at the moment of Parse, reusing that exact same
selector (`core/store/selectors.js#selectDeduplicatedNodes` — same `duplicateKey` identity
criterion, same "keep earliest `createdAt`" tie-break) — not a second dedup algorithm.

**Why change the default:** a first-time/casual user importing a subscription with duplicate
nodes (a common real occurrence — MANY subscription providers repeat entries across rotation
windows) gets a cleaner, non-inflated Node List immediately, without needing to discover a
separate button. Power users who want to inspect duplicates before merging can turn the setting
off in Settings.

**Scope — Converter Screen's primary Parse/Import path only.** Subscription Center's own
"Merge Subscription" feature (`handleMerge`, which is *additive*, not a replace-the-set import)
keeps its already-documented, separate decision ("Deliberately NOT deduplicated automatically...
Merge and Deduplicate stay two separate, single-purpose actions") — untouched by this ADR. The
manual "Run Deduplicate" button in Subscription Center is not removed; it remains useful when
the setting is off, or to re-run after a Merge.

## Decision 4 — Wipe Data

A new `core/storage/wipe.js#wipeAllAppData()`: clears every LocalStorage key this app owns
(`createLocalAdapter().clear()` — the same shared adapter/prefix already used by Theme,
Language, the two new toggles, Node Tags, and Recent Exports, so one call resets all of them
uniformly) and deletes both IndexedDB databases (`"unct-storage"` — the working Node List,
`"unct-templates"` — the Template Library) via `indexedDB.deleteDatabase`, best-effort (never
blocks the wipe on one database's own error/blocked event). The Settings Screen button requires
a two-step confirmation (native `confirm()`, matching this codebase's existing
zero-new-dependency posture) before calling it, then reloads the page so every store
re-initializes from its own empty-state default — no partial/stale in-memory state survives.

## What is explicitly NOT changed

- `core/validator/validate-node.js` — zero new rules, zero changed flags/severities.
- `ParserFactory.parseWithFallback`'s fallback/recovery chain, any parser's `recover()`
  contract, or `metadata.recoveryActions`'s existing meaning/population.
- `selectDeduplicatedNodes`, `duplicateKey`, or the manual "Run Deduplicate" button.
- Subscription Center's "Merge Subscription" behavior.
- Any export format, the Analyzer Engine, or Security Score computation — a "Rejected"/
  "Warning" node is exported and analyzed exactly like a "Valid" one; this ADR is a Settings +
  display-layer feature only.

## Consequences

- Settings Screen gains three real, functioning, reversible toggles plus a Wipe Data action —
  closing out the handoff's Settings page (minus the Telemetry row, deliberately dropped).
- The Node List / Normalized Object status tag becomes 4-state (Valid/Warning/Rejected/Invalid)
  instead of 2-state (Valid/Invalid); existing tests asserting the old binary tag text are
  updated to account for the new "warning"/"rejected" tag classes (`tag--warning` already exists
  in `theme.css` from the Developer Console severity work; no new CSS class needed for those two
  states, only for "rejected", which reuses `tag--invalid`'s red family since it is, in effect,
  "invalid by policy" rather than a new color).
- A fresh install/first-run gets a de-duplicated Node List by default — the one deliberate,
  documented default-behavior change in this ADR.
