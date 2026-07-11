/**
 * SIP008 Parser Plugin — a REAL Custom Parser (Phase 11 Blocked-item
 * resolution, ULTIMATE_BLUEPRINT_INDEX.md P12-13's exact condition: "at
 * least two real Custom Parsers").
 *
 * SIP008 ("Shadowsocks JSON configuration for online config delivery") is
 * the official Shadowsocks-org specification for sharing a LIST of servers
 * as one JSON document — https://shadowsocks.org/guide/sip008.html. It is
 * genuinely distinct from every format `core/parser/` already owns:
 *   - Not Xray/Sing-box JSON: no `outbounds`/`dns` envelope, a bare
 *     `{version, servers[]}` shape instead.
 *   - Not the existing Subscription parser's formats (plain newline URL
 *     list, or a Base64 blob that decodes to one): SIP008 is structured
 *     JSON, never URL strings.
 *   - Not SIP002 (the `ss://` URI already handled by the URL parser): SIP008
 *     is the JSON-array sibling spec, for delivering many servers at once.
 *
 * Real-world source: e.g. Outline Manager's "dynamic access key" JSON and
 * several Shadowsocks-panel projects serve exactly this shape at their
 * subscription endpoint.
 *
 * @typedef {import("../../core/types/parser").BaseParser} BaseParser
 * @typedef {import("../../core/types/parser").RawExtraction} RawExtraction
 * @typedef {import("../../core/types/parser").ParseError} ParseError
 * @typedef {import("../../core/types/unm").UNMNode} UNMNode
 */

import { createNode } from "../../core/unm/create-node.js";

/** @typedef {{ id?: string, remarks?: string, server: string, server_port: number, password: string, method: string, plugin?: string, plugin_opts?: string }} Sip008Server */

/**
 * @param {unknown} value
 * @returns {value is Sip008Server}
 */
function isValidServerEntry(value) {
  if (!value || typeof value !== "object") return false;
  const s = /** @type {Record<string, unknown>} */ (value);
  return (
    typeof s.server === "string" && s.server.length > 0 &&
    typeof s.server_port === "number" && Number.isInteger(s.server_port) &&
    s.server_port >= 1 && s.server_port <= 65535 &&
    typeof s.password === "string" && s.password.length > 0 &&
    typeof s.method === "string" && s.method.length > 0
  );
}

/**
 * @param {string} input
 * @returns {{ version: unknown, servers: unknown[] } | null}
 */
function tryParseSip008(input) {
  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const obj = /** @type {Record<string, unknown>} */ (parsed);
  if (!Array.isArray(obj.servers)) return null;
  // The defining structural difference from Xray/Sing-box JSON (which use
  // `outbounds`) and from Clash-family YAML (which uses `proxies`) --
  // SIP008's top-level array key is specifically `servers`.
  if ("outbounds" in obj || "proxies" in obj) return null;
  return { version: obj.version, servers: obj.servers };
}

/** @type {BaseParser} */
export const sip008Parser = {
  /**
   * @param {string} input
   * @returns {number}
   */
  detect(input) {
    const trimmed = input.trim();
    if (!trimmed.startsWith("{")) return 0;
    const doc = tryParseSip008(trimmed);
    if (!doc) return 0;
    // Require version to be present (spec-mandated field) and at least one
    // structurally valid server -- otherwise this is some other, unrelated
    // JSON object that merely happens to have a `servers` array.
    if (typeof doc.version !== "number") return 0;
    if (!doc.servers.some(isValidServerEntry)) return 0;
    return 90;
  },

  /**
   * @param {string} input
   * @returns {RawExtraction}
   */
  parse(input) {
    const doc = tryParseSip008(input.trim());
    if (!doc) {
      throw new Error("SIP008: not a valid {version, servers[]} document (PARSE_CONTRACT_VIOLATION)");
    }
    const servers = doc.servers.filter(isValidServerEntry);
    if (servers.length === 0) {
      throw new Error("SIP008: no structurally valid server entries (PARSE_CONTRACT_VIOLATION)");
    }
    return { fields: { servers }, raw: input };
  },

  /**
   * @param {RawExtraction} extraction
   * @returns {import("../../core/types/unm").ValidationObject}
   */
  validateStructure(extraction) {
    const servers = /** @type {Sip008Server[]} */ (extraction.fields.servers ?? []);
    const ok = servers.length > 0 && servers.every(isValidServerEntry);
    return {
      addressValid: ok,
      portValid: ok,
      uuidValid: null,
      realityValid: null,
      tlsValid: null,
      alpnValid: null,
      pathValid: null,
      hostValid: null,
      overallValid: ok,
    };
  },

  /** Multi-node parser (ADR-008) -- see normalizeMany(). */
  normalize(_extraction) {
    throw new Error("SIP008: producesMany parser — call normalizeMany() instead (ANTI_CHAOS Rule 9)");
  },

  /**
   * One UNMNode per server entry — `sourceType: "subscription"` (the same
   * value the built-in Subscription parser and the example CSV plugin use
   * for "a config blob that yields a node list", the closest honest fit in
   * the frozen `SourceType` union; SIP008 has no dedicated slot of its own,
   * and adding one would touch the Architecture Freeze zone, which a plugin
   * must never do).
   * @param {RawExtraction} extraction
   * @returns {Readonly<UNMNode>[]}
   */
  normalizeMany(extraction) {
    const servers = /** @type {Sip008Server[]} */ (extraction.fields.servers ?? []);
    return servers.map((s) => createNode(/** @type {any} */ ({
      sourceType: "subscription",
      protocol: "shadowsocks",
      address: s.server,
      port: s.server_port,
      password: s.password,
      method: s.method,
      remark: s.remarks || undefined,
      metadata: { parser: "sip008-plugin", confidence: 90 },
    })));
  },

  /**
   * Best-effort recovery: some real-world SIP008 responses are wrapped in a
   * JSONP-style callback (`callback({...})`) by misconfigured servers --
   * strip a single wrapping function call and retry.
   * @param {string} input
   * @param {ParseError=} _error
   * @returns {RawExtraction | null}
   */
  recover(input, _error) {
    const m = input.trim().match(/^[\w.$]+\((.*)\)\s*;?\s*$/s);
    if (!m) return null;
    try {
      return this.parse(m[1]);
    } catch {
      return null;
    }
  },

  producesMany: true,
};
