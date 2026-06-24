# ADR-008 — BaseParser Contract: Multi-Node Output & Optional Recover Error

| | |
|---|---|
| **Status** | Accepted (Full ADR) |
| **Date** | 2026-06-24 |
| **Deciders** | Mehdi (Architecture Review) |
| **Related** | `12-PARSER_FACTORY` §2 (BaseParser Contract), `04-PARSER_ENGINE` Stage 08/10/11, `ANTI_CHAOS_BLUEPRINT` Rule 9 (Data Loss = Critical Failure) & Rule 13 |
| **Tier** | **Full ADR** — `BaseParser` / Parser Factory is in the Architecture Freeze Scope (`ULTIMATE_BLUEPRINT_INDEX`), so any change to the contract requires a full Context/Decision/Consequences review, not a Lightweight note. |

## Context

Two changes to the `BaseParser` contract (12 §2) were made while implementing
the Phase 3 parsers. Both are recorded here so the Freeze-Scope contract is not
edited silently.

### Problem 1 — multi-node parsers and silent data loss

The contract assumes `normalize(extraction) -> UNMNode` (one node). The
Subscription Parser (Stage 08) expands ONE input into MANY nodes. The initial
implementation made `normalize` return the **first** node only, documented as a
limitation. That is unsafe: any caller that reaches for `.normalize()` without
knowing the parser is multi-node silently receives one node and loses the rest
— exactly the "silent Data Loss" that **ANTI_CHAOS Rule 9 (Data Loss = Critical
Failure)** forbids. Documentation records the footgun; it does not remove it.

### Problem 2 — `recover(input, error)` required error

`recover`'s second parameter (`error: ParseError`) is supplied by the factory
when it drives recovery after a failed `parse()`. But recovery is also called
directly (the Subscription parser recovers individual lines; tests call it
directly), where there is no preceding `ParseError`. The required parameter did
not match real usage.

## Decision

### 1. Multi-node parsers — mirror the `isAsync` / `parseAsync` pattern

The contract already has a precedent for "check a flag, then call the right
method": `isAsync?: boolean` + `parseAsync?` (12 §2, reserved for Plugin
Parsers). Apply the same shape:

```ts
producesMany?: boolean;                              // default falsey
normalizeMany?(extraction: RawExtraction): UNMNode[]; // required when producesMany === true
```

- A multi-node parser sets `producesMany = true`, implements `normalizeMany`,
  and its `normalize` **throws loudly** (it never returns a partial result).
- Single-node parsers are unchanged: no flag, `normalize` returns one node.
- `assertImplementsBaseParser` enforces the pairing at registration time, just
  like `isAsync`/`parseAsync`.
- A single safe expansion helper, `normalizeAll(parser, extraction): UNMNode[]`
  (`core/parser/factory.js`), dispatches on the flag so consumers never write
  the check themselves: single-node → `[normalize()]`, multi-node →
  `normalizeMany()`.

This converts the data-loss risk into a **loud, type-visible** decision: the
`UNMNode[]` return and the throwing `normalize` make it impossible to lose nodes
by accident.

### 2. `recover` error parameter is optional

`recover(input: string, error?: ParseError)`. The factory still passes the
`ParseError` when it drives recovery; direct callers may omit it. This is a
backward-compatible widening — every existing implementation already ignored or
optionally read the argument.

## Consequences

- `BaseParser` gains two optional members (`producesMany`, `normalizeMany`) and
  one parameter is loosened. Single-node parsers (Xray, URL) are unaffected and
  were not modified.
- The Subscription parser no longer has a lossy `normalize`; callers use
  `normalizeAll()` / `normalizeMany()` / `parseSubscription()`.
- Future multi-node parsers (e.g. a Clash file with many proxies, Sing-box with
  many outbounds) follow the same flag, so the factory/pipeline handles them
  uniformly.
- Because Parser Factory is Architecture-Stable, this Full ADR is the record of
  record; the contract `.d.ts` references ADR-008 at the changed members.
