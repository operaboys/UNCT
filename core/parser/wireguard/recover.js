/**
 * WireGuard recovery — 04-PARSER_ENGINE Stage 10/11.
 *
 * Fuzzy-corrects misspelled section headers (e.g. `[Peers]` -> `[Peer]`,
 * `[Interfce]` -> `[Interface]`) using the shared Levenshtein matcher, then
 * re-extracts. Structure only — it never fabricates privateKey/publicKey or any
 * other field; a peer without an endpoint simply yields no node later.
 *
 * @typedef {import("../../types/parser").RawExtraction} RawExtraction
 * @typedef {import("../../types/parser").ParseError} ParseError
 */

import { parseIni, itemsFromSections } from "./extract.js";
import { fuzzyMatch } from "../shared/fuzzy.js";

const KNOWN_SECTIONS = Object.freeze(["interface", "peer"]);

/**
 * @param {string} input
 * @param {ParseError} [_error]
 * @returns {RawExtraction | null}
 */
export function recoverWireguard(input, _error) {
  if (typeof input !== "string" || input.trim().length === 0) return null;

  const sections = parseIni(input);
  if (sections.length === 0) return null;

  /** @type {string[]} */
  const recoveryActions = [];
  for (const section of sections) {
    if (KNOWN_SECTIONS.includes(section.name)) continue;
    const fixed = fuzzyMatch(section.name, KNOWN_SECTIONS, 2);
    if (fixed && fixed !== section.name) {
      recoveryActions.push(`REC_KEY_FUZZY_MATCHED: section "[${section.name}]" -> "[${fixed}]"`);
      section.name = fixed;
    }
  }

  const items = itemsFromSections(sections);
  // Require at least one peer carrying an endpoint (no fabrication).
  if (!items.some((f) => f.endpoint != null)) return null;

  return {
    protocol: "wireguard",
    fields: { items },
    warnings: ["REC_PARTIAL_CONFIG: WireGuard config recovered from malformed input."],
    recoveryActions,
    raw: input,
  };
}
