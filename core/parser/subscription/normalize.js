/**
 * Subscription normalization — 04-PARSER_ENGINE Stage 08 (Auto Normalize).
 *
 * A subscription expands to MANY nodes, so the real entry point is
 * `normalizeSubscription` -> { nodes, report }. Each line is turned into a
 * UNMNode by REUSING the URL parser (parse -> normalize, with recover() on
 * failure) — the decode/extract logic is not re-implemented here.
 *
 * The single-node BaseParser `normalize` MUST NOT be used here: returning one
 * node would silently drop the rest (Data Loss = Critical Failure, ANTI_CHAOS
 * Rule 9). Instead this parser sets `producesMany = true` and exposes
 * `normalizeMany` (ADR-008); its `normalize` throws loudly.
 *
 * @typedef {import("../../types/parser").RawExtraction} RawExtraction
 * @typedef {import("../../types/unm").UNMNode} UNMNode
 */

import { urlParser } from "../url/index.js";

/**
 * Turn one config line into a node via the URL parser, with Stage 10/11
 * recovery. Returns null if the line cannot be parsed (never fabricated).
 * @param {string} line
 * @returns {Readonly<UNMNode> | null}
 */
function parseOneLine(line) {
  try {
    return urlParser.normalize(urlParser.parse(line));
  } catch {
    const recovered = urlParser.recover(line);
    if (recovered) {
      try { return urlParser.normalize(recovered); } catch { /* fall through */ }
    }
    return null;
  }
}

/**
 * @typedef {Object} SubscriptionResult
 * @property {Readonly<UNMNode>[]} nodes
 * @property {Record<string, unknown>} report
 */

/**
 * Expand a subscription extraction into all its nodes.
 * @param {RawExtraction} extraction
 * @returns {SubscriptionResult}
 */
export function normalizeSubscription(extraction) {
  const fields = extraction.fields || {};
  const lines = Array.isArray(fields.lines) ? fields.lines : [];
  const baseReport = (fields.report && typeof fields.report === "object") ? fields.report : {};

  /** @type {Readonly<UNMNode>[]} */
  const nodes = [];
  /** @type {string[]} */
  const failures = [];
  for (const line of lines) {
    const node = parseOneLine(line);
    if (node) nodes.push(node);
    else failures.push(line);
  }

  return {
    nodes,
    report: { ...baseReport, parsed: nodes.length, failed: failures.length, failures },
  };
}

/**
 * Multi-node expansion for the BaseParser contract (ADR-008). This is the
 * method callers reach when `producesMany` is true.
 * @param {RawExtraction} extraction
 * @returns {Readonly<UNMNode>[]}
 */
export function normalizeMany(extraction) {
  return normalizeSubscription(extraction).nodes;
}

/**
 * Single-node `normalize` is invalid for a multi-node parser: it would silently
 * drop every node after the first (Data Loss = Critical Failure, ANTI_CHAOS
 * Rule 9). It throws loudly instead, directing callers to the right method.
 * @param {RawExtraction} _extraction
 * @returns {never}
 */
export function normalizeRefuse(_extraction) {
  throw new Error(
    "SubscriptionParser.normalize() is not valid: a subscription expands to many " +
    "nodes. Check parser.producesMany and call normalizeMany() / parseSubscription() — " +
    "using normalize() would silently drop nodes (ANTI_CHAOS Rule 9). See ADR-008.",
  );
}
