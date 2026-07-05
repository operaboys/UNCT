# ADR-020 — Plugin System Architecture (Phase 11)

| Field | Value |
|---|---|
| **Status** | ACCEPTED |
| **Date** | 2026-06-30 |
| **Deciders** | mehdi (مهدی), claude |
| **Scope** | `core/plugin/`, `plugins/` |
| **Related** | ADR-002 (UNM First), ADR-004 (Exporter in Core), ANTI_CHAOS Rule 12, doc 12 §8.1 |

---

## Context

Phase 11 (09-DEVELOPMENT_ROADMAP) adds a Plugin System with four deliverables:
Plugin Loader, Plugin Registry, Custom Parser API, Custom Export API.

Several constraints were already locked before this ADR:

- **BaseParser Contract** (`core/types/parser.d.ts`): the `isAsync?` / `parseAsync?` and
  `producesMany?` / `normalizeMany?` reserved slots were written specifically so plugin
  parsers could be async or multi-node without requiring a BaseParser change in Phase 11.
- **Plugin Isolation Rule** (doc 12 §8.1): plugins may not modify Core Parsers, UNM Schema,
  or Validation Rules — only ADD new parsing/export capability.
- **ANTI_CHAOS Rule 12**: plugins may not call each other directly; inter-plugin communication
  can only happen through the defined public interface.
- **UNMNode.extensions** (doc 05 §2): already typed as `Record<string, unknown>` to give
  plugin parsers a place to carry plugin-specific extra fields.

---

## Decision

### 1. Two plugin types

| Type | Contract | What it adds |
|---|---|---|
| `parser` | `BaseParser` (doc 12 §2, `core/parser/base/contract.js`) | New input format detected + parsed into `UNMNode[]` |
| `exporter` | `ExporterPlugin` (new, `core/plugin/exporter-contract.js`) | New output serialisation from `UNMNode[]` |

The **ExporterPlugin** contract mirrors the shape every existing exporter in `core/exporter/`
already follows:

```js
{
  export(nodes: readonly UNMNode[]): {
    content: string,
    skipped: { nodeId: string; reason: string }[]
  }
}
```

Using an **object with an `export` method** (rather than a bare function) was chosen
deliberately: an object can carry a `label` / `mimeType` / `extension` advisory hint
following the same Hints-Are-Advisory-Only principle as `BaseParser.analyzeHint()` (doc 12
§2.1). This leaves room for future metadata without breaking the contract.

### 2. Plugin Registry (`core/plugin/registry.js`)

`createPluginRegistry()` returns an independent registry instance (same factory pattern as
`createParserFactory()`) with two separate Maps — one for parser plugins, one for exporter
plugins. The two namespaces are intentionally separate so a name clash in one does not
pollute the other.

The registry does **not** expose its internal Maps to callers — only `register*`, `get*`,
and `list*` methods — so no plugin can reach the registration entry of another plugin by
traversing the registry object.

### 3. Plugin Loader (`core/plugin/loader.js`)

`createPluginLoader(registry)` is the single entry point for loading a plugin. Before
anything is stored in the registry it:

1. Validates the descriptor shape (`id`, `type`, `implementation`).
2. Dispatches to `assertImplementsBaseParser` or `assertImplementsExporterPlugin` so contract
   violations are caught at load time, not at call time.
3. Calls `registry.registerParser` or `registry.registerExporter`.
4. Returns a **frozen `PluginContext`** to the caller — a restricted API object.

### 4. Sandboxed PluginContext (Rule 12 enforcement)

JavaScript has no true VM-level sandbox without CSP + Worker isolation. Within the
constraints of a plain ES-module runtime the enforcement is architectural rather than
mechanical:

- The registry object itself is **never passed to any plugin implementation**.
- A plugin's `implementation` object is stored as-is; it is never injected with the registry
  or with a reference to any other plugin.
- When a caller `load()`s a plugin the returned `PluginContext` exposes **only** approved
  public-Core utilities — a plugin that wants to call another plugin by name has no path
  to do so through the provided context.
- The `PluginContext` is `Object.freeze()`-d to prevent the plugin from attaching new
  properties to it.

This mirrors the approach described in the task specification: "یک Sandboxed Registration
Context که فقط API عمومی را در اختیار Plugin می‌گذارد، نه دسترسی مستقیم به ماژول‌های دیگر".

A future Phase could strengthen this with Worker-per-plugin isolation (similar to Phase 5's
parser.worker.js pattern) if untrusted third-party plugins need true sandboxing.

### 5. No parser-factory integration in this phase

Plugin parsers are registered in the **Plugin Registry**, not automatically promoted into the
core `ParserFactory`. This is intentional: the core `ParserFactory`'s detection/fallback
chain (doc 12 §4–5) is in the Architecture Freeze Scope and must not be changed without a
separate ADR.

A future ADR could define how the application composition root reads the Plugin Registry and
calls `parserFactory.register(id, pluginParser)` for each loaded plugin parser, making it
visible to Format Detection. For now, the plugin registry is the stable infrastructure layer;
integration with the parser chain is deferred.

### 6. Extension Rule compliance (doc 12 §6)

The example parser (`plugins/example-parser/`) registers a brand-new format using only the
`createPluginLoader` API — zero files inside `core/parser/` are touched. This directly
satisfies the Extension Rule's acceptance criterion: "ماژول خارجی بدون تغییر Core کار می‌کند".

---

## Consequences

**Good:**
- A third-party can write a plugin as a plain ES-module object that implements one of the two
  contracts, call `createPluginLoader(registry).load(descriptor)`, and be done.
- Plugin isolation violations are caught at registration time (not silently at runtime).
- The Plugin Registry is independently testable without the core parser stack.
- Rule 12 (no cross-plugin direct calls) is structurally enforced by withholding the registry
  from plugin implementations.

**Trade-offs:**
- Plugin parser detection is not yet wired into the core `ParserFactory` detection chain
  (deferred by design — needs a separate ADR before Phase 12).
- Sandboxing is architectural, not VM-level; a malicious plugin with ESM import access could
  import `core/plugin/registry.js` directly. True sandboxing requires Worker isolation
  (already available in Phase 5's infrastructure) and is the natural Phase 12 upgrade path.

---

## Addendum — Two real Custom Parsers built; fallback tier wired in; Parser-side API now documented

`ULTIMATE_BLUEPRINT_INDEX.md` P12-13 set an explicit condition before the Custom Parser/Export
API could move past "mechanism only": **at least two real Custom Parsers, or one real Custom
Exporter**. This addendum records that the Parser side of that condition is now met, and what
was learned building the two real implementations.

### What was built

- **`plugins/sip008-parser/`** — the official Shadowsocks SIP008 JSON spec (a `{version,
  servers[]}` document listing many servers at once). Multi-node (`producesMany: true`).
- **`plugins/hysteria2-config-parser/`** — Hysteria2's official native client config JSON
  (`{server, auth, tls: {sni}, ...}`). Single-node.

Both target formats genuinely absent from `core/parser/` (verified before starting: neither
collides with any of the six core parsers' own detection surface), both target protocols
already in the frozen `Protocol` union (`shadowsocks`, `hysteria2` — no new protocol was added),
and both are covered by real fixture-based unit tests (`tests/plugin/sip008-parser.test.js`,
`tests/plugin/hysteria2-config-parser.test.js`) plus an integration test proving they resolve
through the real `parseAndValidate()` entry point
(`tests/plugin/parse-with-plugins.test.js`).

### Fallback-tier integration (§5 above, now resolved)

§5's "no parser-factory integration in this phase" is resolved — not by adding plugins to
`ParserFactory` itself (that chain stays exactly as closed as this ADR always intended), but by
a new, separate fallback tier: `core/plugin/parse-with-plugins.js`, tried only after
`ParserFactory.parseWithFallback()` has already thrown for every one of the six core parsers.
Both real parse entry points — `core/parser/parse-and-validate.js` (main thread) and
`core/worker/parser.worker.js` (the real Worker Converter Screen normally uses) — now import a
shared `appPluginRegistry` (`core/plugin/app-plugins.js`) and try this fallback tier
automatically. This was verified with real Playwright screenshots of the Converter Screen
successfully parsing both new formats through the actual running app (not a dev-only stub),
with the Parser Preview panel showing `Detected Format: sip008-parser` /
`hysteria2-config-parser` and zero console errors.

`plugins/example-parser/` (fictional format, explicitly test-only) is deliberately excluded from
`app-plugins.js` — it must never be reachable from the real app's parse path.

### A real architectural finding: the frozen `SourceType`/`Protocol` unions constrain what a
### Custom Parser can honestly produce

Both plugins had to reuse `sourceType: "subscription"` — not because it was the "obvious" fit,
but because the frozen `SourceType` union (`core/types/unm.d.ts`) has **no dedicated slot** for
"a native single- or multi-node config file, not a URI, not one of the six core JSON/YAML
envelopes" for any protocol besides WireGuard (which got its own `"wireguard-config"` value via
ADR-007). A plugin cannot add one — that file is the Architecture Freeze zone, off-limits to
Plugin Isolation by design. `"subscription"` was confirmed safe to reuse only after a `grep`
across `core/`/`ui/` found nothing branches on `sourceType === "subscription"` the way
`core/analyzer/extended/dns-analyzer.js` branches on `"wireguard-config"` — this was a
verification step, not an assumption. This constraint is now documented for future plugin
authors in `core/plugin/README.md`, and is the main reason a *fully general* public API
(one that could honestly support an arbitrary new native-config format) is not yet possible
without a further ADR extending those unions — a real limit of today's design, not an oversight.

### Decision: Parser-side API is now documented; Exporter side was explicitly NOT (until now)

With the condition met and the common pattern extracted from two real (not hypothetical)
implementations, `core/plugin/README.md` is a real, usable guide for third-party Custom Parser
authors — grounded in what was actually built, including the `SourceType` constraint above as a
first-class caveat, not a footnote.

At that point this did **not** extend to Custom **Exporter** plugins. `core/plugin/exporter-
contract.js`'s mechanism was unchanged and still had zero real implementations (only its own unit
test) — the "two real Parsers OR one real Exporter" condition names two independent, alternative
bars, and only the Parser bar had real evidence behind it. A documented Exporter authoring guide
at that time would have been exactly the guesswork this ADR's original Trade-offs section warned
against.

## Addendum — a real Custom Exporter built; Exporter side of P12-13 now resolved

A later checkpoint closed the remaining half of P12-13's condition: `plugins/sip008-exporter/` is
a real Custom Exporter — the exact inverse of `plugins/sip008-parser/`, turning `UNMNode[]` back
into the same official SIP008 JSON document instead of the other direction. It implements
`ExporterPlugin` (`core/plugin/exporter-contract.js`), is registered via `createPluginLoader`/
`createPluginRegistry` in `core/plugin/app-plugins.js` (never `core/exporter/` directly), and is
covered by `tests/plugin/sip008-exporter.test.js` — including a real **round-trip** test
(`sip008-exporter`'s output re-parsed by `sip008-parser` reproduces the same shadowsocks nodes),
the same round-trip guarantee `core/exporter/subscription-builder.js` already established for
Subscription Parser/Builder.

Choosing the *same* spec already used for the Parser side (rather than a third, unrelated format)
kept the choice defensible on the same grounds as the two Parsers: an official, verifiable spec
(https://shadowsocks.org/guide/sip008.html), not a guessed reverse-engineered client dialect
(Shadowrocket/Quantumult X/Surge all use undocumented proprietary line syntaxes for their own
config export — none of them publish a spec the way shadowsocks.org does for SIP008).

Verified end-to-end (not just in its own unit test): `ui/export/export-screen.tsx` calls
`appPluginRegistry.getExporter("sip008-exporter").export(nodes)` directly from a real Format
option in the Export Center Screen, confirmed with real Playwright screenshots showing the correct
SIP008 JSON output for a shadowsocks node and a real skip message
(`SIP008 only represents the Shadowsocks protocol...`) for a non-shadowsocks node in the same
batch, in both Light and Dark themes.

**Final decision:** both halves of P12-13's condition are now met with real, working
implementations (two Custom Parsers, one Custom Exporter) — the Custom Parser/Exporter API is no
longer Blocked. `core/plugin/README.md` now documents both plugin types, each grounded in a real
implementation.

See `ULTIMATE_BLUEPRINT_INDEX.md` P12-13's own addendum for the Backlog-tracking side of this
same decision.
  (already available in Phase 5's infrastructure) and is the natural Phase 12 upgrade path.
