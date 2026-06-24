/**
 * Sing-box recovery — 04-PARSER_ENGINE Stage 10/11.
 *
 * Repairs broken JSON (shared `repairJson`: comments / trailing commas) and
 * re-collects the proxy items. Structure only — it never fabricates a missing
 * server/uuid/password/key; an item that lacks essentials simply produces no
 * node later.
 *
 * @typedef {import("../../types/parser").RawExtraction} RawExtraction
 * @typedef {import("../../types/parser").ParseError} ParseError
 */

import { repairJson } from "../shared/json.js";
import { collectItems, extractItem } from "./extract.js";

/**
 * @param {string} input
 * @param {ParseError} [_error]
 * @returns {RawExtraction | null}
 */
export function recoverSingBox(input, _error) {
  if (typeof input !== "string" || input.trim().length === 0) return null;

  const { text, actions } = repairJson(input);
  /** @type {any} */
  let config;
  try {
    config = JSON.parse(text);
  } catch {
    return null; // could not repair into valid JSON
  }

  const items = collectItems(config).map(extractItem);
  if (items.length === 0) return null;

  return {
    protocol: "singbox",
    fields: { items },
    warnings: ["REC_PARTIAL_CONFIG: sing-box recovered from malformed JSON."],
    recoveryActions: actions,
    raw: input,
  };
}
