/**
 * PDF Export — Export Engine (08-EXPORT_ENGINE §12, P12-3, ADR-023).
 * Zero-dependency minimal PDF 1.4 generator. Uses Helvetica (a PDF standard
 * built-in font), ASCII content streams (non-ASCII → '?'), absolute text
 * positioning with Td + T* operators, and a single-pass xref table. Returns
 * `{ content: Uint8Array }`.
 *
 * The same six-section layout as `to-html.js`: Summary / Analysis / Security
 * Report / Compatibility Report / Warnings / Recommendations.
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 * @typedef {import("../analyzer/analyze-node.js").AnalysisBundle} AnalysisBundle
 */

import { UNM_SCHEMA_VERSION } from "../unm/registry/schema-registry.js";

// ── Page geometry ─────────────────────────────────────────────────────────────

const PAGE_W = 595;     // A4 width in points
const PAGE_H = 842;     // A4 height in points
const MARGIN_X = 50;    // left margin
const FIRST_Y = 792;    // y of first text line  (PAGE_H - 50 top margin)
const BOTTOM_Y = 50;    // y of last allowed line (50 pt bottom margin)
const FONT_SIZE = 9;
const LEADING = 13;     // line height in points
const MAX_LINE = 100;   // max characters per line before wrapping
const LINES_PER_PAGE = Math.floor((FIRST_Y - BOTTOM_Y) / LEADING); // 57

// ── Text sanitization ─────────────────────────────────────────────────────────

/**
 * Ensure a string is safe for a PDF literal string operand `(…)`:
 * 1. Non-printable / non-ASCII → '?'  (keeps the byte length = char count)
 * 2. Backslash, '(', ')' are escaped as required by PDF §7.3.4.2
 * @param {unknown} v
 * @returns {string}
 */
function sanitize(v) {
  return String(v ?? "")
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

/**
 * Wrap a long line at `MAX_LINE` characters.
 * @param {string} line
 * @returns {string[]}
 */
function wrapLine(line) {
  if (line.length <= MAX_LINE) return [line];
  const out = [];
  for (let i = 0; i < line.length; i += MAX_LINE) out.push(line.slice(i, i + MAX_LINE));
  return out;
}

// ── Content generation ────────────────────────────────────────────────────────

/**
 * @param {UNMNode} node
 * @param {AnalysisBundle | undefined} bundle
 * @returns {string[]}
 */
function nodeLines(node, bundle) {
  const title = node.remark
    ? `${node.protocol} - ${node.remark}`
    : `${node.protocol} - ${node.address}:${node.port}`;

  const lines = /** @type {string[]} */ ([]);
  const push = (/** @type {string} */ l) => wrapLine(l).forEach((wl) => lines.push(wl));

  push("=".repeat(70));
  push(title);
  push("=".repeat(70));
  push("");
  push("Summary:");
  push(`  Protocol:   ${node.protocol}`);
  push(`  Address:    ${node.address}`);
  push(`  Port:       ${node.port}`);
  push(`  Network:    ${node.network}`);
  push(`  Security:   ${node.security}`);
  push(`  Validation: ${node.validation.overallValid}`);
  push(`  Remark:     ${node.remark ?? "-"}`);
  push("");
  push("Analysis:");
  if (bundle) {
    push(`  Completeness: ${bundle.completeness.completenessScore}/100`);
    push(`  Security:     ${bundle.security.securityScore}/100`);
    push(`  Recognized:   ${bundle.protocol.recognized}`);
  } else {
    push("  Not analyzed yet.");
  }
  push("");
  push("Security Report:");
  if (bundle) {
    if (bundle.security.issues.length === 0) {
      push("  None.");
    } else {
      bundle.security.issues.forEach((issue) => push(`  - ${issue}`));
    }
  } else {
    push("  Not analyzed yet.");
  }
  push("");
  push("Compatibility Report:");
  if (bundle) {
    const netComp = bundle.network.compatible ? "Compatible" : "Incompatible";
    push(`  Network: ${netComp} (${bundle.network.supportedNetworks.join(", ")})`);
    if (bundle.reality.applicable) {
      const rComp = bundle.reality.compatible ? "Compatible" : "Incompatible";
      push(`  Reality: ${rComp}`);
      bundle.reality.issues.forEach((issue) => push(`  - ${issue}`));
    }
  } else {
    push("  Not analyzed yet.");
  }
  push("");
  push("Warnings:");
  if (node.metadata.warnings.length === 0) {
    push("  None.");
  } else {
    node.metadata.warnings.forEach((w) => push(`  - ${w}`));
  }
  push("");
  push("Recommendations:");
  if (node.metadata.recoveryActions.length === 0) {
    push("  None.");
  } else {
    node.metadata.recoveryActions.forEach((r) => push(`  - ${r}`));
  }
  push("");
  push("");

  return lines;
}

/**
 * Collect all text lines for the document (header + all nodes).
 * @param {readonly UNMNode[]} nodes
 * @param {Readonly<Record<string, AnalysisBundle>>} analysisByNodeId
 * @returns {string[]}
 */
function allLines(nodes, analysisByNodeId) {
  /** @type {string[]} */
  const lines = [];
  const push = (/** @type {string} */ l) => wrapLine(l).forEach((wl) => lines.push(wl));

  push("UNCT Export Report");
  push(`Export Date: ${new Date().toISOString()}`);
  push(`Node Count: ${nodes.length}  UNM Version: ${UNM_SCHEMA_VERSION}`);
  push("");

  for (const node of nodes) {
    nodeLines(node, analysisByNodeId[node.nodeId]).forEach((l) => lines.push(l));
  }

  return lines;
}

// ── PDF binary builder ────────────────────────────────────────────────────────

const ENC = new TextEncoder();

/** @param {string} s @returns {Uint8Array} */
const enc = (s) => ENC.encode(s);

/**
 * Build a PDF content stream string for one page.
 * Uses:  BT … /F1 Tf … Td  T*  Tj … ET
 * @param {string[]} lines
 * @returns {string}
 */
function buildStream(lines) {
  if (lines.length === 0) return "BT ET\n";
  let s = `BT\n/F1 ${FONT_SIZE} Tf\n${LEADING} TL\n${MARGIN_X} ${FIRST_Y} Td\n`;
  s += `(${sanitize(lines[0])}) Tj\n`;
  for (let i = 1; i < lines.length; i++) {
    s += `T*\n(${sanitize(lines[i])}) Tj\n`;
  }
  s += "ET\n";
  return s;
}

/**
 * Build a complete PDF 1.4 document from a flat array of text lines.
 * @param {string[]} lines
 * @returns {Uint8Array}
 */
function buildPdf(lines) {
  // Paginate
  /** @type {string[][]} */
  const pages = [];
  for (let i = 0; i < lines.length; i += LINES_PER_PAGE) {
    pages.push(lines.slice(i, i + LINES_PER_PAGE));
  }
  if (pages.length === 0) pages.push([]);

  // Object layout:
  //   1 = Catalog, 2 = Pages, 3 = Font
  //   Then for each page: contentId = 4 + 2*i, pageId = 5 + 2*i
  const catalogId = 1;
  const pagesId = 2;
  const fontId = 3;
  const pageCount = pages.length;

  /** @type {Map<number, string>} */
  const objs = new Map();

  objs.set(
    fontId,
    `${fontId} 0 obj\n` +
      `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n` +
      `endobj\n`,
  );

  /** @type {number[]} */
  const pageIds = [];
  for (let i = 0; i < pageCount; i++) {
    const contentId = 4 + 2 * i;
    const pageId = 5 + 2 * i;
    pageIds.push(pageId);

    const stream = buildStream(pages[i]);
    objs.set(
      contentId,
      `${contentId} 0 obj\n` +
        `<< /Length ${stream.length} >>\n` +
        `stream\n${stream}endstream\n` +
        `endobj\n`,
    );
    objs.set(
      pageId,
      `${pageId} 0 obj\n` +
        `<< /Type /Page /Parent ${pagesId} 0 R ` +
        `/MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Contents ${contentId} 0 R ` +
        `/Resources << /Font << /F1 ${fontId} 0 R >> >> >>\n` +
        `endobj\n`,
    );
  }

  objs.set(
    pagesId,
    `${pagesId} 0 obj\n` +
      `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] ` +
      `/Count ${pageCount} >>\n` +
      `endobj\n`,
  );
  objs.set(
    catalogId,
    `${catalogId} 0 obj\n` +
      `<< /Type /Catalog /Pages ${pagesId} 0 R >>\n` +
      `endobj\n`,
  );

  // Emit objects in id order and track byte offsets
  const header = "%PDF-1.4\n";
  const totalObjs = objs.size + 1; // +1 for object 0 (free head)

  const parts = [header];
  let offset = header.length;
  const offsets = new Array(totalObjs).fill(0);

  for (let id = 1; id < totalObjs; id++) {
    const s = objs.get(id) ?? "";
    offsets[id] = offset;
    parts.push(s);
    offset += s.length;
  }

  // xref table — each entry is exactly 20 bytes: OOOOOOOOOO GGGGG T\r\n
  const xrefOffset = offset;
  let xref = `xref\n0 ${totalObjs}\n`;
  xref += `0000000000 65535 f\r\n`;
  for (let id = 1; id < totalObjs; id++) {
    xref += `${String(offsets[id]).padStart(10, "0")} 00000 n\r\n`;
  }

  const trailer = `trailer\n<< /Size ${totalObjs} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  parts.push(xref, trailer);

  // Concatenate as bytes
  const chunks = parts.map(enc);
  const total = chunks.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const chunk of chunks) {
    out.set(chunk, pos);
    pos += chunk.length;
  }
  return out;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * @param {readonly UNMNode[]} nodes
 * @param {Readonly<Record<string, AnalysisBundle>>} [analysisByNodeId]
 * @returns {{ content: Uint8Array }}
 */
export function exportPdf(nodes, analysisByNodeId = {}) {
  const lines = allLines(nodes, analysisByNodeId);
  return { content: buildPdf(lines) };
}
