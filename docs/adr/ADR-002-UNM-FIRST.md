# ADR-002 — UNM-First (Compiler-Inspired Central IR)

| | |
|---|---|
| **Status** | Accepted (Core Law) |
| **Date** | 2026-06-24 |
| **Deciders** | Mehdi (Architecture Review) |
| **Related** | `01-MASTER_BLUEPRINT` §8, `05-UNIVERSAL_NODE_MODEL`, `04-PARSER_ENGINE`, `ANTI_CHAOS_BLUEPRINT` |
| **Anti-Chaos Rule** | Rule 10 (UNM is the single source of truth), Rule 13 |

## Context

UNCT ingests many config formats (Xray JSON, Sing-box JSON, Clash YAML, subscription Base64,
VLESS/VMESS/Trojan/SS/Hysteria2/TUIC URLs, WireGuard). Without a shared model, every module would
couple to every input format and to every other module — combinatorial complexity.

## Decision

Adopt the **Universal Node Model (UNM)** as the central intermediate representation, analogous to
an **AST** in a compiler. The only legal data flow is:

```
Raw Input → Parser → UNM → All Other Modules
```

- Only the Importer and Parser layers may touch raw input. Analyzer, Converter, Exporter, and UI
  operate **exclusively** on UNM.
- UNM depends on nothing; everything else depends on UNM.
- UNM is **immutable** (`05-UNIVERSAL_NODE_MODEL` Rule 8): any change produces a new instance
  (structural sharing), never an in-place mutation.
- `nodeId`, `createdAt`, `updatedAt` are always system-generated, never read from raw input.

## Phase 1 implementation

- Types live in `core/types/` (`.d.ts` + JSDoc), exactly per `05-UNIVERSAL_NODE_MODEL` — no field
  added or removed (Architecture Freeze zone).
- Runtime enums / defaults live in `core/unm/schema/`.
- `core/unm/create-node.js` enforces the invariants (generated id/timestamps, non-null metadata
  arrays, frozen output).

## Consequences

- Maximum decoupling and testability; new protocols become new parsers, not core rewrites.
- The Freeze on UNM schema means schema changes require a new ADR (Rule 13).
