/**
 * Sing-box detection — 04-PARSER_ENGINE Stage 02 / 12-PARSER_FACTORY §4.
 *
 * Disambiguated from Xray by FIELD NAMES: a sing-box outbound has `type` +
 * `server`/`server_port`, whereas an Xray outbound has `protocol` +
 * `settings`. So an Xray config yields no sing-box items here (score 0), and a
 * sing-box config yields no usable Xray outbound there (Xray scores only 55) —
 * Highest Confidence Wins routes each correctly.
 */

import { collectItems } from "./extract.js";

/** Tokens that imply a sing-box config even in broken JSON (Xray lacks these). */
const SINGBOX_TOKENS = /"server_port"\s*:|"type"\s*:\s*"(vless|vmess|trojan|shadowsocks|hysteria2|tuic|wireguard)"/;

/**
 * @param {string} input
 * @returns {number} confidence 0-100
 */
export function detectSingBox(input) {
  if (typeof input !== "string") return 0;
  const trimmed = input.trim();
  if (trimmed.length === 0) return 0;

  if (/^[a-z0-9]+:\/\//i.test(trimmed)) return 0; // URL scheme -> other parser
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return 0;

  /** @type {any} */
  let config;
  try {
    config = JSON.parse(trimmed);
  } catch {
    return SINGBOX_TOKENS.test(trimmed) ? 60 : 0; // broken but recoverable sing-box
  }

  return collectItems(config).length > 0 ? 95 : 0;
}
