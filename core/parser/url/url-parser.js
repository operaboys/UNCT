/**
 * URLParser — the second concrete parser (04-PARSER_ENGINE Stage 07, with the
 * Stage 12 preprocessing layer run first). Implements the BaseParser contract
 * (12-PARSER_FACTORY §2) by composing the per-concern modules in this folder.
 * Pure & Sync — directly unit-testable.
 *
 * Pipeline: detect -> preprocess (Stage 12) -> extract (Stage 07) ->
 * normalize (Stage 13.1/14); recover (Stage 10/11) on failure.
 *
 * @typedef {import("../../types/parser").BaseParser} BaseParser
 * @typedef {import("../../types/parser").RawExtraction} RawExtraction
 * @typedef {import("../../types/unm").ValidationObject} ValidationObject
 */

import { detectUrl } from "./detect.js";
import { parseUrl } from "./extract.js";
import { normalizeUrl, PARSER_NAME } from "./normalize.js";
import { recoverUrl } from "./recover.js";

/**
 * Structure-only check (NOT the central Validation Engine, Stage 13).
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
export const urlParser = {
  detect: detectUrl,
  parse: parseUrl,
  validateStructure,
  normalize: normalizeUrl,
  recover: recoverUrl,
  formatVersion: () => "uri",
  metadataHint: () => ({ parser: PARSER_NAME }),
};

/**
 * Register the URLParser on a factory (12 §6.1 — registration only, no direct
 * instantiation). Adding this parser does not touch any existing parser
 * (Extension Rule, 12 §6).
 * @param {{ register: (name: string, parser: BaseParser) => void }} factory
 */
export function registerUrlParser(factory) {
  factory.register("url", urlParser);
}
