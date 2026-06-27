/**
 * CSV Export — Export Engine (08-EXPORT_ENGINE §5, ADR-004). Doc 08 §5 fixes
 * the column set: "Protocol, Address, Port, Remark, Security, Network,
 * Validation Status" — every one an already-set `UNMNode`/`ValidationObject`
 * field. Unlike the other Export formats, there is no existing `core/
 * converter/` serializer to batch (CSV has no per-node "config" shape to
 * reuse) — this file is RFC 4180 field-escaping only, never a new score or
 * validity judgment (Rule 11's boundary still holds: `overallValid` is read
 * as-is from the Validation Engine, not recomputed).
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 */

const CSV_HEADER = Object.freeze(["Protocol", "Address", "Port", "Remark", "Security", "Network", "Validation Status"]);

/**
 * Quote a field per RFC 4180 only when it contains a comma, double-quote, or
 * newline; embedded double-quotes are doubled.
 * @param {unknown} value
 * @returns {string}
 */
function escapeCsvField(value) {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/**
 * @param {UNMNode} node
 * @returns {string[]}
 */
function csvRow(node) {
  return [
    node.protocol,
    node.address,
    String(node.port),
    node.remark ?? "",
    node.security,
    node.network,
    String(node.validation.overallValid),
  ];
}

/**
 * @param {readonly UNMNode[]} nodes
 * @returns {string}
 */
export function exportCsv(nodes) {
  return [CSV_HEADER, ...nodes.map(csvRow)].map((row) => row.map(escapeCsvField).join(",")).join("\n");
}
