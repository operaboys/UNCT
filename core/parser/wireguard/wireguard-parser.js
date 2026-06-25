/**
 * WireGuardParser — sixth concrete parser (04-PARSER_ENGINE Stage 09). Same
 * modular split, registered via ParserFactory (Extension Rule 12 §6 — no
 * existing parser touched). Parses the wg-quick `.conf` text format.
 *
 * Multi-node (ADR-008): a config can carry several `[Peer]` sections, so
 * producesMany=true + normalizeMany from the start; normalize() throws (Rule 9).
 *
 * @typedef {import("../../types/parser").BaseParser} BaseParser
 * @typedef {import("../../types/parser").RawExtraction} RawExtraction
 * @typedef {import("../../types/unm").ValidationObject} ValidationObject
 */

import { detectWireguard } from "./detect.js";
import { parseWireguard } from "./extract.js";
import { normalizeManyWireguard, normalizeRefuse } from "./normalize.js";
import { recoverWireguard } from "./recover.js";

/**
 * Structure-only check: does the extraction carry at least one peer item?
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
export const wireguardParser = {
  detect: detectWireguard,
  parse: parseWireguard,
  validateStructure,
  producesMany: true,
  normalize: normalizeRefuse,
  normalizeMany: normalizeManyWireguard,
  recover: recoverWireguard,
  formatVersion: () => "wireguard-config",
  metadataHint: () => ({ parser: "WireGuardParser" }),
};

/**
 * Register the WireGuardParser on a factory (12 §6.1).
 * @param {{ register: (name: string, parser: BaseParser) => void }} factory
 */
export function registerWireguardParser(factory) {
  factory.register("wireguard", wireguardParser);
}
