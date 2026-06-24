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

/** Outbound protocols that carry a real proxy node (skip freedom/blackhole/dns). */
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
 * Pick the first outbound that carries a proxy node.
 * @param {any} config
 * @returns {any | null}
 */
export function selectOutbound(config) {
  const outbounds = toOutbounds(config);
  for (const ob of outbounds) {
    if (ob && typeof ob === "object" &&
        PROXY_PROTOCOLS.includes(String(ob.protocol).toLowerCase())) {
      return ob;
    }
  }
  return null;
}

/**
 * Extract raw fields from a single outbound. Returns a flat record keyed by
 * the field's RAW Xray name (e.g. `serverName`, `publicKey`, `shortId`) — the
 * mapping to canonical UNM names is normalize.js's job.
 * @param {any} ob
 * @returns {Record<string, unknown>}
 */
export function extractOutbound(ob) {
  /** @type {Record<string, unknown>} */
  const fields = {};
  if (!ob || typeof ob !== "object") return fields;

  fields.protocol = ob.protocol;
  if (ob.tag != null) fields.tag = ob.tag;

  const settings = (ob.settings && typeof ob.settings === "object") ? ob.settings : {};
  const server =
    (Array.isArray(settings.vnext) && settings.vnext[0]) ||
    (Array.isArray(settings.servers) && settings.servers[0]) ||
    null;

  if (server && typeof server === "object") {
    if (server.address != null) fields.address = server.address;
    if (server.port != null) fields.port = server.port;
    // SS keeps password/method on the server; VLESS/VMESS on users[0].
    const user = (Array.isArray(server.users) && server.users[0]) || server;
    if (user && typeof user === "object") {
      if (user.id != null) fields.id = user.id;
      if (user.flow != null) fields.flow = user.flow;
      if (user.encryption != null) fields.encryption = user.encryption;
    }
    if (server.password != null) fields.password = server.password;
    else if (user && user.password != null) fields.password = user.password;
    if (server.method != null) fields.method = server.method;
  }

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

/**
 * parse() — the Stage 04 happy path: strict JSON, structured extraction.
 * Throws on malformed JSON or no usable outbound so the ParserFactory can route
 * to recover() / the fallback chain (12 §5).
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
  const ob = selectOutbound(config);
  if (!ob) {
    throw new Error("XrayParser.parse: no proxy outbound found (PARSE_MISSING_REQUIRED)");
  }
  return { protocol: String(ob.protocol), fields: extractOutbound(ob), raw: input };
}
