/**
 * Normalization Mapping Table — 04-PARSER_ENGINE Stage 13.1.
 *
 * Maps the many raw VALUE spellings used across formats to the canonical UNM
 * enum values (05-UNIVERSAL_NODE_MODEL §2). This is complementary to
 * metadata.originalMappings, which tracks raw FIELD NAMES — this file tracks
 * raw FIELD VALUES.
 *
 * Rule (Stage 13.1): a parser runs its raw values through this table; if a
 * value is absent, it must NOT crash — record a PARSE_UNMAPPED_VALUE warning and
 * apply the protocol default (Stage 10, Error Recovery).
 *
 * @typedef {import("../../types/unm").NetworkType} NetworkType
 * @typedef {import("../../types/unm").SecurityType} SecurityType
 * @typedef {import("../../types/unm").Protocol} Protocol
 */

/** @type {Readonly<Record<string, NetworkType>>} */
export const NETWORK_TYPE_MAP = Object.freeze({
  tcp: "tcp",
  ws: "ws", websocket: "ws",
  grpc: "grpc", "gun": "grpc",
  httpupgrade: "http-upgrade", "http-upgrade": "http-upgrade", httpupgrad: "http-upgrade",
  kcp: "kcp", mkcp: "kcp",
  quic: "quic",
  xhttp: "xhttp", splithttp: "xhttp",
});

/** @type {Readonly<Record<string, SecurityType>>} */
export const SECURITY_TYPE_MAP = Object.freeze({
  none: "none", "": "none",
  tls: "tls",
  reality: "reality", xtls: "reality",
});

/** @type {Readonly<Record<string, Protocol>>} */
export const PROTOCOL_MAP = Object.freeze({
  vless: "vless",
  vmess: "vmess",
  trojan: "trojan",
  shadowsocks: "shadowsocks", ss: "shadowsocks",
  hysteria2: "hysteria2", hy2: "hysteria2",
  tuic: "tuic",
  wireguard: "wireguard", wg: "wireguard",
});

/**
 * Look up a canonical value for a raw value in a given map (case-insensitive,
 * trimmed). Returns `undefined` when the raw value is not mapped — the caller is
 * responsible for the warning + default per Stage 13.1.
 *
 * @template T
 * @param {Readonly<Record<string, T>>} map
 * @param {unknown} raw
 * @returns {T | undefined}
 */
export function normalizeValue(map, raw) {
  if (typeof raw !== "string") return undefined;
  return map[raw.trim().toLowerCase()];
}
