/**
 * Developer Console (07-UI_UX_SYSTEM §4.7) — the eighth and last Main Screen
 * from doc 07's list. Doc 07 §4.7 names seven sections: Parser Logs,
 * Warnings, Errors, Recovery Logs, Validation Logs, Performance Logs,
 * Detection Logs / Detection Metadata Viewer.
 *
 * All seven are built entirely on values Core already computed —
 * Recovery Logs on the pre-existing `selectAggregatedRecoveryActions`
 * (already used by the Converter Screen), Warnings/Errors merged into one
 * severity-sorted view on `selectDiagnosticsSortedBySeverity` (recovers each
 * line's real registered severity via `getErrorDef` and ranks with
 * `compareSeverity`, `core/errors/`, Orphan Check item #4), and the other
 * two on thin projection selectors (`selectParserLog`, `selectDetectionLog`,
 * `selectValidationFailureLog`, `core/store/selectors.js`) that only read
 * fields the Parser/Validation Engine already wrote onto every node.
 *
 * "Alternative Candidates" (the other half of "Detection Logs / Detection
 * Metadata Viewer", doc 04 Stage 02) is now real data too (ADR-028):
 * `core/parser/factory.js`'s `parseWithFallback` already ranked candidate
 * parsers while choosing one — that ranking now survives onto
 * `metadata.alternativeCandidates` (both the main-thread pipeline and the
 * default Worker path, `core/worker/parser.worker.js`/`unflatten-node.js`),
 * and `selectDetectionLog` exposes it alongside Confidence Score. A node
 * whose detection had only one eligible parser gets an honest "only
 * eligible parser" row rather than an empty table implying missing data
 * (Rule 9). It stays nested inside the same "Detection Logs" panel rather
 * than its own `.glass-panel` — the two questions ("what was detected" /
 * "what else was considered") are one topic, not two independent Logs
 * sections doc 07 §4.7 never separately named. 2026-07-05 addendum: at real
 * data volumes (both now `VirtualTable`s) the two looked indistinguishable
 * without a clearer boundary between them, so the subsection now sits in a
 * `.panel-subsection` (top border + tinted title background,
 * `assets/css/theme.css`) — a visual, not structural, separation.
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
 * the existing `.tag--invalid` rather than a redundant duplicate.
 *
 * Virtualization (2026-07-05): a real ~3000-node import made this screen lag
 * for minutes — every table below rendered its FULL array via plain Preact
 * `.map()`, the exact pattern Subscription Center's `NodeTable` already
 * fixed (doc 14 §1/§2) but this screen never received. Parser Logs,
 * Warnings & Errors, Validation Logs, Detection Logs, and Alternative
 * Candidates (all of which scale with node/diagnostic count, unboundedly)
 * now render through `../components/virtual-table.tsx` — the same
 * `use-virtualizer.ts` + spacer-`<tr>` technique, factored into a reusable
 * component since this is now the 2nd screen needing it. Two tables are
 * deliberately LEFT AS PLAIN `.map()`: Performance Logs always has exactly
 * 3 rows (one per Worker pool name) — it can never scale with node count,
 * so virtualizing it would add complexity with no real benefit. Recovery
 * Logs (a `<ul>`, not a `<table>`) is inherently a SUBSET — only nodes that
 * actually needed structural repair appear there, realistically far smaller
 * than the total node count (most real-world imports need no recovery at
 * all) — the same "subset is much smaller than what actually crashed"
 * reasoning `NodeTableGrouped` already used for Subscription Center's Group
 * mode.
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
import { VirtualTable } from "../components/virtual-table.js";

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

type AlternativeCandidateRow =
  | { nodeId: string; onlyEligible: true }
  | { nodeId: string; onlyEligible: false; name: string; confidence: number };

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
  // Flattened once for VirtualTable — a plain data array, not JSX, so the
  // virtualizer's `items`/`renderRow` split can operate on it the same way
  // as every other table here (was previously built inline via `.flatMap`
  // returning JSX directly).
  const alternativeCandidateRows: AlternativeCandidateRow[] = useMemo(
    () => detectionLog.flatMap((entry): AlternativeCandidateRow[] =>
      entry.alternativeCandidates.length === 0
        ? [{ nodeId: entry.nodeId, onlyEligible: true }]
        : entry.alternativeCandidates.map((c) => ({ nodeId: entry.nodeId, onlyEligible: false, name: c.name, confidence: c.confidence })),
    ),
    [detectionLog],
  );

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
            <VirtualTable
              items={parserLog}
              columnCount={4}
              header={<tr><th class="col-nodeid">{t("common.fields.nodeId")}</th><th>{t("common.fields.parser")}</th><th>{t("common.fields.sourceType")}</th><th class="col-timestamp">{t("common.fields.createdAt")}</th></tr>}
              renderRow={(entry) => (
                <>
                  <td class="mono col-nodeid">{entry.nodeId}</td>
                  <td>{entry.parser}</td>
                  <td>{entry.sourceType}</td>
                  <td class="mono col-timestamp"><bdi>{entry.createdAt}</bdi></td>
                </>
              )}
            />
          </div>

          <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label={t("devconsole.diagnostics.title")}>
            <div class="panel-title">{t("devconsole.diagnostics.title")}</div>
            {diagnostics.length === 0 ? (
              <p class="hint">{t("devconsole.diagnostics.empty")}</p>
            ) : (
              <VirtualTable
                items={diagnostics}
                columnCount={4}
                header={<tr><th>{t("devconsole.diagnostics.severityColumn")}</th><th class="col-nodeid">{t("common.fields.nodeId")}</th><th>{t("devconsole.diagnostics.codeColumn")}</th><th>{t("devconsole.diagnostics.messageColumn")}</th></tr>}
                renderRow={(d) => (
                  <>
                    <td><span class={`tag ${SEVERITY_TAG_CLASS[d.severity] ?? "tag--info"}`}>{d.severity}</span></td>
                    <td class="mono col-nodeid">{d.nodeId}</td>
                    <td class="mono">{d.code}</td>
                    <td>{d.message}</td>
                  </>
                )}
              />
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
              <VirtualTable
                items={validationFailures}
                columnCount={2}
                header={<tr><th class="col-nodeid">{t("common.fields.nodeId")}</th><th>{t("devconsole.validationLogs.fieldColumn")}</th></tr>}
                renderRow={(entry) => (
                  <>
                    <td class="mono col-nodeid">{entry.nodeId}</td>
                    <td>{entry.field}</td>
                  </>
                )}
              />
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
            <VirtualTable
              items={detectionLog}
              columnCount={3}
              header={<tr><th class="col-nodeid">{t("common.fields.nodeId")}</th><th>{t("common.fields.parser")}</th><th>{t("common.fields.confidenceScore")}</th></tr>}
              renderRow={(entry) => (
                <>
                  <td class="mono col-nodeid">{entry.nodeId}</td>
                  <td>{entry.parser}</td>
                  <td>{formatScore(entry.confidence)}</td>
                </>
              )}
            />
            <div class="panel-subsection">
              <div class="panel-title" style={{ fontSize: "13px" }}>{t("devconsole.detectionLogs.alternativeCandidates.title")}</div>
              <VirtualTable
                items={alternativeCandidateRows}
                columnCount={3}
                header={<tr><th class="col-nodeid">{t("common.fields.nodeId")}</th><th>{t("common.fields.parser")}</th><th>{t("common.fields.confidenceScore")}</th></tr>}
                renderRow={(row) => row.onlyEligible ? (
                  <>
                    <td class="mono col-nodeid">{row.nodeId}</td>
                    <td colSpan={2} class="hint">{t("devconsole.detectionLogs.alternativeCandidates.onlyEligible")}</td>
                  </>
                ) : (
                  <>
                    <td class="mono col-nodeid">{row.nodeId}</td>
                    <td>{row.name}</td>
                    <td>{formatScore(row.confidence)}</td>
                  </>
                )}
              />
            </div>
          </div>
        </>
      )}
    </main>
  );
}
