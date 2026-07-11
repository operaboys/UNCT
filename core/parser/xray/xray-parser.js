/**
 * XrayParser — the first concrete parser (04-PARSER_ENGINE Stage 04, Priority:
 * Highest). Implements the BaseParser contract (12-PARSER_FACTORY §2) by
 * composing the per-concern modules in this folder. Pure & Sync — directly
 * unit-testable, no Worker (MASTER_FILE_STRUCTURE: logic in core/, not workers).
 *
 * Multi-node (ADR-008): an Xray config's outbounds expand to many nodes
 * (Multi-Outbound · Multi-User, 04 Stage 04), so `producesMany = true` and
 * `normalizeMany` is the real entry point; `normalize` throws (no silent loss,
 * ANTI_CHAOS Rule 9).
 *
 * `validateStructure` here is intentionally minimal: it checks only that the
 * EXTRACTION carries at least one item — it is NOT the central Validation
 * Engine (Stage 13), which judges value validity on each finished node (12 §2).
 *
 * @typedef {import("../../types/parser").BaseParser} BaseParser
 * @typedef {import("../../types/parser").RawExtraction} RawExtraction
 * @typedef {import("../../types/unm").ValidationObject} ValidationObject
 */

import { detectXray } from "./detect.js";
import { parseXray } from "./extract.js";
import { normalizeManyXray, normalizeRefuse, PARSER_NAME } from "./normalize.js";
import { recoverXray } from "./recover.js";
import { validateItemsStructure } from "../shared/validate-structure.js";

/** @type {BaseParser} */
export const xrayParser = {
  detect: detectXray,
  parse: parseXray,
  validateStructure: validateItemsStructure,
  producesMany: true,
  normalize: normalizeRefuse,
  normalizeMany: normalizeManyXray,
  recover: recoverXray,
  // Advisory only (12 §2.1) — never influences selection/validation/normalization.
  formatVersion: () => "xray-json",
  metadataHint: () => ({ parser: PARSER_NAME }),
};

/**
 * Register the XrayParser on a factory (12 §6.1 — registration is the only
 * sanctioned path; no direct instantiation).
 * @param {{ register: (name: string, parser: BaseParser) => void }} factory
 */
export function registerXrayParser(factory) {
  factory.register("xray", xrayParser);
}
