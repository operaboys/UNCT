# Writing a Custom Parser Plugin

This guide is written from two REAL, working Custom Parsers — not a
hypothetical template. Both live in `plugins/` and are loaded into the real
app (not just their own unit tests):

- `plugins/sip008-parser/` — SIP008 (official Shadowsocks JSON spec,
  multi-node).
- `plugins/hysteria2-config-parser/` — Hysteria2's native client config JSON
  (single-node).

Read both alongside this guide — they show every pattern described below in
context, including the one architectural constraint (below) every author
needs to know before starting.

## Scope: Parser plugins only

This document covers **Custom Parser** plugins (`type: "parser"`). Custom
**Exporter** plugins use the same `PluginRegistry`/`PluginLoader` mechanism
(`core/plugin/exporter-contract.js` defines that contract), but no real
Exporter plugin has been written yet — this guide makes no claims about that
side of the API being validated by real-world use.

## The one constraint every author must know first

Your plugin **cannot add a new `Protocol` or `SourceType` value**. Both are
frozen enums in `core/types/unm.d.ts` (the Architecture Freeze zone,
ANTI_CHAOS Rule 13) — a plugin must never touch that file (Plugin Isolation,
doc 12 §8.1). This means:

- Your format must map onto one of the **existing seven protocols**: `vless`,
  `vmess`, `trojan`, `shadowsocks`, `hysteria2`, `tuic`, `wireguard`. A format
  for a protocol not in this list cannot be a plugin today — it needs a real
  ADR extending the frozen union first.
- Your format's `sourceType` must reuse one of the **existing twelve
  values**. If your format is a genuinely new *encoding* of an
  already-supported protocol (this is the common, realistic case — see both
  example plugins), `"subscription"` is usually the honest fit: nothing in
  `core/`/`ui/` branches on `sourceType === "subscription"` the way
  `core/analyzer/extended/dns-analyzer.js` branches on `"wireguard-config"`
  (verified with `grep` before reusing it — always re-verify this yourself
  before you reuse any existing value, in case a future checkpoint adds a
  branch on it).

If neither fits, your format cannot be a Custom Parser plugin without a real
ADR first — this is a genuine limit of today's Plugin Isolation design, not
an oversight in this guide.

## The BaseParser contract

Your plugin's `implementation` must satisfy every method
`core/parser/base/contract.js`'s `assertImplementsBaseParser()` checks for
(the Loader runs this check at `load()` time, so a violation fails loudly,
immediately — not silently at first use):

| Method | Required | Purpose |
|---|---|---|
| `detect(input): number` | always | Confidence 0-100. Return `0` fast for anything structurally not yours — see "Detection" below. |
| `parse(input): RawExtraction` | always | Extract raw fields. Throw on failure; the fallback tier's `recover()` call is the safety net, not this. |
| `validateStructure(extraction): ValidationObject` | always | Cheap structural sanity check (Rule 9: distinct from the full Validation Engine, which still runs afterward on every produced node). |
| `normalize(extraction): UNMNode` | single-node parsers | Build exactly one node via `createNode()`. |
| `normalizeMany(extraction): UNMNode[]` | multi-node parsers (`producesMany: true`) | Build every node the input describes. `normalize()` must then throw (see both example plugins) — the contract enforces this pairing so a multi-node input can never silently lose all-but-one node (ANTI_CHAOS Rule 9). |
| `recover(input, error): RawExtraction \| null` | always | Best-effort fix-and-retry (e.g. a JSONP wrapper, a trailing comma). Return `null` if nothing can be done — never throw. |

**Never call the Validation Engine yourself** inside `normalize`/
`normalizeMany`. Every real core parser (`core/parser/*/normalize.js`) leaves
`node.validation` for the pipeline to fill via `applyValidation()` after your
parser returns — do the same, or you'll validate every node twice for
nothing.

## Detection: score defensively

`detect()` runs against **every** raw input the user pastes, including ones
meant for the six core parsers or another plugin. Both example plugins:

1. Fail fast and cheap for structurally wrong input (`input.trim().startsWith("{")`
   before ever calling `JSON.parse`).
2. Explicitly exclude the envelope keys of formats they must defer to
   (`"outbounds" in obj` for Xray/Sing-box, `"servers" in obj` for SIP008,
   etc.) — a hard exclusion, not just "hope the shapes never collide".
3. Require every field a genuine real-world document of that format always
   has (SIP008's `version` + `servers[]`; Hysteria2's `server` + `auth`) —
   not just the minimum that happens to parse, which risks matching
   unrelated JSON that merely shares one field name.

`ParserFactory.UNKNOWN_FORMAT_THRESHOLD` (50) is also the bar the plugin
fallback tier uses — return a real confidence like `90` for a solid match,
never a token nonzero value.

## Registering your plugin

Plugins are loaded through `createPluginLoader`/`createPluginRegistry`
(`core/plugin/loader.js`/`registry.js`) — **never** register directly with
`core/parser/factory.js`'s `ParserFactory`. That six-parser chain is closed
(Extension Rule, doc 12 §6); your plugin lives in a separate registry and is
tried only as a fallback tier after every core parser has already failed
(`core/plugin/parse-with-plugins.js`).

To make your plugin reachable from the real running app (not just its own
test file), add it to `core/plugin/app-plugins.js`:

```js
import { yourParser } from "../../plugins/your-parser/index.js";
// inside buildAppPluginRegistry():
loader.load({ id: "your-parser", type: "parser", implementation: yourParser });
```

That one file is the only integration point — `core/parser/parse-and-
validate.js` (main-thread) and `core/worker/parser.worker.js` (the real
Worker) both already import `appPluginRegistry` and try it automatically
when every core parser fails. You do not need to touch either of those
files.

## Testing

Write real fixtures from the actual spec/docs of your format — never a
fictional format (that is what `plugins/example-parser/` is for, and it is
explicitly excluded from `app-plugins.js`; it must never reach the real
app). See `tests/plugin/sip008-parser.test.js` and
`tests/plugin/hysteria2-config-parser.test.js` for the expected coverage
shape: BaseParser contract-shape assertions, `detect()` true/false/collision
cases against the formats you must defer to, `parse()`+`normalize()`
producing the exact real UNMNode fields, `validateStructure()`, and
`recover()`.

`tests/plugin/parse-with-plugins.test.js` shows the full real path,
including asserting a core parser still wins for a format it already owns
even with your plugin also registered (Highest-Confidence-Wins applies
across both tiers together).
