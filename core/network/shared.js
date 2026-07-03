/**
 * core/network/shared.js — the single low-level connectivity probe shared by
 * every "single-shot reachability" online feature (ADR-024).
 *
 * Why this file exists (a documented architecture decision, not an
 * afterthought): browsers expose no raw TCP socket API, so a "is this port
 * open?" check and a "how long did the round-trip take?" check are, from
 * inside a browser sandbox, THE SAME operation — one attempted HTTP-level
 * round trip to address:port via fetch() with mode:"no-cors", aborted after
 * a fixed timeout. There is no second, more TCP-accurate mechanism available
 * to build a genuinely different probe from. Duplicating that fetch/timeout/
 * URL-construction logic under two names (once in latency.js, once in
 * port-check.js) would not buy real independence — it would just let the
 * two copies silently drift apart over time while both still measure the
 * identical thing. So the raw probe lives here, once; `latency.js` and
 * `port-check.js` each project the SAME three raw outcomes onto their own
 * vocabulary (RTT-focused vs. open/closed/unknown-focused) — see each
 * module's own doc comment for its mapping and the honesty caveats that
 * come with it (Rule 9: never claim more certainty than the mechanism has).
 *
 * Data Minimization boundary (ADR-024 Rule 2): buildNetworkTarget accepts
 * only {address, port}; every online feature in this directory must funnel
 * through it before touching the network. uuid, password, privateKey,
 * publicKey, pbk, sid, psk, and every other credential field never reach
 * this module, let alone the network.
 *
 * User-Initiated Only (ADR-024 Rule 1): probeEndpoint must only ever be
 * called as the direct result of an explicit user action (button click) —
 * enforced by convention at the UI call sites, not by this module itself.
 */

const TIMEOUT_MS = 5_000;

/**
 * @param {{ address: string | unknown, port: number | unknown }} target
 * @returns {{ address: string, port: number }}
 */
export function buildNetworkTarget({ address, port }) {
  return {
    address: String(address),
    port: Number(port),
  };
}

/**
 * @typedef {{ outcome: "responded"; elapsedMs: number }
 *   | { outcome: "failed-fast"; elapsedMs: number }
 *   | { outcome: "timed-out"; elapsedMs: null }} ProbeResult
 */

/**
 * Attempts exactly one HTTP-level round trip to address:port and reports
 * which of the three distinguishable outcomes actually happened. Never
 * throws.
 *
 * @param {{ address: string, port: number }} target
 * @returns {Promise<ProbeResult>}
 */
export async function probeEndpoint(target) {
  const { address, port } = buildNetworkTarget(target);

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
    return { outcome: "responded", elapsedMs: Math.round(performance.now() - t0) };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { outcome: "timed-out", elapsedMs: null };
    }
    // TypeError: network error (connection refused, TLS failure, or
    // protocol mismatch) — a fast failure, before the timeout fired.
    return { outcome: "failed-fast", elapsedMs: Math.round(performance.now() - t0) };
  } finally {
    clearTimeout(timeoutId);
  }
}
