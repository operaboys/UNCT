/**
 * Sing-box field extraction — 04-PARSER_ENGINE Stage 05 (Sing-box Parser).
 *
 * A sing-box config holds an array of `outbounds` (and, in newer versions,
 * `endpoints` for WireGuard). It is therefore a MULTI-NODE source: every proxy
 * outbound/endpoint becomes its own UNMNode (ADR-008). This module walks the
 * structure and returns one raw-field record per proxy item; value/name
 * normalization is normalize.js's job.
 *
 * Sing-box uses different field names than Xray (`type` not `protocol`,
 * `server`/`server_port` not `address`/`port`, nested `tls`/`transport`), so it
 * is a separate parser per the Extension Rule (12 §6) — Xray is untouched.
 *
 * @typedef {import("../../types/parser").RawExtraction} RawExtraction
 */

/** Outbound/endpoint `type` values that carry a real proxy node. */
export const SINGBOX_PROXY_TYPES = Object.freeze([
  "vless", "vmess", "trojan", "shadowsocks", "hysteria2", "tuic", "wireguard",
]);

/**
 * Gather proxy items from `outbounds` and `endpoints`, skipping non-proxy
 * types (direct/block/dns/selector/urltest/...).
 * @param {any} config
 * @returns {any[]}
 */
export function collectItems(config) {
  if (!config || typeof config !== "object") return [];
  /** @type {any[]} */
  const items = [];
  for (const pool of [config.outbounds, config.endpoints]) {
    if (!Array.isArray(pool)) continue;
    for (const ob of pool) {
      if (ob && typeof ob === "object" &&
          SINGBOX_PROXY_TYPES.includes(String(ob.type).toLowerCase())) {
        items.push(ob);
      }
    }
  }
  return items;
}

/**
 * Extract one outbound/endpoint into a flat raw-field record (raw sing-box
 * names preserved; mapping happens in normalize.js).
 * @param {any} ob
 * @returns {Record<string, unknown>}
 */
export function extractItem(ob) {
  /** @type {Record<string, unknown>} */
  const f = {};
  if (!ob || typeof ob !== "object") return f;

  f.type = ob.type;
  if (ob.tag != null) f.tag = ob.tag;
  if (ob.server != null) f.server = ob.server;
  if (ob.server_port != null) f.server_port = ob.server_port;

  if (ob.uuid != null) f.uuid = ob.uuid;
  if (ob.password != null) f.password = ob.password;
  if (ob.method != null) f.method = ob.method;
  if (ob.flow != null) f.flow = ob.flow;

  // TLS / Reality / uTLS (sing-box nests these under `tls`).
  const tls = (ob.tls && typeof ob.tls === "object") ? ob.tls : null;
  if (tls && tls.enabled) {
    const reality = (tls.reality && typeof tls.reality === "object") ? tls.reality : null;
    const utls = (tls.utls && typeof tls.utls === "object") ? tls.utls : null;
    f.security = (reality && reality.enabled) ? "reality" : "tls";
    if (tls.server_name != null) f.server_name = tls.server_name;
    if (tls.alpn != null) f.alpn = tls.alpn;
    if (utls && utls.fingerprint != null) f.fingerprint = utls.fingerprint;
    if (reality) {
      if (reality.public_key != null) f.public_key = reality.public_key;
      if (reality.short_id != null) f.short_id = reality.short_id;
    }
  }

  // Transport (ws/grpc/http/httpupgrade/quic). Absent => bare TCP.
  const tr = (ob.transport && typeof ob.transport === "object") ? ob.transport : null;
  if (tr) {
    if (tr.type != null) f.network_type = tr.type;
    if (tr.path != null) f.path = tr.path;
    if (tr.service_name != null) f.service_name = tr.service_name;
    if (tr.headers && typeof tr.headers === "object" && tr.headers.Host != null) {
      f.host = tr.headers.Host;
    }
  }

  // WireGuard fields (legacy `type:"wireguard"` outbound or modern endpoint).
  if (ob.private_key != null) f.private_key = ob.private_key;
  if (ob.peer_public_key != null) f.peer_public_key = ob.peer_public_key;
  if (ob.pre_shared_key != null) f.pre_shared_key = ob.pre_shared_key;
  if (ob.mtu != null) f.mtu = ob.mtu;
  if (ob.local_address != null) f.local_address = ob.local_address;
  if (ob.reserved != null) f.reserved = ob.reserved;

  return f;
}

/**
 * parse() — Stage 05 happy path. Strict JSON, collect all proxy items.
 * Throws (routing to recover()) on malformed JSON or no proxy item.
 * @param {string} input
 * @returns {RawExtraction}
 */
export function parseSingBox(input) {
  if (typeof input !== "string") {
    throw new Error("SingBoxParser.parse: input must be a string (PARSE_MISSING_REQUIRED)");
  }
  /** @type {any} */
  let config;
  try {
    config = JSON.parse(input);
  } catch (err) {
    throw new Error(`SingBoxParser.parse: input is not valid JSON (PARSE_MISSING_REQUIRED): ${err instanceof Error ? err.message : String(err)}`);
  }
  const items = collectItems(config).map(extractItem);
  if (items.length === 0) {
    throw new Error("SingBoxParser.parse: no proxy outbound/endpoint found (PARSE_MISSING_REQUIRED)");
  }
  return { protocol: "singbox", fields: { items }, raw: input };
}
