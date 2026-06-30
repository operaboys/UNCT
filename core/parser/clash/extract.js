/**
 * Clash field extraction — 04-PARSER_ENGINE Stage 06.
 *
 * A Clash / Clash.Meta config holds a `proxies:` array, so it is a MULTI-NODE
 * source (ADR-008): every proxy becomes its own UNMNode. Clash uses kebab-case
 * names and nested `*-opts` blocks, so it is a separate parser per the Extension
 * Rule (12 §6). Value/name normalization is normalize.js's job.
 *
 * @typedef {import("../../types/parser").RawExtraction} RawExtraction
 */

import { loadClashYaml } from "./decode.js";

/** Clash proxy `type` values that carry a real node (Clash uses `ss`). */
export const CLASH_PROXY_TYPES = Object.freeze([
  "vless", "vmess", "trojan", "ss", "shadowsocks", "hysteria2", "tuic", "wireguard",
]);

/**
 * Gather proxy entries from the `proxies:` array, skipping anything without a
 * recognized type.
 * @param {any} doc
 * @returns {any[]}
 */
export function collectProxies(doc) {
  if (!doc || typeof doc !== "object" || !Array.isArray(doc.proxies)) return [];
  return doc.proxies.filter(
    (/** @type {any} */ p) => p && typeof p === "object" &&
      CLASH_PROXY_TYPES.includes(String(p.type).toLowerCase()),
  );
}

/**
 * Extract one proxy into a flat raw-field record (raw Clash names preserved).
 * @param {any} p
 * @returns {Record<string, unknown>}
 */
export function extractProxy(p) {
  /** @type {Record<string, unknown>} */
  const f = {};
  if (!p || typeof p !== "object") return f;

  f.type = p.type;
  if (p.name != null) f.name = p.name;
  if (p.server != null) f.server = p.server;
  if (p.port != null) f.port = p.port;
  if (p.uuid != null) f.uuid = p.uuid;
  if (p.password != null) f.password = p.password;
  if (p.cipher != null) f.cipher = p.cipher; // ss method / vmess cipher
  if (p.flow != null) f.flow = p.flow;
  if (p.network != null) f.network = p.network;

  // Security signals: `tls` boolean + presence of `reality-opts`.
  if (p.tls != null) f.tls = p.tls;
  const ro = p["reality-opts"];
  if (ro && typeof ro === "object") {
    f.realityOpts = true;
    if (ro["public-key"] != null) f.public_key = ro["public-key"];
    if (ro["short-id"] != null) f.short_id = ro["short-id"];
  }
  if (p.servername != null) f.servername = p.servername;
  if (p.sni != null) f.sni = p.sni;
  if (p["client-fingerprint"] != null) f.client_fingerprint = p["client-fingerprint"];
  if (p.fingerprint != null) f.fingerprint = p.fingerprint;
  if (p.alpn != null) f.alpn = p.alpn;

  // Transport opts.
  const ws = p["ws-opts"];
  if (ws && typeof ws === "object") {
    if (ws.path != null) f.path = ws.path;
    if (ws.headers && typeof ws.headers === "object" && ws.headers.Host != null) f.host = ws.headers.Host;
  }
  const grpc = p["grpc-opts"];
  if (grpc && typeof grpc === "object" && grpc["grpc-service-name"] != null) {
    f.service_name = grpc["grpc-service-name"];
  }

  // WireGuard.
  if (p["private-key"] != null) f.private_key = p["private-key"];
  if (p["public-key"] != null) f.peer_public_key = p["public-key"];
  if (p["pre-shared-key"] != null) f.pre_shared_key = p["pre-shared-key"];
  if (p.ip != null) f.allowed_ip = p.ip;
  if (p.mtu != null) f.mtu = p.mtu;

  return f;
}

/**
 * Extract config-level route rules from a Clash YAML document.
 * Returns undefined when the config carries no `rules:` array or all entries
 * are non-strings (Clash rules are always raw strings, e.g. "DOMAIN-SUFFIX,google.com,PROXY").
 * @param {any} doc
 * @returns {import("../../types/rules").ConfigRules | undefined}
 */
export function extractClashRules(doc) {
  if (!doc || typeof doc !== "object") return undefined;
  const rawRules = Array.isArray(doc.rules) ? doc.rules : [];
  const rules = rawRules.filter((/** @type {any} */ r) => typeof r === "string");
  if (rules.length === 0) return undefined;
  return { source: "clash", rules };
}

/**
 * Extract config-level DNS settings from a Clash YAML document (ADR-022).
 * Returns undefined when DNS is disabled, absent, or has no usable servers.
 * @param {any} doc
 * @returns {import("../../types/dns").ConfigDns | undefined}
 */
export function extractClashDns(doc) {
  const dns = doc && typeof doc === "object" ? doc.dns : null;
  if (!dns || typeof dns !== "object") return undefined;
  if (dns.enable === false) return undefined;
  const enhancedMode = typeof dns["enhanced-mode"] === "string" ? dns["enhanced-mode"] : undefined;
  const fakeIp = enhancedMode === "fake-ip";
  const pools = [dns.nameserver, dns.fallback, dns["default-nameserver"]].flat();
  const servers = pools.filter((s) => typeof s === "string");
  if (servers.length === 0 && !fakeIp) return undefined;
  /** @type {import("../../types/dns").ConfigDns} */
  const result = { servers, fakeIp };
  if (enhancedMode !== undefined) result.strategy = enhancedMode;
  return result;
}

/**
 * parse() — Stage 06 happy path. Load YAML, collect all proxies.
 * Throws (routing to recover()) on invalid YAML or no proxies.
 * @param {string} input
 * @returns {RawExtraction}
 */
export function parseClash(input) {
  const doc = loadClashYaml(input);
  const items = collectProxies(doc).map(extractProxy);
  if (items.length === 0) {
    throw new Error("Clash parse: no proxies found (PARSE_MISSING_REQUIRED)");
  }
  const configDns = extractClashDns(doc);
  const configRules = extractClashRules(doc);
  /** @type {Record<string, unknown>} */
  const fields = { items };
  if (configDns) fields.configDns = configDns;
  if (configRules) fields.configRules = configRules;
  return { protocol: "clash", fields, raw: input };
}
