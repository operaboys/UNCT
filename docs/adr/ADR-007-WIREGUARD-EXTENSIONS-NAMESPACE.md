# ADR-007 — WireGuard Extensions Namespace

| | |
|---|---|
| **Status** | Accepted (Lightweight ADR) |
| **Date** | 2026-06-24 |
| **Deciders** | Mehdi (Architecture Review) |
| **Related** | `05-UNIVERSAL_NODE_MODEL` §2 (extensions) / §8 (Core vs Runtime Extensions), `04-PARSER_ENGINE` Stage 09, `12-PARSER_FACTORY` §6 |
| **Tier** | Lightweight — additive convention over the existing `extensions` field; it adds no field to the frozen UNM core, so it is not an Architecture-Freeze change. Recorded as an ADR only because it constrains EVERY current and future parser. |

## Context

The UNM core (`05-UNIVERSAL_NODE_MODEL`) is a frozen, canonical model and has no
WireGuard-specific fields (`privateKey`, `publicKey`, `allowedIPs`, `dns`,
`mtu`, `persistentKeepalive`, ...). By design (05 §8, Core vs Runtime
Extensions) such protocol-specific data belongs in `node.extensions:
Record<string, unknown>`, not on the core node.

The URL Parser already emits WireGuard data there. But Phase 4 parsers
(Sing-box `endpoints`/`peers`, Clash WireGuard proxies) will meet the same data.
Without a fixed convention, each parser would invent its own key names/shape and
downstream consumers (Analyzer, Converter, UI) could not read WireGuard data
uniformly. The convention must be pinned now, before the second producer exists.

## Decision

WireGuard data is stored under a single fixed namespace,
`node.extensions.wireguard`, with this shape (all keys optional; only present
keys are written):

```
extensions.wireguard = {
  privateKey?:           string
  publicKey?:            string     // peer public key
  presharedKey?:         string
  endpoint?:             string     // host:port, only when received combined
  allowedIPs?:           string[]
  dns?:                  string[]
  mtu?:                  number
  persistentKeepalive?:  number     // seconds
  reserved?:             string
}
```

Rules:
- Every parser MUST build this fragment through the shared helper
  `buildWireguardExtensions()` (`core/parser/shared/wireguard.js`) — no parser
  hand-rolls the key names.
- `endpoint` is normally redundant with the core `address`/`port` and is set
  only when a parser receives the endpoint as one combined string.
- The Stage 11 recovery rule still applies: keys are never fabricated; a missing
  key stays missing.

## Consequences

- One source of truth for the namespace shape; Phase 4 parsers reuse the helper
  instead of redefining names.
- The frozen UNM core is untouched — this is purely a convention over the
  already-sanctioned `extensions` field, so no UNM Freeze review is triggered.
- If WireGuard ever needs first-class UNM fields, that WOULD be a Freeze change
  requiring a Full ADR; this Lightweight ADR deliberately avoids that.
- The URL Parser is aligned to this convention as of the same change.
