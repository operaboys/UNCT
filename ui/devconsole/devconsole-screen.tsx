/**
 * Developer Console (07-UI_UX_SYSTEM §4.7) — the eighth and last Main Screen
 * from doc 07's list. Doc 07 §4.7 names seven sections: Parser Logs,
 * Warnings, Errors, Recovery Logs, Validation Logs, Performance Logs,
 * Detection Logs / Detection Metadata Viewer.
 *
 * Five of the seven are built entirely on values Core already computed —
 * Recovery Logs on the pre-existing `selectAggregatedRecoveryActions`
 * (already used by the Converter Screen), Warnings/Errors merged into one
 * severity-sorted view on `selectDiagnosticsSortedBySeverity` (recovers each
 * line's real registered severity via `getErrorDef` and ranks with
 * `compareSeverity`, `core/errors/`, Orphan Check item #4), and the other
 * two on thin projection selectors (`selectParserLog`, `selectDetectionLog`,
 * `selectValidationFailureLog`, `core/store/selectors.js`) that only read
 * fields the Parser/Validation Engine already wrote onto every node.
 *
 * One sub-part has no real data source anywhere in the app today:
 * - Alternative Candidates (the other half of "Detection Logs / Detection
 *   Metadata Viewer", doc 04 Stage 02): `core/parser/factory.js`'s
 *   `parseWithFallback` ranks candidate parsers transiently while choosing
 *   one, but `core/parser/parse-and-validate.js` never keeps that ranking
 *   past parser selection — only Confidence Score survives onto the node
 *   (`metadata.confidence`). Per Rule 9, this half is not fabricated.
 *
 * Performance Logs is now fully wired via `usePerformanceState()` (Phase 12
 * P12-2 — ADR-021, `core/worker/worker-manager.js` getStats()).
 *
 * Visual design (final visual design phase, Developer Console step — the
 * eighth and last screen of this phase): restyled onto the same Liquid
 * Glass system as the other redesigned screens, reusing .glass-panel/
 * .panel-title/.data-table/.table-scroll/.plain-list/.hint/.mono as-is. The
 * only new CSS this step adds is three severity tag modifiers (.tag--info/
 * .tag--warning/.tag--critical, assets/css/theme.css) for the real
 * `ErrorSeverity` values Warnings & Errors already reads — "error" reuses
 * the existing `.tag--invalid` rather than a redundant duplicate. No logic/
 * state/handlers changed — same selectors, same Performance Logs pool
 * stats, same Alternative Candidates placeholder.
 */
import { useMemo } from "preact/hooks";
import {
  selectAggregatedRecoveryActions,
  selectParserLog,
  selectDetectionLog,
  selectValidationFailureLog,
  selectDiagnosticsSortedBySeverity,
} from "../../core/store/selectors.js";
import { createTranslator } from "../../core/i18n/translator.js";
import { useParserState } from "../store/use-parser-state.js";
import { usePerformanceState } from "../store/use-performance-state.js";
import { settingsStore, useSettingsState } from "../store/use-settings-state.js";
import { formatScore } from "../analyzer/format.js";

function fmtMs(ms: number | null): string {
  return ms === null ? "N/A" : `${ms.toFixed(1)} ms`;
}
function fmtNum(n: number | null | undefined): string {
  return n == null ? "N/A" : String(n);
}

const SEVERITY_TAG_CLASS: Record<string, string> = {
  info: "tag--info",
  warning: "tag--warning",
  error: "tag--invalid",
  critical: "tag--critical",
};

export function DevConsoleScreen() {
  const nodes = useParserState();
  const pools = usePerformanceState();
  useSettingsState();
  const t = createTranslator(settingsStore);

  const parserLog = useMemo(() => selectParserLog({ nodes }), [nodes]);
  const diagnostics = useMemo(() => selectDiagnosticsSortedBySeverity({ nodes }), [nodes]);
  const recoveryActions = useMemo(() => selectAggregatedRecoveryActions({ nodes }), [nodes]);
  const validationFailures = useMemo(() => selectValidationFailureLog({ nodes }), [nodes]);
  const detectionLog = useMemo(() => selectDetectionLog({ nodes }), [nodes]);

  return (
    <main class="devconsole-screen">
      <div class="screen-header">
        <h1 class="screen-title">{t("devconsole.title")}</h1>
        <p class="screen-subtitle">
          {t("devconsole.subtitle")}
        </p>
      </div>

      {nodes.length === 0 ? (
        <div class="panel glass-panel" aria-label={t("devconsole.title")}>
          <p class="hint">{t("common.noNodesYet")}</p>
        </div>
      ) : (
        <>
          <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label={t("devconsole.parserLogs.title")}>
            <div class="panel-title">{t("devconsole.parserLogs.title")}</div>
            <div class="table-scroll">
              <table class="data-table">
                <thead>
                  <tr><th>{t("common.fields.nodeId")}</th><th>{t("common.fields.parser")}</th><th>{t("common.fields.sourceType")}</th><th>{t("common.fields.createdAt")}</th></tr>
                </thead>
                <tbody>
                  {parserLog.map((entry) => (
                    <tr key={entry.nodeId}>
                      <td class="mono">{entry.nodeId}</td>
                      <td>{entry.parser}</td>
                      <td>{entry.sourceType}</td>
                      <td class="mono"><bdi>{entry.createdAt}</bdi></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label={t("devconsole.diagnostics.title")}>
            <div class="panel-title">{t("devconsole.diagnostics.title")}</div>
            {diagnostics.length === 0 ? (
              <p class="hint">{t("devconsole.diagnostics.empty")}</p>
            ) : (
              <div class="table-scroll">
                <table class="data-table">
                  <thead>
                    <tr><th>{t("devconsole.diagnostics.severityColumn")}</th><th>{t("common.fields.nodeId")}</th><th>{t("devconsole.diagnostics.codeColumn")}</th><th>{t("devconsole.diagnostics.messageColumn")}</th></tr>
                  </thead>
                  <tbody>
                    {diagnostics.map((d, i) => (
                      <tr key={i}>
                        <td><span class={`tag ${SEVERITY_TAG_CLASS[d.severity] ?? "tag--info"}`}>{d.severity}</span></td>
                        <td class="mono">{d.nodeId}</td>
                        <td class="mono">{d.code}</td>
                        <td>{d.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label={t("devconsole.recoveryLogs.title")}>
            <div class="panel-title">{t("devconsole.recoveryLogs.title")}</div>
            {recoveryActions.length === 0 ? (
              <p class="hint">{t("devconsole.recoveryLogs.hint")}</p>
            ) : (
              <ul class="plain-list">{recoveryActions.map((a, i) => <li key={i}>{a}</li>)}</ul>
            )}
          </div>

          <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label={t("devconsole.validationLogs.title")}>
            <div class="panel-title">{t("devconsole.validationLogs.title")}</div>
            {validationFailures.length === 0 ? (
              <p class="hint">{t("devconsole.validationLogs.hint")}</p>
            ) : (
              <div class="table-scroll">
                <table class="data-table">
                  <thead>
                    <tr><th>{t("common.fields.nodeId")}</th><th>{t("devconsole.validationLogs.fieldColumn")}</th></tr>
                  </thead>
                  <tbody>
                    {validationFailures.map((entry, i) => (
                      <tr key={i}><td class="mono">{entry.nodeId}</td><td>{entry.field}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label={t("devconsole.performanceLogs.title")}>
            <div class="panel-title">{t("devconsole.performanceLogs.title")}</div>
            <div class="table-scroll">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>{t("devconsole.performanceLogs.poolColumn")}</th><th>{t("devconsole.performanceLogs.sizeColumn")}</th><th>{t("devconsole.performanceLogs.busyColumn")}</th><th>{t("devconsole.performanceLogs.queuedColumn")}</th>
                    <th>{t("devconsole.performanceLogs.completedColumn")}</th><th>{t("devconsole.performanceLogs.cancelledColumn")}</th><th>{t("devconsole.performanceLogs.failedColumn")}</th>
                    <th>{t("devconsole.performanceLogs.lastDurationColumn")}</th><th>{t("devconsole.performanceLogs.avgRecentColumn")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(["parser", "analyzer", "converter"] as const).map((name) => {
                    const s = pools[name];
                    return (
                      <tr key={name}>
                        <td>{name}</td>
                        <td class="mono">{fmtNum(s?.poolSize)}</td>
                        <td class="mono">{fmtNum(s?.busyCount)}</td>
                        <td class="mono">{fmtNum(s?.pendingCount)}</td>
                        <td class="mono">{fmtNum(s?.completedCount)}</td>
                        <td class="mono">{fmtNum(s?.cancelledCount)}</td>
                        <td class="mono">{fmtNum(s?.failedCount)}</td>
                        <td class="mono">{fmtMs(s?.lastJobDurationMs ?? null)}</td>
                        <td class="mono">{fmtMs(s?.avgRecentDurationMs ?? null)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {Object.values(pools).every((p) => p === null) && (
              <p class="hint" style={{ marginBlockStart: "10px" }}>
                {t("devconsole.performanceLogs.fallbackHint")}
              </p>
            )}
          </div>

          <div class="panel glass-panel" aria-label={t("devconsole.detectionLogs.title")}>
            <div class="panel-title">{t("devconsole.detectionLogs.title")}</div>
            <div class="table-scroll">
              <table class="data-table">
                <thead>
                  <tr><th>{t("common.fields.nodeId")}</th><th>{t("common.fields.parser")}</th><th>{t("common.fields.confidenceScore")}</th></tr>
                </thead>
                <tbody>
                  {detectionLog.map((entry) => (
                    <tr key={entry.nodeId}>
                      <td class="mono">{entry.nodeId}</td>
                      <td>{entry.parser}</td>
                      <td>{formatScore(entry.confidence)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div aria-disabled="true" style={{ marginBlockStart: "16px" }}>
              <div class="panel-title" style={{ fontSize: "13px" }}>{t("devconsole.detectionLogs.alternativeCandidates.title")}</div>
              <p class="hint">
                {t("devconsole.detectionLogs.alternativeCandidates.hint")}
              </p>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
