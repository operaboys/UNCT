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

import { repairAndParseJson } from "../shared/json.js";
import { collectItems, extractItem } from "./extract.js";

/**
 * @param {string} input
 * @param {ParseError} [_error]
 * @returns {RawExtraction | null}
 */
export function recoverSingBox(input, _error) {
  const repaired = repairAndParseJson(input);
  if (!repaired) return null; // not a non-empty string, or could not repair into valid JSON
  const { config, actions } = repaired;

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
