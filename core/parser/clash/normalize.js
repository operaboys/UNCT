/**
 * Clash normalization — 04-PARSER_ENGINE Stage 13.1 + Stage 14.
 *
 * Multi-node (ADR-008). Reuses the shared Normalization Mapping Table, the
 * shared Priority Chain resolver, and the shared WireGuard namespace builder.
 * Clash expresses security as a `tls` boolean + `reality-opts` presence (not a
 * string), and the TLS-native protocols (trojan/hysteria2/tuic) imply TLS.
 *
 * @typedef {import("../../types/parser").RawExtraction} RawExtraction
 * @typedef {import("../../types/unm").UNMNode} UNMNode
 * @typedef {import("../../types/unm").SourceType} SourceType
 */

import { createNode } from "../../unm/create-node.js";
import {
  PROTOCOL_MAP, NETWORK_TYPE_MAP, normalizeValue,
} from "../../unm/mapper/normalization-map.js";
import { DEFAULT_NETWORK, DEFAULT_SECURITY } from "../../unm/schema/defaults.js";
import { resolvePriority } from "../shared/priority.js";
import { buildWireguardExtensions } from "../shared/wireguard.js";
import { parseAlpnArray } from "../shared/alpn.js";

export const PARSER_NAME = "ClashParser";

/** Protocols that are TLS-native in Clash (TLS implied without an explicit flag). */
const TLS_NATIVE = Object.freeze(["trojan", "hysteria2", "tuic"]);

/** Clash synonym chains (05 §2). Clash uses kebab-case (mapped to snake in extract). */
export const PRIORITY_CHAINS = Object.freeze({
  pbk: ["public_key", "publicKey", "pbk"],
  sid: ["short_id", "shortId", "sid"],
  sni: ["servername", "sni"],
  fingerprint: ["client_fingerprint", "fingerprint"],
});

/**
 * Build one UNMNode from a single extracted Clash proxy.
 * @param {Record<string, unknown>} item
 * @param {import("../../types/dns").ConfigDns | undefined} [configDns]
 * @returns {Readonly<UNMNode>}
 * @throws {Error} if protocol/server/port cannot be resolved.
 */
export function normalizeItem(item, configDns = undefined) {
  /** @type {string[]} */
  const warnings = [];
  /** @type {Record<string, string>} */
  const originalMappings = {};

  const protocol = normalizeValue(PROTOCOL_MAP, item.type);
  if (!protocol) {
    throw new Error(`ClashParser.normalize: unknown type "${String(item.type)}" (PARSE_MISSING_REQUIRED)`);
  }

  const address = item.server;
  if (typeof address !== "string" || address.length === 0) {
    throw new Error("ClashParser.normalize: server (address) is missing (PARSE_MISSING_REQUIRED)");
  }
  const port = typeof item.port === "string" ? Number(item.port) : item.port;
  if (typeof port !== "number" || !Number.isInteger(port)) {
    throw new Error("ClashParser.normalize: port is missing or not an integer (PARSE_MISSING_REQUIRED)");
  }

  let network = DEFAULT_NETWORK;
  if (item.network != null) {
    const mapped = normalizeValue(NETWORK_TYPE_MAP, item.network);
    if (mapped) network = mapped;
    else warnings.push(`PARSE_UNMAPPED_VALUE: network "${String(item.network)}" not mapped; defaulted to "${DEFAULT_NETWORK}".`);
  }

  // Security: reality-opts -> reality; tls true -> tls; TLS-native protocol -> tls.
  let security = DEFAULT_SECURITY;
  if (item.realityOpts) security = "reality";
  else if (item.tls === true) security = "tls";
  else if (TLS_NATIVE.includes(protocol)) security = "tls";

  // pbk/sid are Reality-only UNM core fields. WireGuard's own public key
  // (`public_key`/`publicKey`, synonyms in the pbk chain) belongs solely under
  // extensions.wireguard (ADR-007), never on the node — so skip the pbk/sid
  // chains for wireguard to avoid both a bogus node.pbk and a bogus
  // publicKey->pbk entry in originalMappings.
  const isWireguard = protocol === "wireguard";
  const pbk = isWireguard ? undefined : resolvePriority(item, PRIORITY_CHAINS.pbk, "pbk", originalMappings);
  const sid = isWireguard ? undefined : resolvePriority(item, PRIORITY_CHAINS.sid, "sid", originalMappings);
  const sni = resolvePriority(item, PRIORITY_CHAINS.sni, "sni", originalMappings);
  const fingerprint = resolvePriority(item, PRIORITY_CHAINS.fingerprint, "fingerprint", originalMappings);

  // Clash.Meta-only features warrant the meta source type.
  const isMeta = Boolean(item.realityOpts) || ["vless", "hysteria2", "tuic"].includes(protocol);
  const sourceType = /** @type {SourceType} */ (isMeta ? "clash-meta-yaml" : "clash-yaml");

  /** @type {Record<string, unknown>} */
  const input = {
    sourceType,
    protocol,
    address,
    port,
    network,
    security,
    metadata: {
      parser: PARSER_NAME,
      confidence: 95,
      warnings,
      recoveryActions: [],
      originalMappings,
    },
  };

  if (typeof item.uuid === "string") input.uuid = item.uuid;
  if (typeof item.password === "string") input.password = item.password;
  // `cipher` is the SS method, or the VMess cipher (-> encryption).
  if (typeof item.cipher === "string") {
    if (protocol === "shadowsocks") input.method = item.cipher;
    else input.encryption = item.cipher;
  }
  if (typeof item.flow === "string") input.flow = item.flow;
  if (typeof item.path === "string") input.path = item.path;
  if (typeof item.host === "string") input.host = item.host;
  if (typeof item.service_name === "string") input.serviceName = item.service_name;
  if (typeof item.name === "string") input.remark = item.name;
  if (sni !== undefined) input.sni = sni;
  if (pbk !== undefined) input.pbk = pbk;
  if (sid !== undefined) input.sid = sid;
  if (fingerprint !== undefined) input.fingerprint = fingerprint;
  const alpn = parseAlpnArray(item.alpn);
  if (alpn !== undefined) input.alpn = alpn;

  if (protocol === "wireguard") {
    const wgExt = buildWireguardExtensions({
      privateKey: item.private_key,
      publicKey: item.peer_public_key,
      presharedKey: item.pre_shared_key,
      allowedIPs: item.allowed_ip,
      mtu: item.mtu,
    });
    /** @type {Record<string, unknown>} */
    const ext = wgExt ? { ...wgExt } : {};
    if (configDns !== undefined) ext.configDns = configDns;
    if (Object.keys(ext).length > 0) input.extensions = ext;
  } else if (configDns !== undefined) {
    input.extensions = { configDns };
  }

  return createNode(/** @type {any} */ (input));
}

/**
 * Multi-node expansion (ADR-008): one node per proxy, skipping un-buildable ones.
 * @param {RawExtraction} extraction
 * @returns {Readonly<UNMNode>[]}
 */
export function normalizeManyClash(extraction) {
  const items = Array.isArray(extraction.fields?.items) ? extraction.fields.items : [];
  const configDns = /** @type {import("../../types/dns").ConfigDns | undefined} */ (extraction.fields?.configDns);
  /** @type {Readonly<UNMNode>[]} */
  const nodes = [];
  for (const item of items) {
    try { nodes.push(normalizeItem(/** @type {any} */ (item), configDns)); }
    catch { /* skip un-buildable proxy */ }
  }
  return nodes;
}

/**
 * Single-node `normalize` is invalid for this multi-node parser (ADR-008).
 * @param {RawExtraction} _extraction
 * @returns {never}
 */
export function normalizeRefuse(_extraction) {
  throw new Error(
    "ClashParser.normalize() is not valid: a Clash config expands to many nodes. " +
    "Check parser.producesMany and call normalizeMany() — using normalize() would " +
    "silently drop nodes (ANTI_CHAOS Rule 9). See ADR-008.",
  );
}
