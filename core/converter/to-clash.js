/**
 * UNM -> Clash/Clash.Meta YAML serializer — Converter Engine
 * (02-SYSTEM_ARCHITECTURE §7, 09-DEVELOPMENT_ROADMAP Phase 7, Item 4). The
 * exact inverse of the Clash Parser (core/parser/clash: extract.js Stage 06 +
 * normalize.js Stage 13.1): it takes a `UNMNode` and re-emits a single-proxy
 * Clash YAML config a user would paste into a Clash / Clash.Meta client.
 *
 * Boundaries (mirroring to-xray.js / to-singbox.js):
 *  - Input is ALWAYS a `UNMNode`, never a raw string (02 §7).
 *  - Pure & Sync — directly unit-testable, later wrapped by
 *    `converter.worker.js` (ADR-003).
 *  - Uses `js-yaml`'s `dump()` to render the YAML text rather than hand-built
 *    string concatenation — per 14-DEPENDENCY_POLICY §5 ("no custom YAML
 *    parser/serializer — use a proven YAML engine"), the same library
 *    decode.js already uses to read Clash YAML, so quoting/indentation are
 *    always well-formed.
 *  - Emits CANONICAL synonym names the extractor reads first (`servername`
 *    over `sni`, `client-fingerprint` over `fingerprint`, `public-key`/
 *    `short-id` inside `reality-opts`) and Clash's NATIVE protocol spelling
 *    (`ss`, not `shadowsocks` — both are accepted on parse, but `ss` is what
 *    real Clash configs use and what normalize.js maps back to
 *    "shadowsocks") — so `normalizeManyClash(parseClash(toClash(node)))`
 *    round-trips without data loss. Default values (`network: "tcp"`,
 *    `security: "none"`) are omitted, since the parser restores them as
 *    defaults when the corresponding keys are absent.
 *  - WireGuard keys are read from `node.extensions.wireguard` (ADR-007) and
 *    written to Clash's own top-level WireGuard fields (`private-key`,
 *    `public-key`, `pre-shared-key`, `ip`, `mtu`) — NEVER to `reality-opts`,
 *    even though Reality also has a field literally named `public-key`
 *    (nested under `reality-opts` there, top-level here). `node.security`
 *    stays `"none"` for every WireGuard node (no Clash-aware normalizer ever
 *    sets it otherwise), so `buildSecurity()` never emits `tls`/`reality-opts`
 *    for WireGuard — symmetric to to-singbox.js's `buildTls()` returning
 *    `undefined` for the same reason (ADR-007).
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 */

import yaml from "js-yaml";
import { DEFAULT_NETWORK, DEFAULT_SECURITY } from "../unm/schema/defaults.js";

/** Every protocol the Clash Parser's normalize.js builds a full node for.
 *  Exported as ADR-012's ConversionObject source of truth for `canExportAsClashYaml`. */
export const CLASH_SUPPORTED_PROTOCOLS = Object.freeze([
  "vless", "vmess", "trojan", "shadowsocks", "hysteria2", "tuic", "wireguard",
]);

/** Protocols that are TLS-native in Clash (normalize.js infers "tls" without a flag). */
const TLS_NATIVE = Object.freeze(["trojan", "hysteria2", "tuic"]);

/** UNM protocol -> Clash's native `type:` spelling, where it differs.
 * @type {Readonly<Partial<Record<string, string>>>} */
const CLASH_TYPE = Object.freeze({ shadowsocks: "ss" });

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
 * Layer the security-related fields onto the proxy object — inverse of
 * extract.js's `tls`/`reality-opts`/`servername`/`sni`/`client-fingerprint`/
 * `alpn` reading. `tls`/`reality-opts` are only written for a non-default
 * security; sni/fingerprint/alpn are read unconditionally by the parser, so
 * they are written unconditionally here too (mirroring normalize.js exactly).
 * @param {Record<string, unknown>} proxy
 * @param {UNMNode} node
 */
function buildSecurity(proxy, node) {
  if (node.security === "reality") {
    proxy.tls = true;
    /** @type {Record<string, unknown>} */
    const reality = {};
    if (node.pbk) reality["public-key"] = node.pbk;
    if (node.sid) reality["short-id"] = node.sid;
    proxy["reality-opts"] = reality;
  } else if (node.security === "tls") {
    proxy.tls = true;
  }
  if (node.sni) proxy.servername = node.sni;
  if (node.fingerprint) proxy["client-fingerprint"] = node.fingerprint;
  if (Array.isArray(node.alpn) && node.alpn.length) proxy.alpn = [...node.alpn];
}

/**
 * Layer the transport-related fields onto the proxy object — inverse of
 * extract.js's `network`/`ws-opts`/`grpc-opts` reading. Returns without
 * touching `proxy` for the default network ("tcp"). Only ws/grpc get a
 * nested opts block, matching extract.js (no httpupgrade/kcp/quic support
 * there yet).
 * @param {Record<string, unknown>} proxy
 * @param {UNMNode} node
 */
function buildTransport(proxy, node) {
  if (node.network === DEFAULT_NETWORK) return;
  proxy.network = node.network;
  if (node.network === "ws") {
    /** @type {Record<string, unknown>} */
    const ws = {};
    if (node.path) ws.path = node.path;
    if (node.host) ws.headers = { Host: node.host };
    if (Object.keys(ws).length) proxy["ws-opts"] = ws;
  } else if (node.network === "grpc" && node.serviceName) {
    proxy["grpc-opts"] = { "grpc-service-name": node.serviceName };
  }
}

/**
 * Serialize a UNMNode to a single-proxy Clash YAML config string.
 * @param {UNMNode} node
 * @returns {string}
 * @throws {Error} if the protocol is outside the UNM Protocol enum.
 */
export function toClash(node) {
  if (!CLASH_SUPPORTED_PROTOCOLS.includes(node.protocol)) {
    throw new Error(`toClash: protocol "${node.protocol}" has no Clash YAML shape (CONVERT_UNSUPPORTED)`);
  }

  /** @type {Record<string, unknown>} */
  const proxy = {
    type: CLASH_TYPE[node.protocol] ?? node.protocol,
    server: node.address,
    port: node.port,
  };
  if (node.remark) proxy.name = node.remark;
  if (node.uuid) proxy.uuid = node.uuid;
  if (node.password) proxy.password = node.password;
  if (node.protocol === "shadowsocks") {
    if (node.method) proxy.cipher = node.method;
  } else if (node.encryption) {
    proxy.cipher = node.encryption;
  }
  if (node.flow) proxy.flow = node.flow;

  buildTransport(proxy, node);
  buildSecurity(proxy, node);

  if (node.protocol === "wireguard") {
    const wg = wireguardExt(node);
    if (wg) {
      if (typeof wg.privateKey === "string") proxy["private-key"] = wg.privateKey;
      if (typeof wg.publicKey === "string") proxy["public-key"] = wg.publicKey;
      if (typeof wg.presharedKey === "string") proxy["pre-shared-key"] = wg.presharedKey;
      if (Array.isArray(wg.allowedIPs) && wg.allowedIPs.length) proxy.ip = wg.allowedIPs.join(",");
      if (typeof wg.mtu === "number") proxy.mtu = wg.mtu;
    }
  }

  return yaml.dump({ proxies: [proxy] });
}
