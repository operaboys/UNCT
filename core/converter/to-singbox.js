/**
 * UNM -> Sing-box JSON serializer — Converter Engine (02-SYSTEM_ARCHITECTURE
 * §7, 09-DEVELOPMENT_ROADMAP Phase 7, Item 3). The exact inverse of the
 * Sing-box Parser (core/parser/singbox: extract.js Stage 05 + normalize.js
 * Stage 13.1): it takes a `UNMNode` and re-emits a single-outbound sing-box
 * JSON config.
 *
 * Boundaries (mirroring to-url.js / to-xray.js):
 *  - Input is ALWAYS a `UNMNode`, never a raw string (02 §7).
 *  - Pure & Sync — directly unit-testable, later wrapped by
 *    `converter.worker.js` (ADR-003).
 *  - Emits CANONICAL synonym names the extractor reads first (`public_key`
 *    for Reality's pbk, `short_id` for sid, `server_name` for sni) — names
 *    the Sing-box Parser's Priority Chains already resolve as the winner, so
 *    `normalizeManySingBox(parseSingBox(toSingBox(node)))` round-trips
 *    without data loss. Default values (`network: "tcp"`, `security:
 *    "none"`) are omitted, since the parser restores them as defaults (the
 *    absence of `tls`/`transport` blocks IS how the parser reads "tcp"/
 *    "none" — see extract.js's `extractItem`).
 *  - WireGuard keys are read from `node.extensions.wireguard` (ADR-007) and
 *    written to the dedicated WireGuard fields (`private_key`,
 *    `peer_public_key`, `pre_shared_key`, `local_address`, `mtu`,
 *    `reserved`) — never to `tls.reality`, symmetric to how normalize.js
 *    keeps Reality's pbk/sid chain disjoint from WireGuard for protocol ===
 *    "wireguard" nodes. `extensions.wireguard.dns` has no Sing-box field in
 *    this codebase's normalize.js (it never reads one back), so it is not
 *    emitted — a pre-existing parser limitation, not introduced here.
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 */

import { DEFAULT_NETWORK, DEFAULT_SECURITY } from "../unm/schema/defaults.js";

/** Every protocol the Sing-box Parser's normalize.js builds a full node for. */
const SUPPORTED_PROTOCOLS = Object.freeze([
  "vless", "vmess", "trojan", "shadowsocks", "hysteria2", "tuic", "wireguard",
]);

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
 * Build the `tls` block — inverse of extract.js's TLS/Reality/uTLS reading.
 * Returns undefined for the default security ("none"), matching how the
 * parser reads "none" back from a wholly-absent `tls` block.
 * @param {UNMNode} node
 * @returns {Record<string, unknown> | undefined}
 */
function buildTls(node) {
  if (node.security === DEFAULT_SECURITY) return undefined;
  /** @type {Record<string, unknown>} */
  const tls = { enabled: true };
  if (node.sni) tls.server_name = node.sni;
  if (Array.isArray(node.alpn) && node.alpn.length) tls.alpn = [...node.alpn];
  if (node.fingerprint) tls.utls = { enabled: true, fingerprint: node.fingerprint };
  if (node.security === "reality") {
    /** @type {Record<string, unknown>} */
    const reality = { enabled: true };
    if (node.pbk) reality.public_key = node.pbk;
    if (node.sid) reality.short_id = node.sid;
    tls.reality = reality;
  }
  return tls;
}

/**
 * Build the `transport` block — inverse of extract.js's transport reading.
 * Returns undefined for the default network ("tcp"), matching how the parser
 * reads "tcp" back from a wholly-absent `transport` block.
 * @param {UNMNode} node
 * @returns {Record<string, unknown> | undefined}
 */
function buildTransport(node) {
  if (node.network === DEFAULT_NETWORK) return undefined;
  /** @type {Record<string, unknown>} */
  const transport = { type: node.network };
  if (node.path) transport.path = node.path;
  if (node.host) transport.headers = { Host: node.host };
  if (node.serviceName) transport.service_name = node.serviceName;
  return transport;
}

/**
 * Serialize a UNMNode to a single-outbound Sing-box JSON config string.
 * @param {UNMNode} node
 * @returns {string}
 * @throws {Error} if the protocol is outside the UNM Protocol enum.
 */
export function toSingBox(node) {
  if (!SUPPORTED_PROTOCOLS.includes(node.protocol)) {
    throw new Error(`toSingBox: protocol "${node.protocol}" has no Sing-box JSON shape (CONVERT_UNSUPPORTED)`);
  }

  /** @type {Record<string, unknown>} */
  const ob = { type: node.protocol, server: node.address, server_port: node.port };
  if (node.remark) ob.tag = node.remark;
  if (node.uuid) ob.uuid = node.uuid;
  if (node.password) ob.password = node.password;
  if (node.method) ob.method = node.method;
  if (node.flow) ob.flow = node.flow;

  const tls = buildTls(node);
  if (tls) ob.tls = tls;
  const transport = buildTransport(node);
  if (transport) ob.transport = transport;

  if (node.protocol === "wireguard") {
    const wg = wireguardExt(node);
    if (wg) {
      if (typeof wg.privateKey === "string") ob.private_key = wg.privateKey;
      if (typeof wg.publicKey === "string") ob.peer_public_key = wg.publicKey;
      if (typeof wg.presharedKey === "string") ob.pre_shared_key = wg.presharedKey;
      if (Array.isArray(wg.allowedIPs) && wg.allowedIPs.length) ob.local_address = [...wg.allowedIPs];
      if (typeof wg.mtu === "number") ob.mtu = wg.mtu;
      if (typeof wg.reserved === "string") ob.reserved = wg.reserved;
    }
  }

  return JSON.stringify({ outbounds: [ob] });
}
