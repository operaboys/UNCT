/**
 * URL normalization — 04-PARSER_ENGINE Stage 13.1 + Stage 14.
 *
 * Reuses the shared Normalization Mapping Table (core/unm/mapper) and the
 * shared Priority Chain resolver (core/parser/shared) — it does NOT re-implement
 * them. Each parser only defines its own chains, since the synonym names differ
 * per format (a URL uses `fp`; Xray uses `clientFingerprint`).
 *
 * @typedef {import("../../types/parser").RawExtraction} RawExtraction
 * @typedef {import("../../types/unm").UNMNode} UNMNode
 * @typedef {import("../../types/unm").SourceType} SourceType
 */

import { createNode } from "../../unm/create-node.js";
import {
  PROTOCOL_MAP, NETWORK_TYPE_MAP, SECURITY_TYPE_MAP, normalizeValue,
} from "../../unm/mapper/normalization-map.js";
import { DEFAULT_NETWORK, DEFAULT_SECURITY } from "../../unm/schema/defaults.js";
import { resolvePriority } from "../shared/priority.js";
import { buildWireguardExtensions } from "../shared/wireguard.js";

export const PARSER_NAME = "URLParser";

/** Canonical protocol -> the URL-flavored SourceType (05 §2 enum). */
const PROTOCOL_SOURCE_TYPE = Object.freeze({
  vless: "vless-url", vmess: "vmess-url", trojan: "trojan-url",
  shadowsocks: "ss-url", hysteria2: "hysteria2-url", tuic: "tuic-url",
  wireguard: "wireguard-config",
});

/** URL-flavored Priority Chains (05 §2). `fp` is the URL synonym for fingerprint. */
export const PRIORITY_CHAINS = Object.freeze({
  fingerprint: ["fp", "fingerprint"],
  sni: ["sni", "serverName"],
  pbk: ["pbk", "publicKey"],
  sid: ["sid", "shortId"],
});

/**
 * Split a comma/space-separated ALPN string into an array of ids.
 * @param {unknown} raw
 * @returns {string[] | undefined}
 */
function parseAlpn(raw) {
  if (Array.isArray(raw)) return raw.filter((a) => typeof a === "string");
  if (typeof raw === "string") {
    const parts = raw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    return parts.length ? parts : undefined;
  }
  return undefined;
}

/**
 * @param {RawExtraction} extraction
 * @returns {Readonly<UNMNode>}
 * @throws {Error} if protocol/address/port cannot be resolved.
 */
export function normalizeUrl(extraction) {
  const fields = extraction.fields || {};
  /** @type {string[]} */
  const warnings = [...(extraction.warnings || [])];
  /** @type {string[]} */
  const recoveryActions = [...(extraction.recoveryActions || [])];
  /** @type {Record<string, string>} */
  const originalMappings = { ...(extraction.originalMappings || {}) };

  // ----- protocol (required) -----
  const protocol = normalizeValue(PROTOCOL_MAP, extraction.protocol ?? fields.protocol);
  if (!protocol) {
    throw new Error(`URL normalize: unknown protocol "${String(extraction.protocol)}" (PARSE_MISSING_REQUIRED)`);
  }
  const sourceType = /** @type {SourceType} */ (PROTOCOL_SOURCE_TYPE[protocol]);

  // ----- address / port (required) -----
  const address = fields.address;
  if (typeof address !== "string" || address.length === 0) {
    throw new Error("URL normalize: address is missing (PARSE_MISSING_REQUIRED)");
  }
  const port = typeof fields.port === "string" ? Number(fields.port) : fields.port;
  if (typeof port !== "number" || !Number.isInteger(port)) {
    throw new Error("URL normalize: port is missing or not an integer (PARSE_MISSING_REQUIRED)");
  }

  // ----- network: vmess uses `net` (-> fields.network); URLs use `type` -----
  let network = DEFAULT_NETWORK;
  const rawNetwork = fields.network ?? fields.type;
  if (rawNetwork != null) {
    const mapped = normalizeValue(NETWORK_TYPE_MAP, rawNetwork);
    if (mapped) network = mapped;
    else warnings.push(`PARSE_UNMAPPED_VALUE: network "${String(rawNetwork)}" not mapped; defaulted to "${DEFAULT_NETWORK}".`);
  }

  // ----- security -----
  let security = DEFAULT_SECURITY;
  if (fields.security != null) {
    const mapped = normalizeValue(SECURITY_TYPE_MAP, fields.security);
    if (mapped) security = mapped;
    else warnings.push(`PARSE_UNMAPPED_VALUE: security "${String(fields.security)}" not mapped; defaulted to "${DEFAULT_SECURITY}".`);
  }

  // ----- name normalization via shared Priority Chains -----
  const fingerprint = resolvePriority(fields, PRIORITY_CHAINS.fingerprint, "fingerprint", originalMappings);
  const sni = resolvePriority(fields, PRIORITY_CHAINS.sni, "sni", originalMappings);
  const pbk = resolvePriority(fields, PRIORITY_CHAINS.pbk, "pbk", originalMappings);
  const sid = resolvePriority(fields, PRIORITY_CHAINS.sid, "sid", originalMappings);

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
      confidence: recoveryActions.length ? 75 : 90,
      warnings,
      recoveryActions,
      originalMappings,
    },
  };

  if (typeof fields.uuid === "string") input.uuid = fields.uuid;
  if (typeof fields.password === "string") input.password = fields.password;
  if (typeof fields.method === "string") input.method = fields.method;
  if (typeof fields.encryption === "string") input.encryption = fields.encryption;
  if (typeof fields.flow === "string") input.flow = fields.flow;
  if (typeof fields.path === "string") input.path = fields.path;
  if (typeof fields.host === "string") input.host = fields.host;
  if (typeof fields.serviceName === "string") input.serviceName = fields.serviceName;
  if (typeof fields.headerType === "string") input.headerType = fields.headerType;
  if (typeof fields.remark === "string") input.remark = fields.remark;
  if (sni !== undefined) input.sni = sni;
  if (pbk !== undefined) input.pbk = pbk;
  if (sid !== undefined) input.sid = sid;
  if (fingerprint !== undefined) input.fingerprint = fingerprint;
  const alpn = parseAlpn(fields.alpn);
  if (alpn !== undefined) input.alpn = alpn;

  // WireGuard keys are not part of the frozen UNM core — they go under the
  // fixed extensions.wireguard namespace (ADR-007), built via the shared helper
  // so every parser writes the same shape. Never placed on the node itself.
  if (protocol === "wireguard") {
    const ext = buildWireguardExtensions(fields);
    if (ext) input.extensions = ext;
  }

  return createNode(/** @type {any} */ (input));
}
