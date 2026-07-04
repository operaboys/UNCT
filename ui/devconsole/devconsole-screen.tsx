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
import { useParserState } from "../store/use-parser-state.js";
import { usePerformanceState } from "../store/use-performance-state.js";
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

  const parserLog = useMemo(() => selectParserLog({ nodes }), [nodes]);
  const diagnostics = useMemo(() => selectDiagnosticsSortedBySeverity({ nodes }), [nodes]);
  const recoveryActions = useMemo(() => selectAggregatedRecoveryActions({ nodes }), [nodes]);
  const validationFailures = useMemo(() => selectValidationFailureLog({ nodes }), [nodes]);
  const detectionLog = useMemo(() => selectDetectionLog({ nodes }), [nodes]);

  return (
    <main class="devconsole-screen">
      <div class="screen-header">
        <h1 class="screen-title">Developer Console</h1>
        <p class="screen-subtitle">
          Raw Parser/Validation/Recovery/Detection logs and live Worker pool performance
          stats for the working Node List.
        </p>
      </div>

      {nodes.length === 0 ? (
        <div class="panel glass-panel" aria-label="Developer Console">
          <p class="hint">No nodes yet — parse something on the Converter Screen first.</p>
        </div>
      ) : (
        <>
          <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label="Parser Logs">
            <div class="panel-title">Parser Logs</div>
            <div class="table-scroll">
              <table class="data-table">
                <thead>
                  <tr><th>Node ID</th><th>Parser</th><th>Source Type</th><th>Created At</th></tr>
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

          <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label="Warnings and Errors">
            <div class="panel-title">Warnings &amp; Errors</div>
            {diagnostics.length === 0 ? (
              <p class="hint">No warnings or errors recorded.</p>
            ) : (
              <div class="table-scroll">
                <table class="data-table">
                  <thead>
                    <tr><th>Severity</th><th>Node ID</th><th>Code</th><th>Message</th></tr>
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

          <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label="Recovery Logs">
            <div class="panel-title">Recovery Logs</div>
            {recoveryActions.length === 0 ? (
              <p class="hint">No recovery actions were recorded.</p>
            ) : (
              <ul class="plain-list">{recoveryActions.map((a, i) => <li key={i}>{a}</li>)}</ul>
            )}
          </div>

          <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label="Validation Logs">
            <div class="panel-title">Validation Logs</div>
            {validationFailures.length === 0 ? (
              <p class="hint">No validation field failures recorded.</p>
            ) : (
              <div class="table-scroll">
                <table class="data-table">
                  <thead>
                    <tr><th>Node ID</th><th>Field</th></tr>
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

          <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label="Performance Logs">
            <div class="panel-title">Performance Logs</div>
            <div class="table-scroll">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Pool</th><th>Size</th><th>Busy</th><th>Queued</th>
                    <th>Completed</th><th>Cancelled</th><th>Failed</th>
                    <th>Last Duration</th><th>Avg (last 10)</th>
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
                Running in main-thread fallback mode (file:// origin) — Worker pool
                metrics unavailable. Parse something from an HTTP server to see live stats.
              </p>
            )}
          </div>

          <div class="panel glass-panel" aria-label="Detection Logs">
            <div class="panel-title">Detection Logs</div>
            <div class="table-scroll">
              <table class="data-table">
                <thead>
                  <tr><th>Node ID</th><th>Parser</th><th>Confidence Score</th></tr>
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
              <div class="panel-title" style={{ fontSize: "13px" }}>Alternative Candidates</div>
              <p class="hint">
                Deferred — `core/parser/factory.js`'s `parseWithFallback` ranks candidate
                parsers transiently while choosing one, but that ranking is never kept past
                parser selection (`core/parser/parse-and-validate.js` only keeps the chosen
                parser's name, extraction, and recovered fields). Shown as a placeholder
                until a module persists it (Rule 9: never fabricate).
              </p>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
