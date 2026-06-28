/**
 * Export Center Screen (07-UI_UX_SYSTEM §4.6) — the sixth real Phase 9
 * screen. Doc 07 §4.6 lists "TXT, JSON, CSV, YAML, ZIP, QR, HTML Report".
 * This pass covers exactly the formats the just-built Export Engine
 * (core/exporter/, 08-EXPORT_ENGINE) implements — TXT, Xray JSON, Sing-box
 * JSON, Normalized JSON, Analysis JSON, Clash YAML, CSV — by calling those
 * functions directly, the same "no new Core logic in UI" pattern
 * `converter-screen.tsx` set calling `convertBatch` directly (Rule 11's
 * boundary: this file only previews/downloads/copies what Core already
 * produced).
 *
 * ZIP Export (doc 08 §7, ADR-017) is now real: `core/exporter/to-zip.js`
 * bundles every format above plus a manifest.json into one archive via
 * `fflate`, called directly here the same "no new Core logic in UI" way as
 * every other format.
 *
 * QR Export (doc 08 §6, ADR-017) is now real too: `core/exporter/to-qr.js`
 * returns only the raw boolean matrix per node via `uqr`'s `encode()` (no
 * DOM/Canvas in core/);
 * `ui/export/qr-render.ts`'s pure `matrixToSvgPath`/`qrToSvgMarkup` turn that
 * into `<svg>` markup here — one QR per node satisfies doc 08 §6's "Multi QR
 * Pages", "Printable Sheets" is the browser's own print dialog (no new
 * dependency needed for either).
 *
 * HTML Report Export (doc 08 §8, §11 Security Layer, ADR-018) is now real
 * too: `core/exporter/to-html.js` builds the already-escaped-and-DOMPurify-
 * sanitized document directly from `useAnalyzerState()`'s same bundle the
 * Analysis JSON format above already reads — no second sanitization pass
 * belongs here (Rule 9: this screen never re-derives or re-judges what Core
 * already produced). The preview below renders that markup in a sandboxed
 * `<iframe>` (`sandbox="allow-same-origin"`, no `allow-scripts`) rather than
 * `dangerouslySetInnerHTML`-equivalent on the page itself, so even a future
 * regression in the Core sanitization can never execute in this document's
 * own context.
 *
 * Clipboard Quick Copy is doc 07 §4.6's own footnote suggestion ("باید کنار
 * بقیه‌ی Export Profiles در دسترس باشد") — trivial with the existing
 * `navigator.clipboard` Web API (no new dependency), so it is included here
 * rather than deferred.
 *
 * Analysis JSON reads `useAnalyzerState()` the same way `extractor-screen.tsx`'s
 * Reality Extractor does, since that bundle (not `node.analysis`) is the real
 * six-module Analyzer verdict (Rule 9: never fabricate a placeholder bundle).
 */
import { useMemo, useState } from "preact/hooks";
import {
  exportTxt, exportXrayJson, exportSingboxJson, exportNormalizedJson, exportAnalysisJson, exportClashYaml, exportCsv,
  exportZip, exportQr, exportHtmlReport,
} from "../../core/exporter/index.js";
import { useParserState } from "../store/use-parser-state.js";
import { useAnalyzerState } from "../store/use-analyzer-state.js";
import { formatSkipped, type SkippedExportNode } from "./format.js";
import { matrixToSvgPath, qrToSvgMarkup } from "./qr-render.js";

const QR_CELL_SIZE = 4;

type Format = "txt" | "xrayJson" | "singboxJson" | "normalizedJson" | "analysisJson" | "clashYaml" | "csv";

const FORMAT_LABELS: Record<Format, string> = {
  txt: "TXT (URLs)",
  xrayJson: "Xray JSON",
  singboxJson: "Sing-box JSON",
  normalizedJson: "Normalized JSON",
  analysisJson: "Analysis JSON",
  clashYaml: "Clash YAML / Clash Meta / Mihomo / Provider File",
  csv: "CSV",
};

const FORMAT_FILE: Record<Format, { extension: string; mimeType: string }> = {
  txt: { extension: "txt", mimeType: "text/plain" },
  xrayJson: { extension: "json", mimeType: "application/json" },
  singboxJson: { extension: "json", mimeType: "application/json" },
  normalizedJson: { extension: "json", mimeType: "application/json" },
  analysisJson: { extension: "json", mimeType: "application/json" },
  clashYaml: { extension: "yaml", mimeType: "application/x-yaml" },
  csv: { extension: "csv", mimeType: "text/csv" },
};

export function ExportScreen() {
  const nodes = useParserState();
  const analysisByNodeId = useAnalyzerState();
  const [format, setFormat] = useState<Format>("txt");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  const { content, skipped }: { content: string; skipped: SkippedExportNode[] } = useMemo(() => {
    switch (format) {
      case "txt": return exportTxt(nodes);
      case "xrayJson": return exportXrayJson(nodes);
      case "singboxJson": return exportSingboxJson(nodes);
      case "clashYaml": return exportClashYaml(nodes);
      case "csv": return { content: exportCsv(nodes), skipped: [] };
      case "normalizedJson": return { content: exportNormalizedJson(nodes), skipped: [] };
      case "analysisJson": return { content: exportAnalysisJson(analysisByNodeId), skipped: [] };
    }
  }, [nodes, format, analysisByNodeId]);

  const skippedMessage = formatSkipped(skipped);

  const { content: zipContent, skipped: zipSkipped } = useMemo(
    () => exportZip(nodes, analysisByNodeId),
    [nodes, analysisByNodeId],
  );
  const zipSkippedMessage = formatSkipped(zipSkipped);

  const { qrCodes, skipped: qrSkipped } = useMemo(() => exportQr(nodes), [nodes]);
  const qrSkippedMessage = formatSkipped(qrSkipped);

  const { content: htmlReportContent } = useMemo(
    () => exportHtmlReport(nodes, analysisByNodeId),
    [nodes, analysisByNodeId],
  );

  function handleFormatChange(next: Format) {
    setFormat(next);
    setCopyStatus("idle");
  }

  function handleDownload() {
    const { extension, mimeType } = FORMAT_FILE[format];
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `export.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }

  function handleDownloadZip() {
    const blob = new Blob([zipContent as BlobPart], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "export.zip";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadQr(nodeId: string, matrix: readonly (readonly boolean[])[], moduleCount: number) {
    const svg = qrToSvgMarkup(matrix, moduleCount, QR_CELL_SIZE);
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${nodeId}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadHtmlReport() {
    const blob = new Blob([htmlReportContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "report.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main class="export-screen">
      <h1>Export Center</h1>

      {nodes.length === 0 ? (
        <p class="hint">No nodes yet — parse something on the Converter Screen first.</p>
      ) : (
        <section aria-label="Export">
          <h2>Export</h2>
          <label>
            Format:{" "}
            <select
              value={format}
              onChange={(e) => handleFormatChange((e.target as HTMLSelectElement).value as Format)}
            >
              {(Object.keys(FORMAT_LABELS) as Format[]).map((f) => (
                <option key={f} value={f}>{FORMAT_LABELS[f]}</option>
              ))}
            </select>
          </label>

          {format === "analysisJson" && Object.keys(analysisByNodeId).length === 0 && (
            <p class="hint">No analyzed nodes yet — visit the Analyzer Screen first.</p>
          )}

          <div class="actions">
            <button type="button" onClick={handleDownload}>Download</button>
            <button type="button" onClick={handleCopy}>Copy to Clipboard</button>
            {copyStatus === "copied" && <span role="status">Copied.</span>}
            {copyStatus === "error" && <span role="alert">Copy failed.</span>}
          </div>

          <h3>Preview</h3>
          <textarea readOnly rows={10} cols={80} value={content} />
          {skippedMessage && <p class="hint">Skipped: {skippedMessage}</p>}
        </section>
      )}

      <section aria-label="ZIP Export">
        <h2>ZIP Export</h2>
        {nodes.length === 0 ? (
          <p class="hint">No nodes yet — parse something on the Converter Screen first.</p>
        ) : (
          <>
            <p class="hint">
              Bundles TXT, Xray JSON, Sing-box JSON, Normalized JSON, Clash YAML, and CSV plus a
              manifest.json (Export Version, Export Date, Node Count, UNM Version) into one
              archive — doc 08 §7's Full Project Snapshot.
            </p>
            <button type="button" onClick={handleDownloadZip}>Download ZIP</button>
            {zipSkippedMessage && <p class="hint">Skipped: {zipSkippedMessage}</p>}
          </>
        )}
      </section>

      <section aria-label="QR Export">
        <h2>QR Export</h2>
        {nodes.length === 0 ? (
          <p class="hint">No nodes yet — parse something on the Converter Screen first.</p>
        ) : (
          <>
            <p class="hint">
              One QR code per node (doc 08 §6's "Single Node · Multi QR Pages") — encodes each
              node's URL form, the same string TXT Export produces. Print this page for a
              printable sheet.
            </p>
            <div class="qr-grid">
              {qrCodes.map((qr) => (
                <figure key={qr.nodeId}>
                  <svg
                    viewBox={`0 0 ${qr.moduleCount * QR_CELL_SIZE} ${qr.moduleCount * QR_CELL_SIZE}`}
                    width={qr.moduleCount * QR_CELL_SIZE}
                    height={qr.moduleCount * QR_CELL_SIZE}
                  >
                    <rect width="100%" height="100%" fill="#fff" />
                    <path d={matrixToSvgPath(qr.matrix, QR_CELL_SIZE)} fill="#000" />
                  </svg>
                  <figcaption>{qr.protocol}</figcaption>
                  <button type="button" onClick={() => handleDownloadQr(qr.nodeId, qr.matrix, qr.moduleCount)}>
                    Download SVG
                  </button>
                </figure>
              ))}
            </div>
            {qrSkippedMessage && <p class="hint">Skipped: {qrSkippedMessage}</p>}
          </>
        )}
      </section>

      <section aria-label="HTML Report Export">
        <h2>HTML Report Export</h2>
        {nodes.length === 0 ? (
          <p class="hint">No nodes yet — parse something on the Converter Screen first.</p>
        ) : (
          <>
            <p class="hint">
              Summary, Analysis, Security Report, Compatibility Report, Warnings, and
              Recommendations per node (doc 08 §8) — escaped per value, then sanitized as a whole
              document via DOMPurify (doc 08 §11, ADR-018) before either preview or download.
            </p>
            <button type="button" onClick={handleDownloadHtmlReport}>Download HTML</button>
            <h3>Preview</h3>
            <iframe
              title="HTML Report Preview"
              sandbox="allow-same-origin"
              srcdoc={htmlReportContent}
              style={{ width: "100%", height: "400px", border: "1px solid #ccc" }}
            />
          </>
        )}
      </section>
    </main>
  );
}
