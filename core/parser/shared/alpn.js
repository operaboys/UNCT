/**
 * Shared ALPN-array normalization for JSON/YAML-array-shaped sources
 * (Sing-box, Clash both encode ALPN as a native array). The URL Parser's ALPN
 * is a different shape (string-or-array, comma/space-separated when a
 * string) and is NOT this helper — see url/normalize.js's own `parseAlpn`.
 *
 * @param {unknown} raw
 * @returns {string[] | undefined}
 */
export function parseAlpnArray(raw) {
  if (Array.isArray(raw)) {
    const a = raw.filter((x) => typeof x === "string");
    return a.length ? a : undefined;
  }
  return undefined;
}
