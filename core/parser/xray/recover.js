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

import { selectOutbound, extractOutbound, PROXY_PROTOCOLS } from "./extract.js";

/** Canonical outbound-level keys we will fuzzy-match misspellings against. */
const OUTBOUND_KEYS = Object.freeze(["protocol", "settings", "streamSettings", "tag"]);

/**
 * Levenshtein edit distance (Stage 11 "Levenshtein Matching"). Pure helper.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function levenshtein(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  /** @type {number[]} */
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    const curr = [i + 1];
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      curr[j + 1] = Math.min(curr[j] + 1, prev[j + 1] + 1, prev[j] + cost);
    }
    prev = curr;
  }
  return prev[b.length];
}

/**
 * Find the key on `obj` that best matches `target` within `maxDist` edits.
 * Used to recover a misspelled key (`protocl` -> `protocol`) WITHOUT inventing
 * a value — it only re-points to a value that is already there.
 * @param {Record<string, unknown>} obj
 * @param {string} target
 * @param {number} [maxDist]
 * @returns {string | null} the actual key on obj, or null if none close enough
 */
export function fuzzyKey(obj, target, maxDist = 2) {
  if (Object.prototype.hasOwnProperty.call(obj, target)) return target;
  /** @type {string | null} */
  let best = null;
  let bestDist = maxDist + 1;
  for (const key of Object.keys(obj)) {
    const d = levenshtein(key.toLowerCase(), target.toLowerCase());
    if (d < bestDist) { bestDist = d; best = key; }
  }
  return bestDist <= maxDist ? best : null;
}

/**
 * Stage 10: repair common JSON breakage (comments, trailing commas).
 * Structure only — never touches values.
 * @param {string} text
 * @returns {{ text: string, actions: string[] }}
 */
export function repairJson(text) {
  /** @type {string[]} */
  const actions = [];
  let s = text;

  const noBlock = s.replace(/\/\*[\s\S]*?\*\//g, "");
  if (noBlock !== s) { actions.push("REC_STRUCTURE_REPAIRED: removed block comments"); s = noBlock; }

  const noLine = s.replace(/(^|[^:"])\/\/[^\n\r]*/g, "$1");
  if (noLine !== s) { actions.push("REC_STRUCTURE_REPAIRED: removed line comments"); s = noLine; }

  const noTrailing = s.replace(/,(\s*[}\]])/g, "$1");
  if (noTrailing !== s) { actions.push("REC_STRUCTURE_REPAIRED: removed trailing commas"); s = noTrailing; }

  return { text: s, actions };
}

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
  if (typeof input !== "string" || input.trim().length === 0) return null;

  const { text, actions } = repairJson(input);
  /** @type {any} */
  let config;
  try {
    config = JSON.parse(text);
  } catch {
    return null; // could not even repair into valid JSON
  }

  /** @type {string[]} */
  const recoveryActions = [...actions];

  let ob = selectOutbound(config);
  if (!ob) {
    // No outbound recognized as-is — try fuzzy-correcting a single misspelled outbound.
    const candidates =
      Array.isArray(config?.outbounds) ? config.outbounds
        : (config?.outbound ? [config.outbound]
          : (config?.protocol ? [config] : []));
    for (const cand of candidates) {
      if (!cand || typeof cand !== "object") continue;
      const { outbound, actions: fa } = fuzzyCorrectOutbound(cand);
      if (PROXY_PROTOCOLS.includes(String(outbound.protocol).toLowerCase())) {
        ob = outbound;
        recoveryActions.push(...fa);
        break;
      }
    }
  }
  if (!ob) return null;

  const fields = extractOutbound(ob);
  // Require at least a protocol + address to call it a recovery (no fabrication).
  if (fields.protocol == null || fields.address == null) return null;

  return {
    protocol: String(ob.protocol),
    fields,
    warnings: ["REC_PARTIAL_CONFIG: node recovered from malformed Xray JSON."],
    recoveryActions,
    raw: input,
  };
}
