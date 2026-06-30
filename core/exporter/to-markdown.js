/**
 * Markdown Export — Export Engine (08-EXPORT_ENGINE §12, P12-3, ADR-023).
 * Same six-section structure as `to-html.js` (Summary / Analysis / Security
 * Report / Compatibility Report / Warnings / Recommendations) rendered as
 * CommonMark Markdown — no library required. Returns `{ content: string }`.
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 * @typedef {import("../analyzer/analyze-node.js").AnalysisBundle} AnalysisBundle
 */

import { UNM_SCHEMA_VERSION } from "../unm/registry/schema-registry.js";

/** Escape pipe characters so they don't break Markdown table cells. */
function escapeCell(/** @type {unknown} */ value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

/** @param {[string, string][]} rows */
function mdTable(rows) {
  const header = "| Field | Value |";
  const sep = "|-------|-------|";
  const body = rows.map(([k, v]) => `| ${k} | ${escapeCell(v)} |`).join("\n");
  return `${header}\n${sep}\n${body}`;
}

/** @param {readonly string[]} items */
function mdList(items) {
  if (items.length === 0) return "_None._";
  return items.map((item) => `- ${item}`).join("\n");
}

/**
 * @param {UNMNode} node
 * @param {AnalysisBundle | undefined} bundle
 * @returns {string}
 */
function renderNodeMd(node, bundle) {
  const title = node.remark
    ? `${node.protocol} — ${node.remark}`
    : `${node.protocol} — ${node.address}:${node.port}`;

  const parts = [`## ${title}`, ""];

  // Summary
  parts.push("### Summary", "");
  parts.push(
    mdTable([
      ["Protocol", node.protocol],
      ["Address", node.address],
      ["Port", String(node.port)],
      ["Network", node.network],
      ["Security", node.security],
      ["Validation", String(node.validation.overallValid)],
      ["Remark", node.remark ?? "—"],
    ]),
    "",
  );

  // Analysis
  parts.push("### Analysis", "");
  if (bundle) {
    parts.push(
      mdTable([
        ["Completeness Score", `${bundle.completeness.completenessScore}/100`],
        ["Security Score", `${bundle.security.securityScore}/100`],
        ["Protocol Recognized", bundle.protocol.recognized ? "Yes" : "No"],
      ]),
      "",
    );
  } else {
    parts.push("_Not analyzed yet._", "");
  }

  // Security Report
  parts.push("### Security Report", "");
  parts.push(bundle ? mdList(bundle.security.issues) : "_Not analyzed yet._", "");

  // Compatibility Report
  parts.push("### Compatibility Report", "");
  if (bundle) {
    const netComp = bundle.network.compatible ? "Compatible" : "Incompatible";
    parts.push(`**Network:** ${netComp} (supports: ${bundle.network.supportedNetworks.join(", ")})`);
    if (bundle.reality.applicable) {
      const rComp = bundle.reality.compatible ? "Compatible" : "Incompatible";
      parts.push(`**Reality:** ${rComp}`);
      parts.push(mdList(bundle.reality.issues));
    }
    parts.push("");
  } else {
    parts.push("_Not analyzed yet._", "");
  }

  // Warnings
  parts.push("### Warnings", "");
  parts.push(mdList(node.metadata.warnings), "");

  // Recommendations
  parts.push("### Recommendations", "");
  parts.push(mdList(node.metadata.recoveryActions), "");

  return parts.join("\n");
}

/**
 * @param {readonly UNMNode[]} nodes
 * @param {Readonly<Record<string, AnalysisBundle>>} [analysisByNodeId]
 * @returns {{ content: string }}
 */
export function exportMarkdown(nodes, analysisByNodeId = {}) {
  const header = [
    "# UNCT Export Report",
    "",
    `Export Date: ${new Date().toISOString()}  `,
    `Node Count: ${nodes.length}  `,
    `UNM Version: ${UNM_SCHEMA_VERSION}  `,
    "",
  ].join("\n");

  if (nodes.length === 0) return { content: header };

  const body = nodes
    .map((node) => renderNodeMd(node, analysisByNodeId[node.nodeId]))
    .join("\n---\n\n");

  return { content: header + body };
}
