/**
 * WireGuard detection — 04-PARSER_ENGINE Stage 02 / 12-PARSER_FACTORY §4.
 *
 * The wg-quick `.conf` format (`[Interface]` / `[Peer]` INI sections) is
 * unmistakable: it is not valid JSON (Xray/Sing-box score 0), not YAML with a
 * `proxies:` key (Clash scores 0), and not a URL (URL/Subscription score 0).
 */

const SECTION_RE = /^\s*\[(interface|peer)\]\s*$/im;

/**
 * @param {string} input
 * @returns {number} confidence 0-100
 */
export function detectWireguard(input) {
  if (typeof input !== "string") return 0;
  const trimmed = input.trim();
  if (trimmed.length === 0) return 0;
  if (/^[a-z0-9]+:\/\//i.test(trimmed)) return 0; // URL scheme -> other parser

  return SECTION_RE.test(input) ? 95 : 0;
}
