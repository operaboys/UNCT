/**
 * ConversionObject builder + Batch Conversion — Converter Engine
 * (02-SYSTEM_ARCHITECTURE §7, 09-DEVELOPMENT_ROADMAP Phase 7, Item 5; ADR-012).
 *
 * `FORMAT_TABLE` is the single dispatch point for every format-aware
 * operation in this file (capability flags, single-node export, batch
 * export) — adding a 5th output format means adding one row here, nowhere
 * else (ADR-012's noted Plugin-scalability follow-up).
 *
 * `buildConversion(node)` decides each `canExportAsX` flag by checking
 * `node.protocol` membership in that ONE serializer's own protocol-scope
 * constant (each serializer's real `*_SUPPORTED_PROTOCOLS`, its single
 * source of truth) — never by calling the serializer and catching
 * `CONVERT_UNSUPPORTED`. Capability is a static property of
 * `(format, protocol)`, decided without serializing (ADR-012).
 *
 * `convertBatch(nodes, format)` reuses that same static check to split a
 * node collection into `converted`/`skipped` without throwing — the
 * UI/Export Center can grey out or list-as-unavailable exactly the nodes a
 * format cannot serialize (ADR-012 Consequences), rather than one bad node
 * aborting an entire batch.
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 * @typedef {import("../types/unm").ConversionObject} ConversionObject
 * @typedef {"url" | "xrayJson" | "singboxJson" | "clashYaml"} ExportFormat
 */

import { toUrl, URL_SUPPORTED_PROTOCOLS } from "./to-url.js";
import { toXray, XRAY_SUPPORTED_PROTOCOLS } from "./to-xray.js";
import { toSingBox, SINGBOX_SUPPORTED_PROTOCOLS } from "./to-singbox.js";
import { toClash, CLASH_SUPPORTED_PROTOCOLS } from "./to-clash.js";

/** @type {ReadonlyArray<{key: ExportFormat, flag: keyof ConversionObject, protocols: readonly string[], serialize: (node: UNMNode) => string}>} */
const FORMAT_TABLE = Object.freeze([
  { key: "url", flag: "canExportAsUrl", protocols: URL_SUPPORTED_PROTOCOLS, serialize: toUrl },
  { key: "xrayJson", flag: "canExportAsXrayJson", protocols: XRAY_SUPPORTED_PROTOCOLS, serialize: toXray },
  { key: "singboxJson", flag: "canExportAsSingboxJson", protocols: SINGBOX_SUPPORTED_PROTOCOLS, serialize: toSingBox },
  { key: "clashYaml", flag: "canExportAsClashYaml", protocols: CLASH_SUPPORTED_PROTOCOLS, serialize: toClash },
]);

/**
 * @param {ExportFormat} format
 * @returns {(typeof FORMAT_TABLE)[number]}
 */
function formatEntry(format) {
  const entry = FORMAT_TABLE.find((f) => f.key === format);
  if (!entry) {
    throw new Error(`conversion: unknown export format "${format}" (CONVERT_UNSUPPORTED)`);
  }
  return entry;
}

/**
 * Build a fresh ConversionObject for a node — a pure static lookup, never a
 * serialization attempt. Each flag reads the SAME `*_SUPPORTED_PROTOCOLS`
 * constant `FORMAT_TABLE` above is built from, so the flag and the actual
 * converter can never drift (ADR-012).
 * @param {UNMNode} node
 * @returns {ConversionObject}
 */
export function buildConversion(node) {
  return {
    canExportAsUrl: URL_SUPPORTED_PROTOCOLS.includes(node.protocol),
    canExportAsXrayJson: XRAY_SUPPORTED_PROTOCOLS.includes(node.protocol),
    canExportAsSingboxJson: SINGBOX_SUPPORTED_PROTOCOLS.includes(node.protocol),
    canExportAsClashYaml: CLASH_SUPPORTED_PROTOCOLS.includes(node.protocol),
  };
}

/**
 * Serialize a single node to one output format — a thin dispatcher; the
 * underlying serializer enforces its own protocol scope and throws
 * `CONVERT_UNSUPPORTED` (no duplicated capability logic here).
 * @param {UNMNode} node
 * @param {ExportFormat} format
 * @returns {string}
 */
export function convertNode(node, format) {
  return formatEntry(format).serialize(node);
}

/**
 * Batch Conversion (02 §7's fifth Converter Engine output): export a
 * collection of nodes to one target format. Nodes outside that format's
 * protocol scope are NOT attempted (no thrown/caught CONVERT_UNSUPPORTED as
 * control flow) — they land in `skipped` instead, keyed by their own
 * ConversionObject flag, so one incompatible node never fails the batch.
 * @param {readonly UNMNode[]} nodes
 * @param {ExportFormat} format
 * @returns {{ converted: {nodeId: string, output: string}[], skipped: {nodeId: string, protocol: string}[] }}
 */
export function convertBatch(nodes, format) {
  const entry = formatEntry(format);
  /** @type {{nodeId: string, output: string}[]} */
  const converted = [];
  /** @type {{nodeId: string, protocol: string}[]} */
  const skipped = [];
  for (const node of nodes) {
    if (entry.protocols.includes(node.protocol)) {
      converted.push({ nodeId: node.nodeId, output: entry.serialize(node) });
    } else {
      skipped.push({ nodeId: node.nodeId, protocol: node.protocol });
    }
  }
  return { converted, skipped };
}
