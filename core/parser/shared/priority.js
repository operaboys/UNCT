/**
 * Priority Chain resolution — shared parser helper (05-UNIVERSAL_NODE_MODEL §2).
 *
 * When several synonym field names map to one canonical UNM field, a fixed
 * priority order (highest first) decides the winner. EVERY synonym actually
 * present (winner and losers) is recorded in `originalMappings` so no
 * provenance is lost — only the canonical field carries the value on the node.
 *
 * Each parser defines its OWN chains (the synonyms differ per format — e.g.
 * Xray's `publicKey` vs a URL's `pbk`), but they all resolve them through this
 * single function so the behaviour is identical everywhere.
 */

/**
 * @param {Record<string, unknown>} fields
 * @param {readonly string[]} chain  synonym names, highest priority first
 * @param {string} canonical
 * @param {Record<string, string>} originalMappings  mutated: synonym -> canonical
 * @returns {string | undefined} the winning value, or undefined if none present
 */
export function resolvePriority(fields, chain, canonical, originalMappings) {
  /** @type {string | undefined} */
  let winner;
  for (const name of chain) {
    const v = fields[name];
    const present = typeof v === "string" ? v.length > 0 : v != null;
    if (!present) continue;
    if (name !== canonical) originalMappings[name] = canonical;
    if (winner === undefined) winner = String(v);
  }
  return winner;
}
