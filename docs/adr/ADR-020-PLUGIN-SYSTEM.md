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
