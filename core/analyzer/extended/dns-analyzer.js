/**
 * DNS Leak Risk Analyzer — ADR-022.
 *
 * Computes a `DnsLeakRisk` value for a UNMNode by inspecting the config-level
 * DNS data stored at `extensions.configDns` (Xray/Sing-box/Clash configs) or
 * at `extensions.wireguard.dns` (WireGuard `.conf` source type, ADR-007).
 * URL and subscription-derived nodes carry no DNS data → risk is "unknown"
 * (ANTI_CHAOS Rule 9: never fabricate a risk level).
 *
 * Computation matrix (ADR-022 §6):
 *   fakeIp = true               → "none"
 *   all servers private/DoT/DoH → "low"
 *   mixed private+public         → "medium"
 *   all servers public cleartext → "high"
 *   no DNS data available        → "unknown"
 *
 * @typedef {import("../../types/unm").UNMNode} UNMNode
 * @typedef {import("../../types/unm").DnsLeakRisk} DnsLeakRisk
 */

/** @param {string} s */
function isPrivateOrEncrypted(s) {
  const lower = s.toLowerCase();
  // DNS-over-TLS / DNS-over-HTTPS
  if (lower.startsWith("tls://") || lower.startsWith("https://") || lower.startsWith("quic://")) return true;
  // Strip port for IP checks
  const host = lower.replace(/:\d+$/, "").replace(/^\[/, "").replace(/\]$/, "");
  // Private IPv4 ranges
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  if (host === "127.0.0.1" || host === "localhost") return true;
  // IPv6 loopback and link-local
  if (host === "::1") return true;
  if (/^fe80:/i.test(host)) return true;
  // Well-known private/encrypted resolvers
  if (host === "8.8.8.8" || host === "8.8.4.4") return false; // Google (public cleartext)
  if (host === "1.1.1.1" || host === "1.0.0.1") return false; // Cloudflare (public cleartext)
  if (host === "9.9.9.9" || host === "149.112.112.112") return false; // Quad9 (public cleartext)
  // Anything else is treated as public cleartext (conservative assumption)
  return false;
}

/**
 * Compute DnsLeakRisk from a list of server strings and a fakeIp flag.
 * @param {string[]} servers
 * @param {boolean} fakeIp
 * @returns {DnsLeakRisk}
 */
function computeRisk(servers, fakeIp) {
  if (fakeIp) return "none";
  if (servers.length === 0) return "unknown";
  const flags = servers.map(isPrivateOrEncrypted);
  const allPrivate = flags.every(Boolean);
  const anyPrivate = flags.some(Boolean);
  if (allPrivate) return "low";
  if (anyPrivate) return "medium";
  return "high";
}

/**
 * Analyze a UNMNode and return its DNS leak risk level.
 * @param {UNMNode} node
 * @returns {DnsLeakRisk}
 */
export function analyzeDnsLeakRisk(node) {
  const ext = node.extensions;
  if (!ext || typeof ext !== "object") return "unknown";

  // WireGuard `.conf` stores DNS under extensions.wireguard.dns (ADR-007).
  if (node.sourceType === "wireguard-config") {
    const wg = /** @type {any} */ (ext).wireguard;
    if (!wg || typeof wg !== "object") return "unknown";
    const dns = wg.dns;
    if (!dns) return "unknown";
    const servers = Array.isArray(dns) ? dns.filter((/** @type {any} */ s) => typeof s === "string")
      : (typeof dns === "string" ? [dns] : []);
    return computeRisk(servers, false);
  }

  // All other source types: extensions.configDns (ADR-022).
  const configDns = /** @type {any} */ (ext).configDns;
  if (!configDns || typeof configDns !== "object") return "unknown";
  const servers = Array.isArray(configDns.servers) ? configDns.servers.filter(
    (/** @type {any} */ s) => typeof s === "string",
  ) : [];
  const fakeIp = Boolean(configDns.fakeIp);
  return computeRisk(servers, fakeIp);
}
