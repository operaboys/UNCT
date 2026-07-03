/**
 * Converter Screen — the first real Phase 9 screen (07-UI_UX_SYSTEM §4.2),
 * built on `ui/store/`'s Preact bridge (ADR-015) over `core/store/`'s
 * Parser State, rather than calling `core/` directly the way `ui/main.tsx`'s
 * smoke proof did.
 *
 * Flow: Input Panel -> Parser Preview -> Normalized Object -> Output Panel
 * (doc 07 §4.2's diagram). Parsing/conversion are NOT duplicated here —
 * `handleParse` calls `ui/store/parser-worker-client.js#parseRawConfig`
 * (real-Worker-by-default, file://-only fallback to the same
 * parse -> normalize -> applyValidation chain the Foundation Gate already
 * drives — see ADR-016) and writes the result into `parserStore`; the
 * Output Panel's conversion step calls
 * `./converter-worker-client.js#convertBatchInWorker` the same way (same
 * pattern, file://-only fallback to `core/converter/conversion.js#convertBatch`
 * on the main thread — see ADR-016's Addendum). Everything this component
 * renders is read back out through `useParserState()` + Selectors
 * (`core/store/selectors.js`) — Rule 11's boundary: this file
 * sorts/displays/aggregates values Core already computed, it never scores
 * or validates anything itself.
 *
 * Deliberately deferred past this first pass (doc 07 §4.2 lists it, it
 * doesn't block the Parser -> Validation -> Converter chain this screen
 * exists to prove): QR output (no QR library has been reviewed under
 * 14-DEPENDENCY_POLICY yet).
 *
 * Visual design (final visual design phase, Converter step): restyled onto
 * the Liquid Glass system (07-UI_UX_SYSTEM §2) using the same reusable
 * classes the Dashboard redesign established — `.glass-panel`,
 * `.protocol-badge`, `.screen-header`/`.btn`/`.code-textarea`/`.kv-list`/
 * `.data-table` (new, added to `assets/css/theme.css` alongside this
 * screen, for every future screen redesign to reuse too). No reference
 * mockup exists for this screen (unlike Dashboard's
 * `docs/design/dashboard-reference.html`) — layout follows the same
 * Input -> Preview -> Normalized -> Output structure this screen already
 * had, just restyled; nothing here is a new data source or computation.
 *
 * The Input Panel's other three methods (File Upload, Drag-Drop Zone,
 * Clipboard Import) all reduce to the same raw-text string Paste Area
 * already produces — `core/importer/` (a pure, sync text-extraction layer,
 * no parsing) pulls that string out of a `File`/`DragEvent`/the clipboard,
 * and `runParse` below feeds it into the exact same `parseRawConfig` call
 * `handleParse` always used, so all four methods share one processing path
 * (ADR-016).
 */
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  selectProtocolCounts,
  selectAggregatedWarnings,
  selectAggregatedErrors,
  selectAggregatedRecoveryActions,
} from "../../core/store/selectors.js";
import { readFileAsText, extractTextFromDropEvent } from "../../core/importer/index.js";
import { parserStore, useParserState } from "../store/use-parser-state.js";
import { parseRawConfig, CancelledError } from "../store/parser-worker-client.js";
import { convertBatchInWorker, type ConvertResult, type ExportFormat } from "./converter-worker-client.js";
import { formatProtocolCounts, formatDiagnosticList, formatSkippedProtocols } from "./format.js";
import { PROTOCOL_ABBREVIATION } from "../components/protocol-labels.js";

const CLIPBOARD_IMPORT_SUPPORTED =
  typeof navigator !== "undefined" && typeof navigator.clipboard?.readText === "function";

const EMPTY_CONVERT_RESULT: ConvertResult = { converted: [], skipped: [] };

const FORMAT_LABELS: Record<ExportFormat, string> = {
  url: "Links (URL)",
  xrayJson: "Xray JSON",
  singboxJson: "Sing-box JSON",
  clashYaml: "Clash YAML",
};

interface LastParse {
  parserName: string;
  recovered: boolean;
}

export function ConverterScreen() {
  const nodes = useParserState();
  const [raw, setRaw] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [lastParse, setLastParse] = useState<LastParse | null>(null);
  const [format, setFormat] = useState<ExportFormat>("url");
  const [isParsing, setIsParsing] = useState(false);
  const [convertResult, setConvertResult] = useState<ConvertResult>(EMPTY_CONVERT_RESULT);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const protocolCounts = useMemo(() => selectProtocolCounts({ nodes }), [nodes]);
  const warnings = useMemo(() => selectAggregatedWarnings({ nodes }), [nodes]);
  const errors = useMemo(() => selectAggregatedErrors({ nodes }), [nodes]);
  const recoveryActions = useMemo(() => selectAggregatedRecoveryActions({ nodes }), [nodes]);

  useEffect(() => {
    let stale = false;
    convertBatchInWorker(nodes, format).then(
      (result) => {
        if (!stale) setConvertResult(result);
      },
      (err) => {
        if (stale || err instanceof CancelledError) return;
        setConvertResult(EMPTY_CONVERT_RESULT);
      },
    );
    return () => {
      stale = true;
    };
  }, [nodes, format]);

  const { converted, skipped } = convertResult;
  const skippedMessage = formatSkippedProtocols(skipped);

  async function runParse(text: string) {
    setIsParsing(true);
    try {
      const result = await parseRawConfig(text);
      parserStore.setNodes(result.nodes);
      setLastParse({ parserName: result.parserName, recovered: result.recovered });
      setParseError(null);
    } catch (err) {
      // A superseded job (this track's own next Parse, or a Clear) resolves
      // itself instead — never surface a stale cancellation as a user error
      // (10-PERFORMANCE_ENGINE §6.1 "Stale Jobs must never update State").
      if (err instanceof CancelledError) return;
      parserStore.clearNodes();
      setLastParse(null);
      setParseError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsParsing(false);
    }
  }

  async function handleParse() {
    await runParse(raw);
  }

  function handleClear() {
    setRaw("");
    setParseError(null);
    setLastParse(null);
    parserStore.clearNodes();
  }

  async function handleFileInputChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ""; // allow re-selecting the same file later
    if (!file) return;
    const text = await readFileAsText(file);
    setRaw(text);
    await runParse(text);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    let text: string;
    try {
      text = await extractTextFromDropEvent(e);
    } catch {
      return; // nothing dropped that this Drop Zone can read — no-op, not an error
    }
    setRaw(text);
    await runParse(text);
  }

  async function handleClipboardImport() {
    if (!CLIPBOARD_IMPORT_SUPPORTED) return;
    try {
      const text = await navigator.clipboard.readText();
      setRaw(text);
      await runParse(text);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <main class="converter-screen">
      <div class="screen-header">
        <h1 class="screen-title">Converter</h1>
        <p class="screen-subtitle">
          Paste a config: a single URL (vless/vmess/trojan/ss/hysteria2/tuic), a multi-line
          subscription, Xray/Sing-box JSON, Clash/Clash.Meta YAML, or a WireGuard config. Or drop
          a file on the box below, upload one, or import from the clipboard.
        </p>
      </div>

      <div class="content-grid">
        <div class="panel glass-panel" aria-label="Input Panel">
          <div class="panel-title">Input</div>
          <div class={`dropzone${isDragOver ? " dropzone--active" : ""}`}>
            <textarea
              class="code-textarea"
              rows={8}
              value={raw}
              onInput={(e) => setRaw((e.target as HTMLTextAreaElement).value)}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              placeholder="vless://... or a multi-line subscription, etc. (drag a file here to load it)"
            />
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn--primary" onClick={handleParse} disabled={raw.trim().length === 0 || isParsing}>
              {isParsing ? "Parsing…" : "Parse"}
            </button>
            <button type="button" class="btn btn--ghost" onClick={handleClear}>Clear</button>
            <button type="button" class="btn btn--ghost" onClick={() => fileInputRef.current?.click()} disabled={isParsing}>
              Upload File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: "none" }}
              onChange={handleFileInputChange}
            />
            <button
              type="button"
              class="btn btn--ghost"
              onClick={handleClipboardImport}
              disabled={!CLIPBOARD_IMPORT_SUPPORTED || isParsing}
              title={
                CLIPBOARD_IMPORT_SUPPORTED
                  ? undefined
                  : "Clipboard import is unavailable in this browser/context (needs HTTPS and the Clipboard API)."
              }
            >
              Import from Clipboard
            </button>
          </div>
          {parseError && <div class="alert alert--error" role="alert">{parseError}</div>}
        </div>

        <div>
          <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label="Parser Preview">
            <div class="panel-title">Parser Preview</div>
            {lastParse ? (
              <dl class="kv-list">
                <div class="kv-row"><dt>Detected Format</dt><dd>{lastParse.parserName}</dd></div>
                <div class="kv-row"><dt>Recovered</dt><dd>{String(lastParse.recovered)}</dd></div>
                <div class="kv-row"><dt>Protocol Count</dt><dd>{formatProtocolCounts(protocolCounts)}</dd></div>
                <div class="kv-row"><dt>Errors</dt><dd>{formatDiagnosticList(errors)}</dd></div>
                <div class="kv-row"><dt>Warnings</dt><dd>{formatDiagnosticList(warnings)}</dd></div>
              </dl>
            ) : (
              <p class="hint">Parse an input above to see its preview.</p>
            )}
          </div>

          <div class="panel glass-panel" aria-label="Recovery Actions">
            <div class="panel-title">Recovery Actions</div>
            {recoveryActions.length === 0 ? (
              <p class="hint">No recovery actions were recorded.</p>
            ) : (
              <>
                <p class="hint">Recovered Fields Count: <bdi>{recoveryActions.length}</bdi></p>
                <ul class="plain-list">
                  {recoveryActions.map((action, i) => <li key={i}>{action}</li>)}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>

      <div class="panel glass-panel" style={{ marginBlockStart: "20px" }} aria-label="Normalized Object">
        <div class="panel-title">Normalized Object</div>
        {nodes.length === 0 ? (
          <p class="hint">No nodes yet.</p>
        ) : (
          <div class="table-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Protocol</th><th>Address</th><th>Port</th>
                  <th>Network</th><th>Security</th><th>Valid</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map((n) => (
                  <tr key={n.nodeId}>
                    <td><span class={`protocol-badge protocol-badge--${n.protocol}`}>{PROTOCOL_ABBREVIATION[n.protocol]}</span></td>
                    <td class="mono">{n.address}</td>
                    <td class="mono"><bdi>{n.port}</bdi></td>
                    <td>{n.network}</td>
                    <td>{n.security}</td>
                    <td>
                      {n.validation.overallValid ? (
                        <span class="tag tag--valid">Valid</span>
                      ) : (
                        <span class="tag tag--invalid">Invalid</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div class="panel glass-panel" style={{ marginBlockStart: "20px" }} aria-label="Output Panel">
        <div class="panel-title">
          Output
          <select
            class="select"
            value={format}
            onChange={(e) => setFormat((e.target as HTMLSelectElement).value as ExportFormat)}
          >
            {(Object.keys(FORMAT_LABELS) as ExportFormat[]).map((f) => (
              <option key={f} value={f}>{FORMAT_LABELS[f]}</option>
            ))}
          </select>
        </div>
        <p class="hint">QR output is deferred — no QR library has been reviewed under 14-DEPENDENCY_POLICY yet.</p>
        {nodes.length === 0 ? (
          <p class="hint">Nothing to export yet.</p>
        ) : (
          <>
            <textarea class="code-textarea" readOnly rows={10} value={converted.map((c) => c.output).join("\n")} />
            {skippedMessage && <p class="hint" style={{ marginBlockStart: "10px" }}>{skippedMessage}</p>}
          </>
        )}
      </div>
    </main>
  );
}
