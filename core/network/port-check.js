/**
 * core/network/port-check.js — ADR-024 compliant Port Availability Check.
 *
 * Relationship to latency.js (a decision made deliberately, not by accident):
 * browsers expose no raw TCP socket API, so Port Availability Check and the
 * Latency Tester are, at the network level, THE SAME single-shot fetch()-
 * based probe (`probeEndpoint` in shared.js) — one attempted HTTP round trip
 * to address:port, aborted after 5s. There is no second, more TCP-accurate
 * mechanism available inside a browser sandbox to build a genuinely
 * different "is this port open?" check from. Rather than duplicate that
 * fetch/timeout/URL logic under a different name — which would only let the
 * two silently drift apart while still measuring the identical thing — both
 * features share `probeEndpoint` and differ only in how they LABEL its three
 * possible outcomes:
 *
 *   outcome       | latency.js status | port-check.js status
 *   ------------- | ------------------ | ---------------------
 *   responded     | "ok" (+rtt)         | "open" (+latencyMs)
 *   failed-fast   | "unreachable"       | "closed"
 *   timed-out     | "timeout"           | "unknown"
 *
 * Why "closed" for failed-fast, not "unknown": a fetch that rejects with a
 * TypeError BEFORE the timeout fires usually means the OS actively refused
 * or tore down the connection (e.g. TCP RST) — the same signal a real port
 * scanner reads as "closed". This is a heuristic, not a certainty (a proxy
 * that completes the TCP handshake but instantly closes on seeing our raw
 * HTTP HEAD would also fail fast, and would be mislabeled "closed" here even
 * though the port is technically open) — which is exactly why the slow case
 * is reported as "unknown", not "closed": a silently-dropped packet
 * (firewall-filtered) and a genuinely open-but-non-HTTP port that never
 * answers are indistinguishable from inside a browser sandbox, and Rule 9
 * forbids claiming more certainty than the underlying mechanism actually
 * has.
 *
 * Data Minimization (ADR-024 Rule 2) and User-Initiated Only (Rule 1) are
 * enforced identically to latency.js, via the same buildNetworkTarget
 * boundary in shared.js — only address and port ever reach the network.
 */
import { probeEndpoint } from "./shared.js";

/**
 * @typedef {{ status: "open"; latencyMs: number }
 *   | { status: "closed" }
 *   | { status: "unknown" }} PortCheckResult
 */

/**
 * Checks whether address:port appears open, closed, or indeterminate from
 * the browser. Never throws — always returns a typed PortCheckResult.
 * User-Initiated only (ADR-024 Rule 1): this function must only be called
 * as the direct result of an explicit user action (button click).
 *
 * @param {{ address: string, port: number }} target
 * @returns {Promise<PortCheckResult>}
 */
export async function checkPort(target) {
  const result = await probeEndpoint(target);
  if (result.outcome === "responded") return { status: "open", latencyMs: result.elapsedMs };
  if (result.outcome === "failed-fast") return { status: "closed" };
  return { status: "unknown" };
}
