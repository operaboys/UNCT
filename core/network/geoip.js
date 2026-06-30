/**
 * core/network/geoip.js — ADR-024 compliant GeoIP + ASN lookup.
 * Provider: ipwho.is (ADR-025) — HTTPS, no API key, CORS-enabled, ~10k req/hr.
 *
 * Architectural contract (ADR-024 Rule 3):
 *   - Lives in core/network/, not in parser/analyzer/converter/validator/unm.
 *   - Pipeline modules NEVER import from here.
 *   - Only UI code (via a user-initiated button click) calls lookupGeoIp.
 *
 * Data Minimization contract (ADR-024 Rule 2):
 *   - buildGeoTarget is the type-level boundary: accepts {address} only.
 *   - lookupGeoIp calls buildGeoTarget internally before constructing the URL.
 *   - uuid, password, keys, and every other credential field never leave the
 *     browser — even if a caller accidentally passes a full UNMNode.
 *
 * Private/reserved addresses are detected locally (no API call made):
 *   - RFC 1918: 10.x, 172.16-31.x, 192.168.x
 *   - Loopback: 127.x, ::1
 *   - Link-local: 169.254.x, fe80::
 *   - ULA IPv6: fc00::/7 (fc and fd prefixes)
 *   - "localhost"
 */

const API_BASE = "https://ipwho.is/";

/** @type {RegExp[]} */
const PRIVATE_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
  /^localhost$/i,
];

/**
 * Data Minimization boundary (ADR-024 Rule 2).
 * Accepts only address — never uuid, password, keys, or any other UNMNode field.
 * Even if a caller passes extra fields, the returned object has address only.
 *
 * @param {{ address: string | unknown }} target
 * @returns {{ address: string }}
 */
export function buildGeoTarget({ address }) {
  return { address: String(address).trim() };
}

/**
 * @typedef {{ status: "ok"; country: string; region: string; asn: string; isp: string }
 *   | { status: "private"; country: null; region: null; asn: null; isp: null }
 *   | { status: "error"; country: null; region: null; asn: null; isp: null }} GeoIpResult
 */

/**
 * Looks up GeoIP + ASN data for an address.
 * Never throws — always returns a typed GeoIpResult.
 * User-Initiated only (ADR-024 Rule 1): must only be called from a UI button click.
 *
 * Private/reserved addresses are detected locally and return { status: "private" }
 * without making any network request.
 *
 * @param {{ address: string }} target
 * @returns {Promise<GeoIpResult>}
 */
export async function lookupGeoIp(target) {
  const { address } = buildGeoTarget(target);

  if (PRIVATE_PATTERNS.some((p) => p.test(address))) {
    return { status: "private", country: null, region: null, asn: null, isp: null };
  }

  try {
    const resp = await fetch(`${API_BASE}${address}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!resp.ok) {
      return { status: "error", country: null, region: null, asn: null, isp: null };
    }

    /** @type {any} */
    const data = await resp.json();

    if (data.success === false) {
      return { status: "private", country: null, region: null, asn: null, isp: null };
    }

    return {
      status: "ok",
      country: String(data.country ?? ""),
      region: String(data.region ?? ""),
      asn: data.connection?.asn != null ? `AS${data.connection.asn}` : "",
      isp: String(data.connection?.isp ?? data.connection?.org ?? ""),
    };
  } catch {
    return { status: "error", country: null, region: null, asn: null, isp: null };
  }
}
