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
      <h1>Analyzer</h1>

      {nodes.length === 0 ? (
        <p class="hint">No nodes yet — parse something on the Converter Screen first.</p>
      ) : (
        <section aria-label="Analyzer Controls">
          <label>
            Node:{" "}
            <select
              value={effectiveSelectedNodeId ?? ""}
              onChange={(e) => setSelectedNodeId((e.target as HTMLSelectElement).value)}
            >
              {nodes.map((n) => (
                <option key={n.nodeId} value={n.nodeId}>
                  {n.protocol} — {n.address}:{n.port}
                </option>
              ))}
            </select>
          </label>{" "}
          <button type="button" onClick={handleAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? "Analyzing…" : "Analyze"}
          </button>
          {analyzeError && <p class="error" role="alert">{analyzeError}</p>}
        </section>
      )}

      {selectedNode && !bundle && (
        <p class="hint">Click Analyze to see results for this node.</p>
      )}

      {selectedNode && bundle && (
        <>
          <section aria-label="Node Details">
            <h2>Node Details</h2>
            <dl>
              <dt>Protocol</dt><dd>{selectedNode.protocol}</dd>
              <dt>Address</dt><dd>{selectedNode.address}</dd>
              <dt>Port</dt><dd>{selectedNode.port}</dd>
              <dt>Network</dt><dd>{selectedNode.network}</dd>
              <dt>Security</dt><dd>{selectedNode.security}</dd>
              <dt>Completeness Score</dt><dd>{formatScore(bundle.completeness.completenessScore)}</dd>
              <dt>Present Optional Fields</dt><dd>{formatStringList(bundle.completeness.presentOptionalFields)}</dd>
              <dt>Missing Fields</dt><dd>{formatStringList(bundle.completeness.missingFields)}</dd>
            </dl>
          </section>

          <section aria-label="Protocol Analysis">
            <h2>Protocol Analysis</h2>
            <dl>
              <dt>Protocol</dt><dd>{bundle.protocol.protocol}</dd>
              <dt>Recognized</dt><dd>{formatTriState(bundle.protocol.recognized)}</dd>
            </dl>
          </section>

          <section aria-label="Security Analysis">
            <h2>Security Analysis</h2>
            <dl>
              <dt>Security Score</dt><dd>{formatScore(bundle.security.securityScore)}</dd>
              <dt>Issues</dt><dd>{formatStringList(bundle.security.issues)}</dd>
              <dt>TLS Applicable</dt><dd>{formatTriState(bundle.tls.applicable)}</dd>
              <dt>TLS Coherent</dt><dd>{formatTriState(bundle.tls.coherent)}</dd>
              <dt>Known Fingerprint</dt><dd>{formatTriState(bundle.tls.knownFingerprint)}</dd>
              <dt>TLS Issues</dt><dd>{formatStringList(bundle.tls.issues)}</dd>
            </dl>
          </section>

          <section aria-label="Compatibility Analysis">
            <h2>Compatibility Analysis</h2>
            <dl>
              <dt>Network</dt><dd>{bundle.network.network}</dd>
              <dt>Compatible</dt><dd>{formatTriState(bundle.network.compatible)}</dd>
              <dt>Supported Networks</dt><dd>{formatStringList(bundle.network.supportedNetworks)}</dd>
            </dl>
          </section>

          <section aria-label="Cloudflare Analysis" aria-disabled="true">
            <h2>Cloudflare Analysis</h2>
            <p class="hint">
              Deferred — per doc 07 §4.3, Cloudflare Analysis is a semi-definitive Phase 10
              module (06-ANALYZER_ENGINE) and is shown as a placeholder until that module exists.
            </p>
          </section>

          <section aria-label="Reality Analysis">
            <h2>Reality Analysis</h2>
            <dl>
              <dt>Applicable</dt><dd>{formatTriState(bundle.reality.applicable)}</dd>
              <dt>Compatible</dt><dd>{formatTriState(bundle.reality.compatible)}</dd>
              <dt>PBK Plausible</dt><dd>{formatTriState(bundle.reality.pbkPlausible)}</dd>
              <dt>SID Plausible</dt><dd>{formatTriState(bundle.reality.sidPlausible)}</dd>
              <dt>Issues</dt><dd>{formatStringList(bundle.reality.issues)}</dd>
            </dl>
          </section>

          <section aria-label="Platform & Client Compatibility">
            <h2>Platform &amp; Client Compatibility</h2>
            <table aria-label="Platform Compatibility">
              <caption>Platforms</caption>
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
            <table aria-label="Client Compatibility">
              <caption>Clients</caption>
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
          </section>
        </>
      )}
    </main>
  );
}
