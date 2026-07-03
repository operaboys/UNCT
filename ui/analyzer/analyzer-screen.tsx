/**
 * Analyzer Screen (07-UI_UX_SYSTEM §4.3) — the second real Phase 9 screen,
 * built the same way the Converter Screen was: `ui/store/`'s Preact bridge
 * (ADR-015) over a `core/store/` domain, real-Worker-routed Core logic
 * (ADR-016's pattern reused, not re-derived — see `analyzer-worker-client.ts`).
 *
 * Reads its input nodes from the SAME app-wide `parserStore` the Converter
 * Screen writes into via Parse — this is the "Import → Analyze" half of
 * Phase 9's exit condition (09-DEVELOPMENT_ROADMAP), not a separate/parallel
 * node collection. `handleAnalyze` calls `analyzer-worker-client.js#analyzeNodes`
 * for every currently-parsed node and writes the six-module verdict bundle
 * into the sibling `analyzerStore` (`core/store/analyzer-state.js`) — kept
 * separate from `node.analysis` for the reason documented there: today's
 * Analyzer Engine can only fill one real `AnalysisObject` field
 * (`securityScore`), so the raw bundle must not be fabricated into that
 * frozen shape (Rule 9).
 *
 * Section mapping from doc 07 §4.3's list onto the six Core analyzer modules
 * (`core/analyzer/types.d.ts`): Node Details = node fields + Completeness;
 * Protocol Analysis = ProtocolAnalysis; Security Analysis = Security +
 * TLS (doc 07 has no separate TLS section — TLS coherence is a security-
 * quality concern); Compatibility Analysis = NetworkAnalysis; Cloudflare
 * Analysis* = disabled placeholder (semi-definitive Phase 10 module, per
 * doc 07 §4.3's own footnote); Reality Analysis = RealityAnalysis.
 *
 * "Platform & Client Compatibility" (below, last section) is the seventh,
 * Phase 10 Extended module (06-ANALYZER_ENGINE §2.6, `CompatibilityAnalysis`)
 * — a NEW section, not a placeholder activation, since none existed for it.
 * Deliberately named apart from "Compatibility Analysis" above: that section
 * is the NetworkAnalysis module judging transport-vs-protocol compatibility;
 * this one judges whether real client apps/platforms can use the node at
 * all, an unrelated question that happens to share the word "Compatibility".
 *
 * Visual design (final visual design phase, Analyzer step): restyled onto
 * the same Liquid Glass system as Dashboard/Converter, reusing their exact
 * classes (`.glass-panel`, `.panel-title`, `.kv-list`/`.kv-row`, `.btn`,
 * `.select`, `.alert`, `.data-table`, `.hint`) rather than inventing new
 * ones. The one new class this step adds, `.panel-grid` (a symmetric
 * wrapping grid, in `assets/css/theme.css`), exists because this screen's
 * nine analysis sections are equal-weight cards — a different shape from
 * Dashboard's asymmetric master-detail `.content-grid`, not a duplicate of
 * it. No logic/state/handlers changed here — same `handleAnalyze`, same
 * selectors, same six-module bundle read-out as before this pass.
 */
import { useMemo, useState } from "preact/hooks";
import { selectAnalysisByNodeId } from "../../core/store/selectors.js";
import { useParserState } from "../store/use-parser-state.js";
import { analyzerStore, useAnalyzerState } from "../store/use-analyzer-state.js";
import { analyzeNodes, CancelledError } from "../store/analyzer-worker-client.js";
import { formatStringList, formatTriState, formatScore, formatBadge } from "./format.js";

export function AnalyzerScreen() {
  const nodes = useParserState();
  const analysisByNodeId = useAnalyzerState();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const effectiveSelectedNodeId = useMemo(() => {
    if (selectedNodeId && nodes.some((n) => n.nodeId === selectedNodeId)) return selectedNodeId;
    return nodes[0]?.nodeId ?? null;
  }, [selectedNodeId, nodes]);

  const selectedNode = nodes.find((n) => n.nodeId === effectiveSelectedNodeId);
  const bundle = selectedNode
    ? selectAnalysisByNodeId({ analysisByNodeId }, selectedNode.nodeId)
    : undefined;

  async function handleAnalyze() {
    setIsAnalyzing(true);
    try {
      const result = await analyzeNodes(nodes);
      analyzerStore.setAnalysisBatch(result.analyzed);
      setAnalyzeError(null);
    } catch (err) {
      // A superseded job resolves itself instead — never surface a stale
      // cancellation as a user error (10-PERFORMANCE_ENGINE §6.1).
      if (err instanceof CancelledError) return;
      setAnalyzeError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <main class="analyzer-screen">
      <div class="screen-header">
        <h1 class="screen-title">Analyzer</h1>
        <p class="screen-subtitle">
          Six-module verdict per node: protocol recognition, security score, TLS/Reality checks,
          network compatibility, and Cloudflare Worker detection.
        </p>
      </div>

      <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label="Analyzer Controls">
        {nodes.length === 0 ? (
          <p class="hint">No nodes yet — parse something on the Converter Screen first.</p>
        ) : (
          <>
            <div class="form-actions" style={{ marginBlockStart: 0 }}>
              <select
                class="select"
                value={effectiveSelectedNodeId ?? ""}
                onChange={(e) => setSelectedNodeId((e.target as HTMLSelectElement).value)}
              >
                {nodes.map((n) => (
                  <option key={n.nodeId} value={n.nodeId}>
                    {n.protocol} — {n.address}:{n.port}
                  </option>
                ))}
              </select>
              <button type="button" class="btn btn--primary" onClick={handleAnalyze} disabled={isAnalyzing}>
                {isAnalyzing ? "Analyzing…" : "Analyze"}
              </button>
            </div>
            {analyzeError && <div class="alert alert--error" role="alert">{analyzeError}</div>}
            {selectedNode && !bundle && (
              <p class="hint" style={{ marginBlockStart: "12px" }}>Click Analyze to see results for this node.</p>
            )}
          </>
        )}
      </div>

      {selectedNode && bundle && (
        <div class="panel-grid">
          <div class="panel glass-panel" aria-label="Node Details">
            <div class="panel-title">Node Details</div>
            <dl class="kv-list">
              <div class="kv-row"><dt>Protocol</dt><dd>{selectedNode.protocol}</dd></div>
              <div class="kv-row"><dt>Address</dt><dd class="mono">{selectedNode.address}</dd></div>
              <div class="kv-row"><dt>Port</dt><dd class="mono"><bdi>{selectedNode.port}</bdi></dd></div>
              <div class="kv-row"><dt>Network</dt><dd>{selectedNode.network}</dd></div>
              <div class="kv-row"><dt>Security</dt><dd>{selectedNode.security}</dd></div>
              <div class="kv-row"><dt>Completeness Score</dt><dd>{formatScore(bundle.completeness.completenessScore)}</dd></div>
              <div class="kv-row"><dt>Present Optional Fields</dt><dd>{formatStringList(bundle.completeness.presentOptionalFields)}</dd></div>
              <div class="kv-row"><dt>Missing Fields</dt><dd>{formatStringList(bundle.completeness.missingFields)}</dd></div>
            </dl>
          </div>

          <div class="panel glass-panel" aria-label="Protocol Analysis">
            <div class="panel-title">Protocol Analysis</div>
            <dl class="kv-list">
              <div class="kv-row"><dt>Protocol</dt><dd>{bundle.protocol.protocol}</dd></div>
              <div class="kv-row"><dt>Recognized</dt><dd>{formatTriState(bundle.protocol.recognized)}</dd></div>
            </dl>
          </div>

          <div class="panel glass-panel" aria-label="Security Analysis">
            <div class="panel-title">Security Analysis</div>
            <dl class="kv-list">
              <div class="kv-row"><dt>Security Score</dt><dd>{formatScore(bundle.security.securityScore)}</dd></div>
              <div class="kv-row"><dt>Issues</dt><dd>{formatStringList(bundle.security.issues)}</dd></div>
              <div class="kv-row"><dt>TLS Applicable</dt><dd>{formatTriState(bundle.tls.applicable)}</dd></div>
              <div class="kv-row"><dt>TLS Coherent</dt><dd>{formatTriState(bundle.tls.coherent)}</dd></div>
              <div class="kv-row"><dt>Known Fingerprint</dt><dd>{formatTriState(bundle.tls.knownFingerprint)}</dd></div>
              <div class="kv-row"><dt>TLS Issues</dt><dd>{formatStringList(bundle.tls.issues)}</dd></div>
            </dl>
          </div>

          <div class="panel glass-panel" aria-label="Compatibility Analysis">
            <div class="panel-title">Compatibility Analysis</div>
            <dl class="kv-list">
              <div class="kv-row"><dt>Network</dt><dd>{bundle.network.network}</dd></div>
              <div class="kv-row"><dt>Compatible</dt><dd>{formatTriState(bundle.network.compatible)}</dd></div>
              <div class="kv-row"><dt>Supported Networks</dt><dd>{formatStringList(bundle.network.supportedNetworks)}</dd></div>
            </dl>
          </div>

          <div class="panel glass-panel" aria-label="Cloudflare Analysis">
            <div class="panel-title">Cloudflare Analysis</div>
            <dl class="kv-list">
              <div class="kv-row"><dt>Likely Cloudflare Worker</dt><dd>{formatTriState(bundle.cloudflare.likelyCloudflareWorker)}</dd></div>
              <div class="kv-row"><dt>Confidence</dt><dd><bdi>{bundle.cloudflare.confidence}</bdi></dd></div>
              <div class="kv-row"><dt>Signals</dt><dd>{formatStringList(bundle.cloudflare.signals)}</dd></div>
            </dl>
          </div>

          <div class="panel glass-panel" aria-label="Clean IP Analysis">
            <div class="panel-title">Clean IP Analysis</div>
            <dl class="kv-list">
              <div class="kv-row"><dt>Clean IP Pattern</dt><dd>{formatTriState(bundle.cleanIp.isCleanIpPattern)}</dd></div>
              <div class="kv-row"><dt>Confidence</dt><dd><bdi>{bundle.cleanIp.confidence}</bdi></dd></div>
              <div class="kv-row"><dt>Signals</dt><dd>{formatStringList(bundle.cleanIp.signals)}</dd></div>
            </dl>
          </div>

          <div class="panel glass-panel" aria-label="Worker Analysis">
            <div class="panel-title">Worker Analysis</div>
            {bundle.worker.applicable ? (
              <dl class="kv-list">
                <div class="kv-row"><dt>Worker Domain</dt><dd class="mono">{bundle.worker.workerDomain ?? "—"}</dd></div>
                <div class="kv-row"><dt>Path Segments</dt><dd>{formatStringList(bundle.worker.pathSegments)}</dd></div>
                <div class="kv-row"><dt>UUID Segment</dt><dd class="mono">{bundle.worker.uuidSegment ?? "—"}</dd></div>
                <div class="kv-row">
                  <dt>Parameters</dt>
                  <dd>
                    {Object.keys(bundle.worker.parameters).length === 0
                      ? "—"
                      : Object.entries(bundle.worker.parameters)
                          .map(([k, v]) => `${k}=${v}`)
                          .join(", ")}
                  </dd>
                </div>
                {bundle.worker.encodedDataFindings.length > 0 && (
                  <div class="kv-row">
                    <dt>Encoded Data</dt>
                    <dd>
                      <ul class="plain-list">
                        {bundle.worker.encodedDataFindings.map((f, i) => (
                          <li key={i}>
                            <strong>{f.source}</strong>:{" "}
                            {f.rawBase64Detected ? `[binary] ${f.raw}` : f.decoded}
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p class="hint">Not a detected Cloudflare Worker — extraction did not run.</p>
            )}
          </div>

          <div class="panel glass-panel" aria-label="Reality Analysis">
            <div class="panel-title">Reality Analysis</div>
            <dl class="kv-list">
              <div class="kv-row"><dt>Applicable</dt><dd>{formatTriState(bundle.reality.applicable)}</dd></div>
              <div class="kv-row"><dt>Compatible</dt><dd>{formatTriState(bundle.reality.compatible)}</dd></div>
              <div class="kv-row"><dt>PBK Plausible</dt><dd>{formatTriState(bundle.reality.pbkPlausible)}</dd></div>
              <div class="kv-row"><dt>SID Plausible</dt><dd>{formatTriState(bundle.reality.sidPlausible)}</dd></div>
              <div class="kv-row"><dt>Issues</dt><dd>{formatStringList(bundle.reality.issues)}</dd></div>
            </dl>
          </div>

          <div class="panel glass-panel" aria-label="Route Rules Analysis">
            <div class="panel-title">Route Rules Analysis</div>
            {!bundle.rules.applicable ? (
              <p class="hint">No route rules — this node's source format (Xray / URL / WireGuard / Subscription) does not carry a routing table.</p>
            ) : (
              <dl class="kv-list">
                <div class="kv-row"><dt>Total Rules</dt><dd><bdi>{bundle.rules.totalCount}</bdi></dd></div>
                <div class="kv-row">
                  <dt>By Category</dt>
                  <dd>
                    {Object.entries(bundle.rules.byCategory).length === 0
                      ? "—"
                      : Object.entries(bundle.rules.byCategory)
                          .map(([cat, count]) => `${cat}: ${count}`)
                          .join(", ")}
                  </dd>
                </div>
                <div class="kv-row"><dt>Duplicate Rules</dt><dd><bdi>{bundle.rules.duplicateCount}</bdi></dd></div>
                {bundle.rules.duplicates.length > 0 && (
                  <div class="kv-row">
                    <dt>Duplicate Entries</dt>
                    <dd>
                      <ul class="plain-list">
                        {bundle.rules.duplicates.map((d) => <li key={d} class="mono">{d}</li>)}
                      </ul>
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        </div>
      )}

      {selectedNode && bundle && (
        <div class="panel glass-panel" style={{ marginBlockStart: "20px" }} aria-label="Platform & Client Compatibility">
          <div class="panel-title">Platform &amp; Client Compatibility</div>
          <div class="table-scroll">
            <table class="data-table data-table--center" aria-label="Platform Compatibility">
              <caption class="hint" style={{ textAlign: "start", marginBlockEnd: "8px" }}>Platforms</caption>
              <thead>
                <tr>
                  <th>Android</th><th>iOS</th><th>Windows</th><th>Linux</th><th>macOS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{formatBadge(bundle.compatibility.platforms.android)}</td>
                  <td>{formatBadge(bundle.compatibility.platforms.ios)}</td>
                  <td>{formatBadge(bundle.compatibility.platforms.windows)}</td>
                  <td>{formatBadge(bundle.compatibility.platforms.linux)}</td>
                  <td>{formatBadge(bundle.compatibility.platforms.macos)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="table-scroll" style={{ marginBlockStart: "20px" }}>
            <table class="data-table data-table--center" aria-label="Client Compatibility">
              <caption class="hint" style={{ textAlign: "start", marginBlockEnd: "8px" }}>Clients</caption>
              <thead>
                <tr>
                  <th>Xray</th><th>sing-box</th><th>Clash Meta</th><th>NekoBox</th><th>v2rayNG</th><th>Hiddify</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{formatBadge(bundle.compatibility.clients.xray)}</td>
                  <td>{formatBadge(bundle.compatibility.clients["sing-box"])}</td>
                  <td>{formatBadge(bundle.compatibility.clients["clash-meta"])}</td>
                  <td>{formatBadge(bundle.compatibility.clients.nekobox)}</td>
                  <td>{formatBadge(bundle.compatibility.clients.v2rayng)}</td>
                  <td>{formatBadge(bundle.compatibility.clients.hiddify)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
