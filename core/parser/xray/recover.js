/**
 * Xray recovery — 04-PARSER_ENGINE Stage 10 (Error Recovery) + Stage 11 (Fuzzy
 * Recovery).
 *
 * Absolute security rule (Stage 11): recovery repairs STRUCTURE/SYNTAX only and
 * must NEVER invent security data — no uuid, password, publicKey/pbk, or
 * shortId/sid is ever fabricated. If those are missing they stay missing; the
 * node simply fails Validation later (Stage 13), which is correct.
 *
 * @typedef {import("../../types/parser").RawExtraction} RawExtraction
 * @typedef {import("../../types/parser").ParseError} ParseError
 */

import { collectOutbounds, extractItemsFromOutbound, PROXY_PROTOCOLS } from "./extract.js";
import { levenshtein, fuzzyKey } from "../shared/fuzzy.js";
import { repairJson, repairAndParseJson } from "../shared/json.js";

// Re-exported so the public surface (xray/index.js) is unchanged after moving
// these to the shared helper modules — same functions, single source of truth.
export { levenshtein, fuzzyKey, repairJson };

/** Canonical outbound-level keys we will fuzzy-match misspellings against. */
const OUTBOUND_KEYS = Object.freeze(["protocol", "settings", "streamSettings", "tag"]);

/**
 * Re-key a misspelled outbound's keys back to canonical names so extraction can
 * proceed. Returns a shallow-corrected copy plus the actions taken.
 * @param {Record<string, unknown>} ob
 * @returns {{ outbound: Record<string, unknown>, actions: string[] }}
 */
function fuzzyCorrectOutbound(ob) {
  /** @type {string[]} */
  const actions = [];
  /** @type {Record<string, unknown>} */
  const corrected = { ...ob };
  for (const canonical of OUTBOUND_KEYS) {
    if (Object.prototype.hasOwnProperty.call(corrected, canonical)) continue;
    const match = fuzzyKey(corrected, canonical);
    if (match && match !== canonical) {
      corrected[canonical] = corrected[match];
      delete corrected[match];
      actions.push(`REC_KEY_FUZZY_MATCHED: "${match}" -> "${canonical}"`);
    }
  }
  return { outbound: corrected, actions };
}

/**
 * recover() — Stage 10/11 entry. Repairs JSON, fuzzy-corrects outbound keys,
 * then extracts. Returns a RawExtraction (with recoveryActions recorded) or
 * `null` if nothing usable could be recovered.
 * @param {string} input
 * @param {ParseError} [_error]
 * @returns {RawExtraction | null}
 */
export function recoverXray(input, _error) {
  const repaired = repairAndParseJson(input);
  if (!repaired) return null; // not a non-empty string, or could not even repair into valid JSON
  const { config, actions } = repaired;

  /** @type {string[]} */
  const recoveryActions = [...actions];

  let outbounds = collectOutbounds(config);
  if (outbounds.length === 0) {
    // No outbound recognized as-is — try fuzzy-correcting misspelled outbounds.
    const candidates =
      Array.isArray(config?.outbounds) ? config.outbounds
        : (config?.outbound ? [config.outbound]
          : (config?.protocol ? [config] : []));
    /** @type {any[]} */
    const corrected = [];
    for (const cand of candidates) {
      if (!cand || typeof cand !== "object") continue;
      const { outbound, actions: fa } = fuzzyCorrectOutbound(cand);
      if (PROXY_PROTOCOLS.includes(String(outbound.protocol).toLowerCase())) {
        corrected.push(outbound);
        recoveryActions.push(...fa);
      }
    }
    outbounds = corrected;
  }
  if (outbounds.length === 0) return null;

  const items = outbounds.flatMap(extractItemsFromOutbound);
  // Require at least one item with protocol + address (no fabrication).
  if (!items.some((f) => f.protocol != null && f.address != null)) return null;

  return {
    protocol: "xray",
    fields: { items },
    warnings: ["REC_PARTIAL_CONFIG: node(s) recovered from malformed Xray JSON."],
    recoveryActions,
    raw: input,
  };
}
