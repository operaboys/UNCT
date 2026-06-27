/**
 * Developer Console (07-UI_UX_SYSTEM §4.7) — the eighth and last Main Screen
 * from doc 07's list. Doc 07 §4.7 names seven sections: Parser Logs,
 * Warnings, Errors, Recovery Logs, Validation Logs, Performance Logs,
 * Detection Logs / Detection Metadata Viewer.
 *
 * Five of the seven are built entirely on values Core already computed —
 * three of them on the pre-existing aggregate selectors
 * (`selectAggregatedWarnings`/`Errors`/`RecoveryActions`, already used by the
 * Converter Screen) with zero new Core logic, the other two on three new
 * thin projection selectors (`selectParserLog`, `selectDetectionLog`,
 * `selectValidationFailureLog`, `core/store/selectors.js`) that only read
 * fields the Parser/Validation Engine already wrote onto every node.
 *
 * Two sub-parts have no real data source anywhere in the app today, and are
 * shown as disabled placeholders — the same pattern as the Analyzer
 * Screen's "Cloudflare Analysis" section:
 * - Performance Logs: no module records Worker Job Timing anywhere in
 *   `core/worker/` (no timing/duration field on any job result).
 * - Alternative Candidates (the other half of "Detection Logs / Detection
 *   Metadata Viewer", doc 04 Stage 02): `core/parser/factory.js`'s
 *   `parseWithFallback` ranks candidate parsers transiently while choosing
 *   one, but `core/parser/parse-and-validate.js` never keeps that ranking
 *   past parser selection — only Confidence Score survives onto the node
 *   (`metadata.confidence`). Per Rule 9, this half is not fabricated.
 */
import { useMemo } from "preact/hooks";
import {
  selectAggregatedWarnings,
  selectAggregatedErrors,
  selectAggregatedRecoveryActions,
  selectParserLog,
  selectDetectionLog,
  selectValidationFailureLog,
} from "../../core/store/selectors.js";
import { useParserState } from "../store/use-parser-state.js";
import { formatScore } from "../analyzer/format.js";

export function DevConsoleScreen() {
  const nodes = useParserState();

  const parserLog = useMemo(() => selectParserLog({ nodes }), [nodes]);
  const warnings = useMemo(() => selectAggregatedWarnings({ nodes }), [nodes]);
  const errors = useMemo(() => selectAggregatedErrors({ nodes }), [nodes]);
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

          <section aria-label="Warnings">
            <h2>Warnings</h2>
            {warnings.length === 0 ? (
              <p class="hint">No warnings recorded.</p>
            ) : (
              <ul>{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
            )}
          </section>

          <section aria-label="Errors">
            <h2>Errors</h2>
            {errors.length === 0 ? (
              <p class="hint">No errors recorded.</p>
            ) : (
              <ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
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

          <section aria-label="Performance Logs" aria-disabled="true">
            <h2>Performance Logs</h2>
            <p class="hint">
              Deferred — no module in `core/worker/` records Worker Job Timing (no
              timing/duration field on any job result yet), so Performance Logs is shown
              as a placeholder until that data exists, the same as the Analyzer Screen's
              Cloudflare Analysis section.
            </p>
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
