/**
 * Clash detection — 04-PARSER_ENGINE Stage 02 / 12-PARSER_FACTORY §4.
 *
 * Clash is YAML with a `proxies:` array. JSON configs (Xray/Sing-box) are valid
 * YAML too, but they have `outbounds`, not `proxies`, so they score 0 here —
 * and a real Clash YAML is not valid JSON, so the JSON parsers score 0 on it.
 */

import { loadClashYaml } from "./decode.js";
import { collectProxies } from "./extract.js";
import { trimOrReject, isUrlScheme } from "../shared/detect-guards.js";

/**
 * @param {string} input
 * @returns {number} confidence 0-100
 */
export function detectClash(input) {
  const trimmed = trimOrReject(input);
  if (trimmed === null) return 0;
  if (isUrlScheme(trimmed)) return 0; // URL scheme -> other parser

  /** @type {any} */
  let doc;
  try {
    doc = loadClashYaml(trimmed);
  } catch {
    // Broken YAML, but the proxies: key visible -> recoverable Clash.
    return /^\s*proxies\s*:/m.test(trimmed) ? 60 : 0;
  }

  return collectProxies(doc).length > 0 ? 95 : 0;
}
