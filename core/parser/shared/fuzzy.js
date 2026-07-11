/**
 * Fuzzy matching helpers — shared parser helper for 04-PARSER_ENGINE Stage 11
 * (Fuzzy Recovery: Levenshtein Matching, Broken Key Recovery).
 *
 * These ONLY re-point to values that already exist (e.g. a misspelled key) —
 * they never invent a value. Inventing security data (uuid/password/pbk/sid)
 * is forbidden (Stage 11 absolute rule); these helpers cannot do that.
 */

/**
 * Levenshtein edit distance.
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
 * Find the key on `obj` closest to `target` within `maxDist` edits.
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
 * Find the closest member of `candidates` to `value` within `maxDist` edits.
 * @param {string} value
 * @param {readonly string[]} candidates
 * @param {number} [maxDist]
 * @returns {string | null}
 */
export function fuzzyMatch(value, candidates, maxDist = 2) {
  /** @type {string | null} */
  let best = null;
  let bestDist = maxDist + 1;
  for (const c of candidates) {
    const d = levenshtein(value.toLowerCase(), c.toLowerCase());
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return bestDist <= maxDist ? best : null;
}
