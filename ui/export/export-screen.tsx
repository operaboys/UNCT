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
 * ZIP, QR, and HTML Report (doc 08 §6-8) each need a new dependency
 * (14-DEPENDENCY_POLICY) or, for HTML Report, the DOMPurify sanitization
 * ADR-004 mandates — none of that exists in core/exporter/ yet, so they are
 * shown as disabled placeholders, the same treatment `extractor-screen.tsx`
 * gives Worker/DNS Extractor.
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
} from "../../core/exporter/index.js";
import { useParserState } from "../store/use-parser-state.js";
import { useAnalyzerState } from "../store/use-analyzer-state.js";
import { formatSkipped, type SkippedExportNode } from "./format.js";

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

      <section aria-label="ZIP Export" aria-disabled="true">
        <h2>ZIP Export</h2>
        <p class="hint">
          Deferred — doc 08 §7's manifest.json-bearing ZIP bundle needs a new dependency
          (14-DEPENDENCY_POLICY), not yet reviewed; shown as a placeholder until core/exporter/
          implements it.
        </p>
      </section>

      <section aria-label="QR Export" aria-disabled="true">
        <h2>QR Export</h2>
        <p class="hint">
          Deferred — doc 08 §6's QR code generation needs a new dependency
          (14-DEPENDENCY_POLICY), not yet reviewed; shown as a placeholder until core/exporter/
          implements it.
        </p>
      </section>

      <section aria-label="HTML Report Export" aria-disabled="true">
        <h2>HTML Report Export</h2>
        <p class="hint">
          Deferred — doc 08 §11 mandates DOMPurify sanitization (ADR-004) before any HTML Report
          can render user content; shown as a placeholder until core/exporter/ implements it.
        </p>
      </section>
    </main>
  );
}
