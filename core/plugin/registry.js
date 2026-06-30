/**
 * Plugin Registry (ADR-020 §2, Phase 11 — 09-DEVELOPMENT_ROADMAP).
 *
 * Holds all successfully-loaded plugins in two independent namespaces:
 *   - parser plugins   → identified by a unique string id, implement BaseParser
 *   - exporter plugins → identified by a unique string id, implement ExporterPlugin
 *
 * Design mirrors `createParserFactory()` (core/parser/factory.js): a factory
 * function returns an independent instance so tests never share state between
 * runs. The internal Maps are never exposed — only register*, get*, and list*
 * methods — so no external caller can reach another plugin's implementation by
 * traversing the registry object (partial structural enforcement of ANTI_CHAOS
 * Rule 12: plugins may not call each other directly).
 *
 * @typedef {import("../types/parser").BaseParser} BaseParser
 * @typedef {import("./exporter-contract").ExporterPlugin} ExporterPlugin
 */

/**
 * @typedef {{ id: string; implementation: BaseParser }} ParserEntry
 * @typedef {{ id: string; implementation: ExporterPlugin }} ExporterEntry
 */

/**
 * Create an independent Plugin Registry instance. The application composition
 * root creates one shared instance; tests create their own so registrations
 * never leak across test files.
 */
export function createPluginRegistry() {
  /** @type {Map<string, ParserEntry>} */
  const parserPlugins = new Map();

  /** @type {Map<string, ExporterEntry>} */
  const exporterPlugins = new Map();

  // ===== Parser plugins =====

  /**
   * @param {string} id
   * @param {BaseParser} implementation
   */
  function registerParser(id, implementation) {
    if (parserPlugins.has(id)) {
      throw new Error(`PluginRegistry.registerParser: "${id}" is already registered (PLUGIN_CONTRACT_VIOLATION)`);
    }
    parserPlugins.set(id, { id, implementation });
  }

  /**
   * @param {string} id
   * @returns {BaseParser}
   */
  function getParser(id) {
    const entry = parserPlugins.get(id);
    if (!entry) {
      throw new Error(`PluginRegistry.getParser: no parser plugin registered as "${id}" (PLUGIN_CONTRACT_VIOLATION)`);
    }
    return entry.implementation;
  }

  /** @returns {string[]} */
  function listParsers() {
    return [...parserPlugins.keys()];
  }

  // ===== Exporter plugins =====

  /**
   * @param {string} id
   * @param {ExporterPlugin} implementation
   */
  function registerExporter(id, implementation) {
    if (exporterPlugins.has(id)) {
      throw new Error(`PluginRegistry.registerExporter: "${id}" is already registered (PLUGIN_CONTRACT_VIOLATION)`);
    }
    exporterPlugins.set(id, { id, implementation });
  }

  /**
   * @param {string} id
   * @returns {ExporterPlugin}
   */
  function getExporter(id) {
    const entry = exporterPlugins.get(id);
    if (!entry) {
      throw new Error(`PluginRegistry.getExporter: no exporter plugin registered as "${id}" (PLUGIN_CONTRACT_VIOLATION)`);
    }
    return entry.implementation;
  }

  /** @returns {string[]} */
  function listExporters() {
    return [...exporterPlugins.keys()];
  }

  return {
    registerParser,
    getParser,
    listParsers,
    registerExporter,
    getExporter,
    listExporters,
  };
}
