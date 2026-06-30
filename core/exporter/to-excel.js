/**
 * Excel Export — Export Engine (08-EXPORT_ENGINE §12, P12-3, ADR-023).
 * Uses `write-excel-file` (19 KB gzip, vs SheetJS 141 KB gzip — ADR-023).
 * Columns mirror the CSV export (doc 08 §5): Protocol, Address, Port, Remark,
 * Security, Network, Validation Status. Returns `Promise<{ content: Uint8Array }>`.
 *
 * Uses `write-excel-file/universal` which exposes a `.toBlob()` method that
 * works in both browser (native Blob) and Node.js ≥18 (globalThis.Blob).
 * Converting Blob → ArrayBuffer → Uint8Array gives a uniform byte return type.
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 */

// write-excel-file/universal: /universal works in both Node.js (Vitest) and browser (esbuild, ADR-014)
import writeXlsxFile from "write-excel-file/universal";

/** Bold header cell helper. @param {string} label @returns {object} */
const hdr = (label) => ({ value: label, fontWeight: "bold" });

/**
 * @param {readonly UNMNode[]} nodes
 * @returns {Promise<{ content: Uint8Array }>}
 */
export async function exportExcel(nodes) {
  const header = [
    hdr("Protocol"),
    hdr("Address"),
    hdr("Port"),
    hdr("Remark"),
    hdr("Security"),
    hdr("Network"),
    hdr("Validation"),
  ];

  const rows = nodes.map((node) => [
    { value: node.protocol },
    { value: node.address },
    { value: node.port, type: Number },
    { value: node.remark ?? "" },
    { value: node.security },
    { value: node.network },
    { value: String(node.validation.overallValid) },
  ]);

  // write-excel-file/universal returns { toBlob() } — works in both browser and Node.js ≥18
  const blob = await writeXlsxFile([header, ...rows]).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return { content: new Uint8Array(arrayBuffer) };
}
