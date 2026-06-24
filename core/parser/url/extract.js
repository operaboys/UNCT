/**
 * URL field extraction — 04-PARSER_ENGINE Stage 07 (URL Parser).
 *
 * Runs AFTER the Stage 12 preprocessing layer (preprocess.js) — never on a raw
 * URL. Decodes the per-scheme structure (URL params, encoded paths, Base64
 * segments, Reality parameters) into a flat raw-field record. VALUE/NAME
 * normalization is normalize.js's job (Stage 13.1).
 *
 * @typedef {import("../../types/parser").RawExtraction} RawExtraction
 */

import { preprocessUrl } from "./preprocess.js";

/** Scheme -> canonical protocol token (mapped again through PROTOCOL_MAP later). */
const SCHEME_PROTOCOL = Object.freeze({
  vless: "vless", vmess: "vmess", trojan: "trojan", ss: "shadowsocks",
  hysteria2: "hysteria2", hy2: "hysteria2", tuic: "tuic", wireguard: "wireguard",
});

/**
 * Decode standard or URL-safe Base64 (padding-tolerant). Returns "" on failure.
 * Uses `atob` (present in browsers and Node >= 16) — no Node Buffer dependency,
 * keeping core browser-pure.
 * @param {unknown} raw
 * @returns {string}
 */
export function decodeBase64(raw) {
  try {
    const clean = String(raw).replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
    const padded = clean.length % 4 ? clean + "=".repeat(4 - (clean.length % 4)) : clean;
    return decodeURIComponent(escape(atob(padded)));
  } catch {
    return "";
  }
}

/**
 * Decode a percent-encoded component, falling back to the raw value.
 * @param {string | null | undefined} v
 * @returns {string | undefined}
 */
function dec(v) {
  if (v == null) return undefined;
  try { return decodeURIComponent(v); } catch { return v; }
}

/**
 * Read query params case-insensitively into a plain object (last wins).
 * @param {URLSearchParams} searchParams
 * @returns {Record<string, string>}
 */
function queryToObject(searchParams) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const [k, v] of searchParams) out[k.toLowerCase()] = v;
  return out;
}

/**
 * Copy a known set of query params onto fields (decoded).
 * @param {Record<string, unknown>} fields
 * @param {Record<string, string>} q
 * @param {readonly string[]} names
 */
function copyParams(fields, q, names) {
  for (const name of names) {
    if (q[name] != null && q[name] !== "") fields[name] = dec(q[name]);
  }
}

/**
 * vmess:// is Base64(JSON). Map the well-known vmess JSON keys to raw fields.
 * @param {string} body  everything after `vmess://`
 * @returns {Record<string, unknown>}
 */
function extractVmess(body) {
  const json = decodeBase64(body);
  if (!json) throw new Error("URL extract: vmess payload is not decodable Base64 (PARSE_MISSING_REQUIRED)");
  /** @type {any} */
  let v;
  try { v = JSON.parse(json); } catch {
    throw new Error("URL extract: vmess payload is not valid JSON (PARSE_MISSING_REQUIRED)");
  }
  /** @type {Record<string, unknown>} */
  const fields = {};
  if (v.add != null) fields.address = String(v.add);
  if (v.port != null) fields.port = v.port;
  if (v.id != null) fields.uuid = String(v.id);
  if (v.net != null) fields.network = String(v.net);
  if (v.tls != null && v.tls !== "") fields.security = String(v.tls);
  if (v.host != null && v.host !== "") fields.host = String(v.host);
  if (v.path != null && v.path !== "") fields.path = String(v.path);
  if (v.sni != null && v.sni !== "") fields.sni = String(v.sni);
  if (v.alpn != null && v.alpn !== "") fields.alpn = String(v.alpn);
  if (v.type != null && v.type !== "") fields.headerType = String(v.type);
  if (v.scy != null && v.scy !== "") fields.encryption = String(v.scy);
  if (v.ps != null && v.ps !== "") fields.remark = String(v.ps);
  return fields;
}

/**
 * Shadowsocks: SIP002 (`ss://base64(method:pass)@host:port`) or legacy
 * (`ss://base64(method:pass@host:port)`). Never fabricates the credentials.
 * @param {string} body
 * @returns {Record<string, unknown>}
 */
function extractShadowsocks(body) {
  /** @type {Record<string, unknown>} */
  const fields = {};
  let work = body;
  const hashIdx = work.indexOf("#");
  if (hashIdx >= 0) { fields.remark = dec(work.slice(hashIdx + 1)); work = work.slice(0, hashIdx); }
  const qIdx = work.indexOf("?");
  if (qIdx >= 0) work = work.slice(0, qIdx); // plugin params not modeled in UNM

  const atIdx = work.lastIndexOf("@");
  if (atIdx >= 0) {
    // SIP002: userinfo is base64(method:password) (or already plain), host:port after @.
    const userinfo = work.slice(0, atIdx);
    const hostPort = work.slice(atIdx + 1);
    const decoded = userinfo.includes(":") ? userinfo : decodeBase64(userinfo);
    const ci = decoded.indexOf(":");
    if (ci >= 0) { fields.method = decoded.slice(0, ci); fields.password = decoded.slice(ci + 1); }
    assignHostPort(fields, hostPort);
  } else {
    // Legacy: whole body is base64(method:password@host:port).
    const decoded = decodeBase64(work);
    const at = decoded.lastIndexOf("@");
    if (at >= 0) {
      const cred = decoded.slice(0, at);
      const ci = cred.indexOf(":");
      if (ci >= 0) { fields.method = cred.slice(0, ci); fields.password = cred.slice(ci + 1); }
      assignHostPort(fields, decoded.slice(at + 1));
    }
  }
  return fields;
}

/**
 * Split a `host:port` (IPv6-aware) onto fields.
 * @param {Record<string, unknown>} fields
 * @param {string} hostPort
 */
function assignHostPort(fields, hostPort) {
  if (!hostPort) return;
  const v6 = /^\[([^\]]+)\]:(\d+)$/.exec(hostPort);
  if (v6) { fields.address = v6[1]; fields.port = Number(v6[2]); return; }
  const idx = hostPort.lastIndexOf(":");
  if (idx >= 0) {
    fields.address = hostPort.slice(0, idx);
    fields.port = Number(hostPort.slice(idx + 1));
  } else {
    fields.address = hostPort;
  }
}

/**
 * vless/trojan/tuic/hysteria2/wireguard share the `userinfo@host:port?query#frag`
 * shape and can be parsed with the WHATWG URL parser.
 * @param {string} scheme
 * @param {string} url  the preprocessed full URL
 * @returns {Record<string, unknown>}
 */
function extractStandard(scheme, url) {
  // The WHATWG parser needs an http-like scheme to expose userinfo/host/port.
  const u = new URL(url.replace(/^[a-z0-9]+:\/\//i, "http://"));
  /** @type {Record<string, unknown>} */
  const fields = {};
  if (u.hostname) fields.address = u.hostname.replace(/^\[|\]$/g, "");
  if (u.port) fields.port = Number(u.port);
  if (u.hash) fields.remark = dec(u.hash.slice(1));

  const user = dec(u.username) ?? "";
  const pass = dec(u.password) ?? "";
  const q = queryToObject(u.searchParams);

  if (scheme === "tuic") {
    // userinfo = uuid:password
    if (user) fields.uuid = user;
    if (pass) fields.password = pass;
  } else if (scheme === "trojan" || scheme === "hysteria2" || scheme === "hy2") {
    // userinfo = password / auth
    if (user) fields.password = user;
  } else if (scheme === "wireguard") {
    if (user) fields.privateKey = user; // stored under extensions later, never on core node
  } else {
    // vless: userinfo = uuid
    if (user) fields.uuid = user;
  }

  // Common query params (raw names preserved for the Priority Chain).
  copyParams(fields, q, [
    "security", "type", "sni", "fp", "fingerprint", "pbk", "sid", "flow",
    "path", "host", "alpn", "encryption", "headertype", "servicename",
    "publickey", "presharedkey",
  ]);
  // Normalize a couple of casing variants to the names normalize.js expects.
  if (q.servicename != null) fields.serviceName = dec(q.servicename);
  if (q.headertype != null) fields.headerType = dec(q.headertype);
  if (q.publickey != null) fields.publicKey = dec(q.publickey);
  if (q.presharedkey != null) fields.presharedKey = dec(q.presharedkey);
  return fields;
}

/**
 * parse() — Stage 07 happy path. Preprocess (Stage 12) then extract.
 * Throws on undecodable input so the ParserFactory routes to recover().
 * @param {string} input
 * @returns {RawExtraction}
 */
export function parseUrl(input) {
  const pre = preprocessUrl(input);
  const protocol = /** @type {Record<string, string>} */ (SCHEME_PROTOCOL)[pre.scheme];
  if (!protocol) {
    throw new Error(`URL extract: unsupported scheme "${pre.scheme}" (PARSE_MISSING_REQUIRED)`);
  }

  const fields =
    pre.scheme === "vmess" ? extractVmess(pre.body)
      : pre.scheme === "ss" ? extractShadowsocks(pre.body)
        : extractStandard(pre.scheme, pre.url);

  return {
    protocol,
    fields,
    warnings: pre.actions.length ? [...pre.actions] : undefined,
    raw: input,
  };
}

export { SCHEME_PROTOCOL };
