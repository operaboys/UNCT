/**
 * Subscription extraction — 04-PARSER_ENGINE Stage 08 (Auto Split / Auto
 * Deduplicate) gated by Subscription Validation (03-FEATURE_MATRIX §2.1).
 *
 * Per 03 §2.1 the validation checks run BEFORE Split/Merge:
 *  - Detect Empty Subscription
 *  - Detect Broken Base64
 *  - Detect Duplicate Payload
 *
 * The result is a RawExtraction whose `fields.lines` is the cleaned, de-duped
 * list of config URLs and whose `fields.report` records the split stats. Turning
 * each line into a UNMNode is normalize.js's job (it reuses the URL parser).
 *
 * @typedef {import("../../types/parser").RawExtraction} RawExtraction
 */

import { decodeSubscription, isUrlLine } from "./decode.js";

/**
 * Split decoded text into config lines and drop duplicate payloads.
 * @param {string} text
 * @returns {{ lines: string[], totalLines: number, duplicateCount: number }}
 */
export function splitAndDedupe(text) {
  const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).filter(isUrlLine);
  /** @type {Set<string>} */
  const seen = new Set();
  /** @type {string[]} */
  const lines = [];
  let duplicateCount = 0;
  for (const l of rawLines) {
    if (seen.has(l)) { duplicateCount++; continue; }
    seen.add(l);
    lines.push(l);
  }
  return { lines, totalLines: rawLines.length, duplicateCount };
}

/**
 * parse() — Stage 08 happy path. Decode, validate (03 §2.1), split, dedupe.
 * Throws (routing to recover()) on an empty subscription or broken Base64.
 * @param {string} input
 * @returns {RawExtraction}
 */
export function extractSubscription(input) {
  const dec = decodeSubscription(input);

  // ---- Subscription Validation, BEFORE Split/Merge (03 §2.1) ----
  if (dec.empty) {
    throw new Error("Subscription extract: empty subscription (PARSE_EMPTY_SUBSCRIPTION)");
  }
  if (dec.brokenBase64) {
    throw new Error("Subscription extract: broken Base64 payload (PRE_BROKEN_BASE64)");
  }

  const { lines, totalLines, duplicateCount } = splitAndDedupe(dec.text);
  if (lines.length === 0) {
    throw new Error("Subscription extract: no config lines found (PARSE_EMPTY_SUBSCRIPTION)");
  }

  /** @type {string[]} */
  const warnings = [...dec.actions];
  if (duplicateCount > 0) {
    warnings.push(`PARSE_DUPLICATE_PAYLOAD: removed ${duplicateCount} duplicate line(s).`);
  }

  return {
    protocol: "subscription",
    fields: {
      lines,
      report: { encoding: dec.encoding, totalLines, uniqueLines: lines.length, duplicateCount },
    },
    warnings: warnings.length ? warnings : undefined,
    raw: input,
  };
}
