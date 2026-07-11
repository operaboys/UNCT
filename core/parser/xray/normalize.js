/**
 * Xray normalization — 04-PARSER_ENGINE Stage 13.1 + Stage 14.
 *
 * Multi-node (ADR-008): an Xray config expands to many nodes (Multi-Outbound ·
 * Multi-User, 04 Stage 04), so `normalizeManyXray` turns each extracted item
 * into a UNMNode. Each item is normalized by:
 *  - VALUE normalization through the Stage 13.1 mapping tables (network /
 *    security / protocol). Unmapped values do NOT crash — a PARSE_UNMAPPED_VALUE
 *    warning is recorded and the protocol default applies (Stage 10).
 *  - NAME normalization through fixed Priority Chains (05 §2) via the shared
 *    resolver; every synonym seen is recorded in metadata.originalMappings.
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

// Re-exported so the public surface (xray/index.js) is unchanged after moving
// resolvePriority to the shared helper module — single source of truth.
export { resolvePriority };

export const PARSER_NAME = "XrayParser";

/**
 * Priority Chains (05 §2). Each lists the synonym field names for one canonical
 * UNM field, highest priority first. Xray's own names are included so the
 * winner is deterministic even if a config carries several spellings.
 */
export const PRIORITY_CHAINS = Object.freeze({
  pbk: ["publicKey", "serverPublicKey", "pbk"],
  sid: ["shortId", "sid"],
  sni: ["serverName", "sni"],
  fingerprint: ["fingerprint", "clientFingerprint"],
});

/**
 * Build one UNMNode from a single extracted item (one outbound × endpoint × user).
 * @param {Record<string, unknown>} item
 * @param {{ warnings?: string[], recoveryActions?: string[] }} [context]
 * @param {import("../../types/dns").ConfigDns | undefined} [configDns]
 * @returns {Readonly<UNMNode>}
 * @throws {Error} if protocol/address/port cannot be resolved (parser must
 *   recover BEFORE constructing — 04-PARSER_ENGINE).
 */
export function normalizeItem(item, context = {}, configDns = undefined) {
  /** @type {string[]} */
  const warnings = [...(context.warnings || [])];
  /** @type {string[]} */
  const recoveryActions = [...(context.recoveryActions || [])];
  /** @type {Record<string, string>} */
  const originalMappings = {};

  // ----- protocol (required) -----
  const protocol = normalizeValue(PROTOCOL_MAP, item.protocol);
  if (!protocol) {
    throw new Error(`XrayParser.normalize: unknown protocol "${String(item.protocol)}" (PARSE_MISSING_REQUIRED)`);
  }

  // ----- address / port (required) -----
  const address = item.address;
  if (typeof address !== "string" || address.length === 0) {
    throw new Error("XrayParser.normalize: address is missing (PARSE_MISSING_REQUIRED)");
  }
  const port = typeof item.port === "string" ? Number(item.port) : item.port;
  if (typeof port !== "number" || !Number.isInteger(port)) {
    throw new Error("XrayParser.normalize: port is missing or not an integer (PARSE_MISSING_REQUIRED)");
  }

  // ----- network (Stage 13.1 value map; unmapped -> default + warning) -----
  let network = DEFAULT_NETWORK;
  if (item.network != null) {
    const mapped = normalizeValue(NETWORK_TYPE_MAP, item.network);
    if (mapped) network = mapped;
    else warnings.push(`PARSE_UNMAPPED_VALUE: network "${String(item.network)}" not mapped; defaulted to "${DEFAULT_NETWORK}".`);
  }

  // ----- security (Stage 13.1 value map; unmapped -> default + warning) -----
  let security = DEFAULT_SECURITY;
  if (item.security != null) {
    const mapped = normalizeValue(SECURITY_TYPE_MAP, item.security);
    if (mapped) security = mapped;
    else warnings.push(`PARSE_UNMAPPED_VALUE: security "${String(item.security)}" not mapped; defaulted to "${DEFAULT_SECURITY}".`);
  }

  // ----- name normalization via priority chains (records originalMappings) -----
  const pbk = resolvePriority(item, PRIORITY_CHAINS.pbk, "pbk", originalMappings);
  const sid = resolvePriority(item, PRIORITY_CHAINS.sid, "sid", originalMappings);
  const sni = resolvePriority(item, PRIORITY_CHAINS.sni, "sni", originalMappings);
  const fingerprint = resolvePriority(item, PRIORITY_CHAINS.fingerprint, "fingerprint", originalMappings);

  // ----- alpn: keep only string entries (structure only — validity is Stage 13) -----
  /** @type {string[] | undefined} */
  let alpn;
  if (Array.isArray(item.alpn)) {
    alpn = item.alpn.filter((a) => typeof a === "string");
  }

  /** @type {Record<string, unknown>} */
  const input = {
    sourceType: "xray-json",
    protocol,
    address,
    port,
    network,
    security,
    metadata: {
      parser: PARSER_NAME,
      confidence: recoveryActions.length > 0 ? 80 : 95,
      warnings,
      recoveryActions,
      originalMappings,
    },
  };

  // Optional fields — only set when present (never store empty synonyms).
  if (typeof item.id === "string") input.uuid = item.id;
  if (typeof item.password === "string") input.password = item.password;
  if (typeof item.method === "string") input.method = item.method;
  if (typeof item.encryption === "string") input.encryption = item.encryption;
  if (typeof item.flow === "string") input.flow = item.flow;
  if (typeof item.path === "string") input.path = item.path;
  if (typeof item.host === "string") input.host = item.host;
  if (typeof item.serviceName === "string") input.serviceName = item.serviceName;
  if (typeof item.tag === "string") input.remark = item.tag;
  if (sni !== undefined) input.sni = sni;
  if (pbk !== undefined) input.pbk = pbk;
  if (sid !== undefined) input.sid = sid;
  if (fingerprint !== undefined) input.fingerprint = fingerprint;
  if (alpn !== undefined) input.alpn = alpn;
  if (configDns !== undefined) input.extensions = { configDns };

  return createNode(/** @type {any} */ (input));
}

/**
 * Multi-node expansion (ADR-008): one node per extracted item, skipping any
 * item that cannot be built (e.g. missing address) and never fabricating one.
 * @param {RawExtraction} extraction
 * @returns {Readonly<UNMNode>[]}
 */
export function normalizeManyXray(extraction) {
  const items = Array.isArray(extraction.fields?.items) ? extraction.fields.items : [];
  const context = {
    warnings: extraction.warnings,
    recoveryActions: extraction.recoveryActions,
  };
  const configDns = /** @type {import("../../types/dns").ConfigDns | undefined} */ (extraction.fields?.configDns);
  /** @type {Readonly<UNMNode>[]} */
  const nodes = [];
  for (const item of items) {
    try { nodes.push(normalizeItem(/** @type {any} */ (item), context, configDns)); }
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
    "XrayParser.normalize() is not valid: an Xray config expands to many nodes " +
    "(Multi-Outbound · Multi-User). Check parser.producesMany and call " +
    "normalizeMany() — using normalize() would silently drop nodes " +
    "(ANTI_CHAOS Rule 9). See ADR-008.",
  );
}
