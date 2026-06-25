/**
 * ClashParser — fifth concrete parser (04-PARSER_ENGINE Stage 06, Clash /
 * Clash.Meta). Same modular split, registered via ParserFactory (Extension
 * Rule 12 §6 — no existing parser touched). Uses js-yaml for decoding
 * (14-DEPENDENCY_POLICY §5).
 *
 * Multi-node (ADR-008): a Clash `proxies:` array expands to many nodes, so
 * producesMany=true + normalizeMany; normalize() throws (Rule 9).
 *
 * @typedef {import("../../types/parser").BaseParser} BaseParser
 * @typedef {import("../../types/parser").RawExtraction} RawExtraction
 * @typedef {import("../../types/unm").ValidationObject} ValidationObject
 */

import { detectClash } from "./detect.js";
import { parseClash } from "./extract.js";
import { normalizeManyClash, normalizeRefuse } from "./normalize.js";
import { recoverClash } from "./recover.js";

/**
 * Structure-only check: does the extraction carry at least one proxy item?
 * @param {RawExtraction} extraction
 * @returns {ValidationObject}
 */
function validateStructure(extraction) {
  const items = extraction?.fields?.items;
  const ok = Array.isArray(items) && items.length > 0;
  return {
    addressValid: ok,
    portValid: ok,
    uuidValid: null,
    realityValid: null,
    tlsValid: null,
    alpnValid: null,
    pathValid: null,
    hostValid: null,
    overallValid: ok,
  };
}

/** @type {BaseParser} */
export const clashParser = {
  detect: detectClash,
  parse: parseClash,
  validateStructure,
  producesMany: true,
  normalize: normalizeRefuse,
  normalizeMany: normalizeManyClash,
  recover: recoverClash,
  formatVersion: () => "clash-yaml",
  metadataHint: () => ({ parser: "ClashParser" }),
};

/**
 * Register the ClashParser on a factory (12 §6.1).
 * @param {{ register: (name: string, parser: BaseParser) => void }} factory
 */
export function registerClashParser(factory) {
  factory.register("clash", clashParser);
}
