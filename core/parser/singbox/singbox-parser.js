/**
 * SingBoxParser — fourth concrete parser (04-PARSER_ENGINE Stage 05). Same
 * modular split as Xray/URL/Subscription, registered via ParserFactory
 * (Extension Rule 12 §6 — no existing parser touched).
 *
 * Multi-node (ADR-008): a sing-box config's `outbounds`/`endpoints` array
 * expands to many nodes, so `producesMany = true` and `normalizeMany` is the
 * real entry point; `normalize` throws (no silent loss, ANTI_CHAOS Rule 9).
 *
 * @typedef {import("../../types/parser").BaseParser} BaseParser
 * @typedef {import("../../types/parser").RawExtraction} RawExtraction
 * @typedef {import("../../types/unm").ValidationObject} ValidationObject
 */

import { detectSingBox } from "./detect.js";
import { parseSingBox } from "./extract.js";
import { normalizeManySingBox, normalizeRefuse } from "./normalize.js";
import { recoverSingBox } from "./recover.js";
import { validateItemsStructure } from "../shared/validate-structure.js";

/** @type {BaseParser} */
export const singboxParser = {
  detect: detectSingBox,
  parse: parseSingBox,
  validateStructure: validateItemsStructure,
  producesMany: true,
  normalize: normalizeRefuse,
  normalizeMany: normalizeManySingBox,
  recover: recoverSingBox,
  formatVersion: () => "singbox-json",
  metadataHint: () => ({ parser: "SingBoxParser" }),
};

/**
 * Register the SingBoxParser on a factory (12 §6.1).
 * @param {{ register: (name: string, parser: BaseParser) => void }} factory
 */
export function registerSingBoxParser(factory) {
  factory.register("singbox", singboxParser);
}
