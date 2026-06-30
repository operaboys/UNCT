# ADR-022 — DNS Config-Level Data: Extraction, Storage, and Analyzer Architecture

| Field | Value |
|---|---|
| **Status** | ACCEPTED |
| **Date** | 2026-06-30 |
| **Deciders** | mehdi (مهدی), claude |
| **Scope** | `core/types/unm.d.ts`, `core/parser/{xray,singbox,clash}/{extract,normalize}.js`, `core/analyzer/extended/dns-analyzer.js` |
| **Trigger** | Architecture Freeze (ANTI_CHAOS Rule 13) — changes to UNM type + Parser extraction philosophy |
| **Related** | ADR-002 (UNM First), ADR-007 (WireGuard Extension Namespace), ADR-010 (Worker Manager), ADR-011 (Security Score), doc 04 §Stage-04, doc 05 §2–4, doc 06 §2.4 |

---

## Context

### What is Blocked and Why

`core/analyzer/extended/dns-analyzer.js` (doc 06 §2.4) cannot be built without resolving two
architectural gaps. This ADR resolves both.

**Gap 1 — Parsers deliberately skip the DNS block:**
Every Xray/Sing-box/Clash parser's `extract.js` filters to proxy outbounds only, explicitly
ignoring the top-level `dns{}` block. This was the correct decision at parsing time to prevent
DNS-address/node-address confusion (doc 04 Stage 04: "DNS Address vs Server Address"), but it
means no DNS config data ever reaches `UNMNode`.

Code evidence — Xray `extract.js`:
```js
// "a DNS address in `dns.servers` is never mistaken for a node address"
export function collectOutbounds(config) {
  return toOutbounds(config).filter(
    (ob) => PROXY_PROTOCOLS.includes(String(ob.protocol).toLowerCase()),
  );
}
// dns block is never accessed
```

Same pattern confirmed in `singbox/extract.js` (`collectItems()` skips all non-proxy types
including `type:"dns"`) and `clash/extract.js` (`collectProxies()` reads only `doc.proxies`,
never `doc.dns`).

**Gap 2 — UNM has no model for config-level data:**
A DNS block applies to the ENTIRE config, shared across all outbounds. UNMNode is per-node.
For a 20-outbound Xray config, there is one `dns{}` object and twenty `UNMNode` objects — the
one-to-many relationship has no representation in the current model.

### DNS Block Structure in Each Format

**Researched directly from parser source + format knowledge. Not assumed by analogy.**

#### Xray JSON — `config.dns`

```json
{
  "dns": {
    "servers": [
      "8.8.8.8",
      {"address": "tls://dns.google", "domains": ["example.com"]},
      "127.0.0.1"
    ],
    "hosts": {"example.com": "127.0.0.1"},
    "queryStrategy": "UseIPv4",
    "fakeIp": {"enabled": true, "inet4Range": "198.18.0.0/15"}
  },
  "outbounds": [...]
}
```

DNS-leak-relevant fields:
- `servers[]` — where queries go. Can be bare IP, DoT (`tls://`), DoH (`https://`), or
  `{address, domains}` objects. Public cleartext IPs → leak risk.
- `queryStrategy` — `"UseIPv4"` / `"UseIPv6"` / `"UseIP"` — affects which records are queried.
- `fakeIp.enabled` — FakeIP mode maps fake LAN IPs to domains, routing DNS internally;
  prevents most leak scenarios.

#### Sing-box JSON — `config.dns`

```json
{
  "dns": {
    "servers": [
      {"tag": "remote", "address": "tls://8.8.8.8", "detour": "proxy"},
      {"tag": "local", "address": "223.5.5.5"}
    ],
    "rules": [...],
    "fakeip": {"enabled": true, "inet4_range": "198.18.0.0/15"}
  },
  "outbounds": [...]
}
```

DNS-leak-relevant fields:
- `servers[].address` — the DNS server URL (same DoT/DoH/plaintext spectrum as Xray).
- `servers[].detour` — which outbound handles DNS queries; if it routes through the proxy
  outbound, DNS is tunneled.
- `fakeip.enabled` — FakeIP mode.

Note: Sing-box's DNS model is richer (per-rule routing) but the ADR only needs to extract the
server addresses and fakeip flag for Leak Risk analysis — not the full routing rules.

#### Clash YAML — `config.dns`

```yaml
dns:
  enable: true
  enhanced-mode: fake-ip       # or: redir-host
  fake-ip-range: 198.18.0.0/15
  nameserver:
    - 8.8.8.8
    - tls://1.1.1.1:853
  fallback:
    - 8.8.8.8
  default-nameserver:
    - 114.114.114.114
```

DNS-leak-relevant fields:
- `enhanced-mode` — `"fake-ip"` (FakeIP; low/no leak) or `"redir-host"` (direct DNS resolution;
  leak depends on nameserver).
- `nameserver[]` + `fallback[]` — upstream DNS server addresses.
- `enable: false` OR dns block absent → system DNS is used (risk depends on system config,
  cannot be determined from the config alone).

#### WireGuard `.conf` — `[Interface] DNS`

```ini
[Interface]
PrivateKey = ...
DNS = 1.1.1.1, 8.8.8.8

[Peer]
...
```

**Already handled.** The WireGuard extractor already extracts `[Interface] DNS` as a
comma-separated list (`f.dns = ifaceEntries.dns`) and the WireGuard normalizer already places it
in `extensions.wireguard.dns: string[]` via `buildWireguardExtensions()` (ADR-007). No change
is needed for WireGuard.

#### URL Parser — No DNS concept

A single proxy URL (`vless://uuid@host:port?...`) carries per-connection credentials only.
There is no URL parameter for "what DNS server should the client use." DNS is absent by
definition. No extraction is possible; Rule 9 mandates the DNS Analyzer output `"unknown"` for
URL-sourced nodes.

#### Subscription Parser — No DNS concept

A subscription is Base64-encoded URL lines. Like the URL parser, there is no config-level DNS
block. Each parsed URL produces a node via the URL parser's path. DNS is absent; output
`"unknown"`.

---

## Decision Options Considered

### Option A — ConfigMetadata + `configId` on UNMNode (initial proposal in doc 06 §2.4)

```typescript
interface ConfigMetadata {
  configId: string;      // UUID, system-generated
  sourceType: SourceType;
  createdAt: string;
  dns?: ConfigDns;
}

// UNMNode gains:
configId?: string;       // foreign key into ConfigMetadata store
```

**Why this was considered:** Architecturally correct — DNS is config-level data, not per-node
data. One `ConfigMetadata` per parsed config; all nodes from that config share `configId`.

**Why REJECTED for this ADR:**

1. **Cascading changes across every layer.** `parse-and-validate.js` currently returns
   `UNMNode[]`; it must change to return `{ nodes: UNMNode[], configs: ConfigMetadata[] }`.
   Every call-site (parser.worker.js, parse tests, UI client) must handle the new return shape.

2. **New entity type = new store + new storage + new selector join.** `ConfigMetadata` needs
   its own state store (`core/store/config-metadata-state.js`), IndexedDB persistence object,
   hydration logic, and Preact bridge. The Selector layer must join nodes with their config to
   surface DNS data to the UI.

3. **Analyzer API coupling.** The Analyzer currently takes a single `UNMNode` and returns an
   `AnalysisBundle`. Injecting `ConfigMetadata` as a second param breaks the clean
   `node → analysis` contract and creates a compile-time dependency from the Analyzer on the
   store layer.

4. **`configId` on UNMNode is a deep Freeze change.** Adding a field to `UNMNode`'s core
   section (not `extensions`) requires changing `core/types/unm.d.ts` in the Architecture Freeze
   zone, which is the same cost as Option B — but with far more blast radius.

5. **Disproportionate complexity for the benefit.** A DNS config object is ~100 bytes. Storing
   it once per config and resolving it via a join costs more in code, tests, and cognitive
   overhead than the storage savings justify at this scale (hundreds of nodes, not millions).

### Option B — `extensions.configDns` per-node (DECIDED)

Each node produced from an Xray/Sing-box/Clash config carries the DNS block extracted from that
config in a standardized `extensions.configDns` slot:

```typescript
// Shape of the configDns extension (new, NOT in the frozen UNM core)
interface ConfigDns {
  servers: string[];      // raw server addresses/URLs — never fabricated, never normalized
  fakeIp: boolean;        // true if FakeIP/fake-ip mode is explicitly enabled
  strategy?: string;      // Xray: queryStrategy / Clash: enhanced-mode / Sing-box: absent
}

// On each node from Xray/Sing-box/Clash config that has a dns{} block:
node.extensions.configDns = { servers: [...], fakeIp: false }
```

**Why ACCEPTED:**

1. **`extensions` is the sanctioned escape hatch.** Spec 05 §8 ("Core vs Runtime Extensions")
   defines `extensions?: Record<string, unknown>` exactly for data that does not fit the frozen
   core. ADR-007 already uses this for WireGuard (`extensions.wireguard`). This ADR adds a
   second namespace (`configDns`) following the same precedent.

2. **Zero new entity types.** No new store, no new storage schema, no new Preact bridge, no
   join selector. The Analyzer reads `node.extensions?.configDns` the same way it reads
   any other node field.

3. **Each node remains self-contained.** The Analyzer, Selector, and Exporter all work on a
   single node with no external lookup. This keeps the Analyzer contract clean:
   `analyze(node) → AnalysisBundle`.

4. **WireGuard precedent.** The `[Interface] DNS` field is already per-node in
   `extensions.wireguard.dns`. The DNS Analyzer will read from there for WireGuard nodes and
   from `extensions.configDns` for Xray/Sing-box/Clash nodes. The duplication (same DNS object
   on all nodes from one config) is an accepted tradeoff for self-containment at this scale.

5. **`parse-and-validate.js` API is unchanged.** Still returns `UNMNode[]`. No call-site
   changes.

**Acknowledged tradeoff — DRY violation:** For a 20-outbound Xray config, the same `configDns`
object is duplicated across 20 nodes. This is intentional — the benefit of self-contained nodes
outweighs the storage cost (~100 bytes × 20 = ~2 KB) at the scale this app targets.

---

## Decision

### 1. New `configDns` extension namespace

```typescript
/** Config-level DNS settings extracted during parsing. Stored per-node under
 *  `extensions.configDns`. Absent (undefined) means the source format carries no
 *  DNS block at that level (URL, Subscription) — distinct from "DNS block exists
 *  but is empty" (which should not produce configDns either).
 *
 *  Rule 9: never fabricate. If a Clash config has `dns.enable: false`, configDns
 *  is omitted because there is no meaningful DNS configuration to extract.
 */
interface ConfigDns {
  /** Raw server address strings — preserved as-is from the config.
   *  Examples: "8.8.8.8", "tls://dns.google", "127.0.0.1", "https://cloudflare-dns.com/dns-query"
   *  Combined from all applicable server pools (Xray: dns.servers; Sing-box: dns.servers[].address;
   *  Clash: dns.nameserver + dns.fallback + dns.default-nameserver).
   */
  servers: string[];

  /** True if FakeIP mode is explicitly enabled in this config.
   *  Xray: dns.fakeIp.enabled === true
   *  Sing-box: dns.fakeip.enabled === true
   *  Clash: dns.enhanced-mode === "fake-ip"
   */
  fakeIp: boolean;

  /** Optional mode/strategy string — preserved raw from the config.
   *  Xray: dns.queryStrategy ("UseIPv4" | "UseIPv6" | "UseIP")
   *  Clash: dns.enhanced-mode ("fake-ip" | "redir-host")
   *  Sing-box: absent (DNS routing is per-rule, not a single strategy field)
   */
  strategy?: string;
}
```

This type lives in a new file `core/types/dns.d.ts` — it is NOT added to `UNMNode`'s frozen
core. It is only referenced from `extensions.configDns` at runtime.

### 2. `DnsLeakRisk` type — add `"unknown"`

The current type in `core/types/unm.d.ts` and `docs/blueprints/05-UNIVERSAL_NODE_MODEL.md`:
```typescript
export type DnsLeakRisk = "none" | "low" | "medium" | "high";
```

Must be changed to:
```typescript
export type DnsLeakRisk = "none" | "low" | "medium" | "high" | "unknown";
```

**Why:** Rule 9 (never fabricate). URL-sourced and Subscription-sourced nodes have no DNS block.
Returning `"none"` would fabricate safety; returning `"high"` would fabricate risk. `"unknown"`
is the honest, non-fabricated result. This is an additive change to the type union — all
existing stored nodes with one of the four concrete values remain valid; `"unknown"` is a new
fifth option for the DNS Analyzer to emit when data is absent.

This change touches the Architecture Freeze zone (`core/types/unm.d.ts`). It is the primary
trigger for this being a **Full ADR** rather than a Lightweight ADR.

### 3. `DnsLeakRisk` computation matrix

The DNS Analyzer maps from the extracted `configDns` (or WireGuard DNS) to a risk level:

| Source format | DNS data available | Risk computation rule |
|---|---|---|
| Xray/Sing-box/Clash + FakeIP enabled | `extensions.configDns.fakeIp === true` | `"none"` |
| Xray/Sing-box/Clash + all servers private or DoT/DoH | all servers are `127.*`, `::1`, or start with `tls://`/`https://` | `"low"` |
| Xray/Sing-box/Clash + mixed (some public cleartext) | `servers` contains public plaintext IPs (e.g., `"8.8.8.8"`) AND non-DoT/DoH | `"medium"` |
| Xray/Sing-box/Clash + all servers public cleartext | all `servers` are public, no DoT/DoH, no FakeIP | `"high"` |
| Xray/Sing-box/Clash + dns block absent or disabled | `extensions.configDns` is undefined | `"unknown"` |
| WireGuard + DNS set | `extensions.wireguard.dns` is present | same private/cleartext rules as above |
| WireGuard + DNS absent | `extensions.wireguard.dns` is undefined | `"unknown"` |
| URL (single proxy URL) | no configDns possible | `"unknown"` |
| Subscription (URL list) | no configDns possible | `"unknown"` |

The DNS Analyzer **reads** from `extensions.configDns` (or `extensions.wireguard.dns`). It
**never writes** to `extensions` — it writes only to `AnalysisObject.dnsLeakRisk`.

**Private IP ranges** for the "all private" check:
`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `::1`, `fc00::/7`.

### 4. Parser changes — which parsers and what exactly changes

#### 4a. Xray (`core/parser/xray/extract.js` → `parseXray()`)

Add DNS extraction at the end of `parseXray()`. The dns block is read from the parsed JSON
object — NOT by re-parsing the input string. The existing strict JSON parse step already ran.

```js
// After: const items = outbounds.flatMap(extractItemsFromOutbound);
/** @type {import("../../types/dns").ConfigDns | undefined} */
const configDns = extractXrayDns(config);
return { protocol: "xray", fields: { items, ...(configDns ? { configDns } : {}) }, raw: input };
```

New pure function `extractXrayDns(config)`:
```js
function extractXrayDns(config) {
  const dns = config && typeof config === "object" && config.dns;
  if (!dns || typeof dns !== "object") return undefined;
  const rawServers = Array.isArray(dns.servers) ? dns.servers : [];
  const servers = rawServers.flatMap((s) => {
    if (typeof s === "string") return [s];
    if (s && typeof s === "object" && typeof s.address === "string") return [s.address];
    return [];
  });
  if (servers.length === 0) return undefined; // no usable server = no configDns
  const fakeIp = Boolean(dns.fakeIp && dns.fakeIp.enabled);
  const strategy = typeof dns.queryStrategy === "string" ? dns.queryStrategy : undefined;
  return { servers, fakeIp, ...(strategy ? { strategy } : {}) };
}
```

#### 4b. Sing-box (`core/parser/singbox/extract.js` → `parseSingBox()`)

```js
// After: const items = collectItems(config).map(extractItem);
const configDns = extractSingBoxDns(config);
return { protocol: "singbox", fields: { items, ...(configDns ? { configDns } : {}) }, raw: input };
```

New pure function `extractSingBoxDns(config)`:
```js
function extractSingBoxDns(config) {
  const dns = config && typeof config === "object" && config.dns;
  if (!dns || typeof dns !== "object") return undefined;
  const rawServers = Array.isArray(dns.servers) ? dns.servers : [];
  const servers = rawServers.flatMap((s) => {
    if (typeof s === "string") return [s];
    if (s && typeof s === "object" && typeof s.address === "string") return [s.address];
    return [];
  });
  if (servers.length === 0) return undefined;
  const fakeIp = Boolean(dns.fakeip && dns.fakeip.enabled);
  return { servers, fakeIp };
  // Note: Sing-box has no single `queryStrategy` field — DNS routing is per-rule.
  // `strategy` is omitted for Sing-box; consumers should not infer absence = unknown strategy.
}
```

#### 4c. Clash (`core/parser/clash/extract.js` → `parseClash()`)

```js
// After: const items = collectProxies(doc).map(extractProxy);
const configDns = extractClashDns(doc);
return { protocol: "clash", fields: { items, ...(configDns ? { configDns } : {}) }, raw: input };
```

New pure function `extractClashDns(doc)`:
```js
function extractClashDns(doc) {
  const dns = doc && typeof doc === "object" && doc.dns;
  if (!dns || typeof dns !== "object") return undefined;
  if (dns.enable === false) return undefined; // explicitly disabled = no DNS config
  const fakeIp = dns["enhanced-mode"] === "fake-ip";
  const strategy = typeof dns["enhanced-mode"] === "string" ? dns["enhanced-mode"] : undefined;
  const pools = [dns.nameserver, dns.fallback, dns["default-nameserver"]].flat().filter(Boolean);
  const servers = pools.filter((s) => typeof s === "string");
  if (servers.length === 0 && !fakeIp) return undefined;
  return { servers, fakeIp, ...(strategy ? { strategy } : {}) };
}
```

#### 4d. Normalize.js changes (Xray, Sing-box, Clash)

Each parser's `normalizeMany*` function must propagate `extraction.fields.configDns` to every
node it produces. The pattern is identical across all three:

```js
// In normalizeManyXray / normalizeManySingBox / normalizeManyClash:
const configDns = extraction.fields?.configDns;

// When building each node's `input` before createNode():
if (configDns) {
  input.extensions = { ...(input.extensions || {}), configDns };
}
```

`configDns` from `extraction.fields` is a single reference shared across all nodes in the
normalization pass. Each `createNode()` call deep-clones / freezes, so there is no aliasing risk.

#### 4e. URL Parser — no change

Single-URL format has no DNS block. `extensions.configDns` is never set on URL-sourced nodes.

#### 4f. Subscription Parser — no change

Subscription lines are individually parsed by the URL parser path. No DNS block. Same as 4e.

#### 4g. WireGuard — no change

`[Interface] DNS` is already extracted into `extensions.wireguard.dns: string[]` by
`buildWireguardExtensions()`. The DNS Analyzer reads from there directly (see §3 matrix).

### 5. DNS Analyzer module (`core/analyzer/extended/dns-analyzer.js`) — interface spec

```js
/**
 * @param {import("../../types/unm").UNMNode} node
 * @returns {import("../../types/unm").DnsLeakRisk}
 */
export function analyzeDnsLeakRisk(node) { ... }
```

The analyzer never throws — it returns `"unknown"` on any missing or unrecognizable input.
It is pure (no side effects, no I/O, no imports from `ui/` or `core/store/`).

Reading strategy:
1. Check `node.extensions?.configDns` (Xray / Sing-box / Clash path).
2. If absent, check `node.extensions?.wireguard?.dns` (WireGuard path).
3. If both absent, return `"unknown"`.
4. Compute risk from the available data per §3 matrix.

The result wires into `AnalysisObject.dnsLeakRisk` during the Analyzer Engine's assembly step
(same pattern as `cloudflareDetected`, `cleanIPDetected`, etc.).

---

## Scope of Changes

### Files that CHANGE

| File | Change type | Reason |
|---|---|---|
| `core/types/unm.d.ts` | **Type change** (Freeze zone) | Add `"unknown"` to `DnsLeakRisk` |
| `docs/blueprints/05-UNIVERSAL_NODE_MODEL.md` | Doc sync | Same change in blueprint |
| `core/parser/xray/extract.js` | Add pure function + modify `parseXray()` return | DNS extraction |
| `core/parser/singbox/extract.js` | Add pure function + modify `parseSingBox()` return | DNS extraction |
| `core/parser/clash/extract.js` | Add pure function + modify `parseClash()` return | DNS extraction |
| `core/parser/xray/normalize.js` | Propagate `configDns` to `extensions` on each node | DNS storage |
| `core/parser/singbox/normalize.js` | Same | DNS storage |
| `core/parser/clash/normalize.js` | Same | DNS storage |

### Files that are NEW

| File | Content |
|---|---|
| `core/types/dns.d.ts` | `ConfigDns` interface |
| `core/analyzer/extended/dns-analyzer.js` | DNS Leak Risk computation |
| `tests/analyzer/dns-analyzer.test.js` | Unit tests (see §Testing) |
| `tests/parser/dns-extraction.test.js` | Parser-level DNS extraction tests |

### Files that do NOT change

| File | Why untouched |
|---|---|
| `core/parser/url/*.js` | Single-URL format has no DNS block |
| `core/parser/subscription/*.js` | URL-list format has no DNS block |
| `core/parser/wireguard/*.js` | Already extracts DNS into `extensions.wireguard.dns` |
| `core/store/parser-state.js` | State shape is `{ nodes }`, `configDns` is inside each node's extensions |
| `core/storage/` | IndexedDB persists nodes as-is; `extensions.configDns` is already inside the node |
| `core/worker/parser.worker.js` | Passes through nodes unchanged |
| `ui/` (all files) | No UI change required by this ADR; DNS Extractor UI is a separate task |
| `core/store/selectors.js` | No join selector needed; `node.extensions?.configDns` is directly readable |

---

## Consequences

### Round-Trip Compatibility (doc 08)

Current converters (`to-xray.js`, `to-singbox.js`, `to-clash.js`) are NOT modified by this ADR.
They do not currently serialize `extensions.configDns` back to the output format's `dns{}` block,
which means a round-trip does **not** preserve DNS settings. This is an acknowledged limitation:

- **Acceptable for now:** The DNS block is complex (routing rules, fakeip config, hosts maps) and
  reproducing it correctly would require understanding Xray/Sing-box/Clash's DNS routing semantics
  fully — beyond this ADR's scope.
- **Future ADR:** If DNS round-trip is required, a separate ADR will define how to reconstruct
  the `dns{}` block from `extensions.configDns` in each serializer.
- **Rule 9 enforcement:** Converters must NOT fabricate a `dns{}` block when only `configDns` is
  available. The existing "omit if unset" behavior of all three serializers is correct.

### Baseline Dataset (doc 15)

The current baseline dataset (`tests/baseline-dataset/raw-config-dataset.js`) should be extended
to include at least one Xray and one Sing-box fixture that has a `dns{}` block. This enables
integration-level testing of the full parse → DNS extraction → analyzer pipeline.

This is **not** a blocker for this ADR — the DNS Analyzer tests in `tests/analyzer/` will use
hand-crafted UNMNode fixtures with `extensions.configDns` set, independent of the parser path.

### UI (doc 07 — Extractor Screen and Developer Console)

The DNS Extractor section in `ui/extractor/extractor-screen.tsx` currently shows a placeholder
("Deferred — `dnsLeakRisk` is not yet built"). After the DNS Analyzer is implemented, this
placeholder is replaced with a table showing `dnsLeakRisk` per node — a separate implementation
task, not part of this ADR.

The Developer Console (doc 07 §4.7) does not currently show `dnsLeakRisk`. No UI change is
required by this ADR.

### Testing Requirements

`tests/parser/dns-extraction.test.js` must cover:
- Xray: config WITH `dns.servers` + `fakeIp.enabled` → `extensions.configDns` correctly set
- Xray: config WITHOUT `dns{}` → `extensions.configDns` absent (not `null`, not `{}`)
- Xray: `dns.servers` with `{address, domains}` objects → addresses correctly flattened
- Sing-box: config WITH `dns.servers` → `extensions.configDns.servers` populated
- Sing-box: `fakeip.enabled: true` → `configDns.fakeIp === true`
- Clash: `enhanced-mode: fake-ip` → `configDns.fakeIp === true`, `configDns.strategy === "fake-ip"`
- Clash: `enable: false` → `extensions.configDns` absent
- URL parser: `extensions.configDns` is always absent
- WireGuard: `extensions.wireguard.dns` is set; `extensions.configDns` is absent

`tests/analyzer/dns-analyzer.test.js` must cover:
- All 9 rows in the computation matrix (§3)
- FakeIP → `"none"` regardless of server list
- Private-only servers → `"low"`
- All public cleartext → `"high"`
- Mixed → `"medium"`
- `configDns` absent + `wireguard.dns` absent → `"unknown"`
- WireGuard node with private DNS → `"low"`
- URL-sourced node (no configDns) → `"unknown"`

---

## Explicit Non-Decisions (Out of Scope for this ADR)

1. **DNS Round-Trip in converters** — deferred to a future ADR.
2. **Full Clash DNS routing rules** — Clash's per-rule DNS routing (`dns.rules`) is not extracted;
   only the top-level server list and enhanced-mode flag are captured. Full rule extraction
   requires a dedicated design pass.
3. **Sing-box per-server `detour`** — the `detour` field (which outbound handles DNS queries)
   is not modeled in `ConfigDns`. Its absence means the "servers" list is the best available
   signal for leak risk.
4. **DNS block in FakeIP hosts map** — `dns.hosts` (Xray/Sing-box static host overrides) is not
   stored. It is relevant for accurate FakeIP bypass logic but not for the initial leak risk
   assessment.
5. **`DnsLeakRisk` aggregation in AnalysisObject.riskScore** — the formula in ADR-011 defers
   this until `dnsLeakRisk` exists. The weight is specified in ADR-011 §3: `dnsLeakRisk` is
   a modifier on top of the security score, not a substitute. The implementation of that formula
   is a task for the Final Report aggregation step, not this ADR.

---

## Verification Checklist (before closing PROPOSED status)

- [ ] `npm run typecheck` — `tsc --noEmit` clean after adding `"unknown"` to `DnsLeakRisk`
- [ ] `npm test` — all existing tests pass (especially `unflatten-node.test.js` which pins
  `dnsLeakRisk: "none"` — this value remains valid; no existing test breaks)
- [ ] `tests/parser/dns-extraction.test.js` — all cases pass
- [ ] `tests/analyzer/dns-analyzer.test.js` — all cases pass
- [ ] Git diff — `core/unm/create-node.js`, `core/worker/worker-manager.js`,
  `core/validator/`, `core/storage/` are NOT in the diff (scope guard)
