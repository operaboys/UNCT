/**
 * Dashboard Screen (07-UI_UX_SYSTEM §4.1) — the third real Phase 9 screen,
 * and (per doc 07 §4's own ordering) the app's landing screen. Deliberately
 * the simplest of the three: every number here is read straight out of the
 * two stores the Converter/Analyzer Screens already write into
 * (`parserStore`, `analyzerStore`) through Selectors — Rule 11's boundary —
 * with NO new Core logic and no Worker routing of its own (nothing here is
 * an expensive computation; it is all already-computed values).
 *
 * Doc 07 §4.1 lists six sections: Quick Stats, Recent Imports, Recent
 * Exports, Node Summary, Health Overview, Warnings. Two of them have no
 * backing data anywhere in the app today, for the same reason — no Phase 9
 * screen persists anything to the durable `core/storage/` (ADR-013), and no
 * screen records a timestamped log of past actions:
 *
 * - "Recent Imports" is interpreted as the CURRENT session's parsed nodes,
 *   most-recent-first by their own internally-generated `createdAt`
 *   (`selectNodesSortedByCreatedAt`) — real data, not a placeholder, just
 *   scoped to this session rather than full cross-session history.
 * - "Recent Exports" has no analogous signal: the Converter Screen's Output
 *   Panel only ever shows a live, on-the-fly conversion of the CURRENT
 *   format selection, never a record that an export action actually
 *   happened. Shown as a disabled placeholder (same pattern as the Analyzer
 *   Screen's Cloudflare Analysis section) until an Export Center
 *   (doc 07 §4.6) or activity log exists to back it.
 */
import { useMemo } from "preact/hooks";
import {
  selectValidNodeIds,
  selectProtocolCounts,
  selectAggregatedWarnings,
  selectNodesSortedByCreatedAt,
  selectAverageSecurityScore,
} from "../../core/store/selectors.js";
import { useParserState } from "../store/use-parser-state.js";
import { useAnalyzerState } from "../store/use-analyzer-state.js";
import { formatAverageScore } from "./format.js";

const RECENT_IMPORTS_LIMIT = 5;

export function DashboardScreen() {
  const nodes = useParserState();
  const analysisByNodeId = useAnalyzerState();

  const validCount = useMemo(() => selectValidNodeIds({ nodes }).length, [nodes]);
  const protocolCounts = useMemo(() => selectProtocolCounts({ nodes }), [nodes]);
  const warnings = useMemo(() => selectAggregatedWarnings({ nodes }), [nodes]);
  const recentImports = useMemo(
    () => selectNodesSortedByCreatedAt({ nodes }).slice(0, RECENT_IMPORTS_LIMIT),
    [nodes],
  );
  const averageSecurityScore = useMemo(
    () => selectAverageSecurityScore({ analysisByNodeId }),
    [analysisByNodeId],
  );
  const analyzedCount = Object.keys(analysisByNodeId).length;
  const invalidCount = nodes.length - validCount;

  return (
    <main class="dashboard-screen">
      <h1>Dashboard</h1>

      <section aria-label="Quick Stats">
        <h2>Quick Stats</h2>
        <dl>
          <dt>Total Nodes</dt><dd>{nodes.length}</dd>
          <dt>Valid Nodes</dt><dd>{validCount}</dd>
          <dt>Invalid Nodes</dt><dd>{invalidCount}</dd>
          <dt>Analyzed Nodes</dt><dd>{analyzedCount}</dd>
        </dl>
      </section>

      <section aria-label="Recent Imports">
        <h2>Recent Imports</h2>
        {recentImports.length === 0 ? (
          <p class="hint">No nodes yet — parse something on the Converter Screen first.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Protocol</th><th>Address</th><th>Port</th><th>Imported At</th></tr>
            </thead>
            <tbody>
              {recentImports.map((n) => (
                <tr key={n.nodeId}>
                  <td>{n.protocol}</td>
                  <td>{n.address}</td>
                  <td>{n.port}</td>
                  <td>{n.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section aria-label="Recent Exports" aria-disabled="true">
        <h2>Recent Exports</h2>
        <p class="hint">
          Deferred — no screen records an export action yet (the Converter Screen's Output
          Panel only ever shows a live, on-the-fly conversion, doc 07 §4.2), and no Phase 9
          screen persists to durable storage (ADR-013). Shown as a placeholder until an
          Export Center (doc 07 §4.6) or activity log exists to back it.
        </p>
      </section>

      <section aria-label="Node Summary">
        <h2>Node Summary</h2>
        {Object.keys(protocolCounts).length === 0 ? (
          <p class="hint">No nodes yet.</p>
        ) : (
          <table>
            <thead><tr><th>Protocol</th><th>Count</th></tr></thead>
            <tbody>
              {Object.entries(protocolCounts).map(([protocol, count]) => (
                <tr key={protocol}><td>{protocol}</td><td>{count}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section aria-label="Health Overview">
        <h2>Health Overview</h2>
        <dl>
          <dt>Valid / Total</dt><dd>{validCount} / {nodes.length}</dd>
          <dt>Average Security Score</dt><dd>{formatAverageScore(averageSecurityScore)}</dd>
        </dl>
      </section>

      <section aria-label="Warnings">
        <h2>Warnings</h2>
        {warnings.length === 0 ? (
          <p class="hint">No warnings recorded.</p>
        ) : (
          <ul>
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        )}
      </section>
    </main>
  );
}
