/**
 * Plugin Loader (ADR-020 §3–4, Phase 11 — 09-DEVELOPMENT_ROADMAP).
 *
 * The single entry point for registering a plugin. Before anything is stored
 * in the registry it:
 *   1. Validates the descriptor shape (id, type, implementation).
 *   2. Dispatches to the appropriate contract checker so violations surface at
 *      load time, not silently at call time.
 *   3. Forwards to registry.registerParser / registry.registerExporter.
 *   4. Returns a frozen PluginContext to the caller — the only API surface a
 *      plugin may use at load time (ANTI_CHAOS Rule 12: no cross-plugin paths).
 *
 * PluginContext deliberately withholds the registry object.  A plugin that
 * wants to call another plugin by name has no path to do so through the context
 * it receives — the registry is only held by the factory closure and is never
 * passed outward to plugin code.
 *
 * @typedef {import("../types/parser").BaseParser} BaseParser
 * @typedef {import("./exporter-contract").ExporterPlugin} ExporterPlugin
 * @typedef {import("./registry").createPluginRegistry} CreatePluginRegistry
 */

import { assertImplementsBaseParser } from "../parser/base/contract.js";
import { assertImplementsExporterPlugin } from "./exporter-contract.js";

/**
 * @typedef {"parser" | "exporter"} PluginType
 *
 * @typedef {{
 *   id: string;
 *   type: "parser";
 *   implementation: BaseParser;
 * } | {
 *   id: string;
 *   type: "exporter";
 *   implementation: ExporterPlugin;
 * }} PluginDescriptor
 *
 * @typedef {{
 *   readonly pluginType: PluginType;
 *   readonly pluginId: string;
 * }} PluginContext
 */

const VALID_TYPES = Object.freeze(["parser", "exporter"]);

/**
 * Build the sandboxed context returned to the caller after `load()` succeeds.
 * Contains only the plugin's own identity — no registry reference, no other
 * plugins' implementations (ANTI_CHAOS Rule 12).
 *
 * @param {string} id
 * @param {PluginType} type
 * @returns {PluginContext}
 */
function createPluginContext(id, type) {
  return Object.freeze({ pluginId: id, pluginType: type });
}

/**
 * @param {ReturnType<typeof import("./registry").createPluginRegistry>} registry
 */
export function createPluginLoader(registry) {
  /**
   * Validate and register a plugin, returning a sandboxed PluginContext.
   *
   * @param {PluginDescriptor} descriptor
   * @returns {PluginContext}
   * @throws {Error} on any contract violation or duplicate id
   */
  function load(descriptor) {
    if (!descriptor || typeof descriptor !== "object") {
      throw new Error("PluginLoader.load: descriptor must be an object (PLUGIN_CONTRACT_VIOLATION)");
    }

    const { id, type, implementation } = /** @type {Record<string, unknown>} */ (descriptor);

    if (typeof id !== "string" || id.length === 0) {
      throw new Error("PluginLoader.load: descriptor.id must be a non-empty string (PLUGIN_CONTRACT_VIOLATION)");
    }
    if (!VALID_TYPES.includes(/** @type {string} */ (type))) {
      throw new Error(`PluginLoader.load: descriptor.type must be "parser" or "exporter", got "${type}" (PLUGIN_CONTRACT_VIOLATION)`);
    }
    if (!implementation || typeof implementation !== "object") {
      throw new Error(`PluginLoader.load: descriptor.implementation must be an object (PLUGIN_CONTRACT_VIOLATION)`);
    }

    if (type === "parser") {
      assertImplementsBaseParser(/** @type {BaseParser} */ (implementation), id);
      registry.registerParser(id, /** @type {BaseParser} */ (implementation));
    } else {
      // type === "exporter"
      assertImplementsExporterPlugin(/** @type {ExporterPlugin} */ (implementation), id);
      registry.registerExporter(id, /** @type {ExporterPlugin} */ (implementation));
    }

    return createPluginContext(id, /** @type {PluginType} */ (type));
  }

  return { load };
}
