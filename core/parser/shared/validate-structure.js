/**
 * Shared `validateStructure()` — structure-only check (12-PARSER_FACTORY §2),
 * NOT the central Validation Engine (Stage 13, which judges value validity on
 * each finished node). Every multi-item parser's extraction is a list under
 * `fields[key]` (default "items"; Subscription uses "lines"), so this single
 * implementation is reused instead of six near-identical copies.
 *
 * @typedef {import("../../types/parser").RawExtraction} RawExtraction
 * @typedef {import("../../types/unm").ValidationObject} ValidationObject
 */

/**
 * @param {RawExtraction} extraction
 * @param {string} [key]
 * @returns {ValidationObject}
 */
export function validateItemsStructure(extraction, key = "items") {
  const list = /** @type {any} */ (extraction)?.fields?.[key];
  const ok = Array.isArray(list) && list.length > 0;
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
