/**
 * QR Export — Export Engine (08-EXPORT_ENGINE §6, ADR-017). Doc 08 §6 scopes
 * this to "Single Node · Multi QR Pages · Printable Sheets"; doc 08 §1 notes
 * QR is a one-way (display/share) export, never Round-Trip — so unlike
 * to-zip.js, there is no `manifest.json` requirement here.
 *
 * Each node is serialized through the existing URL Converter (`toUrl`,
 * core/converter/to-url.js) — the exact string a user would otherwise paste
 * into a client — then encoded as a QR matrix via `uqr`'s `encode()`. Per
 * ADR-017's amended review, `uqr` (unlike the originally-chosen
 * `qrcode-generator`) exports `encode()` as a standalone ES module export
 * separate from its renderer functions, so importing only `encode` here
 * genuinely tree-shakes away every renderer; this module still returns only
 * the raw boolean matrix itself (no DOM/Canvas/SVG), with SVG rendering
 * belonging in `ui/export/` (Rule 11: `core/` never depends on Preact/DOM).
 * "Multi QR Pages" is satisfied by this function already accepting/returning
 * an array — the UI renders one page per node; "Printable Sheets" is the
 * browser's native print, not a Core concern.
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 */
import { encode } from "uqr";
import { toUrl } from "../converter/to-url.js";
import { withSkipReason } from "./skip-reason.js";

/**
 * @typedef {Object} QrCode
 * @property {string} nodeId
 * @property {string} protocol
 * @property {number} moduleCount
 * @property {boolean[][]} matrix
 */

/**
 * @param {readonly UNMNode[]} nodes
 * @returns {{ qrCodes: QrCode[], skipped: {nodeId: string, protocol: string, reason: string}[] }}
 */
export function exportQr(nodes) {
  /** @type {QrCode[]} */
  const qrCodes = [];
  /** @type {{nodeId: string, protocol: string}[]} */
  const skipped = [];

  for (const node of nodes) {
    let url;
    try {
      url = toUrl(node);
    } catch {
      skipped.push({ nodeId: node.nodeId, protocol: node.protocol });
      continue;
    }

    const { size: moduleCount, data: matrix } = encode(url, { ecc: "M" });
    qrCodes.push({ nodeId: node.nodeId, protocol: node.protocol, moduleCount, matrix });
  }

  return { qrCodes, skipped: withSkipReason(skipped, "QR") };
}
