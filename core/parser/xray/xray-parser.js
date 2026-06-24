/**
 * XrayParser — the first concrete parser (04-PARSER_ENGINE Stage 04, Priority:
 * Highest). Implements the BaseParser contract (12-PARSER_FACTORY §2) by
 * composing the per-concern modules in this folder. Pure & Sync — directly
 * unit-testable, no Worker (MASTER_FILE_STRUCTURE: logic in core/, not workers).
 *
 * `validateStructure` here is intentionally minimal: it checks only that the
 * EXTRACTION has the structural essentials (address/port present) — it is NOT
 * the central Validation Engine (Stage 13, core/validator/), which judges value
 * validity on the finished node. The two are deliberately separate (12 §2).
 *
 * @typedef {import("../../types/parser").BaseParser} BaseParser
 * @typedef {import("../../types/parser").RawExtraction} RawExtraction
 * @typedef {import("../../types/unm").ValidationObject} ValidationObject
 */

import { detectXray } from "./detect.js";
import { parseXray } from "./extract.js";
import { normalizeXray, PARSER_NAME } from "./normalize.js";
import { recoverXray } from "./recover.js";

/**
 * @param {RawExtraction} extraction
 * @returns {ValidationObject}
 */
function validateStructure(extraction) {
  const fields = extraction?.fields || {};
  const addressValid = typeof fields.address === "string" && fields.address.length > 0;
  const port = typeof fields.port === "string" ? Number(fields.port) : fields.port;
  const portValid = typeof port === "number" && Number.isInteger(port);
  return {
    addressValid,
    portValid,
    uuidValid: null,
    realityValid: null,
    tlsValid: null,
    alpnValid: null,
    pathValid: null,
    hostValid: null,
    overallValid: addressValid && portValid,
  };
}

/** @type {BaseParser} */
export const xrayParser = {
  detect: detectXray,
  parse: parseXray,
  validateStructure,
  normalize: normalizeXray,
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
