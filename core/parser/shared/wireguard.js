/**
 * WireGuard extension namespace — shared convention (ADR-007).
 *
 * The frozen UNM core (05-UNIVERSAL_NODE_MODEL) has NO WireGuard-specific
 * fields. Per 05 §8 (Core vs Runtime Extensions), WireGuard data lives under
 * `node.extensions.wireguard` with the FIXED shape below, so every parser that
 * meets WireGuard (URL now; Sing-box / Clash in Phase 4) writes the same keys
 * instead of inventing its own.
 *
 * `endpoint` (host:port) is normally redundant with the core `address`/`port`
 * and is only set when a parser receives it as a single combined string.
 *
 * @typedef {Object} WireguardExtension
 * @property {string} [privateKey]
 * @property {string} [publicKey]            peer public key
 * @property {string} [presharedKey]
 * @property {string} [endpoint]             host:port, only if received combined
 * @property {string[]} [allowedIPs]
 * @property {string[]} [dns]
 * @property {number} [mtu]
 * @property {number} [persistentKeepalive]  seconds
 * @property {string} [reserved]
 */

/** The single namespace key under `node.extensions`. */
export const WIREGUARD_EXTENSION_NS = "wireguard";

/** Split a comma/space-separated list into a trimmed string array, or undefined.
 *  @param {unknown} raw @returns {string[] | undefined} */
function toList(raw) {
  if (Array.isArray(raw)) {
    const a = raw.filter((x) => typeof x === "string" && x.length > 0);
    return a.length ? a : undefined;
  }
  if (typeof raw === "string" && raw.length > 0) {
    const a = raw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    return a.length ? a : undefined;
  }
  return undefined;
}

/** Coerce to a finite integer, or undefined. @param {unknown} raw @returns {number | undefined} */
function toInt(raw) {
  const n = typeof raw === "string" ? Number(raw) : raw;
  return typeof n === "number" && Number.isInteger(n) ? n : undefined;
}

/**
 * Build the `{ wireguard: {...} }` extensions fragment from loosely-typed parts.
 * Only present keys are included; returns `null` when nothing is present (so the
 * caller can skip setting `extensions` at all).
 *
 * @param {Record<string, unknown>} parts
 * @returns {{ wireguard: WireguardExtension } | null}
 */
export function buildWireguardExtensions(parts) {
  /** @type {WireguardExtension} */
  const wg = {};
  if (typeof parts.privateKey === "string") wg.privateKey = parts.privateKey;
  if (typeof parts.publicKey === "string") wg.publicKey = parts.publicKey;
  if (typeof parts.presharedKey === "string") wg.presharedKey = parts.presharedKey;
  if (typeof parts.endpoint === "string") wg.endpoint = parts.endpoint;
  if (typeof parts.reserved === "string") wg.reserved = parts.reserved;

  const allowedIPs = toList(parts.allowedIPs);
  if (allowedIPs) wg.allowedIPs = allowedIPs;
  const dns = toList(parts.dns);
  if (dns) wg.dns = dns;
  const mtu = toInt(parts.mtu);
  if (mtu !== undefined) wg.mtu = mtu;
  const keepalive = toInt(parts.persistentKeepalive);
  if (keepalive !== undefined) wg.persistentKeepalive = keepalive;

  return Object.keys(wg).length ? { [WIREGUARD_EXTENSION_NS]: wg } : null;
}
