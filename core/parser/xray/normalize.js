/**
 * Xray normalization — 04-PARSER_ENGINE Stage 13.1 + Stage 14.
 *
 * Turns a RawExtraction (raw Xray field names/values) into a canonical,
 * immutable UNMNode:
 *  - VALUE normalization through the Stage 13.1 mapping tables (network /
 *    security / protocol). Unmapped values do NOT crash — a PARSE_UNMAPPED_VALUE
 *    warning is recorded and the protocol default applies (Stage 10).
 *  - NAME normalization through fixed Priority Chains (05 §2): when several
 *    synonym names map to one canonical field, a fixed order picks the winner;
 *    every synonym actually seen is recorded in metadata.originalMappings.
 *
 * @typedef {import("../../types/parser").RawExtraction} RawExtraction
 * @typedef {import("../../types/unm").UNMNode} UNMNode
 */

import { createNode } from "../../unm/create-node.js";
import {
  PROTOCOL_MAP, NETWORK_TYPE_MAP, SECURITY_TYPE_MAP, normalizeValue,
} from "../../unm/mapper/normalization-map.js";
import { DEFAULT_NETWORK, DEFAULT_SECURITY } from "../../unm/schema/defaults.js";

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
 * Resolve a canonical value from a priority chain. Records EVERY present
 * synonym (winner and losers) in `originalMappings` so no provenance is lost
 * (05 §2); returns the first present value as the winner.
 * @param {Record<string, unknown>} fields
 * @param {readonly string[]} chain
 * @param {string} canonical
 * @param {Record<string, string>} originalMappings
 * @returns {string | undefined}
 */
export function resolvePriority(fields, chain, canonical, originalMappings) {
  /** @type {string | undefined} */
  let winner;
  for (const name of chain) {
    const v = fields[name];
    const present = typeof v === "string" ? v.length > 0 : v != null;
    if (!present) continue;
    if (name !== canonical) originalMappings[name] = canonical;
    if (winner === undefined) winner = String(v);
  }
  return winner;
}

/**
 * @param {RawExtraction} extraction
 * @returns {Readonly<UNMNode>}
 * @throws {Error} if protocol/address/port cannot be resolved (parser must
 *   recover BEFORE constructing — 04-PARSER_ENGINE).
 */
export function normalizeXray(extraction) {
  const fields = extraction.fields || {};
  /** @type {string[]} */
  const warnings = [...(extraction.warnings || [])];
  /** @type {string[]} */
  const recoveryActions = [...(extraction.recoveryActions || [])];
  /** @type {Record<string, string>} */
  const originalMappings = { ...(extraction.originalMappings || {}) };

  // ----- protocol (required) -----
  const rawProtocol = extraction.protocol ?? fields.protocol;
  const protocol = normalizeValue(PROTOCOL_MAP, rawProtocol);
  if (!protocol) {
    throw new Error(`XrayParser.normalize: unknown protocol "${String(rawProtocol)}" (PARSE_MISSING_REQUIRED)`);
  }

  // ----- address / port (required) -----
  const address = fields.address;
  if (typeof address !== "string" || address.length === 0) {
    throw new Error("XrayParser.normalize: address is missing (PARSE_MISSING_REQUIRED)");
  }
  const port = typeof fields.port === "string" ? Number(fields.port) : fields.port;
  if (typeof port !== "number" || !Number.isInteger(port)) {
    throw new Error("XrayParser.normalize: port is missing or not an integer (PARSE_MISSING_REQUIRED)");
  }

  // ----- network (Stage 13.1 value map; unmapped -> default + warning) -----
  let network = DEFAULT_NETWORK;
  if (fields.network != null) {
    const mapped = normalizeValue(NETWORK_TYPE_MAP, fields.network);
    if (mapped) network = mapped;
    else warnings.push(`PARSE_UNMAPPED_VALUE: network "${String(fields.network)}" not mapped; defaulted to "${DEFAULT_NETWORK}".`);
  }

  // ----- security (Stage 13.1 value map; unmapped -> default + warning) -----
  let security = DEFAULT_SECURITY;
  if (fields.security != null) {
    const mapped = normalizeValue(SECURITY_TYPE_MAP, fields.security);
    if (mapped) security = mapped;
    else warnings.push(`PARSE_UNMAPPED_VALUE: security "${String(fields.security)}" not mapped; defaulted to "${DEFAULT_SECURITY}".`);
  }

  // ----- name normalization via priority chains (records originalMappings) -----
  const pbk = resolvePriority(fields, PRIORITY_CHAINS.pbk, "pbk", originalMappings);
  const sid = resolvePriority(fields, PRIORITY_CHAINS.sid, "sid", originalMappings);
  const sni = resolvePriority(fields, PRIORITY_CHAINS.sni, "sni", originalMappings);
  const fingerprint = resolvePriority(fields, PRIORITY_CHAINS.fingerprint, "fingerprint", originalMappings);

  // ----- alpn: keep only string entries (structure only — validity is Stage 13) -----
  /** @type {string[] | undefined} */
  let alpn;
  if (Array.isArray(fields.alpn)) {
    alpn = fields.alpn.filter((a) => typeof a === "string");
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
      confidence: typeof extraction.warnings?.length === "number" && extraction.warnings.length > 0 ? 80 : 95,
      warnings,
      recoveryActions,
      originalMappings,
    },
  };

  // Optional fields — only set when present (never store empty synonyms).
  if (typeof fields.id === "string") input.uuid = fields.id;
  if (typeof fields.password === "string") input.password = fields.password;
  if (typeof fields.method === "string") input.method = fields.method;
  if (typeof fields.encryption === "string") input.encryption = fields.encryption;
  if (typeof fields.flow === "string") input.flow = fields.flow;
  if (typeof fields.path === "string") input.path = fields.path;
  if (typeof fields.host === "string") input.host = fields.host;
  if (typeof fields.serviceName === "string") input.serviceName = fields.serviceName;
  if (typeof fields.tag === "string") input.remark = fields.tag;
  if (sni !== undefined) input.sni = sni;
  if (pbk !== undefined) input.pbk = pbk;
  if (sid !== undefined) input.sid = sid;
  if (fingerprint !== undefined) input.fingerprint = fingerprint;
  if (alpn !== undefined) input.alpn = alpn;

  return createNode(/** @type {any} */ (input));
}
