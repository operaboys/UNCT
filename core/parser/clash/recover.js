/**
 * Clash recovery — 04-PARSER_ENGINE Stage 10.
 *
 * The most common Clash YAML breakage is literal TAB indentation (YAML forbids
 * tabs). Recovery replaces tabs with spaces and retries the load. Structure
 * only — it never fabricates a proxy; an un-buildable proxy simply yields no
 * node later.
 *
 * @typedef {import("../../types/parser").RawExtraction} RawExtraction
 * @typedef {import("../../types/parser").ParseError} ParseError
 */

import { loadClashYaml } from "./decode.js";
import { collectProxies, extractProxy } from "./extract.js";

/**
 * @param {string} input
 * @param {ParseError} [_error]
 * @returns {RawExtraction | null}
 */
export function recoverClash(input, _error) {
  if (typeof input !== "string" || input.trim().length === 0) return null;

  /** @type {string[]} */
  const recoveryActions = [];
  let fixed = input;
  if (/\t/.test(fixed)) {
    fixed = fixed.replace(/\t/g, "  ");
    recoveryActions.push("REC_STRUCTURE_REPAIRED: replaced tabs with spaces");
  }

  /** @type {any} */
  let doc;
  try {
    doc = loadClashYaml(fixed);
  } catch {
    return null; // could not repair into valid YAML
  }

  const items = collectProxies(doc).map(extractProxy);
  if (items.length === 0) return null;

  return {
    protocol: "clash",
    fields: { items },
    warnings: ["REC_PARTIAL_CONFIG: clash recovered from malformed YAML."],
    recoveryActions,
    raw: input,
  };
}
