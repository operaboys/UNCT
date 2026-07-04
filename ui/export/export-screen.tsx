/**
 * Export Center Screen (07-UI_UX_SYSTEM §4.6) — the sixth real Phase 9
 * screen. Doc 07 §4.6 lists "TXT, JSON, CSV, YAML, ZIP, QR, HTML Report".
 * This pass covers exactly the formats the just-built Export Engine
 * (core/exporter/, 08-EXPORT_ENGINE) implements — TXT, Xray JSON, Sing-box
 * JSON, Normalized JSON, Analysis JSON, Clash YAML, CSV — by calling those
 * functions directly on the main thread, the same "no new Core logic in UI"
 * pattern `converter-screen.tsx` originally set when it first called
 * `convertBatch` directly (Rule 11's boundary: this file only previews/
 * downloads/copies what Core already produced). Unlike this screen,
 * `converter-screen.tsx` itself no longer calls `convertBatch` directly —
 * its Convert step now routes through `../converter/converter-worker-client.js` (a
 * real Worker by default, ADR-016's Addendum) — but this screen's own
 * formats are out of that fix's scope and still run on the main thread.
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
 *
 * Visual design (final visual design phase, Export Center step): restyled
 * onto the same Liquid Glass system as the other redesigned screens,
 * reusing `.glass-panel`/`.panel-title`/`.btn`/`.select`/`.field`/
 * `.code-textarea`/`.hint`/`.tag` as-is. Two new classes were added to
 * `assets/css/theme.css` for this step: `.qr-grid`/`.qr-card` (a responsive
 * grid of small QR cards — nothing existing fit that shape) and
 * `.embed-frame` (a rounded/bordered frame for the sandboxed HTML Report
 * `<iframe>`, replacing its previous inline `border:"1px solid #ccc"`). No
 * logic/state/handlers changed — same export functions, same sandboxed
 * iframe, same Blob download plumbing.
 */
import { useMemo, useState } from "preact/hooks";
import {
  exportTxt, exportXrayJson, exportSingboxJson, exportNormalizedJson, exportAnalysisJson, exportClashYaml, exportCsv,
  exportZip, exportQr, exportHtmlReport,
} from "../../core/exporter/index.js";
import { createTranslator } from "../../core/i18n/translator.js";
import { useParserState } from "../store/use-parser-state.js";
import { useAnalyzerState } from "../store/use-analyzer-state.js";
import { settingsStore, useSettingsState } from "../store/use-settings-state.js";
import { formatSkipped, type SkippedExportNode } from "./format.js";
import { matrixToSvgPath, qrToSvgMarkup } from "./qr-render.js";

const QR_CELL_SIZE = 4;

type Format = "txt" | "xrayJson" | "singboxJson" | "normalizedJson" | "analysisJson" | "clashYaml" | "csv";

const FORMAT_LABEL_KEYS: Record<Format, string> = {
  txt: "export.format.txt",
  xrayJson: "export.format.xrayJson",
  singboxJson: "export.format.singboxJson",
  normalizedJson: "export.format.normalizedJson",
  analysisJson: "export.format.analysisJson",
  clashYaml: "export.format.clashYaml",
  csv: "export.format.csv",
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
  useSettingsState();
  const t = createTranslator(settingsStore);
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
      <div class="screen-header">
        <h1 class="screen-title">{t("export.title")}</h1>
        <p class="screen-subtitle">
          {t("export.subtitle")}
        </p>
      </div>

      <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label={t("export.section.title")}>
        <div class="panel-title">{t("export.section.title")}</div>
        {nodes.length === 0 ? (
          <p class="hint">{t("common.noNodesYet")}</p>
        ) : (
          <>
            <div class="form-actions" style={{ marginBlockStart: 0 }}>
              <label class="field">
                {t("export.section.formatLabel")}
                <select
                  class="select"
                  value={format}
                  onChange={(e) => handleFormatChange((e.target as HTMLSelectElement).value as Format)}
                >
                  {(Object.keys(FORMAT_LABEL_KEYS) as Format[]).map((f) => (
                    <option key={f} value={f}>{t(FORMAT_LABEL_KEYS[f])}</option>
                  ))}
                </select>
              </label>
              <button type="button" class="btn btn--primary" onClick={handleDownload}>{t("common.actions.download")}</button>
              <button type="button" class="btn btn--ghost" onClick={handleCopy}>{t("common.actions.copyToClipboard")}</button>
              {copyStatus === "copied" && <span class="tag tag--valid" role="status">{t("export.status.copied")}</span>}
              {copyStatus === "error" && <span class="tag tag--invalid" role="alert">{t("export.status.copyFailed")}</span>}
            </div>

            {format === "analysisJson" && Object.keys(analysisByNodeId).length === 0 && (
              <p class="hint" style={{ marginBlockStart: "12px" }}>{t("export.hint.noAnalyzedNodes")}</p>
            )}

            <textarea class="code-textarea" style={{ marginBlockStart: "14px" }} readOnly rows={10} value={content} />
            {skippedMessage && <p class="hint" style={{ marginBlockStart: "10px" }}>{t("common.skippedPrefix")}{skippedMessage}</p>}
          </>
        )}
      </div>

      <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label={t("export.zip.title")}>
        <div class="panel-title">{t("export.zip.title")}</div>
        {nodes.length === 0 ? (
          <p class="hint">{t("common.noNodesYet")}</p>
        ) : (
          <>
            <p class="hint">
              {t("export.zip.hint")}
            </p>
            <div class="form-actions">
              <button type="button" class="btn btn--primary" onClick={handleDownloadZip}>{t("export.zip.download")}</button>
            </div>
            {zipSkippedMessage && <p class="hint" style={{ marginBlockStart: "10px" }}>{t("common.skippedPrefix")}{zipSkippedMessage}</p>}
          </>
        )}
      </div>

      <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label={t("export.qr.title")}>
        <div class="panel-title">{t("export.qr.title")}</div>
        {nodes.length === 0 ? (
          <p class="hint">{t("common.noNodesYet")}</p>
        ) : (
          <>
            <p class="hint">
              {t("export.qr.hint")}
            </p>
            <div class="qr-grid" style={{ marginBlockStart: "14px" }}>
              {qrCodes.map((qr) => (
                <figure class="qr-card glass-panel" key={qr.nodeId}>
                  <svg
                    viewBox={`0 0 ${qr.moduleCount * QR_CELL_SIZE} ${qr.moduleCount * QR_CELL_SIZE}`}
                    width={qr.moduleCount * QR_CELL_SIZE}
                    height={qr.moduleCount * QR_CELL_SIZE}
                  >
                    <rect width="100%" height="100%" fill="#fff" />
                    <path d={matrixToSvgPath(qr.matrix, QR_CELL_SIZE)} fill="#000" />
                  </svg>
                  <figcaption>{qr.protocol}</figcaption>
                  <button type="button" class="btn btn--ghost btn--sm" onClick={() => handleDownloadQr(qr.nodeId, qr.matrix, qr.moduleCount)}>
                    {t("export.qr.downloadSvg")}
                  </button>
                </figure>
              ))}
            </div>
            {qrSkippedMessage && <p class="hint" style={{ marginBlockStart: "10px" }}>{t("common.skippedPrefix")}{qrSkippedMessage}</p>}
          </>
        )}
      </div>

      <div class="panel glass-panel" aria-label={t("export.htmlReport.title")}>
        <div class="panel-title">{t("export.htmlReport.title")}</div>
        {nodes.length === 0 ? (
          <p class="hint">{t("common.noNodesYet")}</p>
        ) : (
          <>
            <p class="hint">
              {t("export.htmlReport.hint")}
            </p>
            <div class="form-actions">
              <button type="button" class="btn btn--primary" onClick={handleDownloadHtmlReport}>{t("export.htmlReport.downloadHtml")}</button>
            </div>
            <iframe
              class="embed-frame"
              style={{ marginBlockStart: "14px" }}
              title={t("export.htmlReport.title")}
              sandbox="allow-same-origin"
              srcdoc={htmlReportContent}
            />
          </>
        )}
      </div>
    </main>
  );
}
