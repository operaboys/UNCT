/**
 * Hysteria2 Native Client Config Parser Plugin — the second REAL Custom
 * Parser (see `plugins/sip008-parser/index.js`'s header for the shared
 * context/condition this pair resolves).
 *
 * Hysteria2's official client accepts a JSON (or YAML) config file with a
 * `server`/`auth`/`tls`/`bandwidth` shape — documented at
 * https://v2.hysteria.network/docs/getting-started/Client/. This is
 * genuinely distinct from every hysteria2 input `core/parser/` already
 * understands: the URL parser only recognizes the `hy2://`/`hysteria2://`
 * URI scheme (a single connection string), never this multi-field native
 * config file server operators commonly hand out as a ready-to-use client
 * config (this plugin supports the JSON variant only; YAML would collide
 * with Clash's own `.yaml` detection surface and needs its own design pass
 * — out of scope here, same as ADR-022's own scoped-down DNS extraction).
 *
 * `SourceType` note (an honest architectural finding, not an oversight):
 * unlike WireGuard's `.conf` (which got its own `"wireguard-config"` value,
 * ADR-007), the frozen `SourceType` union has no dedicated "native config
 * file" slot for hysteria2 — only `"hysteria2-url"` (the `hy2://` URI
 * specifically). Adding one would touch `core/types/unm.d.ts`'s Architecture
 * Freeze zone, which a plugin must never do (Plugin Isolation, doc 12
 * §8.1). `"subscription"` is reused instead: grep confirms nothing in
 * `core/`/`ui/` branches on `sourceType === "subscription"` the way
 * `core/analyzer/extended/dns-analyzer.js` branches on
 * `"wireguard-config"`, so this reuse is safe (not just convenient) and
 * strictly more honest than mislabeling it `"hysteria2-url"` for a file
 * that never had a URI. If a future Custom Parser genuinely needs its own
 * native-config `SourceType`, that is exactly the kind of gap a real public
 * Plugin API would need to resolve first — see this checkpoint's report.
 *
 * @typedef {import("../../core/types/parser").BaseParser} BaseParser
 * @typedef {import("../../core/types/parser").RawExtraction} RawExtraction
 * @typedef {import("../../core/types/parser").ParseError} ParseError
 * @typedef {import("../../core/types/unm").UNMNode} UNMNode
 */

import { createNode } from "../../core/unm/create-node.js";

/**
 * @param {string} value "host:port"
 * @returns {{ host: string, port: number } | null}
 */
function splitHostPort(value) {
  const idx = value.lastIndexOf(":");
  if (idx <= 0 || idx === value.length - 1) return null;
  const host = value.slice(0, idx);
  const port = Number(value.slice(idx + 1));
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) return null;
  return { host, port };
}

/**
 * @param {unknown} doc
 * @returns {{ server: string, auth?: string, sni?: string } | null}
 */
function readHysteria2Config(doc) {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return null;
  const obj = /** @type {Record<string, unknown>} */ (doc);
  // Structural exclusions -- these keys belong to formats this plugin must
  // defer to, not compete with (Highest-Confidence-Wins still applies
  // within the plugin fallback tier, but a hard exclusion avoids ever
  // mis-detecting a differently-shaped JSON document).
  if ("outbounds" in obj || "servers" in obj || "proxies" in obj) return null;
  if (typeof obj.server !== "string" || obj.server.length === 0) return null;
  const tls = obj.tls && typeof obj.tls === "object" ? /** @type {Record<string, unknown>} */ (obj.tls) : undefined;
  return {
    server: obj.server,
    auth: typeof obj.auth === "string" ? obj.auth : undefined,
    sni: tls && typeof tls.sni === "string" ? tls.sni : undefined,
  };
}

/** @type {BaseParser} */
export const hysteria2ConfigParser = {
  /**
   * @param {string} input
   * @returns {number}
   */
  detect(input) {
    const trimmed = input.trim();
    if (!trimmed.startsWith("{")) return 0;
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return 0;
    }
    const cfg = readHysteria2Config(parsed);
    if (!cfg) return 0;
    if (!splitHostPort(cfg.server)) return 0;
    // `auth` is present in effectively every real deployment (Hysteria2
    // requires a shared secret) -- require it to avoid matching an
    // unrelated `{server: "..."}` JSON object from some other tool.
    return cfg.auth ? 90 : 0;
  },

  /**
   * @param {string} input
   * @returns {RawExtraction}
   */
  parse(input) {
    const parsed = JSON.parse(input.trim());
    const cfg = readHysteria2Config(parsed);
    if (!cfg) {
      throw new Error("Hysteria2 config: missing/invalid \"server\" field (PARSE_CONTRACT_VIOLATION)");
    }
    const hostPort = splitHostPort(cfg.server);
    if (!hostPort) {
      throw new Error(`Hysteria2 config: "server" is not "host:port" (got "${cfg.server}") (PARSE_CONTRACT_VIOLATION)`);
    }
    return { fields: { ...hostPort, auth: cfg.auth, sni: cfg.sni }, raw: input };
  },

  /**
   * @param {RawExtraction} extraction
   * @returns {import("../../core/types/unm").ValidationObject}
   */
  validateStructure(extraction) {
    const { host, port } = /** @type {{ host?: string, port?: number }} */ (extraction.fields);
    const addressValid = typeof host === "string" && host.length > 0;
    const portValid = typeof port === "number" && port >= 1 && port <= 65535;
    const overallValid = addressValid && portValid;
    return {
      addressValid,
      portValid,
      uuidValid: null,
      realityValid: null,
      tlsValid: null,
      alpnValid: null,
      pathValid: null,
      hostValid: null,
      overallValid,
    };
  },

  /**
   * Single-node parser. `sourceType`/`network`/`security` reasoning is in
   * this file's header comment.
   * @param {RawExtraction} extraction
   * @returns {Readonly<UNMNode>}
   */
  normalize(extraction) {
    const { host, port, auth, sni } = /** @type {{ host: string, port: number, auth?: string, sni?: string }} */ (extraction.fields);
    return createNode(/** @type {any} */ ({
      sourceType: "subscription",
      protocol: "hysteria2",
      address: host,
      port,
      password: auth,
      sni,
      metadata: { parser: "hysteria2-config-plugin", confidence: 90 },
    }));
  },

  /**
   * Best-effort recovery: a stray trailing comma (a common hand-edited-JSON
   * mistake) before a closing brace/bracket.
   * @param {string} input
   * @param {ParseError=} _error
   * @returns {RawExtraction | null}
   */
  recover(input, _error) {
    const stripped = input.replace(/,(\s*[}\]])/g, "$1");
    if (stripped === input) return null;
    try {
      return this.parse(stripped);
    } catch {
      return null;
    }
  },
};
