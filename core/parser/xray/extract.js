/**
 * Xray field extraction — 04-PARSER_ENGINE Stage 04 (Xray Parser, Priority:
 * Highest). Walks the Xray JSON outbound structure and pulls out the raw
 * fields. Structured walking (settings.vnext / settings.servers) — NOT a blind
 * deep search — so a DNS address in `dns.servers` is never mistaken for a node
 * address (Stage 04 "DNS Address vs Server Address").
 *
 * Output is a RawExtraction holding RAW values under their Xray names; value
 * normalization + priority chains happen later in normalize.js (Stage 13.1).
 *
 * @typedef {import("../../types/parser").RawExtraction} RawExtraction
 */

/**
 * Outbound protocols that carry a real proxy node (skip freedom/blackhole/dns).
 * This is a STRUCTURAL filter only — "is this outbound a proxy, not routing
 * infra" — not a claim that normalize.js fully builds every one of these.
 * Today normalize.js's credential extraction (settings.vnext/servers + users[])
 * only yields a complete node for vless/vmess/trojan/shadowsocks; hysteria2/
 * tuic/wireguard have no matching Xray JSON shape here yet (no WireGuard
 * extensions namespace, no uuid:password convention), so an outbound of one of
 * those types currently passes this filter but fails normalizeItem on the
 * missing address (Xray-core's own shapes for them differ from vnext/servers)
 * and is silently skipped by normalizeManyXray's per-item try/catch — never
 * fabricated, simply not yet supported. core/converter/to-xray.js mirrors this
 * boundary explicitly (CONVERT_UNSUPPORTED for the same three).
 */
export const PROXY_PROTOCOLS = Object.freeze([
  "vless", "vmess", "trojan", "shadowsocks", "ss",
  "hysteria2", "tuic", "wireguard",
]);

/**
 * Resolve the input to a list of outbound objects, accepting the common Xray
 * shapes: `{ outbounds: [...] }`, `{ outbound: {...} }`, or a bare outbound.
 * @param {any} config
 * @returns {any[]}
 */
function toOutbounds(config) {
  if (!config || typeof config !== "object") return [];
  if (Array.isArray(config.outbounds)) return config.outbounds;
  if (config.outbound && typeof config.outbound === "object") return [config.outbound];
  if (config.protocol && config.settings) return [config];
  return [];
}

/**
 * Pick the first outbound that carries a proxy node. Used by detect.js to know
 * whether a config contains any proxy outbound at all.
 * @param {any} config
 * @returns {any | null}
 */
export function selectOutbound(config) {
  return collectOutbounds(config)[0] ?? null;
}

/**
 * All outbounds that carry a proxy node — Multi-Outbound support (04 Stage 04).
 * @param {any} config
 * @returns {any[]}
 */
export function collectOutbounds(config) {
  return toOutbounds(config).filter(
    (ob) => ob && typeof ob === "object" &&
      PROXY_PROTOCOLS.includes(String(ob.protocol).toLowerCase()),
  );
}

/**
 * Extract the per-outbound SHARED fields: protocol/tag plus everything under
 * streamSettings (network/security/TLS/Reality/transport). Per-endpoint and
 * per-user fields (address/port/id/...) are layered on later, so these are the
 * fields common to every node produced from this outbound.
 * @param {any} ob
 * @returns {Record<string, unknown>}
 */
function extractStreamFields(ob) {
  /** @type {Record<string, unknown>} */
  const fields = {};
  fields.protocol = ob.protocol;
  if (ob.tag != null) fields.tag = ob.tag;

  const ss = (ob.streamSettings && typeof ob.streamSettings === "object") ? ob.streamSettings : {};
  if (ss.network != null) fields.network = ss.network;
  if (ss.security != null) fields.security = ss.security;

  // TLS / Reality share serverName/alpn/fingerprint; Reality adds publicKey/shortId.
  const tls = (ss.tlsSettings && typeof ss.tlsSettings === "object") ? ss.tlsSettings : {};
  const reality = (ss.realitySettings && typeof ss.realitySettings === "object") ? ss.realitySettings : {};
  const sec = { ...tls, ...reality };
  if (sec.serverName != null) fields.serverName = sec.serverName;
  if (sec.alpn != null) fields.alpn = sec.alpn;
  if (sec.fingerprint != null) fields.fingerprint = sec.fingerprint;
  // Synonyms are preserved raw so normalize.js's Priority Chains can resolve a
  // deterministic winner and record losers in originalMappings (05 §2).
  if (sec.clientFingerprint != null) fields.clientFingerprint = sec.clientFingerprint;
  if (reality.publicKey != null) fields.publicKey = reality.publicKey;
  if (reality.serverPublicKey != null) fields.serverPublicKey = reality.serverPublicKey;
  if (reality.shortId != null) fields.shortId = reality.shortId;

  // Transport-specific settings.
  const ws = (ss.wsSettings && typeof ss.wsSettings === "object") ? ss.wsSettings : {};
  if (ws.path != null) fields.path = ws.path;
  if (ws.headers && typeof ws.headers === "object" && ws.headers.Host != null) {
    fields.host = ws.headers.Host;
  }
  const httpup = (ss.httpupgradeSettings && typeof ss.httpupgradeSettings === "object") ? ss.httpupgradeSettings : {};
  if (fields.path == null && httpup.path != null) fields.path = httpup.path;
  if (fields.host == null && httpup.host != null) fields.host = httpup.host;
  const grpc = (ss.grpcSettings && typeof ss.grpcSettings === "object") ? ss.grpcSettings : {};
  if (grpc.serviceName != null) fields.serviceName = grpc.serviceName;

  return fields;
}

/** Layer a single user's credential fields onto an item (never overwrites a set value).
 * @param {Record<string, unknown>} item @param {any} user */
function applyUserFields(item, user) {
  if (!user || typeof user !== "object") return;
  if (user.id != null) item.id = user.id;
  if (user.flow != null) item.flow = user.flow;
  if (user.encryption != null) item.encryption = user.encryption;
  if (item.password == null && user.password != null) item.password = user.password;
}

/**
 * Expand ONE outbound into one raw-field record PER node it represents
 * (04 Stage 04 Multi-Outbound · Multi-User): one node per `settings.vnext` /
 * `settings.servers` endpoint, multiplied by each entry in that endpoint's
 * `users[]`. Collapsing these to a single node would be silent Data Loss
 * (ANTI_CHAOS Rule 9).
 * @param {any} ob
 * @returns {Record<string, unknown>[]}
 */
export function extractItemsFromOutbound(ob) {
  if (!ob || typeof ob !== "object") return [];
  const stream = extractStreamFields(ob);
  const settings = (ob.settings && typeof ob.settings === "object") ? ob.settings : {};
  const vnext = Array.isArray(settings.vnext) ? settings.vnext : [];
  const servers = Array.isArray(settings.servers) ? settings.servers : [];

  /** @type {Record<string, unknown>[]} */
  const items = [];
  for (const ep of [...vnext, ...servers]) {
    if (!ep || typeof ep !== "object") continue;
    /** @type {Record<string, unknown>} */
    const base = { ...stream };
    if (ep.address != null) base.address = ep.address;
    if (ep.port != null) base.port = ep.port;
    if (ep.password != null) base.password = ep.password; // trojan/ss server-level
    if (ep.method != null) base.method = ep.method;       // ss
    const users = Array.isArray(ep.users) ? ep.users : [];
    if (users.length > 0) {
      for (const user of users) {
        const item = { ...base };
        applyUserFields(item, user);
        items.push(item);
      }
    } else {
      items.push(base);
    }
  }
  // An outbound with no vnext/servers still yields one item (its stream fields);
  // it will fail normalize on the missing address and simply produce no node.
  if (items.length === 0) items.push({ ...stream });
  return items;
}

/**
 * Back-compat helper: the first item of an outbound (single record).
 * @param {any} ob
 * @returns {Record<string, unknown>}
 */
export function extractOutbound(ob) {
  return extractItemsFromOutbound(ob)[0] ?? {};
}

/**
 * Extract config-level DNS settings from a parsed Xray config object (ADR-022).
 * Returns undefined when the dns block is absent or has no usable server addresses.
 * Called after JSON.parse — never on the raw string.
 * @param {any} config
 * @returns {import("../../types/dns").ConfigDns | undefined}
 */
export function extractXrayDns(config) {
  const dns = config && typeof config === "object" ? config.dns : null;
  if (!dns || typeof dns !== "object") return undefined;
  const rawServers = Array.isArray(dns.servers) ? dns.servers : [];
  const servers = rawServers.flatMap((/** @type {any} */ s) => {
    if (typeof s === "string") return [s];
    if (s && typeof s === "object" && typeof s.address === "string") return [s.address];
    return [];
  });
  if (servers.length === 0) return undefined;
  const fakeIp = Boolean(dns.fakeIp && dns.fakeIp.enabled);
  const strategy = typeof dns.queryStrategy === "string" ? dns.queryStrategy : undefined;
  /** @type {import("../../types/dns").ConfigDns} */
  const result = { servers, fakeIp };
  if (strategy !== undefined) result.strategy = strategy;
  return result;
}

/**
 * parse() — the Stage 04 happy path: strict JSON, structured extraction of ALL
 * proxy outbounds (Multi-Outbound · Multi-User). Throws on malformed JSON or no
 * usable outbound so the ParserFactory can route to recover() / fallback (12 §5).
 * @param {string} input
 * @returns {RawExtraction}
 */
export function parseXray(input) {
  if (typeof input !== "string") {
    throw new Error("XrayParser.parse: input must be a string (PARSE_MISSING_REQUIRED)");
  }
  /** @type {any} */
  let config;
  try {
    config = JSON.parse(input);
  } catch (err) {
    throw new Error(`XrayParser.parse: input is not valid JSON (PARSE_MISSING_REQUIRED): ${err instanceof Error ? err.message : String(err)}`);
  }
  const outbounds = collectOutbounds(config);
  if (outbounds.length === 0) {
    throw new Error("XrayParser.parse: no proxy outbound found (PARSE_MISSING_REQUIRED)");
  }
  const items = outbounds.flatMap(extractItemsFromOutbound);
  const configDns = extractXrayDns(config);
  /** @type {Record<string, unknown>} */
  const fields = { items };
  if (configDns) fields.configDns = configDns;
  return { protocol: "xray", fields, raw: input };
}
