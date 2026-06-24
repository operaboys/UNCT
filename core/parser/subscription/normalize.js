/**
 * Subscription normalization — 04-PARSER_ENGINE Stage 08 (Auto Normalize).
 *
 * A subscription expands to MANY nodes, so the real entry point is
 * `normalizeSubscription` -> { nodes, report }. Each line is turned into a
 * UNMNode by REUSING the URL parser (parse -> normalize, with recover() on
 * failure) — the decode/extract logic is not re-implemented here.
 *
 * `normalizeFirst` exists only to satisfy the single-node BaseParser contract
 * (12 §2): it returns the first node. Consumers that want every node call
 * `normalizeSubscription` / `parseSubscription` instead.
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
 * Single-node BaseParser compliance — returns the first node only.
 * @param {RawExtraction} extraction
 * @returns {Readonly<UNMNode>}
 * @throws {Error} if the subscription produced no nodes.
 */
export function normalizeFirst(extraction) {
  const { nodes } = normalizeSubscription(extraction);
  if (nodes.length === 0) {
    throw new Error("Subscription normalize: no nodes produced (PARSE_EMPTY_SUBSCRIPTION)");
  }
  return nodes[0];
}
