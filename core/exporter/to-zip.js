/**
 * ZIP Export — Export Engine (08-EXPORT_ENGINE §7, ADR-004, ADR-017). Doc 08
 * §7 scope: "Full Project · Reports · Nodes · Logs · Backups" — the Mission
 * ("Export Anything, Lose Nothing") is realized here by bundling every
 * already-built single-file format (`to-txt.js`, `to-json.js`, `to-yaml.js`,
 * `to-csv.js`) into one archive. No new transformation logic: this file only
 * packages outputs those modules already produce, via `fflate#zipSync`
 * (ADR-017).
 *
 * `manifest.json` (doc 08 §7's Manifest File sub-section) carries Export
 * Version, Export Date, Node Count, and UNM Version — `EXPORT_MANIFEST_
 * VERSION` here is this manifest shape's own version, the same pattern
 * `core/unm/registry/schema-registry.js#UNM_SCHEMA_VERSION` already
 * established for the UNM schema itself.
 *
 * `nodes.json` (Normalized JSON) is the Round-Trip-eligible member (doc 08
 * §1: "this requirement's test location ... must include the full ZIP Export
 * cycle with manifest.json, not just node-level conversion") — it alone is
 * guaranteed lossless; the other bundled files are convenience formats, not
 * the round-trip source of truth.
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 * @typedef {import("../analyzer/analyze-node.js").AnalysisBundle} AnalysisBundle
 */
import { zipSync, strToU8 } from "fflate";
import { UNM_SCHEMA_VERSION } from "../unm/registry/schema-registry.js";
import { exportTxt } from "./to-txt.js";
import { exportXrayJson, exportSingboxJson, exportNormalizedJson, exportAnalysisJson } from "./to-json.js";
import { exportClashYaml } from "./to-yaml.js";
import { exportCsv } from "./to-csv.js";

/** Version of this ZIP manifest's own shape (doc 08 §7) — bump only if the manifest fields change. */
export const EXPORT_MANIFEST_VERSION = "1.0";

/**
 * @param {readonly UNMNode[]} nodes
 * @returns {{ name: string, exportVersion: string, exportDate: string, nodeCount: number, unmVersion: string }}
 */
function buildManifest(nodes) {
  return {
    name: "manifest.json",
    exportVersion: EXPORT_MANIFEST_VERSION,
    exportDate: new Date().toISOString(),
    nodeCount: nodes.length,
    unmVersion: UNM_SCHEMA_VERSION,
  };
}

/**
 * @param {readonly UNMNode[]} nodes
 * @param {Readonly<Record<string, AnalysisBundle>>} [analysisByNodeId]
 * @returns {{ content: Uint8Array, skipped: {nodeId: string, protocol: string, reason: string}[] }}
 */
export function exportZip(nodes, analysisByNodeId = {}) {
  const manifest = buildManifest(nodes);
  const txt = exportTxt(nodes);
  const xrayJson = exportXrayJson(nodes);
  const singboxJson = exportSingboxJson(nodes);
  const clashYaml = exportClashYaml(nodes);

  /** @type {import("fflate").Zippable} */
  const files = {
    "manifest.json": strToU8(JSON.stringify({
      exportVersion: manifest.exportVersion,
      exportDate: manifest.exportDate,
      nodeCount: manifest.nodeCount,
      unmVersion: manifest.unmVersion,
    }, null, 2)),
    "nodes.json": strToU8(exportNormalizedJson(nodes)),
    "nodes.txt": strToU8(txt.content),
    "nodes.csv": strToU8(exportCsv(nodes)),
    "clash.yaml": strToU8(clashYaml.content),
    "xray.json": strToU8(xrayJson.content),
    "singbox.json": strToU8(singboxJson.content),
  };
  if (Object.keys(analysisByNodeId).length > 0) {
    files["analysis.json"] = strToU8(exportAnalysisJson(analysisByNodeId));
  }

  const skipped = [...txt.skipped, ...xrayJson.skipped, ...singboxJson.skipped, ...clashYaml.skipped];
  return { content: zipSync(files), skipped };
}
