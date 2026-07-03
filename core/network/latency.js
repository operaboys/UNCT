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
 * Shared mechanism (see shared.js's doc comment for the full reasoning): the
 * actual fetch/timeout/URL-construction logic lives in `probeEndpoint`
 * (shared.js), because the Port Availability Check (port-check.js) needs the
 * exact same browser-level probe — a browser cannot open a raw TCP socket,
 * so both features measure the same single HTTP round-trip attempt and only
 * differ in how they label its outcome. This module maps that outcome onto
 * an RTT-focused result:
 *
 *   responded   -> "ok" (+rtt)
 *   failed-fast -> "unreachable"
 *   timed-out   -> "timeout"
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
import { buildNetworkTarget, probeEndpoint } from "./shared.js";

/**
 * Data Minimization boundary (ADR-024 Rule 2).
 * Accepts only address and port — never the full UNMNode.
 * Callers must not bypass this by passing extra fields; even if they do,
 * the returned object contains address and port only.
 *
 * @param {{ address: string | unknown, port: number | unknown }} target
 * @returns {{ address: string, port: number }}
 */
export const buildPingTarget = buildNetworkTarget;

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
  const result = await probeEndpoint(target);
  if (result.outcome === "responded") return { status: "ok", rtt: result.elapsedMs };
  if (result.outcome === "timed-out") return { status: "timeout", rtt: null };
  return { status: "unreachable", rtt: null };
}
