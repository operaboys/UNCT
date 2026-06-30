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
      <h1>Developer Console</h1>

      {nodes.length === 0 ? (
        <p class="hint">No nodes yet — parse something on the Converter Screen first.</p>
      ) : (
        <>
          <section aria-label="Parser Logs">
            <h2>Parser Logs</h2>
            <table>
              <thead>
                <tr><th>Node ID</th><th>Parser</th><th>Source Type</th><th>Created At</th></tr>
              </thead>
              <tbody>
                {parserLog.map((entry) => (
                  <tr key={entry.nodeId}>
                    <td>{entry.nodeId}</td>
                    <td>{entry.parser}</td>
                    <td>{entry.sourceType}</td>
                    <td>{entry.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section aria-label="Warnings and Errors">
            <h2>Warnings &amp; Errors</h2>
            {diagnostics.length === 0 ? (
              <p class="hint">No warnings or errors recorded.</p>
            ) : (
              <table>
                <thead>
                  <tr><th>Severity</th><th>Node ID</th><th>Code</th><th>Message</th></tr>
                </thead>
                <tbody>
                  {diagnostics.map((d, i) => (
                    <tr key={i}>
                      <td>{d.severity}</td>
                      <td>{d.nodeId}</td>
                      <td>{d.code}</td>
                      <td>{d.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section aria-label="Recovery Logs">
            <h2>Recovery Logs</h2>
            {recoveryActions.length === 0 ? (
              <p class="hint">No recovery actions were recorded.</p>
            ) : (
              <ul>{recoveryActions.map((a, i) => <li key={i}>{a}</li>)}</ul>
            )}
          </section>

          <section aria-label="Validation Logs">
            <h2>Validation Logs</h2>
            {validationFailures.length === 0 ? (
              <p class="hint">No validation field failures recorded.</p>
            ) : (
              <table>
                <thead>
                  <tr><th>Node ID</th><th>Field</th></tr>
                </thead>
                <tbody>
                  {validationFailures.map((entry, i) => (
                    <tr key={i}><td>{entry.nodeId}</td><td>{entry.field}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section aria-label="Performance Logs">
            <h2>Performance Logs</h2>
            <table>
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
                      <td>{fmtNum(s?.poolSize)}</td>
                      <td>{fmtNum(s?.busyCount)}</td>
                      <td>{fmtNum(s?.pendingCount)}</td>
                      <td>{fmtNum(s?.completedCount)}</td>
                      <td>{fmtNum(s?.cancelledCount)}</td>
                      <td>{fmtNum(s?.failedCount)}</td>
                      <td>{fmtMs(s?.lastJobDurationMs ?? null)}</td>
                      <td>{fmtMs(s?.avgRecentDurationMs ?? null)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {Object.values(pools).every((p) => p === null) && (
              <p class="hint">
                Running in main-thread fallback mode (file:// origin) — Worker pool
                metrics unavailable. Parse something from an HTTP server to see live stats.
              </p>
            )}
          </section>

          <section aria-label="Detection Logs">
            <h2>Detection Logs</h2>
            <table>
              <thead>
                <tr><th>Node ID</th><th>Parser</th><th>Confidence Score</th></tr>
              </thead>
              <tbody>
                {detectionLog.map((entry) => (
                  <tr key={entry.nodeId}>
                    <td>{entry.nodeId}</td>
                    <td>{entry.parser}</td>
                    <td>{formatScore(entry.confidence)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div aria-disabled="true">
              <h3>Alternative Candidates</h3>
              <p class="hint">
                Deferred — `core/parser/factory.js`'s `parseWithFallback` ranks candidate
                parsers transiently while choosing one, but that ranking is never kept past
                parser selection (`core/parser/parse-and-validate.js` only keeps the chosen
                parser's name, extraction, and recovered fields). Shown as a placeholder
                until a module persists it (Rule 9: never fabricate).
              </p>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
