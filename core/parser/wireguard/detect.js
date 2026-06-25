/**
 * WireGuard detection — 04-PARSER_ENGINE Stage 02 / 12-PARSER_FACTORY §4.
 *
 * The wg-quick `.conf` format (`[Interface]` / `[Peer]` INI sections) is
 * unmistakable: it is not valid JSON (Xray/Sing-box score 0), not YAML with a
 * `proxies:` key (Clash scores 0), and not a URL (URL/Subscription score 0).
 */

import { trimOrReject, isUrlScheme } from "../shared/detect-guards.js";

const SECTION_RE = /^\s*\[(interface|peer)\]\s*$/im;

/**
 * @param {string} input
 * @returns {number} confidence 0-100
 */
export function detectWireguard(input) {
  const trimmed = trimOrReject(input);
  if (trimmed === null) return 0;
  if (isUrlScheme(trimmed)) return 0; // URL scheme -> other parser

  return SECTION_RE.test(input) ? 95 : 0;
}
