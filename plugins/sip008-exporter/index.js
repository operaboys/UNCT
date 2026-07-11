/**
 * SIP008 Exporter Plugin — the first REAL Custom Exporter (Phase 11 Blocked-
 * item resolution, ULTIMATE_BLUEPRINT_INDEX.md P12-13's remaining condition:
 * "at least ... one real Custom Exporter").
 *
 * Exports the exact inverse of `plugins/sip008-parser/index.js`: instead of
 * turning a SIP008 `{version, servers[]}` document into `UNMNode[]`, this
 * turns `UNMNode[]` back into that same official Shadowsocks-org JSON
 * document (https://shadowsocks.org/guide/sip008.html) — the standard shape
 * several real Shadowsocks server-management panels and clients already
 * serve/consume for "online configuration delivery" (the same real-world use
 * case documented in the parser's own header). Choosing the SAME spec for
 * both directions (rather than inventing a third, unrelated export format)
 * keeps the choice defensible on the same grounds already used for the two
 * real Custom Parsers: an official, verifiable spec — not a guessed,
 * reverse-engineered client dialect (Shadowrocket/Quantumult X/Surge all use
 * proprietary, undocumented line syntaxes; SIP008 is the one shadowsocks.org
 * itself publishes).
 *
 * Only `protocol: "shadowsocks"` nodes can honestly be represented in a
 * SIP008 document (the spec has no fields for VLESS/VMess/Reality/etc.) —
 * every other node is skipped with a reason, the same "Export Anything,
 * Lose Nothing" transparency doc 08 §1 requires of every core exporter.
 *
 * Round-trip: `sip008Parser.normalizeMany(sip008Parser.parse(sip008Exporter.export(nodes).content))`
 * reproduces the same shadowsocks nodes (proven in
 * `tests/plugin/sip008-exporter.test.js`) — the same round-trip guarantee
 * `core/exporter/subscription-builder.js` already established for
 * Subscription Parser/Builder.
 *
 * @typedef {import("../../core/types/unm").UNMNode} UNMNode
 * @typedef {import("../../core/plugin/exporter-contract").ExporterPlugin} ExporterPlugin
 */

/**
 * @param {UNMNode} node
 * @returns {string | null} a skip reason, or null if the node can be represented
 */
function skipReasonFor(node) {
  if (node.protocol !== "shadowsocks") {
    return `SIP008 only represents the Shadowsocks protocol (node protocol: "${node.protocol}") (PLUGIN_EXPORT_SKIP)`;
  }
  if (!node.method) {
    return `Shadowsocks node is missing "method", required by SIP008 (PLUGIN_EXPORT_SKIP)`;
  }
  if (!node.password) {
    return `Shadowsocks node is missing "password", required by SIP008 (PLUGIN_EXPORT_SKIP)`;
  }
  return null;
}

/** @type {ExporterPlugin} */
export const sip008Exporter = {
  label: "SIP008 (Shadowsocks JSON)",
  mimeType: "application/json",
  extension: "json",

  /**
   * @param {readonly UNMNode[]} nodes
   * @returns {{ content: string, skipped: { nodeId: string, reason: string }[] }}
   */
  export(nodes) {
    /** @type {{ nodeId: string, reason: string }[]} */
    const skipped = [];
    const servers = [];
    let nextId = 1;

    for (const node of nodes) {
      const reason = skipReasonFor(node);
      if (reason) {
        skipped.push({ nodeId: node.nodeId, reason });
        continue;
      }
      servers.push({
        id: String(nextId++),
        remarks: node.remark ?? "",
        server: node.address,
        server_port: node.port,
        password: node.password,
        method: node.method,
      });
    }

    const doc = { version: 1, servers };
    return { content: JSON.stringify(doc, null, 2), skipped };
  },
};
