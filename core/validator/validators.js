/**
 * Pure field validators — no node context, no side effects. Used by the
 * Validation Engine (validate-node.js). Each function answers a single
 * "is this value well-formed?" question.
 *
 * Scope boundary (04-PARSER_ENGINE Stage 13 / 05 §5): these judge whether a
 * VALUE is valid — never where it came from (that is Recovery's job).
 */

/** Recognized ALPN protocol identifiers. Unknown entries are a warning, not an error. */
export const KNOWN_ALPN = Object.freeze(["h2", "http/1.1", "http/1.0", "h3"]);

/**
 * @param {unknown} port
 * @returns {boolean} true if an integer in 1-65535
 */
export function isValidPort(port) {
  return typeof port === "number" && Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * @param {unknown} v
 * @returns {boolean} true if a dotted-quad IPv4 with each octet 0-255
 */
export function isValidIPv4(v) {
  if (typeof v !== "string") return false;
  const parts = v.split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255 && (p === "0" || !p.startsWith("0")));
}

/**
 * @param {unknown} v
 * @returns {boolean} true if a plausible IPv6 literal (incl. compressed `::`)
 */
export function isValidIPv6(v) {
  if (typeof v !== "string") return false;
  let s = v;
  if (s.startsWith("[") && s.endsWith("]")) s = s.slice(1, -1);
  if (!s.includes(":")) return false;
  // At most one "::" compression.
  if ((s.match(/::/g) || []).length > 1) return false;
  const groups = s.split(":");
  if (groups.length > 8) return false;
  return groups.every((g) => g === "" || /^[0-9a-fA-F]{1,4}$/.test(g));
}

/**
 * @param {unknown} v
 * @returns {boolean} true if a syntactically valid hostname (RFC-1123 labels)
 */
export function isValidDomain(v) {
  if (typeof v !== "string" || v.length === 0 || v.length > 253) return false;
  const host = v.endsWith(".") ? v.slice(0, -1) : v;
  const labels = host.split(".");
  return labels.every((l) =>
    l.length >= 1 && l.length <= 63 &&
    /^[a-zA-Z0-9-]+$/.test(l) &&
    !l.startsWith("-") && !l.endsWith("-")
  );
}

/**
 * Valid node address = IPv4, IPv6, or domain. (DNS-address filtering is the
 * parser's responsibility, not validation — 04-PARSER_ENGINE Stage 04.)
 * @param {unknown} v
 * @returns {boolean}
 */
export function isValidAddress(v) {
  return isValidIPv4(v) || isValidIPv6(v) || isValidDomain(v);
}

/**
 * @param {unknown} v
 * @returns {boolean} true if an RFC-4122 UUID (any version)
 */
export function isValidUUID(v) {
  return typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

/**
 * @param {unknown} v
 * @returns {boolean} true if a valid hostname for SNI / Host header use
 */
export function isValidHost(v) {
  return isValidDomain(v);
}

/**
 * @param {unknown} v
 * @returns {boolean} true if a structurally valid transport path
 */
export function isValidPath(v) {
  return typeof v === "string" && v.length > 0 && !/\s/.test(v) && v.startsWith("/");
}

/**
 * Structural validity of an ALPN list. Unrecognized-but-well-formed entries are
 * structurally valid (they only warrant a warning).
 * @param {unknown} v
 * @returns {boolean}
 */
export function isValidAlpn(v) {
  return Array.isArray(v) && v.length > 0 &&
    v.every((e) => typeof e === "string" && e.length > 0 && !/\s/.test(e));
}

/**
 * @param {unknown} v
 * @returns {boolean} true if every entry is a recognized ALPN id
 */
export function isKnownAlpn(v) {
  return Array.isArray(v) && v.every((e) => KNOWN_ALPN.includes(e));
}
