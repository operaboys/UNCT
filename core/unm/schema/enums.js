/**
 * UNM runtime enums — the concrete value sets behind the `.d.ts` union types
 * in core/types/unm.d.ts (ADR-002 §"Phase 1 implementation": types in
 * core/types/, runtime enums/defaults in core/unm/schema/).
 *
 * Mirrors 05-UNIVERSAL_NODE_MODEL §2 exactly (Freeze zone).
 *
 * @typedef {import("../../types/unm").SourceType} SourceType
 * @typedef {import("../../types/unm").Protocol} Protocol
 * @typedef {import("../../types/unm").NetworkType} NetworkType
 * @typedef {import("../../types/unm").SecurityType} SecurityType
 */

/** @type {readonly SourceType[]} */
export const SOURCE_TYPES = Object.freeze([
  "xray-json", "singbox-json", "clash-yaml", "clash-meta-yaml",
  "vless-url", "vmess-url", "trojan-url", "ss-url",
  "hysteria2-url", "tuic-url", "wireguard-config", "subscription",
]);

/** @type {readonly Protocol[]} */
export const PROTOCOLS = Object.freeze([
  "vless", "vmess", "trojan", "shadowsocks",
  "hysteria2", "tuic", "wireguard",
]);

/** @type {readonly NetworkType[]} */
export const NETWORK_TYPES = Object.freeze([
  "tcp", "ws", "grpc", "http-upgrade", "kcp", "quic", "xhttp",
]);

/** @type {readonly SecurityType[]} */
export const SECURITY_TYPES = Object.freeze(["none", "tls", "reality"]);

/**
 * Protocols for which `uuid` is the authentication credential (so uuid validity
 * is meaningful — otherwise the ValidationObject flag is `null`).
 * @type {readonly Protocol[]}
 */
export const UUID_PROTOCOLS = Object.freeze(["vless", "vmess"]);

/** @param {unknown} v @returns {v is SourceType} */
export const isSourceType = (v) => SOURCE_TYPES.includes(/** @type {SourceType} */ (v));
/** @param {unknown} v @returns {v is Protocol} */
export const isProtocol = (v) => PROTOCOLS.includes(/** @type {Protocol} */ (v));
/** @param {unknown} v @returns {v is NetworkType} */
export const isNetworkType = (v) => NETWORK_TYPES.includes(/** @type {NetworkType} */ (v));
/** @param {unknown} v @returns {v is SecurityType} */
export const isSecurityType = (v) => SECURITY_TYPES.includes(/** @type {SecurityType} */ (v));
