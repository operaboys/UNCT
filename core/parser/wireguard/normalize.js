/**
 * WireGuard normalization — 04-PARSER_ENGINE Stage 14.
 *
 * Multi-node (ADR-008): one node per peer. The endpoint (`host:port`) becomes
 * the core `address`/`port`; all WireGuard-specific fields go into
 * `extensions.wireguard` via the SHARED `buildWireguardExtensions` helper — the
 * exact same namespace and key names that Sing-box / Clash use (ADR-007). No
 * Priority Chains are needed (WireGuard `.conf` keys have no synonyms).
 *
 * @typedef {import("../../types/parser").RawExtraction} RawExtraction
 * @typedef {import("../../types/unm").UNMNode} UNMNode
 */

import { createNode } from "../../unm/create-node.js";
import { DEFAULT_NETWORK, DEFAULT_SECURITY } from "../../unm/schema/defaults.js";
import { buildWireguardExtensions } from "../shared/wireguard.js";
import { splitHostPort } from "../shared/endpoint.js";

export const PARSER_NAME = "WireGuardParser";

/**
 * Build one UNMNode from a single peer's raw-field record.
 * @param {Record<string, unknown>} item
 * @returns {Readonly<UNMNode>}
 * @throws {Error} if the endpoint (address/port) cannot be resolved.
 */
export function normalizeItem(item) {
  const hp = splitHostPort(item.endpoint);
  if (!hp || hp.host.length === 0) {
    throw new Error("WireGuardParser.normalize: peer has no usable Endpoint (PARSE_MISSING_REQUIRED)");
  }
  if (typeof hp.port !== "number" || !Number.isInteger(hp.port)) {
    throw new Error("WireGuardParser.normalize: Endpoint has no valid port (PARSE_MISSING_REQUIRED)");
  }

  // WireGuard data lives under extensions.wireguard (ADR-007) — never on the
  // frozen UNM core. `endpoint` is kept as the combined string per ADR-007.
  const ext = buildWireguardExtensions({
    privateKey: item.privatekey,
    publicKey: item.publickey,
    presharedKey: item.presharedkey,
    endpoint: item.endpoint,
    allowedIPs: item.allowedips,
    dns: item.dns,
    mtu: item.mtu,
    persistentKeepalive: item.persistentkeepalive,
  });

  /** @type {Record<string, unknown>} */
  const input = {
    sourceType: "wireguard-config",
    protocol: "wireguard",
    address: hp.host,
    port: hp.port,
    network: DEFAULT_NETWORK,   // UNM enum has no UDP; network is not meaningful here
    security: DEFAULT_SECURITY, // WireGuard has its own crypto, not TLS/Reality
    metadata: {
      parser: PARSER_NAME,
      confidence: 95,
      warnings: [],
      recoveryActions: [],
      originalMappings: {},
    },
  };
  if (ext) input.extensions = ext;

  return createNode(/** @type {any} */ (input));
}

/**
 * Multi-node expansion (ADR-008): one node per peer, skipping any peer that
 * cannot be built (e.g. no endpoint) and never fabricating one.
 * @param {RawExtraction} extraction
 * @returns {Readonly<UNMNode>[]}
 */
export function normalizeManyWireguard(extraction) {
  const items = Array.isArray(extraction.fields?.items) ? extraction.fields.items : [];
  /** @type {Readonly<UNMNode>[]} */
  const nodes = [];
  for (const item of items) {
    try { nodes.push(normalizeItem(/** @type {any} */ (item))); }
    catch { /* skip un-buildable peer */ }
  }
  return nodes;
}

/**
 * Single-node `normalize` is invalid for this multi-node parser (ADR-008): it
 * would silently drop every peer after the first (ANTI_CHAOS Rule 9).
 * @param {RawExtraction} _extraction
 * @returns {never}
 */
export function normalizeRefuse(_extraction) {
  throw new Error(
    "WireGuardParser.normalize() is not valid: a WireGuard config can have many " +
    "[Peer] sections (many nodes). Check parser.producesMany and call " +
    "normalizeMany() — using normalize() would silently drop nodes " +
    "(ANTI_CHAOS Rule 9). See ADR-008.",
  );
}
