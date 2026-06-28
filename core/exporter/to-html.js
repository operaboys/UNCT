/**
 * HTML Report Export — Export Engine (08-EXPORT_ENGINE §8, §9, §10, §11).
 * Doc 08 §8 fixes the report's six sections — "Summary, Analysis, Security
 * Report, Compatibility Report, Warnings, Recommendations" — and this module
 * fills every one from data the system has *already* computed, never a new
 * judgment (Rule 9): Summary reads the node's own fields (the same ones
 * `to-csv.js` reads); Analysis reads `completeness.completenessScore` +
 * `security.securityScore` + `protocol.recognized`; Security Report reads
 * `security.issues` (already a de-duplicated rollup of TLS+Reality issues —
 * `core/analyzer/core/security-analyzer.js`); Compatibility Report reads
 * `network.compatible`/`supportedNetworks` and, when applicable,
 * `reality.compatible`/`issues` — deliberately kept separate from Security
 * per the Reality Analyzer's own doc comment (a node can be Secure but not
 * Compatible, or vice versa, ADR-011); Warnings reads `metadata.warnings`;
 * Recommendations reads `metadata.recoveryActions` (the Parser's own
 * recorded corrective actions, not a new advice engine). Doc 08 §1's
 * Round-Trip requirement explicitly excludes this format ("یک‌طرفه مثل HTML
 * Report یا QR Code"), so — like `to-csv.js` — there is no per-node
 * serializer dependency and therefore no `skipped` list.
 *
 * Security (doc 08 §11, MANDATORY) is two layers, not one: (1) every value
 * is run through the hand-written `escapeHtml()` below before being
 * string-concatenated in — this is "Escape Before Render" and is what
 * actually preserves a user's literal text with zero data loss (Rule 9);
 * DOMPurify's own tag-stripping, tested directly against this project's data
 * before writing this file, silently *deletes* text that merely looks like
 * an unknown tag (e.g. a remark containing "<chars>" loses that substring
 * entirely, not just its brackets) — unacceptable per-field, so DOMPurify is
 * never run on a lone value. (2) the fully-assembled document is then passed
 * once through `DOMPurify.sanitize(..., { WHOLE_DOCUMENT: true })` — "Sanitize
 * Before Export" — as defense-in-depth against anything `escapeHtml()` could
 * have missed (e.g. a future contributor concatenating a raw field by
 * mistake). `ADD_TAGS`/`ADD_ATTR` are required because DOMPurify otherwise
 * drops `<meta charset>`/`<style>` even under `WHOLE_DOCUMENT: true`; the
 * `<!DOCTYPE html>` preamble (always static, never user-controlled) is
 * prepended after sanitization since DOMPurify strips that too.
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 * @typedef {import("../analyzer/analyze-node.js").AnalysisBundle} AnalysisBundle
 */
import DOMPurify from "dompurify";
import { UNM_SCHEMA_VERSION } from "../unm/registry/schema-registry.js";

/** Version of this report's own shape (doc 08 §10 Export Metadata). */
export const EXPORT_REPORT_VERSION = "1.0";

/** @type {Record<string, string>} */
const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** @param {unknown} value @returns {string} */
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/** @param {readonly string[]} items @returns {string} */
function renderList(items) {
  if (items.length === 0) return '<p class="empty">None.</p>';
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

/** @param {[string, string][]} rows @returns {string} */
function renderTable(rows) {
  return `<table>${rows.map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join("")}</table>`;
}

/** @param {UNMNode} node @returns {string} */
function renderSummary(node) {
  return renderTable([
    ["Protocol", node.protocol],
    ["Address", node.address],
    ["Port", String(node.port)],
    ["Network", node.network],
    ["Security", node.security],
    ["Validation", node.validation.overallValid ? "Valid" : "Invalid"],
    ["Remark", node.remark ?? "—"],
  ]);
}

/** @param {AnalysisBundle | undefined} bundle @returns {string} */
function renderAnalysis(bundle) {
  if (!bundle) return '<p class="empty">Not analyzed yet.</p>';
  return renderTable([
    ["Completeness Score", `${bundle.completeness.completenessScore}/100`],
    ["Security Score", `${bundle.security.securityScore}/100`],
    ["Protocol Recognized", bundle.protocol.recognized ? "Yes" : "No"],
  ]);
}

/** @param {AnalysisBundle | undefined} bundle @returns {string} */
function renderSecurityReport(bundle) {
  if (!bundle) return '<p class="empty">Not analyzed yet.</p>';
  return renderList(bundle.security.issues);
}

/** @param {AnalysisBundle | undefined} bundle @returns {string} */
function renderCompatibilityReport(bundle) {
  if (!bundle) return '<p class="empty">Not analyzed yet.</p>';
  const parts = [
    `<p><strong>Network:</strong> ${bundle.network.compatible ? "Compatible" : "Incompatible"} ` +
      `(supports: ${escapeHtml(bundle.network.supportedNetworks.join(", "))})</p>`,
  ];
  if (bundle.reality.applicable) {
    parts.push(`<p><strong>Reality:</strong> ${bundle.reality.compatible ? "Compatible" : "Incompatible"}</p>`);
    parts.push(renderList(bundle.reality.issues));
  }
  return parts.join("");
}

/** @param {UNMNode} node @returns {string} */
function renderWarnings(node) {
  return renderList(node.metadata.warnings);
}

/** @param {UNMNode} node @returns {string} */
function renderRecommendations(node) {
  return renderList(node.metadata.recoveryActions);
}

/**
 * @param {UNMNode} node
 * @param {Readonly<Record<string, AnalysisBundle>>} analysisByNodeId
 * @returns {string}
 */
function renderNodeReport(node, analysisByNodeId) {
  const bundle = analysisByNodeId[node.nodeId];
  const title = node.remark ? `${node.protocol} — ${node.remark}` : `${node.protocol} — ${node.address}:${node.port}`;
  return `
<article class="node-report">
  <h2>${escapeHtml(title)}</h2>
  <h3>Summary</h3>${renderSummary(node)}
  <h3>Analysis</h3>${renderAnalysis(bundle)}
  <h3>Security Report</h3>${renderSecurityReport(bundle)}
  <h3>Compatibility Report</h3>${renderCompatibilityReport(bundle)}
  <h3>Warnings</h3>${renderWarnings(node)}
  <h3>Recommendations</h3>${renderRecommendations(node)}
</article>`;
}

/**
 * Average `security.securityScore` across analyzed nodes — `null` (never
 * fabricated as 0) when nothing has been analyzed yet, the same Rule-9
 * pattern `core/store/selectors.js#selectAverageSecurityScore` already uses.
 * @param {Readonly<Record<string, AnalysisBundle>>} analysisByNodeId
 * @returns {number | null}
 */
function averageSecurityScore(analysisByNodeId) {
  const scores = Object.values(analysisByNodeId).map((bundle) => bundle.security.securityScore);
  if (scores.length === 0) return null;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

const REPORT_STYLE =
  "body{font-family:sans-serif;margin:2rem;color:#222}" +
  "h1{margin-bottom:0}" +
  "table{border-collapse:collapse;margin:0.5rem 0}" +
  "th,td{border:1px solid #ccc;padding:4px 8px;text-align:left}" +
  ".node-report{border-top:2px solid #888;padding-top:1rem;margin-top:1rem}" +
  ".empty{color:#777;font-style:italic}";

/**
 * @param {readonly UNMNode[]} nodes
 * @param {Readonly<Record<string, AnalysisBundle>>} [analysisByNodeId]
 * @returns {{ content: string }}
 */
export function exportHtmlReport(nodes, analysisByNodeId = {}) {
  const avgScore = averageSecurityScore(analysisByNodeId);
  const body = `
<h1>UNCT Export Report</h1>
<p>Export Date: ${escapeHtml(new Date().toISOString())} &middot; Node Count: ${nodes.length} &middot; ` +
    `UNM Version: ${escapeHtml(UNM_SCHEMA_VERSION)} &middot; Report Version: ${EXPORT_REPORT_VERSION}</p>
<p>Average Security Score: ${avgScore === null ? "Not analyzed yet." : `${avgScore.toFixed(1)}/100`}</p>
${nodes.map((node) => renderNodeReport(node, analysisByNodeId)).join("\n")}`;

  const page =
    `<html><head><meta charset="utf-8"><title>UNCT Export Report</title>` +
    `<style>${REPORT_STYLE}</style></head><body>${body}</body></html>`;

  const sanitized = DOMPurify.sanitize(page, {
    WHOLE_DOCUMENT: true,
    ADD_TAGS: ["meta", "style"],
    ADD_ATTR: ["charset"],
  });

  return { content: `<!DOCTYPE html>${sanitized}` };
}
