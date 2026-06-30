/**
 * Example Parser Plugin — EXAMPLE/TEST-ONLY, not production.
 *
 * Purpose: demonstrate that a brand-new parser plugin can be added and loaded
 * via `createPluginLoader` without touching any file inside `core/parser/`
 * (Extension Rule, doc 12 §6; Plugin Isolation Rule, doc 12 §8.1).
 *
 * Fake format: "UNCT-CSV node list". Each non-comment, non-header line is:
 *
 *   <protocol>,<address>,<port>,<credential>,<remark>
 *
 * Example:
 *   # unct-csv v1
 *   protocol,address,port,credential,remark
 *   vless,example.com,443,some-uuid,my-node
 *   trojan,other.com,8443,secretpass,other-node
 *
 * This format does not exist in the wild — it is purely illustrative. Real
 * plugin parsers would target an actual external format (custom API response,
 * regional subscription encoding, etc.).
 *
 * @typedef {import("../../core/types/parser").BaseParser} BaseParser
 * @typedef {import("../../core/types/parser").RawExtraction} RawExtraction
 * @typedef {import("../../core/types/parser").ParseError} ParseError
 * @typedef {import("../../core/types/unm").UNMNode} UNMNode
 */

import { createNode } from "../../core/unm/create-node.js";
import { validateNode } from "../../core/validator/validate-node.js";

const MAGIC_HEADER = "# unct-csv";
const COLUMN_HEADER = "protocol,address,port,credential,remark";

/**
 * Parse a single non-comment CSV data line into a raw field map.
 * @param {string} line
 * @param {number} lineIndex
 * @returns {{ protocol: string, address: string, port: number, credential: string, remark: string } | null}
 */
function parseLine(line, lineIndex) {
  const parts = line.split(",").map((p) => p.trim());
  if (parts.length < 4) return null;
  const [protocol, address, rawPort, credential, remark = ""] = parts;
  const port = Number(rawPort);
  if (!protocol || !address || !Number.isInteger(port) || port < 1 || port > 65535) return null;
  return { protocol, address, port, credential, remark };
}

/** @type {BaseParser} */
export const exampleCsvParser = {
  /**
   * Confidence: 85 if the magic header is present, otherwise 0.
   * High enough to win detection but below the URL/Subscription parsers for
   * their own inputs (avoids false-positive interference).
   * @param {string} input
   * @returns {number}
   */
  detect(input) {
    return input.trimStart().startsWith(MAGIC_HEADER) ? 85 : 0;
  },

  /**
   * @param {string} input
   * @returns {RawExtraction}
   */
  parse(input) {
    const lines = input.split(/\r?\n/);
    if (!lines[0].trimStart().startsWith(MAGIC_HEADER)) {
      throw new Error("UNCT-CSV: missing magic header (PARSE_CONTRACT_VIOLATION)");
    }
    // Collect data lines (skip header row, blank lines, and comment lines).
    /** @type {Array<{ protocol: string, address: string, port: number, credential: string, remark: string }>} */
    const rows = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed === COLUMN_HEADER) continue;
      const row = parseLine(trimmed, rows.length);
      if (row) rows.push(row);
    }
    return {
      fields: { rows },
      raw: input,
    };
  },

  /**
   * Structural validation: at least one parseable row must be present.
   * @param {RawExtraction} extraction
   * @returns {import("../../core/types/unm").ValidationObject}
   */
  validateStructure(extraction) {
    const rows = /** @type {any[]} */ (extraction.fields.rows ?? []);
    const ok = rows.length > 0;
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

  /**
   * Single-node parsers must implement normalize(); because this plugin sets
   * producesMany=true it throws here per the contract (ANTI_CHAOS Rule 9: no
   * silent data loss when many nodes are produced).
   */
  normalize(_extraction) {
    throw new Error("UNCT-CSV: producesMany parser — call normalizeMany() instead (ANTI_CHAOS Rule 9)");
  },

  /**
   * Expand the extraction into one UNMNode per CSV row.
   * @param {RawExtraction} extraction
   * @returns {Readonly<UNMNode>[]}
   */
  normalizeMany(extraction) {
    const rows = /** @type {Array<{ protocol: string, address: string, port: number, credential: string, remark: string }>} */ (extraction.fields.rows ?? []);
    return rows.map((row) => {
      /** @type {any} */
      const partial = {
        sourceType: "subscription",
        protocol: row.protocol,
        address: row.address,
        port: row.port,
        remark: row.remark || undefined,
        metadata: { parser: "example-csv", confidence: 85 },
      };
      // Attach credential to the right field based on protocol.
      if (row.protocol === "vless" || row.protocol === "vmess") {
        partial.uuid = row.credential;
      } else if (row.protocol === "trojan" || row.protocol === "shadowsocks" || row.protocol === "hysteria2") {
        partial.password = row.credential;
      }
      const node = createNode(partial);
      const { validation } = validateNode(node);
      return createNode({ ...node, validation });
    });
  },

  /**
   * Best-effort recovery: strip the header and try again.
   * @param {string} input
   * @param {ParseError=} _error
   * @returns {RawExtraction | null}
   */
  recover(input, _error) {
    const withFakeHeader = MAGIC_HEADER + "\n" + input;
    try {
      return this.parse(withFakeHeader);
    } catch {
      return null;
    }
  },

  // Multi-node: each CSV file expands into many UNMNodes.
  producesMany: true,
};
