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
 * This screen's Output Panel is a quick, stage-by-stage PREVIEW of the
 * current in-memory result, not a full export tool — it never had QR and
 * never will, by design, not because of any unreviewed dependency. Full,
 * paginated QR output (`uqr`, ADR-017-EXPORT-DEPENDENCIES) is Export
 * Center's exclusive responsibility.
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
 *
 * Virtualization (2026-07-05): the Normalized Object table rendered its full
 * node array with a plain `.map()` inside an unbounded `.table-scroll` at
 * real-world scale (~3000 nodes) — the same pattern already fixed in
 * Developer Console/Export Center, missed here in that pass. Now uses the
 * shared `VirtualTable` (`ui/components/virtual-table.tsx`).
 */
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  selectProtocolCounts,
  selectAggregatedWarnings,
  selectAggregatedErrors,
  selectAggregatedRecoveryActions,
} from "../../core/store/selectors.js";
import { createTranslator } from "../../core/i18n/translator.js";
import { readFileAsText, extractTextFromDropEvent } from "../../core/importer/index.js";
import { parserStore, useParserState } from "../store/use-parser-state.js";
import { settingsStore, useSettingsState } from "../store/use-settings-state.js";
import { parseRawConfig, CancelledError } from "../store/parser-worker-client.js";
import { convertBatchInWorker, type ConvertResult, type ExportFormat } from "./converter-worker-client.js";
import { formatProtocolCounts, formatDiagnosticList, formatSkippedProtocols } from "./format.js";
import { PROTOCOL_ABBREVIATION } from "../components/protocol-labels.js";
import { VirtualTable } from "../components/virtual-table.js";

const CLIPBOARD_IMPORT_SUPPORTED =
  typeof navigator !== "undefined" && typeof navigator.clipboard?.readText === "function";

const EMPTY_CONVERT_RESULT: ConvertResult = { converted: [], skipped: [] };

const FORMAT_LABEL_KEYS: Record<ExportFormat, string> = {
  url: "converter.format.url",
  xrayJson: "converter.format.xrayJson",
  singboxJson: "converter.format.singboxJson",
  clashYaml: "converter.format.clashYaml",
};

interface LastParse {
  parserName: string;
  recovered: boolean;
}

export function ConverterScreen() {
  const nodes = useParserState();
  useSettingsState();
  const t = createTranslator(settingsStore);
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
        <h1 class="screen-title">{t("converter.title")}</h1>
        <p class="screen-subtitle">
          {t("converter.subtitle")}
        </p>
      </div>

      <div class="content-grid">
        <div class="panel glass-panel" aria-label={t("converter.input.ariaLabel")}>
          <div class="panel-title">{t("converter.input.title")}</div>
          <div class={`dropzone${isDragOver ? " dropzone--active" : ""}`}>
            <textarea
              class="code-textarea"
              rows={8}
              value={raw}
              onInput={(e) => setRaw((e.target as HTMLTextAreaElement).value)}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              placeholder={t("converter.input.textareaPlaceholder")}
            />
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn--primary" onClick={handleParse} disabled={raw.trim().length === 0 || isParsing}>
              {isParsing ? t("converter.actions.parsing") : t("converter.actions.parse")}
            </button>
            <button type="button" class="btn btn--ghost" onClick={handleClear}>{t("converter.actions.clear")}</button>
            <button type="button" class="btn btn--ghost" onClick={() => fileInputRef.current?.click()} disabled={isParsing}>
              {t("converter.actions.uploadFile")}
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
                  : t("converter.actions.clipboardUnsupportedTitle")
              }
            >
              {t("converter.actions.importFromClipboard")}
            </button>
          </div>
          {parseError && <div class="alert alert--error" role="alert">{parseError}</div>}
        </div>

        <div>
          <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label={t("converter.parserPreview.ariaLabel")}>
            <div class="panel-title">{t("converter.parserPreview.title")}</div>
            {lastParse ? (
              <dl class="kv-list">
                <div class="kv-row"><dt>{t("converter.parserPreview.detectedFormat")}</dt><dd>{lastParse.parserName}</dd></div>
                <div class="kv-row"><dt>{t("converter.parserPreview.recovered")}</dt><dd>{String(lastParse.recovered)}</dd></div>
                <div class="kv-row"><dt>{t("converter.parserPreview.protocolCount")}</dt><dd>{formatProtocolCounts(protocolCounts)}</dd></div>
                <div class="kv-row"><dt>{t("converter.parserPreview.errors")}</dt><dd>{formatDiagnosticList(errors)}</dd></div>
                <div class="kv-row"><dt>{t("converter.parserPreview.warnings")}</dt><dd>{formatDiagnosticList(warnings)}</dd></div>
              </dl>
            ) : (
              <p class="hint">{t("converter.parserPreview.hint")}</p>
            )}
          </div>

          <div class="panel glass-panel" aria-label={t("converter.recoveryActions.ariaLabel")}>
            <div class="panel-title">{t("converter.recoveryActions.title")}</div>
            {recoveryActions.length === 0 ? (
              <p class="hint">{t("converter.recoveryActions.hint")}</p>
            ) : (
              <>
                <p class="hint">{t("converter.recoveryActions.countPrefix")}<bdi>{recoveryActions.length}</bdi></p>
                <ul class="plain-list">
                  {recoveryActions.map((action, i) => <li key={i}>{action}</li>)}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>

      <div class="panel glass-panel" style={{ marginBlockStart: "20px" }} aria-label={t("converter.normalizedObject.ariaLabel")}>
        <div class="panel-title">{t("converter.normalizedObject.title")}</div>
        {nodes.length === 0 ? (
          <p class="hint">{t("common.noNodesYetShort")}</p>
        ) : (
          <VirtualTable
            items={nodes}
            columnCount={6}
            header={(
              <tr>
                <th>{t("common.fields.protocol")}</th><th>{t("common.fields.address")}</th><th>{t("common.fields.port")}</th>
                <th>{t("common.fields.network")}</th><th>{t("common.fields.security")}</th><th>{t("common.fields.valid")}</th>
              </tr>
            )}
            renderRow={(n) => (
              <>
                <td><span class={`protocol-badge protocol-badge--${n.protocol}`}>{PROTOCOL_ABBREVIATION[n.protocol]}</span></td>
                <td class="mono">{n.address}</td>
                <td class="mono"><bdi>{n.port}</bdi></td>
                <td>{n.network}</td>
                <td>{n.security}</td>
                <td>
                  {n.validation.overallValid ? (
                    <span class="tag tag--valid">{t("common.fields.valid")}</span>
                  ) : (
                    <span class="tag tag--invalid">{t("common.fields.invalid")}</span>
                  )}
                </td>
              </>
            )}
          />
        )}
      </div>

      <div class="panel glass-panel" style={{ marginBlockStart: "20px" }} aria-label={t("converter.outputPanel.ariaLabel")}>
        <div class="panel-title">
          {t("converter.outputPanel.title")}
          <select
            class="select"
            value={format}
            onChange={(e) => setFormat((e.target as HTMLSelectElement).value as ExportFormat)}
          >
            {(Object.keys(FORMAT_LABEL_KEYS) as ExportFormat[]).map((f) => (
              <option key={f} value={f}>{t(FORMAT_LABEL_KEYS[f])}</option>
            ))}
          </select>
        </div>
        <p class="hint">{t("converter.outputPanel.previewHint")}</p>
        {nodes.length === 0 ? (
          <p class="hint">{t("converter.outputPanel.nothingToExport")}</p>
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
