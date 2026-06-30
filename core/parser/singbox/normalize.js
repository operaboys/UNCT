/**
 * Sing-box normalization — 04-PARSER_ENGINE Stage 13.1 + Stage 14.
 *
 * Multi-node (ADR-008): `normalizeManySingBox` turns each extracted item into a
 * UNMNode. Reuses the shared Normalization Mapping Table (core/unm/mapper), the
 * shared Priority Chain resolver, and the shared WireGuard namespace builder —
 * only the sing-box-specific synonym chains are defined here.
 *
 * @typedef {import("../../types/parser").RawExtraction} RawExtraction
 * @typedef {import("../../types/unm").UNMNode} UNMNode
 */

import { createNode } from "../../unm/create-node.js";
import {
  PROTOCOL_MAP, NETWORK_TYPE_MAP, SECURITY_TYPE_MAP, normalizeValue,
} from "../../unm/mapper/normalization-map.js";
import { DEFAULT_NETWORK, DEFAULT_SECURITY } from "../../unm/schema/defaults.js";
import { resolvePriority } from "../shared/priority.js";
import { buildWireguardExtensions } from "../shared/wireguard.js";
import { parseAlpnArray } from "../shared/alpn.js";

export const PARSER_NAME = "SingBoxParser";

/** Sing-box synonym chains (05 §2). Sing-box uses snake_case names. */
export const PRIORITY_CHAINS = Object.freeze({
  pbk: ["public_key", "publicKey", "pbk"],
  sid: ["short_id", "shortId", "sid"],
  sni: ["server_name", "sni"],
  fingerprint: ["fingerprint"],
});

/**
 * Build one UNMNode from a single extracted sing-box item.
 * @param {Record<string, unknown>} item
 * @param {import("../../types/dns").ConfigDns | undefined} [configDns]
 * @param {import("../../types/rules").ConfigRules | undefined} [configRules]
 * @returns {Readonly<UNMNode>}
 * @throws {Error} if protocol/server/server_port cannot be resolved.
 */
export function normalizeItem(item, configDns = undefined, configRules = undefined) {
  /** @type {string[]} */
  const warnings = [];
  /** @type {Record<string, string>} */
  const originalMappings = {};

  const protocol = normalizeValue(PROTOCOL_MAP, item.type);
  if (!protocol) {
    throw new Error(`SingBoxParser.normalize: unknown type "${String(item.type)}" (PARSE_MISSING_REQUIRED)`);
  }

  const address = item.server;
  if (typeof address !== "string" || address.length === 0) {
    throw new Error("SingBoxParser.normalize: server (address) is missing (PARSE_MISSING_REQUIRED)");
  }
  const port = typeof item.server_port === "string" ? Number(item.server_port) : item.server_port;
  if (typeof port !== "number" || !Number.isInteger(port)) {
    throw new Error("SingBoxParser.normalize: server_port is missing or not an integer (PARSE_MISSING_REQUIRED)");
  }

  let network = DEFAULT_NETWORK;
  if (item.network_type != null) {
    const mapped = normalizeValue(NETWORK_TYPE_MAP, item.network_type);
    if (mapped) network = mapped;
    else warnings.push(`PARSE_UNMAPPED_VALUE: transport "${String(item.network_type)}" not mapped; defaulted to "${DEFAULT_NETWORK}".`);
  }

  let security = DEFAULT_SECURITY;
  if (item.security != null) {
    const mapped = normalizeValue(SECURITY_TYPE_MAP, item.security);
    if (mapped) security = mapped;
    else warnings.push(`PARSE_UNMAPPED_VALUE: security "${String(item.security)}" not mapped; defaulted to "${DEFAULT_SECURITY}".`);
  }

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

  /** @type {Record<string, unknown>} */
  const input = {
    sourceType: "singbox-json",
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
  if (typeof item.method === "string") input.method = item.method;
  if (typeof item.flow === "string") input.flow = item.flow;
  if (typeof item.path === "string") input.path = item.path;
  if (typeof item.host === "string") input.host = item.host;
  if (typeof item.service_name === "string") input.serviceName = item.service_name;
  if (typeof item.tag === "string") input.remark = item.tag;
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
      allowedIPs: item.local_address,
      mtu: item.mtu,
      reserved: item.reserved,
    });
    /** @type {Record<string, unknown>} */
    const ext = wgExt ? { ...wgExt } : {};
    if (configDns !== undefined) ext.configDns = configDns;
    if (configRules !== undefined) ext.configRules = configRules;
    if (Object.keys(ext).length > 0) input.extensions = ext;
  } else {
    /** @type {Record<string, unknown>} */
    const ext = {};
    if (configDns !== undefined) ext.configDns = configDns;
    if (configRules !== undefined) ext.configRules = configRules;
    if (Object.keys(ext).length > 0) input.extensions = ext;
  }

  return createNode(/** @type {any} */ (input));
}

/**
 * Multi-node expansion (ADR-008): one node per extracted item, skipping any
 * item that cannot be built and recording it in the report (never fabricated).
 * @param {RawExtraction} extraction
 * @returns {Readonly<UNMNode>[]}
 */
export function normalizeManySingBox(extraction) {
  const items = Array.isArray(extraction.fields?.items) ? extraction.fields.items : [];
  const configDns = /** @type {import("../../types/dns").ConfigDns | undefined} */ (extraction.fields?.configDns);
  const configRules = /** @type {import("../../types/rules").ConfigRules | undefined} */ (extraction.fields?.configRules);
  /** @type {Readonly<UNMNode>[]} */
  const nodes = [];
  for (const item of items) {
    try { nodes.push(normalizeItem(/** @type {any} */ (item), configDns, configRules)); }
    catch { /* skip un-buildable item; it simply produces no node */ }
  }
  return nodes;
}

/**
 * Single-node `normalize` is invalid for this multi-node parser (ADR-008): it
 * would silently drop every node after the first (ANTI_CHAOS Rule 9).
 * @param {RawExtraction} _extraction
 * @returns {never}
 */
export function normalizeRefuse(_extraction) {
  throw new Error(
    "SingBoxParser.normalize() is not valid: a sing-box config expands to many " +
    "nodes. Check parser.producesMany and call normalizeMany() — using normalize() " +
    "would silently drop nodes (ANTI_CHAOS Rule 9). See ADR-008.",
  );
}
