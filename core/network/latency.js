/**
 * core/network/latency.js — ADR-024 compliant latency probe.
 *
 * Architectural contract (ADR-024 Rule 3):
 *   - This module LIVES in core/network/, not in parser/analyzer/converter/validator/unm.
 *   - Pipeline modules NEVER import from here.
 *   - Only UI code (via a user-initiated action) calls measureLatency.
 *
 * Data Minimization contract (ADR-024 Rule 2):
 *   - buildPingTarget is the type-level boundary: it accepts {address, port} only.
 *   - measureLatency calls buildPingTarget internally, so even if a caller
 *     accidentally passes a full UNMNode, only address and port reach the network.
 *   - uuid, password, keys, and every other credential field never leave the browser.
 *
 * Browser limitation:
 *   Raw TCP sockets are not available in standard browser contexts. We use
 *   fetch() with mode:"no-cors" as a TCP-level probe. Most proxy servers
 *   (VLESS, VMess, Trojan, Hysteria2, TUIC) do not speak HTTP — they close
 *   the connection after the TCP handshake or after seeing our HTTP HEAD.
 *   This manifests as a TypeError in the Fetch API; we return "unreachable"
 *   because the probe did not complete a round-trip.
 *
 *   A status of "ok" (with RTT) is returned when the server does respond at
 *   the HTTP level (e.g., CDN-fronted configs, Cloudflare Worker endpoints,
 *   or any node whose transport layer speaks HTTP/TLS-ALPN h2).
 *
 *   "timeout" is returned when the AbortController fires (TIMEOUT_MS elapsed
 *   with no response at all — truly unreachable or packet-dropped firewall).
 */

const TIMEOUT_MS = 5_000;

/**
 * Data Minimization boundary (ADR-024 Rule 2).
 * Accepts only address and port — never the full UNMNode.
 * Callers must not bypass this by passing extra fields; even if they do,
 * the returned object contains address and port only.
 *
 * @param {{ address: string | unknown, port: number | unknown }} target
 * @returns {{ address: string, port: number }}
 */
export function buildPingTarget({ address, port }) {
  return {
    address: String(address),
    port: Number(port),
  };
}

/**
 * @typedef {{ status: "ok"; rtt: number }
 *   | { status: "unreachable"; rtt: null }
 *   | { status: "timeout"; rtt: null }} LatencyResult
 */

/**
 * Measures network latency to an address:port endpoint.
 * Never throws — always returns a typed LatencyResult.
 * User-Initiated only (ADR-024 Rule 1): this function must only be called
 * as the direct result of an explicit user action (button click).
 *
 * @param {{ address: string, port: number }} target
 * @returns {Promise<LatencyResult>}
 */
export async function measureLatency(target) {
  const { address, port } = buildPingTarget(target);

  // IPv6 addresses require brackets in URLs (RFC 2732).
  const host = address.includes(":") ? `[${address}]` : address;
  const url = `http://${host}:${port}/`;

  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const t0 = performance.now();

  try {
    await fetch(url, {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-store",
      signal: ctrl.signal,
    });
    return { status: "ok", rtt: Math.round(performance.now() - t0) };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { status: "timeout", rtt: null };
    }
    // TypeError: network error (connection refused, TLS failure, or
    // proxy protocol mismatch — all are non-HTTP responses).
    return { status: "unreachable", rtt: null };
  } finally {
    clearTimeout(timeoutId);
  }
}
