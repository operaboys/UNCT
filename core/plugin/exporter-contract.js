/**
 * Runtime enforcement of the ExporterPlugin contract (ADR-020 §1, Phase 11).
 *
 * ExporterPlugin is the export-side counterpart to BaseParser: a plugin object
 * that exposes a single `export` method. The shape deliberately mirrors every
 * existing core exporter (core/exporter/to-txt.js, to-json.js, etc.) so the
 * same call-site pattern works for both built-in and plugin exporters.
 *
 * An ExporterPlugin may also carry advisory-only hints (label, mimeType,
 * extension) following doc 12 §2.1's Hints-Are-Advisory-Only principle;
 * these are not part of the required contract.
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 */

/** The one method every exporter plugin must implement (ADR-020 §1). */
export const REQUIRED_EXPORTER_METHODS = Object.freeze(["export"]);

/**
 * @typedef {{ nodeId: string; reason: string }} SkippedEntry
 *
 * @typedef {{
 *   export(nodes: readonly UNMNode[]): { content: string; skipped: SkippedEntry[] };
 *   label?: string;
 *   mimeType?: string;
 *   extension?: string;
 * }} ExporterPlugin
 */

/**
 * @param {Partial<ExporterPlugin> | null | undefined} plugin
 * @param {string} id
 * @throws {Error} if `plugin` does not satisfy the ExporterPlugin contract
 */
export function assertImplementsExporterPlugin(plugin, id) {
  if (!plugin || typeof plugin !== "object") {
    throw new Error(`ExporterPlugin contract violation: "${id}" is not an object (PLUGIN_CONTRACT_VIOLATION)`);
  }
  const candidate = /** @type {Record<string, unknown>} */ (plugin);
  for (const method of REQUIRED_EXPORTER_METHODS) {
    if (typeof candidate[method] !== "function") {
      throw new Error(`ExporterPlugin contract violation: "${id}" is missing required method "${method}()" (PLUGIN_CONTRACT_VIOLATION)`);
    }
  }
  // Advisory hints are optional, but if present they must be strings.
  for (const hint of ["label", "mimeType", "extension"]) {
    if (candidate[hint] !== undefined && typeof candidate[hint] !== "string") {
      throw new Error(`ExporterPlugin contract violation: "${id}".${hint} must be a string if present (PLUGIN_CONTRACT_VIOLATION)`);
    }
  }
}
