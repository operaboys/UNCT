/**
 * UNM -> Xray JSON serializer — Converter Engine (02-SYSTEM_ARCHITECTURE §7,
 * 09-DEVELOPMENT_ROADMAP Phase 7, Item 2). The exact inverse of the Xray
 * Parser (core/parser/xray: extract.js Stage 04 + normalize.js Stage 13.1):
 * it takes a `UNMNode` and re-emits the single-outbound Xray JSON config a
 * user would paste into an Xray-core client.
 *
 * Boundaries (mirroring to-url.js / the parser's):
 *  - Input is ALWAYS a `UNMNode`, never a raw string (02 §7).
 *  - Pure & Sync — directly unit-testable, later wrapped by
 *    `converter.worker.js` (ADR-003).
 *  - Emits CANONICAL synonym names the extractor reads first (`publicKey` for
 *    Reality's pbk, `shortId` for sid, `serverName` for sni, `fingerprint`
 *    over `clientFingerprint`) — every one is a name the Xray Parser already
 *    accepts as the priority-chain winner, so `normalizeManyXray(parseXray(
 *    toXray(node)))` round-trips without data loss. Default values
 *    (`network: "tcp"`, `security: "none"`) are omitted, since the parser
 *    restores them as defaults.
 *  - Supports the four protocols the Xray Parser actually builds full nodes
 *    for (vless, vmess, trojan, shadowsocks — see normalize.js: every other
 *    PROXY_PROTOCOLS entry has no credential-extraction path there). TUIC /
 *    Hysteria2 / WireGuard have no Xray JSON shape in this codebase yet, so
 *    they throw CONVERT_UNSUPPORTED rather than emit a guessed shape.
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 */

import { DEFAULT_NETWORK, DEFAULT_SECURITY } from "../unm/schema/defaults.js";

/** Protocols the Xray Parser's normalize.js fully builds (credentials + stream).
 *  Exported as ADR-012's ConversionObject source of truth for `canExportAsXrayJson`. */
export const XRAY_SUPPORTED_PROTOCOLS = Object.freeze(["vless", "vmess", "trojan", "shadowsocks"]);

/**
 * Build `settings.vnext`/`settings.servers` — inverse of extract.js's
 * `extractItemsFromOutbound` per-endpoint/per-user fields.
 * @param {UNMNode} node
 * @returns {Record<string, unknown>}
 */
function buildSettings(node) {
  switch (node.protocol) {
    case "vless":
    case "vmess": {
      /** @type {Record<string, unknown>} */
      const user = { id: node.uuid };
      if (node.flow) user.flow = node.flow;
      if (node.encryption) user.encryption = node.encryption;
      return { vnext: [{ address: node.address, port: node.port, users: [user] }] };
    }
    case "trojan":
      return { servers: [{ address: node.address, port: node.port, password: node.password }] };
    case "shadowsocks":
      return {
        servers: [{
          address: node.address, port: node.port, method: node.method, password: node.password,
        }],
      };
    default:
      // Unreachable — toXray() already rejects unsupported protocols.
      return {};
  }
}

/**
 * Build `streamSettings` — inverse of extract.js's `extractStreamFields`.
 * @param {UNMNode} node
 * @returns {Record<string, unknown>}
 */
function buildStreamSettings(node) {
  /** @type {Record<string, unknown>} */
  const ss = {};
  if (node.network !== DEFAULT_NETWORK) ss.network = node.network;
  if (node.security !== DEFAULT_SECURITY) ss.security = node.security;

  if (node.security === "tls") {
    /** @type {Record<string, unknown>} */
    const tls = {};
    if (node.sni) tls.serverName = node.sni;
    if (Array.isArray(node.alpn) && node.alpn.length) tls.alpn = [...node.alpn];
    if (node.fingerprint) tls.fingerprint = node.fingerprint;
    if (Object.keys(tls).length) ss.tlsSettings = tls;
  } else if (node.security === "reality") {
    /** @type {Record<string, unknown>} */
    const reality = {};
    if (node.sni) reality.serverName = node.sni;
    if (node.pbk) reality.publicKey = node.pbk;
    if (node.sid) reality.shortId = node.sid;
    if (node.fingerprint) reality.fingerprint = node.fingerprint;
    if (Object.keys(reality).length) ss.realitySettings = reality;
  }

  if (node.network === "ws") {
    /** @type {Record<string, unknown>} */
    const ws = {};
    if (node.path) ws.path = node.path;
    if (node.host) ws.headers = { Host: node.host };
    if (Object.keys(ws).length) ss.wsSettings = ws;
  } else if (node.network === "http-upgrade") {
    /** @type {Record<string, unknown>} */
    const httpupgrade = {};
    if (node.path) httpupgrade.path = node.path;
    if (node.host) httpupgrade.host = node.host;
    if (Object.keys(httpupgrade).length) ss.httpupgradeSettings = httpupgrade;
  } else if (node.network === "grpc" && node.serviceName) {
    ss.grpcSettings = { serviceName: node.serviceName };
  }

  return ss;
}

/**
 * Serialize a UNMNode to a single-outbound Xray JSON config string.
 * @param {UNMNode} node
 * @returns {string}
 * @throws {Error} if the protocol has no Xray JSON shape in this codebase.
 */
export function toXray(node) {
  if (!XRAY_SUPPORTED_PROTOCOLS.includes(node.protocol)) {
    throw new Error(`toXray: protocol "${node.protocol}" has no Xray JSON shape (CONVERT_UNSUPPORTED)`);
  }

  /** @type {Record<string, unknown>} */
  const outbound = { protocol: node.protocol, settings: buildSettings(node) };
  if (node.remark) outbound.tag = node.remark;
  const streamSettings = buildStreamSettings(node);
  if (Object.keys(streamSettings).length) outbound.streamSettings = streamSettings;

  return JSON.stringify({ outbounds: [outbound] });
}
