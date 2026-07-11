# ADR-012 — ConversionObject: Per-Format Export Capability (not Per-Protocol Transcoding)

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-06-26 |
| **Deciders** | Mehdi (Architecture Review) |
| **Related** | `05-UNIVERSAL_NODE_MODEL` §6 (`ConversionObject`, the frozen field being reshaped) and §2 (`UNMNode.conversion?`); `02-SYSTEM_ARCHITECTURE` §7 (Converter Engine — its stated outputs are *formats*, not protocols); `core/converter/to-url.js`, `to-xray.js`, `to-singbox.js`, `to-clash.js` (the four real serializers, Phase 7 Items 1–4); `core/types/unm.d.ts` (the `interface ConversionObject` to edit); `09-DEVELOPMENT_ROADMAP` Phase 7 Item 5 |
| **Anti-Chaos Rule** | Rule 13 (changing an Architecture-Freeze zone — `ConversionObject` is part of the UNM, spec 05 — requires an ADR). This is that ADR. It also resolves a latent **Rule 02/10 boundary** violation baked into the old shape (see Context). |
| **Tier** | Lightweight — it reshapes one optional, never-yet-populated sub-object (`conversion?`) before any code writes or reads it. No node currently carries a `conversion` value (the Converter Engine has only just been built), so there is no data migration and no consumer to break. |

## Context

Spec 05 §6 defines `ConversionObject` with seven **per-protocol** flags:

```typescript
interface ConversionObject {
  canConvertToVLESS, canConvertToVMESS, canConvertToTrojan, canConvertToSS,
  canConvertToTUIC, canConvertToHysteria2, canConvertToWireGuard: boolean;
}
```

This shape encodes **protocol-to-protocol transcoding** — "can this vless node
become a vmess node?". That question is meaningless for the Converter Engine we
actually built, for two independent reasons:

1. **No converter does protocol transcoding, and none can.** All four
   serializers (`to-url`, `to-xray`, `to-singbox`, `to-clash`) take a `UNMNode`
   and re-emit it *in its own protocol* in a different wire **format**. Turning
   a vless node into a vmess node is not a serialization — it would require
   fabricating a different credential/transport model the source node never
   had (different UUID semantics, different security handshake), which is exactly
   the kind of invented data ANTI_CHAOS Rule 9 forbids.

2. **Spec 02 §7 already describes the Converter in format terms**, contradicting
   05 §6. Its "خروجی‌های ممکن" (possible outputs) list is literally:
   *UNM → URL · UNM → JSON (Xray) · UNM → JSON (Sing-box) · UNM → Clash YAML ·
   Batch Conversion* — five **formats**, zero protocols. §7's own warning note
   stresses the list shows "خروجی‌های ممکن از UNM" (possible outputs *from* UNM),
   and that the Converter never re-parses (that boundary is Rule 02/10). The
   per-protocol §6 shape quietly re-introduces the very protocol-Parsing framing
   §7 forbids: a `canConvertToVMESS` flag only makes sense if something
   *interprets* the node as vmess, which is a Parser's job, not the Converter's.

So `ConversionObject` as frozen in 05 §6 answers a question the system was
explicitly architected *not* to ask. The right question — the one the four
converters can actually answer for any given node — is: **"which output formats
can this node be exported as?"** That is format-keyed, and each format's answer
depends on that one converter's real protocol scope:

| Converter | Real protocol scope (from its `SUPPORTED_PROTOCOLS`) |
|---|---|
| `to-url.js` | all 7 (`PROTOCOL_SCHEME` covers every UNM protocol) |
| `to-xray.js` | **4 only** — vless / vmess / trojan / shadowsocks (Xray's `normalize.js` builds no node for hysteria2/tuic/wireguard; see the PROXY_PROTOCOLS note in `core/parser/xray/extract.js`) |
| `to-singbox.js` | all 7 |
| `to-clash.js` | all 7 |

The `to-xray` asymmetry is the whole point of making these *capability* flags
rather than a constant: for a wireguard node, `canExportAsXrayJson` is genuinely
`false` while the other three are `true`. A single `canExport: boolean` would
erase that, and the per-protocol shape can't express it at all.

Spec 05 §6 itself already flags a *future* concern about this object (the
priority-1 review note: per-protocol flags don't scale to the Plugin System, and
proposes `supportedExports: string[]` someday). This ADR does **not** adopt that
string-array form yet — that is a larger Plugin-era change. It makes the minimal
correction needed now: keep the explicit-boolean style (consistent with
`ValidationObject`/`AnalysisObject`), but key the booleans on the **four formats
that exist today** instead of on protocols. The `supportedExports: string[]`
migration remains the deferred Plugin-era follow-up, now with a clearer
starting point.

## Decision

### New shape

Replace the seven per-protocol flags in `ConversionObject` (spec 05 §6 /
`core/types/unm.d.ts`) with one boolean per **output format** the Converter
Engine produces:

```typescript
/** Conversion Object — spec 05 §6 / ADR-012. Which output FORMATS this node
 *  can be exported as (not protocol-to-protocol transcoding). Filled by the
 *  Converter Engine; each flag = node.protocol is in that serializer's scope. */
export interface ConversionObject {
  canExportAsUrl: boolean;          // to-url.js        — all 7 protocols
  canExportAsXrayJson: boolean;     // to-xray.js       — vless/vmess/trojan/ss only
  canExportAsSingboxJson: boolean;  // to-singbox.js    — all 7 protocols
  canExportAsClashYaml: boolean;    // to-clash.js      — all 7 protocols
}
```

### How each flag is computed

A single pure helper — `buildConversion(node)` in
`core/converter/conversion.js` — sets each flag to whether `node.protocol` is in
that one serializer's supported-protocol set. Each serializer already owns that
set as its single source of truth (its frozen `SUPPORTED_PROTOCOLS`, or
`PROTOCOL_SCHEME` keys for `to-url`); `buildConversion` reads those, so the flag
and the actual converter can never drift. The helper never *runs* a converter to
test it — capability is a static property of `(format, protocol)`, so a flag is
decided without serializing (and without throwing/catching `CONVERT_UNSUPPORTED`
as control flow).

This keeps the established UNM-object discipline: like `ValidationObject` and
`AnalysisObject`, `ConversionObject` carries only plain booleans, is produced by
a pure Core function, and is attached to a node as a fresh object (never
mutated in place — Rule 8 immutability).

### Out of scope

- **`supportedExports: string[]`** — the Plugin-era scalable form (05 §6's own
  future note). Deferred; this ADR keeps explicit booleans.
- **Protocol transcoding** (vless↔vmess, etc.) — confirmed a non-goal of the
  Converter Engine, not merely unimplemented. If it is ever wanted it is a new
  engine with its own ADR, not a field on this object.
- **The Exporter** (`02 §8`, file-packaging/QR/subscription output) is a
  *later* stage that consumes converter output; `ConversionObject` describes
  what the Converter can produce, not how the Exporter packages it.

## Consequences

- **`ConversionObject` now answers a question the system can actually answer.**
  Every flag maps 1:1 to a real serializer that exists and is tested; populating
  it in Item 5 is reading four membership checks, not implementing transcoding.
- **The `to-xray` 4-protocol limit becomes first-class, visible data.** A
  wireguard/tuic/hysteria2 node will correctly carry `canExportAsXrayJson:
  false` with the other three `true` — the UI/Export Center can grey out exactly
  the unavailable format instead of failing at export time.
- **Resolves the 05 §6 ↔ 02 §7 contradiction** in favour of §7's format framing,
  and removes the latent Rule 02/10 (Converter-doesn't-parse) smell the
  per-protocol naming carried.
- **No migration, no breakage.** `conversion?` is optional and has never been
  populated (Converter Engine is brand new), so no stored node or test asserts
  the old keys. Only `core/types/unm.d.ts` and the (still-unwritten) Item-5
  population code reference the shape.
- **Plugin-scalability concern is unchanged, just re-pointed.** Adding a 5th
  output format still means adding a 5th boolean — the same shape of cost 05 §6
  noted — so the eventual `supportedExports: string[]` migration is still the
  open follow-up, now starting from a format-keyed object that maps onto a
  string array far more naturally than per-protocol flags did.
