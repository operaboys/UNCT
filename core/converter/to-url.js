/**
 * UNM -> URL serializer — Converter Engine (02-SYSTEM_ARCHITECTURE §7,
 * 09-DEVELOPMENT_ROADMAP Phase 7). The exact inverse of the URL Parser
 * (core/parser/url: extract.js Stage 07 + normalize.js Stage 13.1): it takes a
 * `UNMNode` and re-emits the single-line URL form a user would paste back into
 * any client.
 *
 * Boundaries (mirroring the parser's):
 *  - Input is ALWAYS a `UNMNode`, never a raw string (02 §7 — the Converter
 *    never parses; that is the Parser's job).
 *  - Pure & Sync — directly unit-testable, later wrapped by
 *    `converter.worker.js` (ADR-003), exactly as the parsers/analyzers are.
 *  - Emits CANONICAL synonym names (e.g. `fingerprint`, not `fp`; `pbk`, not
 *    `publicKey`) — every one is a name the URL Parser already accepts, so
 *    `parseUrl(toUrl(node))` round-trips without data loss (Phase 7 Exit
 *    Condition). Default values (`network: "tcp"`, `security: "none"`) are
 *    omitted, since the parser restores them as defaults — keeping URLs clean
 *    while staying lossless.
 *  - WireGuard keys are read from `node.extensions.wireguard` (ADR-007), never
 *    from the frozen core, symmetric to how the parser routes them there.
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 * @typedef {import("../types/unm").Protocol} Protocol
 */

import { DEFAULT_NETWORK, DEFAULT_SECURITY } from "../unm/schema/defaults.js";

/** Canonical protocol -> URL scheme (inverse of extract.js `SCHEME_PROTOCOL`). */
const PROTOCOL_SCHEME = Object.freeze({
  vless: "vless", vmess: "vmess", trojan: "trojan", shadowsocks: "ss",
  hysteria2: "hysteria2", tuic: "tuic", wireguard: "wireguard",
});

/**
 * Base64-encode a UTF-8 string with `btoa` (browser-pure, symmetric to the
 * parser's `atob`-based `decodeBase64`). No Node Buffer dependency.
 * @param {string} str
 * @returns {string}
 */
function encodeBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

/**
 * Render `host:port`, bracketing an IPv6 literal so the WHATWG URL parser can
 * read it back (symmetric to extract.js stripping the brackets).
 * @param {string} address
 * @param {number} port
 * @returns {string}
 */
function hostPort(address, port) {
  const host = address.includes(":") && !address.startsWith("[") ? `[${address}]` : address;
  return `${host}:${port}`;
}

/**
 * Append a query param only when the value is meaningful (non-empty).
 * @param {URLSearchParams} params
 * @param {string} name
 * @param {unknown} value
 */
function put(params, name, value) {
  if (value === undefined || value === null || value === "") return;
  params.set(name, String(value));
}

/**
 * Shared query params for the standard userinfo@host:port?query#frag schemes
 * (everything except vmess, which is Base64-JSON). Names match what the parser
 * reads back: `type` <- network, `security`, `sni`, `fingerprint`, `pbk`,
 * `sid`, `flow`, `path`, `host`, `encryption`, `headerType`, `serviceName`,
 * `alpn`.
 * @param {UNMNode} node
 * @returns {URLSearchParams}
 */
function standardQuery(node) {
  const q = new URLSearchParams();
  // Defaults are restored by the parser, so omit them for a clean URL.
  if (node.network !== DEFAULT_NETWORK) put(q, "type", node.network);
  if (node.security !== DEFAULT_SECURITY) put(q, "security", node.security);
  put(q, "sni", node.sni);
  put(q, "fingerprint", node.fingerprint);
  put(q, "pbk", node.pbk);
  put(q, "sid", node.sid);
  put(q, "flow", node.flow);
  put(q, "path", node.path);
  put(q, "host", node.host);
  put(q, "encryption", node.encryption);
  put(q, "headerType", node.headerType);
  put(q, "serviceName", node.serviceName);
  if (Array.isArray(node.alpn) && node.alpn.length) q.set("alpn", node.alpn.join(","));
  return q;
}

/**
 * Build the userinfo segment for a standard scheme (protocol-specific, the
 * inverse of extract.js `extractStandard`).
 * @param {UNMNode} node
 * @returns {string} already-encoded userinfo, or "" when there is none
 */
function userinfo(node) {
  const enc = (/** @type {string} */ v) => encodeURIComponent(v);
  switch (node.protocol) {
    case "tuic":
      // uuid:password
      return [node.uuid, node.password].filter(Boolean).map((v) => enc(String(v))).join(":");
    case "trojan":
    case "hysteria2":
      return node.password ? enc(node.password) : "";
    case "wireguard": {
      const wg = wireguardExt(node);
      return wg?.privateKey ? enc(String(wg.privateKey)) : "";
    }
    default:
      // vless
      return node.uuid ? enc(node.uuid) : "";
  }
}

/**
 * Read the WireGuard extension namespace off a node (ADR-007), if present.
 * @param {UNMNode} node
 * @returns {Record<string, unknown> | undefined}
 */
function wireguardExt(node) {
  const ext = /** @type {Record<string, unknown> | undefined} */ (
    /** @type {unknown} */ (node.extensions)
  );
  return /** @type {Record<string, unknown> | undefined} */ (ext?.wireguard);
}

/**
 * Append the WireGuard query params from `extensions.wireguard` (inverse of
 * extract.js's wireguard branch). The peer public key goes to `publicKey`
 * (the parser's WG synonym), NOT `pbk` — pbk is Reality-only (ADR-007).
 * @param {URLSearchParams} q
 * @param {UNMNode} node
 */
function appendWireguardQuery(q, node) {
  const wg = wireguardExt(node);
  if (!wg) return;
  put(q, "publicKey", wg.publicKey);
  put(q, "presharedKey", wg.presharedKey);
  if (Array.isArray(wg.allowedIPs) && wg.allowedIPs.length) q.set("allowedips", wg.allowedIPs.join(","));
  if (Array.isArray(wg.dns) && wg.dns.length) q.set("dns", wg.dns.join(","));
  put(q, "mtu", wg.mtu);
  put(q, "keepalive", wg.persistentKeepalive);
  put(q, "reserved", wg.reserved);
}

/**
 * vmess:// is Base64(JSON) — inverse of extract.js `extractVmess`.
 * @param {UNMNode} node
 * @returns {string}
 */
function toVmessUrl(node) {
  /** @type {Record<string, unknown>} */
  const v = { v: "2" };
  if (node.remark) v.ps = node.remark;
  v.add = node.address;
  v.port = node.port;
  if (node.uuid) v.id = node.uuid;
  if (node.network !== DEFAULT_NETWORK) v.net = node.network;
  if (node.headerType) v.type = node.headerType;
  if (node.host) v.host = node.host;
  if (node.path) v.path = node.path;
  if (node.security !== DEFAULT_SECURITY) v.tls = node.security;
  if (node.sni) v.sni = node.sni;
  if (Array.isArray(node.alpn) && node.alpn.length) v.alpn = node.alpn.join(",");
  if (node.encryption) v.scy = node.encryption;
  return `vmess://${encodeBase64(JSON.stringify(v))}`;
}

/**
 * shadowsocks SIP002 — inverse of extract.js `extractShadowsocks`.
 * @param {UNMNode} node
 * @returns {string}
 */
function toShadowsocksUrl(node) {
  const cred = encodeBase64(`${node.method ?? ""}:${node.password ?? ""}`);
  const frag = node.remark ? `#${encodeURIComponent(node.remark)}` : "";
  return `ss://${cred}@${hostPort(node.address, node.port)}${frag}`;
}

/**
 * Serialize a UNMNode to its single-line URL form.
 * @param {UNMNode} node
 * @returns {string}
 * @throws {Error} if the protocol has no URL scheme.
 */
export function toUrl(node) {
  const scheme = /** @type {Record<string, string>} */ (PROTOCOL_SCHEME)[node.protocol];
  if (!scheme) {
    throw new Error(`toUrl: protocol "${node.protocol}" has no URL scheme (CONVERT_UNSUPPORTED)`);
  }

  if (node.protocol === "vmess") return toVmessUrl(node);
  if (node.protocol === "shadowsocks") return toShadowsocksUrl(node);

  // Standard userinfo@host:port?query#frag schemes.
  const q = standardQuery(node);
  if (node.protocol === "wireguard") appendWireguardQuery(q, node);

  const ui = userinfo(node);
  const auth = ui ? `${ui}@${hostPort(node.address, node.port)}` : hostPort(node.address, node.port);
  const query = q.toString();
  const frag = node.remark ? `#${encodeURIComponent(node.remark)}` : "";
  return `${scheme}://${auth}${query ? `?${query}` : ""}${frag}`;
}
