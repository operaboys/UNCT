/**
 * SubscriptionParser — third concrete parser (04-PARSER_ENGINE Stage 08). Same
 * modular split as Xray/URL, registered via ParserFactory (Extension Rule 12 §6
 * — no existing parser touched). It REUSES the URL parser to turn each
 * subscription line into a node.
 *
 * Contract note: a subscription expands to MANY nodes, which does not fit the
 * single-node BaseParser shape. The canonical API is `parseSubscription()` /
 * `normalizeAll` (-> { nodes, report }); the contract `normalize` returns the
 * first node only, for type compatibility.
 *
 * @typedef {import("../../types/parser").BaseParser} BaseParser
 * @typedef {import("../../types/parser").RawExtraction} RawExtraction
 * @typedef {import("../../types/unm").ValidationObject} ValidationObject
 */

import { detectSubscription } from "./detect.js";
import { extractSubscription } from "./extract.js";
import { normalizeFirst, normalizeSubscription } from "./normalize.js";
import { recoverSubscription } from "./recover.js";

/**
 * Structure-only check: does the extraction carry at least one config line?
 * (Not the central Validation Engine; that runs per produced node.)
 * @param {RawExtraction} extraction
 * @returns {ValidationObject}
 */
function validateStructure(extraction) {
  const lines = extraction?.fields?.lines;
  const ok = Array.isArray(lines) && lines.length > 0;
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

/** @type {BaseParser & { normalizeAll: typeof normalizeSubscription }} */
export const subscriptionParser = {
  detect: detectSubscription,
  parse: extractSubscription,
  validateStructure,
  normalize: normalizeFirst,
  recover: recoverSubscription,
  // Beyond the single-node contract: expand the whole subscription to N nodes.
  normalizeAll: normalizeSubscription,
  formatVersion: () => "subscription",
  metadataHint: () => ({ parser: "SubscriptionParser" }),
};

/**
 * One-shot helper: raw subscription text -> { nodes, report }.
 * @param {string} input
 */
export function parseSubscription(input) {
  return normalizeSubscription(extractSubscription(input));
}

/**
 * Register the SubscriptionParser on a factory (12 §6.1).
 * @param {{ register: (name: string, parser: BaseParser) => void }} factory
 */
export function registerSubscriptionParser(factory) {
  factory.register("subscription", subscriptionParser);
}
