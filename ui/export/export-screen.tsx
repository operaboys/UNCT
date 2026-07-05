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
 * QR Pagination (2026-07-05): a real ~3000-node import made this panel lag
 * for minutes — `exportQr(nodes)` ran a real Reed-Solomon `encode()` for
 * EVERY node unconditionally, on every render where `nodes` changed, then
 * mounted an `<svg>` per node in one unbounded `.qr-grid`. Unlike
 * Subscription Center's Node List / Developer Console's log tables (a
 * single-column list, a natural fit for row virtualization), `.qr-grid` is
 * a responsive multi-column CSS grid (`auto-fill`) — virtualizing a
 * variable-column-count grid needs either a fixed column count (defeats the
 * responsive design) or real 2-D virtualization math, meaningfully more
 * complex than this needs. Real pagination (`QR_PAGE_SIZE` per page) is a
 * better fit on BOTH axes: (1) it bounds `encode()` itself to only the
 * current page's nodes — virtualizing the DOM alone would still leave every
 * node's QR computed eagerly, which was the actual CPU cost, not just the
 * render cost; (2) doc 08 §6's own "Printable Sheets" concept is already a
 * page of QR codes to print — pagination is the more natural fit for how a
 * user actually consumes QR codes (scanned one at a time with a phone
 * camera) than infinite scroll ever was. The "X skipped" hint below now
 * reports skips for the CURRENT PAGE only (accurate to what was actually
 * computed) rather than a global count across the whole node list.
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
 *
 * P12-13 addition (Custom Exporter API, this checkpoint): the "SIP008 (...
 * Custom Exporter Plugin)" format option calls the real
 * `plugins/sip008-exporter/` plugin through `appPluginRegistry.getExporter`
 * (`core/plugin/app-plugins.js`) — never `core/exporter/` directly — proving
 * the Plugin System's Exporter side actually works end-to-end in the real
 * running app, the same way `core/plugin/parse-with-plugins.js` already
 * proved the Parser side on the Converter Screen. It is included in the
 * regular format list (not a separate "test-only" control) because, unlike
 * `plugins/example-parser/` (a fictional format explicitly excluded from
 * `app-plugins.js`), this is a real, spec-backed exporter with real skip
 * behavior for non-Shadowsocks nodes — legitimate to offer to a real user.
 */
import { useMemo, useState } from "preact/hooks";
import {
  exportTxt, exportXrayJson, exportSingboxJson, exportNormalizedJson, exportAnalysisJson, exportClashYaml, exportCsv,
  exportZip, exportQr, exportHtmlReport,
} from "../../core/exporter/index.js";
import { appPluginRegistry } from "../../core/plugin/app-plugins.js";
import { createTranslator } from "../../core/i18n/translator.js";
import { useParserState } from "../store/use-parser-state.js";
import { useAnalyzerState } from "../store/use-analyzer-state.js";
import { settingsStore, useSettingsState } from "../store/use-settings-state.js";
import { recentExportsStore } from "../store/use-recent-exports-state.js";
import { formatSkipped, type SkippedExportNode } from "./format.js";
import { matrixToSvgPath, qrToSvgMarkup } from "./qr-render.js";

const QR_CELL_SIZE = 4;
const QR_PAGE_SIZE = 24;

// "sip008Plugin" calls the real Custom Exporter plugin (plugins/sip008-
// exporter/) through appPluginRegistry.getExporter — never core/exporter/
// directly (ADR-020) — proving the Plugin System's Exporter side works
// end-to-end in the real running app, the same way the Converter Screen
// already proves the Parser side (core/plugin/parse-with-plugins.js).
type Format = "txt" | "xrayJson" | "singboxJson" | "normalizedJson" | "analysisJson" | "clashYaml" | "csv" | "sip008Plugin";

const FORMAT_LABEL_KEYS: Record<Format, string> = {
  txt: "export.format.txt",
  xrayJson: "export.format.xrayJson",
  singboxJson: "export.format.singboxJson",
  normalizedJson: "export.format.normalizedJson",
  analysisJson: "export.format.analysisJson",
  clashYaml: "export.format.clashYaml",
  csv: "export.format.csv",
  sip008Plugin: "export.format.sip008Plugin",
};

const FORMAT_FILE: Record<Format, { extension: string; mimeType: string }> = {
  txt: { extension: "txt", mimeType: "text/plain" },
  xrayJson: { extension: "json", mimeType: "application/json" },
  singboxJson: { extension: "json", mimeType: "application/json" },
  normalizedJson: { extension: "json", mimeType: "application/json" },
  analysisJson: { extension: "json", mimeType: "application/json" },
  clashYaml: { extension: "yaml", mimeType: "application/x-yaml" },
  csv: { extension: "csv", mimeType: "text/csv" },
  sip008Plugin: { extension: "json", mimeType: "application/json" },
};

export function ExportScreen() {
  const nodes = useParserState();
  const analysisByNodeId = useAnalyzerState();
  useSettingsState();
  const t = createTranslator(settingsStore);
  const [format, setFormat] = useState<Format>("txt");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const [qrPage, setQrPage] = useState(0);

  const { content, skipped }: { content: string; skipped: SkippedExportNode[] } = useMemo(() => {
    switch (format) {
      case "txt": return exportTxt(nodes);
      case "xrayJson": return exportXrayJson(nodes);
      case "singboxJson": return exportSingboxJson(nodes);
      case "clashYaml": return exportClashYaml(nodes);
      case "csv": return { content: exportCsv(nodes), skipped: [] };
      case "normalizedJson": return { content: exportNormalizedJson(nodes), skipped: [] };
      case "analysisJson": return { content: exportAnalysisJson(analysisByNodeId), skipped: [] };
      case "sip008Plugin": return appPluginRegistry.getExporter("sip008-exporter").export(nodes);
    }
  }, [nodes, format, analysisByNodeId]);

  const skippedMessage = formatSkipped(skipped);

  const { content: zipContent, skipped: zipSkipped } = useMemo(
    () => exportZip(nodes, analysisByNodeId),
    [nodes, analysisByNodeId],
  );
  const zipSkippedMessage = formatSkipped(zipSkipped);

  const qrTotalPages = Math.max(1, Math.ceil(nodes.length / QR_PAGE_SIZE));
  const qrPageIndex = Math.min(qrPage, qrTotalPages - 1);
  const qrPageNodes = useMemo(
    () => nodes.slice(qrPageIndex * QR_PAGE_SIZE, (qrPageIndex + 1) * QR_PAGE_SIZE),
    [nodes, qrPageIndex],
  );
  // Only the current page's nodes are ever encoded — see the module header
  // comment for why this bounds the real CPU cost, not just the DOM cost.
  const { qrCodes, skipped: qrSkipped } = useMemo(() => exportQr(qrPageNodes), [qrPageNodes]);
  const qrSkippedMessage = formatSkipped(qrSkipped);

  function handleQrPrevPage() {
    setQrPage((p) => Math.max(0, p - 1));
  }
  function handleQrNextPage() {
    setQrPage((p) => Math.min(qrTotalPages - 1, p + 1));
  }

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
    const exportedCount = nodes.length - skipped.length;
    if (exportedCount > 0) recentExportsStore.addExport(format, exportedCount);
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
    const exportedCount = nodes.length - zipSkipped.length;
    if (exportedCount > 0) recentExportsStore.addExport("zip", exportedCount);
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
    recentExportsStore.addExport("qr", 1);
  }

  function handleDownloadHtmlReport() {
    const blob = new Blob([htmlReportContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "report.html";
    a.click();
    URL.revokeObjectURL(url);
    recentExportsStore.addExport("html", nodes.length);
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
            {qrTotalPages > 1 && (
              <p class="hint" style={{ marginBlockStart: "6px" }}>
                {t("export.qr.pagination.hint")}
              </p>
            )}
            <div class="form-actions" style={{ marginBlockStart: "14px" }}>
              <button type="button" class="btn btn--ghost btn--sm" onClick={handleQrPrevPage} disabled={qrPageIndex === 0}>
                {t("export.qr.pagination.prev")}
              </button>
              <span class="hint">
                {t("export.qr.pagination.pagePrefix")} <bdi>{qrPageIndex + 1}</bdi> {t("export.qr.pagination.of")} <bdi>{qrTotalPages}</bdi>
              </span>
              <button type="button" class="btn btn--ghost btn--sm" onClick={handleQrNextPage} disabled={qrPageIndex >= qrTotalPages - 1}>
                {t("export.qr.pagination.next")}
              </button>
            </div>
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
